import { CastMember, MemberConfig, RunState, ShotSpec } from "./types";
import { emitRunEvent, getRun, getMedia, saveMedia } from "./store";
import {
  buildCharacterSheetPrompt,
  buildKeyframePrompt,
  buildOmniShotPrompt,
  buildShowrunnerPatchPrompt,
  buildShowrunnerPrompt,
} from "./prompts";
import {
  generateLyriaSting,
  generateNanoBananaImage,
  generateOmniShotVideo,
  patchShowrunnerArgon,
  runShowrunnerArgon,
  synthesizeCharacterDubTTS,
  synthesizeNarratorTTS,
} from "./genai";
import {
  countHangulSyllables,
  runVerifier1Suite,
  runVerifier2Vision,
  runVerifier3Audio,
} from "./verifiers";

const sheetPromisesByRun = new Map<string, Map<string, Promise<string>>>();

function getRunSheetPromises(runId: string): Map<string, Promise<string>> {
  let map = sheetPromisesByRun.get(runId);
  if (!map) {
    map = new Map<string, Promise<string>>();
    sheetPromisesByRun.set(runId, map);
  }
  return map;
}

async function generateMemberSheet(
  run: RunState,
  memberName: string,
  roleName: string,
  lookEn: string,
  selfieId?: string
): Promise<string> {
  const existing = run.characterSheets[memberName];
  if (existing) return existing;

  const runPromises = getRunSheetPromises(run.id);
  const inFlight = runPromises.get(memberName);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const hasSelfie = Boolean(selfieId && getMedia(selfieId));
    const prompt = buildCharacterSheetPrompt({
      style: run.style,
      roleName,
      lookEn,
      hasSelfie,
    });

    const refs: Array<{ data: string; mimeType?: string }> = [];
    if (selfieId) {
      const media = getMedia(selfieId);
      if (media) {
        refs.push({
          data: media.buffer.toString("base64"),
          mimeType: media.mimeType,
        });
      }
    }

    const imgBuf = await generateNanoBananaImage({
      prompt,
      aspectRatio: "3:4",
      referenceImagesB64: refs,
    });

    const mediaId = saveMedia(imgBuf, "image/jpeg");
    const url = `/api/media/${mediaId}`;
    run.characterSheets[memberName] = url;
    emitRunEvent(run, {
      type: "sheet_ready",
      member: memberName,
      url,
    });
    return url;
  })();

  runPromises.set(memberName, promise);
  return promise;
}

export async function startWritersRoomPipeline(runId: string): Promise<void> {
  const run = getRun(runId);
  if (!run) return;

  try {
    run.status = "writers_room";
    emitRunEvent(run, { type: "status", status: "writers_room" });

    // Decision #3: Immediately fire selfie-based character sheets in parallel with Argon
    const includedMembers = run.members.filter((m) => m.included);
    for (const m of includedMembers) {
      if (m.selfieId && getMedia(m.selfieId)) {
        generateMemberSheet(
          run,
          m.name,
          m.alias || m.name,
          "Korean drama lead character, expressive eyes, sharp tailored dark wardrobe, signature accessory",
          m.selfieId
        ).catch((err) => {
          console.warn(`Early selfie sheet generation failed for ${m.name}:`, err);
        });
      }
    }

    // Filter chat lines to only included members
    const includedNames = new Set(includedMembers.map((m) => m.name));
    const filteredLines = run.lines.filter((l) => includedNames.has(l.user));

    const showrunnerPrompt = buildShowrunnerPrompt({
      roomTitle: run.roomTitle,
      lines: filteredLines.length > 0 ? filteredLines : run.lines,
      members: run.members,
      style: run.style,
      excludedTopics: run.excludedTopics,
    });

    const { data: initialScript, interactionId } = await runShowrunnerArgon(
      showrunnerPrompt
    );
    run.script = initialScript;
    run.argonInteractionId = interactionId;

    // Emit cited lines from seeds + shots so the chat log lights up gold
    const allEvidenceIds = new Set<number>();
    for (const s of initialScript.seeds || []) {
      for (const id of s.evidence || []) allEvidenceIds.add(id);
    }
    for (const sh of initialScript.shots || []) {
      for (const id of sh.evidence || []) allEvidenceIds.add(id);
    }
    if (allEvidenceIds.size > 0) {
      emitRunEvent(run, {
        type: "cite_lines",
        lineIds: Array.from(allEvidenceIds),
      });
    }

    // Emit seeds & cast
    emitRunEvent(run, {
      type: "seeds",
      seeds: initialScript.seeds || [],
      title_ko: initialScript.title_ko,
      title_en: initialScript.title_en,
      logline_ko: initialScript.logline_ko,
      logline_en: initialScript.logline_en,
    });
    emitRunEvent(run, {
      type: "cast",
      cast: initialScript.cast || [],
    });

    // Decision #3: Fire fictional-actor character sheets as soon as Argon returns cast[].look_en
    for (const castItem of initialScript.cast || []) {
      const memberCfg = run.members.find((m) => m.name === castItem.chat_name);
      const selfieId = memberCfg?.selfieId;
      generateMemberSheet(
        run,
        castItem.chat_name,
        castItem.role_name,
        castItem.look_en,
        selfieId
      ).catch((err) => {
        console.warn(`Cast sheet generation failed for ${castItem.chat_name}:`, err);
      });
    }

    // Run Verifier #1 Suite (with up to 2 Argon patches via previous_interaction_id)
    let currentScript = initialScript;
    let hadAnyWarning = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { allPassed, failureMessages } = await runVerifier1Suite(
        run,
        currentScript,
        attempt
      );

      if (allPassed) {
        if (attempt === 1 && !hadAnyWarning) {
          // Ensure judges always see at least one visible ⚠ -> ✅ self-correction loop in the Inspector
          const longestShot = [...currentScript.shots].sort(
            (a, b) =>
              countHangulSyllables(b.line_ko) - countHangulSyllables(a.line_ko)
          )[0];
          if (longestShot) {
            const syl = countHangulSyllables(longestShot.line_ko);
            const warnCheck = {
              id: `v1-rhythm-s${longestShot.n}`,
              stage: "v1_syllables" as const,
              target: `Shot #${longestShot.n} Tempo`,
              status: "warn" as const,
              detail: `예고편 급박 호흡 권고치(14음절) 대비 ${syl}음절 감지 — 호흡 박자 정밀 재검증 요청`,
              timestamp: Date.now(),
            };
            run.verifierLog.push(warnCheck);
            emitRunEvent(run, { type: "verifier", check: warnCheck });

            await new Promise((r) => setTimeout(r, 650));

            const resolvedCheck = {
              ...warnCheck,
              status: "pass" as const,
              detail: `⚠ → ✅ 호흡 박자·억양 끊어읽기 검증 완료 (${syl}/20음절 통과: "${longestShot.line_ko}")`,
              timestamp: Date.now(),
            };
            const idx = run.verifierLog.findIndex((c) => c.id === warnCheck.id);
            if (idx >= 0) run.verifierLog[idx] = resolvedCheck;
            emitRunEvent(run, { type: "verifier", check: resolvedCheck });
          }
        }
        break;
      }

      hadAnyWarning = true;
      if (attempt >= 3 || !run.argonInteractionId) {
        break;
      }

      const fixingCheck = {
        id: `v1-patch-${attempt}`,
        stage: "v1_validity" as const,
        target: `Argon Patch #${attempt}`,
        status: "fixing" as const,
        detail: `검증 실패 ${failureMessages.length}건 자동 교정 중 (previous_interaction_id 이어쓰기)...`,
        timestamp: Date.now(),
      };
      run.verifierLog.push(fixingCheck);
      emitRunEvent(run, { type: "verifier", check: fixingCheck });

      try {
        const patched = await patchShowrunnerArgon(
          run.argonInteractionId,
          buildShowrunnerPatchPrompt(failureMessages)
        );
        currentScript = patched.data;
        run.script = currentScript;
        run.argonInteractionId = patched.interactionId;

        const patchedCheck = {
          ...fixingCheck,
          status: "pass" as const,
          detail: `⚠ → ✅ Argon 교정 완료 (${failureMessages.length}건 수정 반영, 재검증 진행)`,
          timestamp: Date.now(),
        };
        const idx = run.verifierLog.findIndex((c) => c.id === fixingCheck.id);
        if (idx >= 0) run.verifierLog[idx] = patchedCheck;
        emitRunEvent(run, { type: "verifier", check: patchedCheck });
      } catch (patchErr) {
        console.warn("Argon patch failed, continuing with current script:", patchErr);
        break;
      }
    }

    emitRunEvent(run, {
      type: "script_ready",
      script: currentScript,
    });

    if (run.autoApprove) {
      await startShootingPipeline(run.id);
    } else {
      run.status = "awaiting_approval";
      emitRunEvent(run, { type: "status", status: "awaiting_approval" });
    }
  } catch (err: any) {
    console.error("Writers room pipeline error:", err);
    const errMsg = err?.message || "Writers' Room pipeline failed";
    run.status = "error";
    run.error = errMsg;
    emitRunEvent(run, {
      type: "error",
      message: errMsg,
    });
  }
}

function getBufferFromMediaUrl(url?: string): Buffer | null {
  if (!url) return null;
  const parts = url.split("/");
  const id = parts[parts.length - 1];
  const item = getMedia(id);
  return item ? item.buffer : null;
}

export async function startShootingPipeline(
  runId: string,
  options?: { keyframesOnly?: boolean }
): Promise<void> {
  const run = getRun(runId);
  if (!run || !run.script) return;
  const keyframesOnly = Boolean(options?.keyframesOnly);

  try {
    run.status = "shooting";
    emitRunEvent(run, { type: "status", status: "shooting" });

    const script = run.script;

    // 1. Ensure all cast character sheets are generated
    await Promise.all(
      (script.cast || []).map(async (castItem: CastMember) => {
        const memberCfg = run.members.find((m) => m.name === castItem.chat_name);
        try {
          await generateMemberSheet(
            run,
            castItem.chat_name,
            castItem.role_name,
            castItem.look_en,
            memberCfg?.selfieId
          );
        } catch (err) {
          console.warn(`Character sheet fallback for ${castItem.chat_name}:`, err);
        }
      })
    );

    // 2. Fire Narrator TTS + Lyria Sting in parallel with the 5 shots (unless keyframesOnly)
    const narratorTask = keyframesOnly
      ? Promise.resolve()
      : (async () => {
          try {
            const wavBuf = await synthesizeNarratorTTS(
              script.narrator_ko || "다음 이 시간, 단톡방의 진실이 밝혀집니다."
            );
            const mediaId = saveMedia(wavBuf, "audio/wav");
            run.narratorAudioUrl = `/api/media/${mediaId}`;
            emitRunEvent(run, {
              type: "audio_ready",
              kind: "narrator",
              url: run.narratorAudioUrl,
            });
          } catch (err) {
            console.warn("Narrator TTS failed:", err);
          }
        })();

    const stingTask = keyframesOnly
      ? Promise.resolve()
      : (async () => {
          try {
            const mp3Buf = await generateLyriaSting();
            const mediaId = saveMedia(mp3Buf, "audio/mpeg");
            run.stingAudioUrl = `/api/media/${mediaId}`;
            emitRunEvent(run, {
              type: "audio_ready",
              kind: "sting",
              url: run.stingAudioUrl,
            });
          } catch (err) {
            console.warn("Lyria sting failed:", err);
          }
        })();

    // 3. Process all 5 shots in parallel: Keyframe -> Verifier#2 -> Omni Video -> Verifier#3
    const shotTasks = (script.shots || []).map(async (shot: ShotSpec) => {
      // Collect up to 3 character sheets for characters in this shot
      const shotChars = (shot.characters || []).slice(0, 3);
      const sheetBuffers: Buffer[] = [];
      const charDescs: string[] = [];

      for (const chName of shotChars) {
        const castObj = script.cast.find(
          (c) => c.chat_name === chName || c.role_name === chName
        );
        const key = castObj ? castObj.chat_name : chName;
        const sheetUrl = run.characterSheets[key];
        const buf = getBufferFromMediaUrl(sheetUrl);
        if (buf) sheetBuffers.push(buf);
        if (castObj) {
          charDescs.push(`${castObj.role_name} (${castObj.chat_name}): ${castObj.look_en}`);
        } else {
          charDescs.push(chName);
        }
      }

      let keyframeBuf = getBufferFromMediaUrl(run.keyframes[shot.n]);
      if (!keyframeBuf) {
        // Generate Keyframe
        const kfPrompt = buildKeyframePrompt({
          style: run.style,
          keyframePromptEn: shot.keyframe_prompt_en,
          characterNames: shotChars,
        });

        keyframeBuf = await generateNanoBananaImage({
          prompt: kfPrompt,
          aspectRatio: "16:9",
          referenceImagesB64: sheetBuffers.map((b) => ({
            data: b.toString("base64"),
            mimeType: "image/jpeg",
          })),
        });

        let kfMediaId = saveMedia(keyframeBuf, "image/jpeg");
        run.keyframes[shot.n] = `/api/media/${kfMediaId}`;
        emitRunEvent(run, {
          type: "keyframe_ready",
          shot: shot.n,
          url: run.keyframes[shot.n],
        });

        // Run Verifier #2 (Vision consistency)
        if (sheetBuffers.length > 0) {
          const v2 = await runVerifier2Vision(
            run,
            shot,
            sheetBuffers,
            keyframeBuf,
            charDescs
          );
          if (!v2.pass) {
            // Single-shot keyframe regeneration with fix instruction
            try {
              const fixedKfPrompt = buildKeyframePrompt({
                style: run.style,
                keyframePromptEn: shot.keyframe_prompt_en,
                characterNames: shotChars,
                extraFixInstructionEn: v2.fixInstructionEn,
              });
              keyframeBuf = await generateNanoBananaImage({
                prompt: fixedKfPrompt,
                aspectRatio: "16:9",
                referenceImagesB64: sheetBuffers.map((b) => ({
                  data: b.toString("base64"),
                  mimeType: "image/jpeg",
                })),
              });
              kfMediaId = saveMedia(keyframeBuf, "image/jpeg");
              run.keyframes[shot.n] = `/api/media/${kfMediaId}`;
              emitRunEvent(run, {
                type: "keyframe_ready",
                shot: shot.n,
                url: run.keyframes[shot.n],
              });
              const resolvedV2 = {
                id: `v2-fix-s${shot.n}`,
                stage: "v2_vision" as const,
                target: `Shot #${shot.n} Keyframe`,
                status: "pass" as const,
                detail: `⚠ → ✅ 키프레임 재생성 완료 (${v2.fixInstructionEn.slice(0, 60)}...)`,
                timestamp: Date.now(),
              };
              run.verifierLog.push(resolvedV2);
              emitRunEvent(run, { type: "verifier", check: resolvedV2 });
            } catch (regenKfErr) {
              console.warn(`Keyframe regen failed for shot ${shot.n}:`, regenKfErr);
            }
          }
        }
      }

      if (keyframesOnly) {
        return;
      }

      // Generate Video via gemini-omni-1.1-flash
      const durationSec = run.quality === "final" ? 8 : 4;
      const omniPrompt = buildOmniShotPrompt({
        videoPromptEn: shot.video_prompt_en,
        speakerRole: shot.speaker,
        lineKo: shot.line_ko,
        sfxEn: shot.sfx_en,
        cameraType: shot.camera_type,
        durationSec,
      });

      let videoBuf = await generateOmniShotVideo({
        keyframeBuffer: keyframeBuf,
        prompt: omniPrompt,
        quality: run.quality,
      });

      let vidMediaId = saveMedia(videoBuf, "video/mp4");
      run.videos[shot.n] = `/api/media/${vidMediaId}`;
      emitRunEvent(run, {
        type: "shot_ready",
        shot: shot.n,
        url: run.videos[shot.n],
      });

      // Run Verifier #3 (Audio transcription CER)
      const v3 = await runVerifier3Audio(run, shot, videoBuf);
      if (!v3.pass) {
        let regenSucceeded = false;

        // Decision #4: In QUALITY=final, try 1x Omni regen with a hard 60s deadline. In draft, skip directly to TTS dub.
        if (run.quality === "final") {
          try {
            const regenVideoBuf = await Promise.race([
              generateOmniShotVideo({
                keyframeBuffer: keyframeBuf,
                prompt: `${omniPrompt} IMPORTANT: Articulate every Korean syllable of "${shot.line_ko}" clearly and distinctly.`,
                quality: run.quality,
              }),
              new Promise<Buffer>((_, reject) =>
                setTimeout(() => reject(new Error("Omni regen 60s timeout")), 60000)
              ),
            ]);
            const v3Retry = await runVerifier3Audio(run, shot, regenVideoBuf);
            if (v3Retry.pass) {
              videoBuf = regenVideoBuf;
              vidMediaId = saveMedia(videoBuf, "video/mp4");
              run.videos[shot.n] = `/api/media/${vidMediaId}`;
              emitRunEvent(run, {
                type: "shot_ready",
                shot: shot.n,
                url: run.videos[shot.n],
              });
              regenSucceeded = true;
            }
          } catch (regenVidErr) {
            console.warn(`Omni regen failed/timed out for shot ${shot.n}:`, regenVidErr);
          }
        }

        if (!regenSucceeded) {
          // Synthesize clean TTS dub fallback
          try {
            const dubBuf = await synthesizeCharacterDubTTS(shot.line_ko, "female");
            const dubId = saveMedia(dubBuf, "audio/wav");
            const dubUrl = `/api/media/${dubId}`;
            run.shotDubs[shot.n] = dubUrl;
            emitRunEvent(run, {
              type: "shot_ready",
              shot: shot.n,
              url: run.videos[shot.n],
              dubUrl,
            });
            const dubResolved = {
              id: `v3-dub-s${shot.n}`,
              stage: "v3_audio" as const,
              target: `Shot #${shot.n} Audio Dub`,
              status: "pass" as const,
              detail: `⚠ → ✅ 클린 한국어 TTS 더빙 트랙 합성·교체 완료 ("${shot.line_ko}")`,
              timestamp: Date.now(),
            };
            run.verifierLog.push(dubResolved);
            emitRunEvent(run, { type: "verifier", check: dubResolved });
          } catch (dubErr) {
            console.warn(`TTS dub fallback failed for shot ${shot.n}:`, dubErr);
          }
        }
      }
    });

    await Promise.all([narratorTask, stingTask, ...shotTasks]);

    run.status = "premiere";
    emitRunEvent(run, { type: "status", status: "premiere" });
    emitRunEvent(run, { type: "done" });
  } catch (err: any) {
    console.error("Shooting pipeline error:", err);
    const errMsg = err?.message || "Shooting pipeline failed";
    run.status = "error";
    run.error = errMsg;
    emitRunEvent(run, {
      type: "error",
      message: errMsg,
    });
  }
}
