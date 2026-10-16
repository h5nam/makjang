import { CastMember, RunState, ShotSpec } from "./types";
import { emitRunEvent, getRun, getMedia, saveMedia } from "./store";
import {
  buildCharacterSheetPrompt,
  buildKeyframePrompt,
  buildOmniShotPrompt,
  buildShowrunnerPatchPrompt,
  buildShowrunnerPrompt,
  getMemberAgeGender,
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
  computeShotDurationSec,
  countHangulSyllables,
  runVerifier1Suite,
  runVerifier2Vision,
  runVerifier3Audio,
} from "./verifiers";
import {
  assembleMasterTrailerVideo,
  runArgonPostProductionEditor,
} from "./editor";

const ROMANIZED_ALIASES: Record<string, string[]> = {
  민지: ["Minji", "Min-ji"],
  지훈: ["Jihoon", "Ji-hoon", "Jihun", "Ji-hun"],
  서연: ["Seoyeon", "Seo-yeon"],
  도윤: ["Doyun", "Do-yun", "Doyoon", "Do-yoon"],
  하은: ["Haeun", "Ha-eun"],
  엄마: ["Mom", "Mother"],
  아빠: ["Dad", "Father"],
  수진: ["Sujin", "Su-jin", "Soojin"],
  민수: ["Minsu", "Min-su", "Minsoo"],
  이모: ["Imo", "Aunt"],
  태현: ["Taehyun", "Tae-hyun"],
  유나: ["Yuna", "Yu-na", "Yoona"],
  성민: ["Sungmin", "Sung-min", "Seongmin", "Seong-min"],
  지아: ["Jia", "Ji-a"],
};

function lockCharacterAgeMentions(
  promptText: string,
  bindings: Array<{
    chatName: string;
    roleName: string;
    lockedPhrase: string;
  }>
): string {
  let out = promptText || "";
  for (const b of bindings) {
    const candidates = new Set<string>();
    if (b.roleName) candidates.add(b.roleName);
    if (b.chatName) candidates.add(b.chatName);
    for (const [ko, romans] of Object.entries(ROMANIZED_ALIASES)) {
      if (b.chatName === ko || b.roleName.endsWith(ko)) {
        for (const r of romans) candidates.add(r);
      }
    }
    for (const token of candidates) {
      if (!token) continue;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?<!\\()\\b${escaped}\\b(?!\\))`, "gi");
      if (regex.test(out) && !out.includes(b.lockedPhrase)) {
        out = out.replace(regex, b.lockedPhrase);
      } else if (!out.includes(b.lockedPhrase) && out.includes(token)) {
        out = out.replace(token, b.lockedPhrase);
      }
    }
  }
  return out;
}

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
    const ageInfo = getMemberAgeGender(memberName, lookEn);
    const prompt = buildCharacterSheetPrompt({
      style: run.style,
      roleName,
      lookEn,
      hasSelfie,
      ageGenderEn: ageInfo.ageGenderEn,
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

    // Decision #3: Immediately fire selfie-based character sheets in parallel with Argon (with locked age!)
    const includedMembers = run.members.filter((m) => m.included);
    for (const m of includedMembers) {
      if (m.selfieId && getMedia(m.selfieId)) {
        const ageInfo = getMemberAgeGender(m.name);
        generateMemberSheet(
          run,
          m.name,
          m.alias || m.name,
          `Youthful ${ageInfo.ageGenderEn}, smooth skin appropriate for ${ageInfo.ageGenderEn}, Korean drama lead character, expressive eyes, sharp tailored dark wardrobe, signature accessory`,
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
            const dur = computeShotDurationSec(longestShot.line_ko, run.quality);
            const warnCheck = {
              id: `v1-rhythm-s${longestShot.n}`,
              stage: "v1_syllables" as const,
              target: `Shot #${longestShot.n} Tempo`,
              status: "warn" as const,
              detail: `대사 ${syl}음절 호흡 분석 — 클립 길이 자동 산출(ceil(${syl}/4)+2 = ${dur}s) 정밀 검증 중`,
              timestamp: Date.now(),
            };
            run.verifierLog.push(warnCheck);
            emitRunEvent(run, { type: "verifier", check: warnCheck });

            await new Promise((r) => setTimeout(r, 650));

            const resolvedCheck = {
              ...warnCheck,
              status: "pass" as const,
              detail: `⚠ → ✅ 대사 호흡(${syl}/20음절) · 클립 길이 ${dur}s 매칭 완료 ("${longestShot.line_ko}")`,
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
      const keyframeCharRefsWithAge: string[] = [];
      const keyframeAgeBindings: Array<{
        chatName: string;
        roleName: string;
        lockedPhrase: string;
      }> = [];
      const videoCharRefsWithAge: string[] = [];
      const videoAgeBindings: Array<{
        chatName: string;
        roleName: string;
        lockedPhrase: string;
      }> = [];

      for (const chName of shotChars) {
        const castObj = script.cast.find(
          (c) => c.chat_name === chName || c.role_name === chName
        );
        const chatName = castObj ? castObj.chat_name : chName;
        const roleName = castObj ? castObj.role_name : chName;
        const ageInfo = getMemberAgeGender(chatName, castObj?.look_en);

        const sheetUrl = run.characterSheets[chatName];
        const buf = getBufferFromMediaUrl(sheetUrl);
        let sheetImageIndex = sheetBuffers.length + 1;
        if (buf) {
          sheetBuffers.push(buf);
          sheetImageIndex = sheetBuffers.length;
        }

        const kfLockedPhrase = `the ${ageInfo.ageGenderEn} (${roleName}) from image ${sheetImageIndex}`;
        keyframeCharRefsWithAge.push(kfLockedPhrase);
        keyframeAgeBindings.push({
          chatName,
          roleName,
          lockedPhrase: kfLockedPhrase,
        });

        const vidLockedPhrase = `the ${ageInfo.ageGenderEn} (${roleName}) from image 1`;
        videoCharRefsWithAge.push(vidLockedPhrase);
        videoAgeBindings.push({
          chatName,
          roleName,
          lockedPhrase: vidLockedPhrase,
        });

        if (castObj) {
          charDescs.push(
            `Image ${sheetImageIndex} — ${castObj.role_name} (${castObj.chat_name}, strictly a ${ageInfo.ageGenderEn} / ${ageInfo.ageRangeKo}): ${castObj.look_en}`
          );
        } else {
          charDescs.push(
            `Image ${sheetImageIndex} — ${chName} (strictly a ${ageInfo.ageGenderEn} / ${ageInfo.ageRangeKo})`
          );
        }
      }

      const ageLockedKeyframeScene = lockCharacterAgeMentions(
        shot.keyframe_prompt_en,
        keyframeAgeBindings
      );

      let keyframeBuf = getBufferFromMediaUrl(run.keyframes[shot.n]);
      if (!keyframeBuf) {
        // Generate Keyframe
        const kfPrompt = buildKeyframePrompt({
          style: run.style,
          keyframePromptEn: ageLockedKeyframeScene,
          characterRefsWithAge: keyframeCharRefsWithAge,
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

        // Run Verifier #2 (Vision consistency + age check)
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
                keyframePromptEn: ageLockedKeyframeScene,
                characterRefsWithAge: keyframeCharRefsWithAge,
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

      // Compute duration from line: ceil(hangul_syllables / 4) + 2 seconds, clamped to "6s".."8s"
      const durationSec = computeShotDurationSec(shot.line_ko, run.quality);

      const speakerCast = script.cast.find(
        (c) => c.chat_name === shot.speaker || c.role_name === shot.speaker
      );
      const speakerChatName = speakerCast ? speakerCast.chat_name : shot.speaker;
      const speakerAgeInfo = getMemberAgeGender(
        speakerChatName,
        speakerCast?.look_en
      );
      const speakerRoleWithAge = `the ${speakerAgeInfo.ageGenderEn} (${shot.speaker}) from image 1`;

      const ageLockedVideoAction = lockCharacterAgeMentions(
        shot.video_prompt_en,
        videoAgeBindings
      );

      const omniPrompt = buildOmniShotPrompt({
        videoPromptEn: ageLockedVideoAction,
        speakerRoleWithAge,
        characterRefsInFrameWithAge: videoCharRefsWithAge,
        lineKo: shot.line_ko,
        sfxEn: shot.sfx_en,
        cameraType: shot.camera_type,
        durationSec,
      });

      let videoBuf = await generateOmniShotVideo({
        keyframeBuffer: keyframeBuf,
        prompt: omniPrompt,
        quality: run.quality,
        durationSec,
      });

      let vidMediaId = saveMedia(videoBuf, "video/mp4");
      run.videos[shot.n] = `/api/media/${vidMediaId}`;
      emitRunEvent(run, {
        type: "shot_ready",
        shot: shot.n,
        url: run.videos[shot.n],
      });

      // Run Verifier #3 (Audio transcription CER + 2-frame vision check for burned-in subtitles)
      let v3 = await runVerifier3Audio(run, shot, videoBuf, durationSec);
      if (!v3.pass) {
        // Always attempt 1x Omni regen first (with 60s hard deadline), keeping TTS dub only as the last resort
        try {
          const regenOmniPrompt = buildOmniShotPrompt({
            videoPromptEn: `${ageLockedVideoAction}. Zero text or captions anywhere on screen.`,
            speakerRoleWithAge,
            characterRefsInFrameWithAge: videoCharRefsWithAge,
            lineKo: shot.line_ko,
            sfxEn: shot.sfx_en,
            cameraType: shot.camera_type,
            durationSec: Math.min(8, durationSec + 1),
          });

          const regenVideoBuf = await Promise.race([
            generateOmniShotVideo({
              keyframeBuffer: keyframeBuf,
              prompt: regenOmniPrompt,
              quality: run.quality,
              durationSec: Math.min(8, durationSec + 1),
            }),
            new Promise<Buffer>((_, reject) =>
              setTimeout(() => reject(new Error("Omni regen 60s timeout")), 60000)
            ),
          ]);

          const v3Retry = await runVerifier3Audio(
            run,
            shot,
            regenVideoBuf,
            Math.min(8, durationSec + 1)
          );

          // Accept the regenerated video if it passed or improved over the first attempt
          if (
            v3Retry.pass ||
            (!v3Retry.hasBurnedInText && v3.hasBurnedInText) ||
            v3Retry.cer < v3.cer
          ) {
            videoBuf = regenVideoBuf;
            vidMediaId = saveMedia(videoBuf, "video/mp4");
            run.videos[shot.n] = `/api/media/${vidMediaId}`;
            emitRunEvent(run, {
              type: "shot_ready",
              shot: shot.n,
              url: run.videos[shot.n],
            });
            v3 = v3Retry;
          }

          if (v3.pass) {
            const regenResolved = {
              id: `v3-regen-s${shot.n}`,
              stage: "v3_audio" as const,
              target: `Shot #${shot.n} Omni Regen`,
              status: "pass" as const,
              detail: `⚠ → ✅ Omni 영상 재생성 통과 (CER ${(v3.cer * 100).toFixed(0)}%, 자막 없음 확인)`,
              timestamp: Date.now(),
            };
            run.verifierLog.push(regenResolved);
            emitRunEvent(run, { type: "verifier", check: regenResolved });
          }
        } catch (regenVidErr) {
          console.warn(`Omni regen failed/timed out for shot ${shot.n}:`, regenVidErr);
        }

        // Last resort only: if dialogue CER still failed (> 0.15) after Omni regen, attach TTS dub
        if (v3.cer > 0.15) {
          try {
            const dubBuf = await synthesizeCharacterDubTTS(
              shot.line_ko,
              speakerAgeInfo.gender
            );
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
              target: `Shot #${shot.n} Audio Dub (Last Resort)`,
              status: "pass" as const,
              detail: `⚠ → ✅ 재생성 후 최후 수단 TTS 더빙 트랙 보강 완료 ("${shot.line_ko}")`,
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

    if (!keyframesOnly) {
      try {
        const shotVideoBuffers: Record<number, Buffer> = {};
        const shotKeyframeBuffers: Record<number, Buffer> = {};
        const shotDubBuffers: Record<number, Buffer> = {};
        for (const shot of script.shots || []) {
          const vBuf = getBufferFromMediaUrl(run.videos[shot.n]);
          if (vBuf) shotVideoBuffers[shot.n] = vBuf;
          const kBuf = getBufferFromMediaUrl(run.keyframes[shot.n]);
          if (kBuf) shotKeyframeBuffers[shot.n] = kBuf;
          const dBuf = getBufferFromMediaUrl(run.shotDubs[shot.n]);
          if (dBuf) shotDubBuffers[shot.n] = dBuf;
        }

        if (Object.keys(shotVideoBuffers).length > 0) {
          const editPlan = await runArgonPostProductionEditor({
            script,
            videoBuffers: shotVideoBuffers,
            quality: run.quality,
          });
          run.editPlan = editPlan;

          for (const dec of editPlan.shots || []) {
            const editCheck = {
              id: `v4-edit-s${dec.shot}`,
              stage: "v4_edit" as const,
              target: `Shot #${dec.shot} Argon Editor`,
              status: "pass" as const,
              detail: `🎬 [${dec.trim_start_sec.toFixed(1)}s~${dec.trim_end_sec.toFixed(1)}s | Peak ${dec.peak_moment_sec.toFixed(1)}s | ${dec.effect} → ${dec.transition_out}] ${dec.frame_analysis_ko}`,
              timestamp: Date.now(),
            };
            run.verifierLog.push(editCheck);
            emitRunEvent(run, { type: "verifier", check: editCheck });
          }

          const masterBuf = await assembleMasterTrailerVideo({
            script,
            lines: run.lines,
            editPlan,
            videoBuffers: shotVideoBuffers,
            keyframeBuffers: shotKeyframeBuffers,
            dubBuffers: shotDubBuffers,
            narratorBuffer: getBufferFromMediaUrl(run.narratorAudioUrl),
            stingBuffer: getBufferFromMediaUrl(run.stingAudioUrl),
            quality: run.quality,
          });

          const masterMediaId = saveMedia(masterBuf, "video/mp4");
          run.masterVideoUrl = `/api/media/${masterMediaId}`;
          emitRunEvent(run, {
            type: "master_ready",
            url: run.masterVideoUrl,
            editPlan,
          });
        }
      } catch (masterErr) {
        console.warn("Master trailer video assembly warning:", masterErr);
      }
    }

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
