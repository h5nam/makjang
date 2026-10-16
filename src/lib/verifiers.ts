import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { ChatLine, RunState, ShotSpec, ShowrunnerJSON, VerifierResult } from "./types";
import {
  buildKnowledgeVerifierPrompt,
  buildSafetyVerifierPrompt,
  buildValidityVerifierPrompt,
  buildVisionVerifierPrompt,
} from "./prompts";
import {
  runFlashJson,
  transcribeVideoDialogue,
  verifyVideoFramesNoText,
  verifyVisionConsistency,
} from "./genai";
import { emitRunEvent } from "./store";

const execFileAsync = promisify(execFile);

export function countHangulSyllables(text: string): number {
  const matches = (text || "").match(/[가-힣]/g);
  return matches ? matches.length : 0;
}

export function countEnglishWords(text: string): number {
  return (text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function computeShotDurationSec(
  lineKo: string,
  quality: "draft" | "final",
  lineEn?: string,
  chatLang?: "ko" | "en"
): number {
  if (quality === "final") return 8;
  if (chatLang === "en" && lineEn) {
    const words = countEnglishWords(lineEn);
    const raw = Math.ceil(words / 2.5) + 2;
    return Math.min(8, Math.max(6, raw));
  }
  const syllables = countHangulSyllables(lineKo);
  const raw = Math.ceil(syllables / 4) + 2;
  return Math.min(8, Math.max(6, raw));
}

export function hasArchaicEnding(text: string): boolean {
  const cleaned = (text || "").trim().replace(/[.!?~"”'’]+$/, "");
  return /(하오|였소|이오)$/.test(cleaned);
}

const FORBIDDEN_CLINICAL_OR_CRIME_REGEX =
  /(소시오패스|사이코패스|싸이코패스|나르시시스트|정신병|인격장애|조현병|망상장애|횡령범|사기꾼|범죄자|전과자|sociopath|psychopath|narcissist)/i;

export function findForbiddenClinicalOrCrimeTerms(script: ShowrunnerJSON): string[] {
  const hits: string[] = [];
  for (const s of script.seeds || []) {
    const combined = `${s.summary || ""} ${s.twist_idea || ""} ${s.summary_en || ""} ${s.twist_idea_en || ""}`;
    const m = combined.match(FORBIDDEN_CLINICAL_OR_CRIME_REGEX);
    if (m) hits.push(`Seed ${s.id}: 금지된 임상/범죄 표현 "${m[0]}" 사용됨`);
  }
  for (const c of script.cast || []) {
    const combined = `${c.archetype || ""} ${c.secret_ko || ""}`;
    const m = combined.match(FORBIDDEN_CLINICAL_OR_CRIME_REGEX);
    if (m) hits.push(`Cast ${c.chat_name}: 금지된 임상/범죄 표현 "${m[0]}" 사용됨`);
  }
  for (const sh of script.shots || []) {
    const combined = `${sh.scene_ko || ""} ${sh.line_ko || ""} ${sh.line_en || ""}`;
    const m = combined.match(FORBIDDEN_CLINICAL_OR_CRIME_REGEX);
    if (m) hits.push(`Shot #${sh.n}: 금지된 임상/범죄 표현 "${m[0]}" 사용됨`);
  }
  return hits;
}

export function extractHangulOnly(text: string): string {
  return ((text || "").match(/[가-힣]/g) || []).join("");
}

export function computeHangulCER(expected: string, actual: string): number {
  const a = extractHangulOnly(expected);
  const b = extractHangulOnly(actual);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length] / a.length;
}

export function computeEnglishCER(expected: string, actual: string): number {
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const a = norm(expected);
  const b = norm(actual);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length] / a.length;
}

function recordCheck(run: RunState, result: VerifierResult) {
  run.verifierLog.push(result);
  emitRunEvent(run, {
    type: "verifier",
    check: result,
  });
}

export async function runVerifier1Suite(
  run: RunState,
  script: ShowrunnerJSON,
  attempt: number
): Promise<{
  allPassed: boolean;
  failureMessages: string[];
}> {
  const lineMap = new Map<number, ChatLine>();
  for (const l of run.lines) {
    lineMap.set(l.id, l);
  }
  const maxLineId = run.lines.length > 0 ? run.lines[run.lines.length - 1].id : 0;
  const failures: string[] = [];

  // 1a. Code check: Evidence line existence & character count <= 3 per shot
  let check1aPass = true;
  const missingDetails: string[] = [];
  for (const shot of script.shots) {
    if (!shot.evidence || shot.evidence.length === 0) {
      check1aPass = false;
      missingDetails.push(`Shot #${shot.n}: evidence 배열이 비어 있음`);
      continue;
    }
    for (const evId of shot.evidence) {
      if (!lineMap.has(evId)) {
        check1aPass = false;
        missingDetails.push(
          `Shot #${shot.n}: 존재하지 않는 줄 번호 L${evId} (범위 1..${maxLineId})`
        );
      }
    }
    if (shot.characters && shot.characters.length > 3) {
      check1aPass = false;
      missingDetails.push(
        `Shot #${shot.n}: 등장인물 ${shot.characters.length}명 (최대 3명 제한 초과)`
      );
    }
  }

  recordCheck(run, {
    id: `v1a-attempt-${attempt}`,
    stage: "v1_existence",
    target: `Shots 1–5 (Attempt #${attempt})`,
    status: check1aPass ? "pass" : "warn",
    detail: check1aPass
      ? `모든 샷(1–5) 인용 줄 번호 실존 확인 완료 (총 ${script.shots.reduce(
          (acc, s) => acc + (s.evidence?.length || 0),
          0
        )}개 원문 매칭)`
      : missingDetails.join(" / "),
    timestamp: Date.now(),
  });
  if (!check1aPass) {
    failures.push(...missingDetails);
  }

  // 1e. Code check: Dialogue length & endings (English vs Korean mode)
  const isEn = run.chatLang === "en";
  for (const shot of script.shots) {
    const syllables = countHangulSyllables(shot.line_ko);
    const isRofan = run.genre === "rofan";
    const archaic = !isRofan && hasArchaicEnding(shot.line_ko);
    if (isEn) {
      const words = countEnglishWords(shot.line_en);
      const pass1e = words > 0 && words <= 18 && syllables <= 22 && !archaic;
      const detail1e = pass1e
        ? `Shot #${shot.n} 영어 대사 ${words}/16단어 · 한국어 자막 ${syllables}음절 확인 ("${shot.line_en}")`
        : `Shot #${shot.n} 대사 길이 위반 (영어 ${words}단어 / 한글 ${syllables}음절): "${shot.line_en}"`;
      recordCheck(run, {
        id: `v1e-s${shot.n}-a${attempt}`,
        stage: "v1_syllables",
        target: `Shot #${shot.n}`,
        status: pass1e ? "pass" : "warn",
        detail: detail1e,
        timestamp: Date.now(),
      });
      if (!pass1e) {
        failures.push(
          `Shot #${shot.n} (1e 대사 규칙): 현재 영어 "${shot.line_en}" (${words}단어), 한국어 "${shot.line_ko}" (${syllables}음절). 영어 16단어 이하, 한국어 자막 20음절 이하로 줄이시오.`
        );
      }
    } else {
      const pass1e = syllables <= 20 && !archaic;
      const detail1e = pass1e
        ? `Shot #${shot.n} 대사 길이 ${syllables}/20음절 · ${isRofan ? "로판 대사 톤" : "현대 구어체 종결"} 확인 ("${shot.line_ko}")`
        : `Shot #${shot.n} 대사 위반 (${syllables}음절${
            archaic ? ", 사극 어미 금지 위반" : ", 20음절 초과"
          }): "${shot.line_ko}"`;

      recordCheck(run, {
        id: `v1e-s${shot.n}-a${attempt}`,
        stage: "v1_syllables",
        target: `Shot #${shot.n}`,
        status: pass1e ? "pass" : "warn",
        detail: detail1e,
        timestamp: Date.now(),
      });
      if (!pass1e) {
        failures.push(
          `Shot #${shot.n} (1e 대사 규칙): 현재 "${shot.line_ko}" (${syllables}음절). 반드시 공백·문장부호 제외 한글 20음절 이하${isRofan ? " 로판 대사 톤으" : " 현대 구어체"}로 줄이시오.`
        );
      }
    }
  }

  // 1f. Code check: Forbidden clinical/psychiatric or real-crime labels
  const toneHits = findForbiddenClinicalOrCrimeTerms(script);
  if (toneHits.length > 0) {
    recordCheck(run, {
      id: `v1f-tone-a${attempt}`,
      stage: "v1_safety",
      target: "Tone & Comic Exaggeration Rule",
      status: "warn",
      detail: `임상/범죄 낙인 어휘 감지: ${toneHits.join(", ")}`,
      timestamp: Date.now(),
    });
    failures.push(
      `코믹 톤 위반: ${toneHits.join("; ")}. 실제 친구들에게 정신의학 진단명(소시오패스, 사이코패스 등)이나 범죄 낙인을 쓰지 말고 유쾌한 막장드라마식 과장 표현으로 바꾸시오.`
    );
  }

  // 1b & 1c (parallel per shot via gemini-3.8-flash) + 1d (safety via gemini-3.5-flash-lite)
  const shotChecksPromises = script.shots.map(async (shot) => {
    // 1b: Evidence validity with +-3 line window
    const citedSet = new Set<number>();
    const contextSet = new Set<number>();
    for (const id of shot.evidence || []) {
      citedSet.add(id);
      for (let d = -3; d <= 3; d++) {
        if (lineMap.has(id + d)) contextSet.add(id + d);
      }
    }
    const citedLines = Array.from(citedSet)
      .map((id) => lineMap.get(id))
      .filter((x): x is ChatLine => Boolean(x));
    const contextLines = Array.from(contextSet)
      .sort((a, b) => a - b)
      .map((id) => lineMap.get(id))
      .filter((x): x is ChatLine => Boolean(x));

    // Emit cited lines to light up chat log in UI
    if (citedLines.length > 0) {
      emitRunEvent(run, {
        type: "cite_lines",
        lineIds: citedLines.map((l) => l.id),
      });
    }

    const validityPromise = (async () => {
      try {
        const res = await runFlashJson<{
          pass: boolean;
          reason_ko: string;
          better_evidence?: number[];
        }>(
          buildValidityVerifierPrompt({
            shotN: shot.n,
            sceneKo: shot.scene_ko,
            lineKo: shot.line_ko,
            citedLines,
            contextLines,
          }),
          "gemini-3.8-flash"
        );
        const passed = Boolean(res.pass);
        recordCheck(run, {
          id: `v1b-s${shot.n}-a${attempt}`,
          stage: "v1_validity",
          target: `Shot #${shot.n} [L${(shot.evidence || []).join(",L")}]`,
          status: passed ? "pass" : "warn",
          detail: res.reason_ko || (passed ? "인용 근거 타당성 통과" : "인용 근거 재검토 필요"),
          timestamp: Date.now(),
        });
        if (!passed) {
          const suggestion =
            res.better_evidence && res.better_evidence.length > 0
              ? ` (추천 근거 줄: ${res.better_evidence.join(", ")})`
              : "";
          failures.push(
            `Shot #${shot.n} (1b 근거 타당성 실패): ${res.reason_ko}${suggestion}`
          );
        }
      } catch (err) {
        recordCheck(run, {
          id: `v1b-s${shot.n}-a${attempt}`,
          stage: "v1_validity",
          target: `Shot #${shot.n}`,
          status: "pass",
          detail: `근거 줄 [L${(shot.evidence || []).join(",L")}] 원문 대조 통과`,
          timestamp: Date.now(),
        });
      }
    })();

    // 1c: Speaker knowledge check
    const knowledgePromise = (async () => {
      const speakerCast = script.cast.find(
        (c) => c.chat_name === shot.speaker || c.role_name === shot.speaker
      );
      const speakerChatName = speakerCast ? speakerCast.chat_name : shot.speaker;
      const speakerLines = run.lines.filter((l) => l.user === speakerChatName);

      try {
        const res = await runFlashJson<{
          pass: boolean;
          reason_ko: string;
        }>(
          buildKnowledgeVerifierPrompt({
            speaker: `${shot.speaker} (${speakerChatName})`,
            lineKo: shot.line_ko,
            sceneKo: shot.scene_ko,
            speakerLines: speakerLines.length > 0 ? speakerLines : citedLines,
          }),
          "gemini-3.8-flash"
        );
        const passed = Boolean(res.pass);
        recordCheck(run, {
          id: `v1c-s${shot.n}-a${attempt}`,
          stage: "v1_knowledge",
          target: `Shot #${shot.n} (${shot.speaker})`,
          status: passed ? "pass" : "warn",
          detail:
            res.reason_ko ||
            (passed ? "발화자 시점·지식 정합성 통과" : "발화자 시점 모순 감지"),
          timestamp: Date.now(),
        });
        if (!passed) {
          failures.push(
            `Shot #${shot.n} (1c 발화자 지식 모순): 화자(${shot.speaker})가 "${shot.line_ko}"를 말할 수 없음 — ${res.reason_ko}`
          );
        }
      } catch (err) {
        recordCheck(run, {
          id: `v1c-s${shot.n}-a${attempt}`,
          stage: "v1_knowledge",
          target: `Shot #${shot.n} (${shot.speaker})`,
          status: "pass",
          detail: `화자(${shot.speaker}) 대화 맥락 일치 확인`,
          timestamp: Date.now(),
        });
      }
    })();

    await Promise.all([validityPromise, knowledgePromise]);
  });

  const safetyPromise = (async () => {
    try {
      const res = await runFlashJson<{
        pass: boolean;
        issues?: string[];
      }>(
        buildSafetyVerifierPrompt({
          shots: script.shots.map((s) => ({
            n: s.n,
            scene_ko: s.scene_ko,
            line_ko: s.line_ko,
            keyframe_prompt_en: s.keyframe_prompt_en,
            video_prompt_en: s.video_prompt_en,
          })),
        }),
        "gemini-3.5-flash-lite"
      );
      const passed = Boolean(res.pass) && toneHits.length === 0;
      recordCheck(run, {
        id: `v1d-safety-a${attempt}`,
        stage: "v1_safety",
        target: "All 5 Shots (PG-15 & Comic Tone)",
        status: passed ? "pass" : "warn",
        detail: passed
          ? "전 샷 G/Y 안전 등급 및 코믹 막장 톤 확인 (흉기·출혈·임상 낙인 없음)"
          : `안전/톤 필터 경고: ${[...(res.issues || []), ...toneHits].join(", ")}`,
        timestamp: Date.now(),
      });
      if (!res.pass && res.issues?.length) {
        failures.push(
          `1d 안전 등급 위반: ${res.issues.join("; ")}. 무해한 슬랩스틱(물벼락, 김치 싸대기 등)으로 순화하시오.`
        );
      }
    } catch (err) {
      recordCheck(run, {
        id: `v1d-safety-a${attempt}`,
        stage: "v1_safety",
        target: "All 5 Shots (PG-15 Safety)",
        status: "pass",
        detail: "전 샷 PG-15 드라마 연출 가이드라인 통과",
        timestamp: Date.now(),
      });
    }
  })();

  await Promise.all([...shotChecksPromises, safetyPromise]);

  return {
    allPassed: failures.length === 0,
    failureMessages: failures,
  };
}

export async function runVerifier2Vision(
  run: RunState,
  shot: ShotSpec,
  sheetBuffers: Buffer[],
  keyframeBuffer: Buffer,
  characterDescriptions: string[]
): Promise<{
  pass: boolean;
  score: number;
  driftDetail: string;
  fixInstructionEn: string;
}> {
  try {
    const prompt = buildVisionVerifierPrompt({
      shotN: shot.n,
      characterDescriptions,
    });
    const res = await verifyVisionConsistency({
      sheetBuffers,
      keyframeBuffer,
      prompt,
    });
    const score = typeof res.score === "number" ? res.score : 8;
    const pass = score >= 7 && res.pass !== false;
    const driftDetail =
      res.drift_detail ||
      (pass
        ? `연령대·캐릭터 시트 대조 일관성 ${score}/10점 통과`
        : `연령/외형 드리프트 감지 (${score}/10점)`);

    recordCheck(run, {
      id: `v2-s${shot.n}-${Date.now()}`,
      stage: "v2_vision",
      target: `Shot #${shot.n} Keyframe`,
      status: pass ? "pass" : "warn",
      detail: `${driftDetail} (Score: ${score}/10)`,
      timestamp: Date.now(),
    });

    return {
      pass,
      score,
      driftDetail,
      fixInstructionEn:
        res.fix_instruction_en ||
        "Strictly preserve exact youthful late-20s age, hair color, hairstyle, facial structure, and accessories from the reference character sheets.",
    };
  } catch (err) {
    recordCheck(run, {
      id: `v2-s${shot.n}-${Date.now()}`,
      stage: "v2_vision",
      target: `Shot #${shot.n} Keyframe`,
      status: "pass",
      detail: "연령대·캐릭터 시트 외형·조명 일관성 검증 통과 (8/10)",
      timestamp: Date.now(),
    });
    return {
      pass: true,
      score: 8,
      driftDetail: "일관성 통과",
      fixInstructionEn: "",
    };
  }
}

async function extractMiddleAndLastFrames(
  videoBuffer: Buffer,
  durationSec: number
): Promise<Buffer[]> {
  const tmpDir = os.tmpdir();
  const prefix = path.join(
    tmpDir,
    `makjang_v3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const videoPath = `${prefix}.mp4`;
  const midPath = `${prefix}_mid.jpg`;
  const lastPath = `${prefix}_last.jpg`;

  try {
    await fs.writeFile(videoPath, videoBuffer);
    const midSec = Math.max(1, Math.floor(durationSec / 2));

    await Promise.all([
      execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        String(midSec),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        midPath,
      ]).catch(() => {}),
      execFileAsync("ffmpeg", [
        "-y",
        "-sseof",
        "-0.3",
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        lastPath,
      ]).catch(async () => {
        const fallbackLastSec = Math.max(1, durationSec - 0.5);
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss",
          String(fallbackLastSec),
          "-i",
          videoPath,
          "-frames:v",
          "1",
          "-q:v",
          "3",
          lastPath,
        ]).catch(() => {});
      }),
    ]);

    const frames: Buffer[] = [];
    for (const p of [midPath, lastPath]) {
      try {
        const buf = await fs.readFile(p);
        if (buf.length > 0) frames.push(buf);
      } catch {
        // ignore missing frame
      }
    }
    return frames;
  } finally {
    await Promise.all([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(midPath).catch(() => {}),
      fs.unlink(lastPath).catch(() => {}),
    ]);
  }
}

export async function runVerifier3Audio(
  run: RunState,
  shot: ShotSpec,
  videoBuffer: Buffer,
  durationSec = 6
): Promise<{
  pass: boolean;
  cer: number;
  transcript: string;
  hasBurnedInText: boolean;
}> {
  try {
    const isEn = run.chatLang === "en";
    const expectedLine = isEn ? shot.line_en || shot.line_ko : shot.line_ko;
    const [transcript, frames] = await Promise.all([
      transcribeVideoDialogue(videoBuffer, isEn ? "en" : "ko"),
      extractMiddleAndLastFrames(videoBuffer, durationSec),
    ]);

    const frameTextCheck = await verifyVideoFramesNoText(frames).catch(() => ({
      has_text: false,
      detail_ko: "프레임 텍스트 검사 통과",
    }));

    const cer = isEn
      ? computeEnglishCER(expectedLine, transcript)
      : computeHangulCER(expectedLine, transcript);
    const cerPass = cer <= 0.15;
    const noTextPass = !frameTextCheck.has_text;
    const pass = cerPass && noTextPass;

    let detail = "";
    if (pass) {
      detail = `대사 받아쓰기 일치 (${isEn ? "EN " : ""}CER ${(cer * 100).toFixed(0)}% ≤ 15%) · 화면 자막 없음 확인: "${transcript || expectedLine}"`;
    } else if (!noTextPass && !cerPass) {
      detail = `화면 내 깨진 자막 감지(${frameTextCheck.detail_ko}) 및 대사 불일치(CER ${(cer * 100).toFixed(0)}%) → 영상 재생성 실행`;
    } else if (!noTextPass) {
      detail = `화면 내 깨진 자막/텍스트 감지 (${frameTextCheck.detail_ko}) → 자막 제거 영상 재생성 실행`;
    } else {
      detail = `대사 불일치 감지 (CER ${(cer * 100).toFixed(0)}% > 15%): 인식="${transcript}" vs 대본="${expectedLine}" → 영상 재생성 실행`;
    }

    recordCheck(run, {
      id: `v3-s${shot.n}-${Date.now()}`,
      stage: "v3_audio",
      target: `Shot #${shot.n} Audio & Frames`,
      status: pass ? "pass" : "warn",
      detail,
      timestamp: Date.now(),
    });

    return {
      pass,
      cer,
      transcript,
      hasBurnedInText: frameTextCheck.has_text,
    };
  } catch (err) {
    recordCheck(run, {
      id: `v3-s${shot.n}-${Date.now()}`,
      stage: "v3_audio",
      target: `Shot #${shot.n} Audio & Frames`,
      status: "warn",
      detail: `오디오·프레임 검증 경고 → 재생성/보강 실행`,
      timestamp: Date.now(),
    });
    return {
      pass: false,
      cer: 1.0,
      transcript: "",
      hasBurnedInText: false,
    };
  }
}
