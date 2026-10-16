import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import { cleanJsonText, getAI } from "./genai";
import {
  ArgonEditPlan,
  ChatLine,
  GenreMode,
  ShotEditDecision,
  ShotSpec,
  ShowrunnerJSON,
} from "./types";

const execFileAsync = promisify(execFile);

function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = String(text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if ((current + " " + w).length <= maxCharsPerLine) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function probeMediaDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const val = parseFloat(stdout.trim());
    return Number.isFinite(val) && val > 0 ? val : 4.0;
  } catch {
    return 4.0;
  }
}

export async function runArgonPostProductionEditor(options: {
  script: ShowrunnerJSON;
  videoBuffers: Record<number, Buffer>;
  quality: "draft" | "final";
}): Promise<ArgonEditPlan> {
  const ai = getAI();
  const clipDuration = options.quality === "final" ? 8.0 : 6.0;
  const inputParts: any[] = [];

  const shotMetaLines: string[] = [];
  for (const shot of options.script.shots) {
    const buf = options.videoBuffers[shot.n];
    if (buf) {
      inputParts.push({
        type: "video",
        mime_type: "video/mp4",
        data: buf.toString("base64"),
      });
      shotMetaLines.push(
        `- Shot #${shot.n} (첨부 영상 순서대로 매칭, 원본 길이 약 ${clipDuration}s): 화자=${shot.speaker}, 클리셰=${shot.trope_id}, 대사="${shot.line_ko}", 장면=${shot.scene_ko}`
      );
    }
  }

  const prompt = `당신은 한국 최고 시청률 주말 막장드라마의 총괄 편집 감독(Chief Post-Production Film Editor)입니다.
첨부된 ${inputParts.length}개의 생성 영상 클립(Shot 1 ~ Shot ${options.script.shots.length})을 프레임 단위(0.1초 정밀도)로 시청·청취하고, 단순 이어붙이기가 아닌 **극적인 막장드라마 예고편 완성본(Master Cut)**을 만들기 위한 정밀 편집 지시서(EDL JSON)를 작성하십시오.

## 샷별 메타데이터
${shotMetaLines.join("\n")}

## 프레임 단위 분석 및 편집 지시 규칙
1. **인/아웃 포인트 트리밍 (\`trim_start_sec\`, \`trim_end_sec\`)**:
   - 각 영상 클립의 초반 정지 프레임이나 후반부 대사가 끝난 뒤 어색하게 남는 공백/표정 풀림/불필요한 컷 전환 프레임을 정확히 찾아 잘라내십시오.
   - 단, 대사가 절대 잘리지 않도록 보장하고, 각 샷의 편집 후 길이(\`trim_end_sec - trim_start_sec\`)는 최소 **2.6초 이상**이어야 합니다 (원본 길이: 0.0s ~ ${clipDuration.toFixed(1)}s).
2. **감정·액션 정점 프레임 포착 (\`peak_moment_sec\`)**:
   - 대사의 핵심 음절이 터지거나 물벼락·영수증 투척·충격 리액션이 폭발하는 정확한 시각(초)을 \`peak_moment_sec\`에 지정하십시오.
3. **후반 연출 효과 (\`effect\`, \`zoom_factor\`)**:
   - \`"crash_zoom_end"\`: \`peak_moment_sec\`부터 인물의 눈빛/표정으로 급격히 파고드는 크래시 줌인
   - \`"triple_shock_zoom"\`: 막장드라마 특유의 3단 연속 충격 줌인 (클라이맥스 샷이나 엔딩 샷에 적극 활용)
   - \`"flash_impact"\`: 충격 순간 화면 콘트라스트·밝기 임팩트 강조
   - \`"none"\`: 원본 카메라 무빙 유지
   - \`zoom_factor\`: 1.15 ~ 1.35 사이 실수
4. **장면 전환 (\`transition_out\`)**:
   - 다음 샷으로 넘어갈 때 연출 의도에 맞게 \`"hard_cut"\`(긴박한 직컷), \`"flash_white"\`(충격 폭로 화이트 플래시), \`"crimson_flash"\`(막장 핏빛 플래시), \`"fade_black"\`(암전 여운) 중 하나를 선택하십시오.
5. **오디오 더킹 (\`bgm_duck_volume\`)**:
   - 대사 명료도를 위해 해당 샷 구간에서 배경 스팅 음악(Lyria 3)을 줄일 볼륨 비율(0.12 ~ 0.28)을 지정하십시오.
6. **프레임 단위 편집 코멘터리 (\`frame_analysis_ko\`)**:
   - 실제 영상에서 몇 초에 어떤 동작/표정/입모양이 나오고 왜 해당 인·아웃 포인트와 줌 효과를 걸었는지 한국어로 구체적인 타임코드(예: \`0.2s\`, \`2.4s\`, \`3.6s\`)를 들어 설명하십시오.

순수 JSON만 출력하십시오:
{
  "opening_title_sec": 2.4,
  "ending_freeze_sec": 3.8,
  "overall_edit_summary_ko": "전체 5샷 리듬·호흡·클라이맥스 편집 총평 (1~2문장)",
  "shots": [
    {
      "shot": 1,
      "trim_start_sec": 0.0,
      "trim_end_sec": 3.6,
      "peak_moment_sec": 2.3,
      "effect": "crash_zoom_end",
      "zoom_factor": 1.24,
      "transition_out": "flash_white",
      "bgm_duck_volume": 0.16,
      "frame_analysis_ko": "0.0s 투샷 대치 시작 → 1.6s 카메라 푸시인 → 2.3s 핵심 대사 끝음절 직후 1.24x 크래시 줌인 적용 → 3.6s 이후 정적 프레임 컷아웃"
    }
  ]
}`;

  inputParts.push({ type: "text", text: prompt });

  try {
    // NEVER pass temperature or top_p to gemini-4-argon
    const interaction = await (ai.interactions as any).create({
      model: "gemini-4-argon",
      input: inputParts,
      generation_config: { thinking_level: "low" },
      response_format: { type: "text", mime_type: "application/json" },
    });

    const parsed = JSON.parse(cleanJsonText(interaction.output_text || "{}")) as ArgonEditPlan;
    return sanitizeEditPlan(parsed, options.script.shots, clipDuration);
  } catch (err) {
    console.warn("Argon post-production editor fallback:", err);
    return sanitizeEditPlan(null, options.script.shots, clipDuration);
  }
}

function sanitizeEditPlan(
  raw: ArgonEditPlan | null,
  shots: ShotSpec[],
  clipDuration: number
): ArgonEditPlan {
  const sanitizedShots: ShotEditDecision[] = shots.map((sh, idx) => {
    const found = raw?.shots?.find((s) => s.shot === sh.n) || raw?.shots?.[idx];
    let trimStart =
      found && typeof found.trim_start_sec === "number"
        ? Math.max(0, Math.min(0.6, found.trim_start_sec))
        : 0.0;
    let trimEnd =
      found && typeof found.trim_end_sec === "number"
        ? Math.max(trimStart + 2.6, Math.min(clipDuration, found.trim_end_sec))
        : clipDuration - 0.2;
    if (trimEnd > clipDuration) trimEnd = clipDuration;
    if (trimEnd - trimStart < 2.6) {
      trimStart = 0.0;
      trimEnd = clipDuration;
    }

    const defaultPeak = Number((trimStart + (trimEnd - trimStart) * 0.62).toFixed(2));
    const peak =
      found &&
      typeof found.peak_moment_sec === "number" &&
      found.peak_moment_sec >= trimStart + 0.4 &&
      found.peak_moment_sec <= trimEnd - 0.2
        ? Number(found.peak_moment_sec.toFixed(2))
        : defaultPeak;

    const validEffects = ["none", "crash_zoom_end", "triple_shock_zoom", "flash_impact"] as const;
    const effect =
      found && validEffects.includes(found.effect as any)
        ? found.effect
        : sh.n === 5 || sh.camera_type === "shock_zoom"
        ? "triple_shock_zoom"
        : "crash_zoom_end";

    const validTransitions = ["hard_cut", "flash_white", "crimson_flash", "fade_black"] as const;
    const transitionOut =
      found && validTransitions.includes(found.transition_out as any)
        ? found.transition_out
        : sh.n === 4
        ? "crimson_flash"
        : sh.n === 5
        ? "fade_black"
        : "flash_white";

    const zoomFactor =
      found && typeof found.zoom_factor === "number"
        ? Math.max(1.12, Math.min(1.36, found.zoom_factor))
        : sh.n >= 4
        ? 1.32
        : 1.22;

    const bgmDuck =
      found && typeof found.bgm_duck_volume === "number"
        ? Math.max(0.1, Math.min(0.32, found.bgm_duck_volume))
        : 0.18;

    return {
      shot: sh.n,
      trim_start_sec: Number(trimStart.toFixed(2)),
      trim_end_sec: Number(trimEnd.toFixed(2)),
      peak_moment_sec: peak,
      effect,
      zoom_factor: Number(zoomFactor.toFixed(2)),
      transition_out: transitionOut,
      bgm_duck_volume: Number(bgmDuck.toFixed(2)),
      frame_analysis_ko:
        found?.frame_analysis_ko ||
        `${trimStart.toFixed(1)}s~${trimEnd.toFixed(1)}s 채택: ${peak.toFixed(1)}s 대사 클라이맥스 지점에서 ${zoomFactor.toFixed(2)}x ${effect} 및 ${transitionOut} 전환 적용`,
    };
  });

  return {
    opening_title_sec: 2.4,
    ending_freeze_sec: 3.8,
    overall_edit_summary_ko:
      raw?.overall_edit_summary_ko ||
      "5개 샷의 대사 호흡과 표정 정점 프레임을 기준으로 불필요한 여백 프레임을 제거하고, 클라이맥스 크래시 줌 및 플래시 전환으로 막장드라마 긴장감을 극대화했습니다.",
    shots: sanitizedShots,
  };
}

async function renderTitleCardPng(
  width: number,
  height: number,
  script: ShowrunnerJSON,
  outPath: string,
  genre: GenreMode = "modern"
): Promise<void> {
  const isRofan = genre === "rofan";
  const titleKo = escapeXml(`《${script.title_ko}》`);
  const titleEn = escapeXml(script.title_en || "MAKJANG ORIGINAL TRAILER");
  const logLines = wrapText(script.logline_ko || "", 34).map(escapeXml);
  const badgeText = isRofan
    ? "칼레도르 제국 황실 기록보관소 · 단톡방 영수증 기반 로판 막장"
    : "실제 단톡방 영수증 기반 막장 드라마";

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${isRofan ? "#580C1F" : "#3A0812"}"/>
        <stop offset="55%" stop-color="${isRofan ? "#2E0611" : "#12090D"}"/>
        <stop offset="100%" stop-color="${isRofan ? "#180309" : "#070709"}"/>
      </radialGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#A88438"/>
        <stop offset="50%" stop-color="#F3D999"/>
        <stop offset="100%" stop-color="#B58E3E"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect x="48" y="42" width="1184" height="636" fill="none" stroke="#D4B26A" stroke-opacity="${isRofan ? "0.7" : "0.35"}" stroke-width="${isRofan ? "3" : "2"}"/>
    <circle cx="96" cy="88" r="22" fill="${isRofan ? "#8A1022" : "#C8102E"}" stroke="#D4B26A" stroke-width="2"/>
    <text x="96" y="96" fill="#FFFFFF" font-size="22" font-weight="900" font-family="sans-serif" text-anchor="middle">19</text>
    <text x="132" y="95" fill="#D4B26A" font-size="18" font-weight="700" font-family="monospace" letter-spacing="3">${
      isRofan
        ? "MAKJANG ROFAN SERIES · IMPERIAL COURT TRAILER"
        : "MAKJANG ORIGINAL SERIES · EPISODE 1 TRAILER"
    }</text>

    <rect x="390" y="190" width="500" height="36" rx="4" fill="${isRofan ? "#2A0610" : "#181216"}" stroke="#D4B26A" stroke-opacity="0.75" stroke-width="1.5"/>
    <text x="640" y="214" fill="#D4B26A" font-size="17" font-weight="700" font-family="sans-serif" text-anchor="middle">${badgeText}</text>

    <text x="640" y="330" fill="${isRofan ? "#F5E6C8" : "#F5F2EB"}" font-size="64" font-weight="900" font-family="serif, sans-serif" text-anchor="middle">${titleKo}</text>
    <text x="640" y="388" fill="url(#gold)" font-size="26" font-weight="700" font-family="monospace, sans-serif" text-anchor="middle" letter-spacing="2">${titleEn}</text>
    <line x1="420" y1="422" x2="860" y2="422" stroke="${isRofan ? "#D4B26A" : "#C8102E"}" stroke-width="3"/>
    ${logLines
      .map(
        (line, idx) =>
          `<text x="640" y="${472 + idx * 38}" fill="#E0DDD5" font-size="24" font-weight="500" font-family="sans-serif" text-anchor="middle">${line}</text>`
      )
      .join("\n")}
  </svg>`;

  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(outPath);
}

async function renderShotHudOverlayPng(
  width: number,
  height: number,
  shot: ShotSpec,
  decision: ShotEditDecision,
  linesMap: Map<number, ChatLine>,
  outPath: string,
  chatLang: "ko" | "en" = "ko"
): Promise<void> {
  const evId = shot.evidence?.[0];
  const chatLine = evId ? linesMap.get(evId) : undefined;
  const receiptEn =
    shot.receipts?.find((r) => r.line_id === evId)?.text_en || "";

  const receiptHeader = evId
    ? `CHAT RECEIPT #L${String(evId).padStart(3, "0")} · ${escapeXml(
        chatLine?.date || ""
      )}`
    : "CHAT RECEIPT VERIFIED";
  const receiptKo = chatLine
    ? `${chatLine.user}: "${chatLine.text}"`
    : `근거 줄 #L${evId || 1}`;
  const receiptKoLines = wrapText(receiptKo, 26).map(escapeXml);
  const receiptEnLines = wrapText(receiptEn ? `"${receiptEn}"` : "", 34).map(
    escapeXml
  );

  const isEn = chatLang === "en";
  const primaryLine = escapeXml(
    isEn ? `“${shot.line_en || shot.line_ko}”` : `“${shot.line_ko}”`
  );
  const secondaryLine = escapeXml(
    isEn
      ? shot.line_ko
        ? `“${shot.line_ko}”`
        : ""
      : shot.line_en
      ? `“${shot.line_en}”`
      : ""
  );
  const speakerBadge = escapeXml(`${shot.speaker} · ${shot.trope_id}`);
  const editBadge = escapeXml(
    `ARGON EDIT [${decision.trim_start_sec.toFixed(1)}s-${decision.trim_end_sec.toFixed(1)}s · ${decision.effect.toUpperCase()}]`
  );

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.0"/>
      </linearGradient>
      <linearGradient id="botGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.0"/>
        <stop offset="45%" stop-color="#000000" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.94"/>
      </linearGradient>
    </defs>

    <!-- Top letterbox bar -->
    <rect x="0" y="0" width="1280" height="76" fill="url(#topGrad)"/>
    <circle cx="46" cy="36" r="16" fill="#C8102E" stroke="#FFFFFF" stroke-width="1.5"/>
    <text x="46" y="42" fill="#FFFFFF" font-size="16" font-weight="900" font-family="sans-serif" text-anchor="middle">19</text>
    <text x="74" y="42" fill="#D4B26A" font-size="15" font-weight="700" font-family="monospace">SHOT ${shot.n}/5 · ${editBadge}</text>

    <!-- Top-Right Torn Chat Receipt Card -->
    <g transform="translate(810, 22)">
      <rect x="0" y="0" width="442" height="${
        76 + receiptKoLines.length * 22 + receiptEnLines.length * 18
      }" rx="4" fill="#F6F1E3" fill-opacity="0.94" stroke="#8A1022" stroke-width="2"/>
      <rect x="0" y="0" width="442" height="26" rx="3" fill="#8A1022"/>
      <text x="12" y="18" fill="#FEE500" font-size="13" font-weight="800" font-family="monospace">${receiptHeader}</text>
      ${receiptKoLines
        .map(
          (l, i) =>
            `<text x="14" y="${50 + i * 22}" fill="#141417" font-size="16" font-weight="800" font-family="sans-serif">${l}</text>`
        )
        .join("\n")}
      ${receiptEnLines
        .map(
          (l, i) =>
            `<text x="14" y="${
              52 + receiptKoLines.length * 22 + i * 18
            }" fill="#4A463E" font-size="13" font-style="italic" font-family="sans-serif">${l}</text>`
        )
        .join("\n")}
    </g>

    <!-- Bottom Cinema Subtitle Bar -->
    <rect x="0" y="510" width="1280" height="210" fill="url(#botGrad)"/>
    <rect x="510" y="554" width="260" height="28" rx="4" fill="#C8102E"/>
    <text x="640" y="574" fill="#FFFFFF" font-size="15" font-weight="800" font-family="monospace, sans-serif" text-anchor="middle">${speakerBadge}</text>
    <text x="640" y="630" fill="#F5F2EB" font-size="42" font-weight="900" font-family="serif, sans-serif" stroke="#000000" stroke-width="1.2" text-anchor="middle">${primaryLine}</text>
    <text x="640" y="672" fill="#D4B26A" font-size="22" font-weight="700" font-family="sans-serif" text-anchor="middle">${secondaryLine}</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(outPath);
}

async function renderEndingOverlayPng(
  width: number,
  height: number,
  script: ShowrunnerJSON,
  outPath: string,
  genre: GenreMode = "modern"
): Promise<void> {
  const isRofan = genre === "rofan";
  const narrKoLines = wrapText(
    `“${script.narrator_ko || "다음 이 시간, 단톡방의 진실이 밝혀집니다."}”`,
    26
  ).map(escapeXml);
  const narrEnLines = wrapText(
    script.narrator_en ? `“${script.narrator_en}”` : "",
    42
  ).map(escapeXml);
  const nextTime = escapeXml(`다음 이 시간… NEXT TIME ON 《${script.title_ko}》`);

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="720" fill="${isRofan ? "#26050C" : "#090608"}" fill-opacity="${isRofan ? "0.76" : "0.68"}"/>
    <rect x="54" y="46" width="1172" height="628" fill="none" stroke="#D4B26A" stroke-opacity="${isRofan ? "0.75" : "0.45"}" stroke-width="${isRofan ? "3" : "2"}"/>
    <rect x="450" y="160" width="380" height="34" rx="4" fill="${isRofan ? "#7A1022" : "#C8102E"}" stroke="${isRofan ? "#D4B26A" : "none"}"/>
    <text x="640" y="183" fill="#FFFFFF" font-size="16" font-weight="800" font-family="monospace" text-anchor="middle" letter-spacing="2">CLIFFHANGER · NEXT EPISODE PREVIEW</text>
    ${narrKoLines
      .map(
        (l, i) =>
          `<text x="640" y="${285 + i * 58}" fill="${isRofan ? "#F5E6C8" : "#F5F2EB"}" font-size="46" font-weight="900" font-family="serif, sans-serif" text-anchor="middle">${l}</text>`
      )
      .join("\n")}
    ${narrEnLines
      .map(
        (l, i) =>
          `<text x="640" y="${
            305 + narrKoLines.length * 58 + i * 32
          }" fill="#D4B26A" font-size="23" font-style="italic" font-family="sans-serif" text-anchor="middle">${l}</text>`
      )
      .join("\n")}
    <line x1="340" y1="535" x2="940" y2="535" stroke="#D4B26A" stroke-opacity="0.6" stroke-width="2"/>
    <text x="640" y="582" fill="#FEE500" font-size="32" font-weight="900" font-family="serif, sans-serif" text-anchor="middle" letter-spacing="2">${nextTime}</text>
    <line x1="340" y1="605" x2="940" y2="605" stroke="#D4B26A" stroke-opacity="0.6" stroke-width="2"/>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(outPath);
}

export async function assembleMasterTrailerVideo(options: {
  script: ShowrunnerJSON;
  lines: ChatLine[];
  editPlan: ArgonEditPlan;
  videoBuffers: Record<number, Buffer>;
  keyframeBuffers: Record<number, Buffer>;
  dubBuffers: Record<number, Buffer>;
  narratorBuffer?: Buffer | null;
  stingBuffer?: Buffer | null;
  quality: "draft" | "final";
  genre?: GenreMode;
  chatLang?: "ko" | "en";
}): Promise<Buffer> {
  const width = options.quality === "final" ? 1280 : 640;
  const height = options.quality === "final" ? 720 : 360;
  const fps = 24;
  const genre: GenreMode = options.genre === "rofan" ? "rofan" : "modern";
  const chatLang: "ko" | "en" = options.chatLang === "en" ? "en" : "ko";

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "makjang-edit-"));
  const linesMap = new Map<number, ChatLine>();
  for (const l of options.lines) linesMap.set(l.id, l);

  try {
    const segmentPaths: string[] = [];

    // 1. Opening Title Segment (2.4s)
    const titleDur = options.editPlan.opening_title_sec || 2.4;
    const titlePngPath = path.join(tmpDir, "title.png");
    const titleSegPath = path.join(tmpDir, "seg_00_title.mp4");
    await renderTitleCardPng(width, height, options.script, titlePngPath, genre);

    await execFileAsync("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-t",
      String(titleDur),
      "-i",
      titlePngPath,
      "-f",
      "lavfi",
      "-t",
      String(titleDur),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-vf",
      `scale=w='${width}*(1+0.06*(t/${titleDur}))':h='${height}*(1+0.06*(t/${titleDur}))':eval=frame,crop=${width}:${height},fade=t=in:st=0:d=0.35,fade=t=out:st=${(
        titleDur - 0.25
      ).toFixed(2)}:d=0.25:color=white,format=yuv420p`,
      "-r",
      String(fps),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-shortest",
      titleSegPath,
    ]);
    segmentPaths.push(titleSegPath);

    // 2. Render each of the 5 shots according to Argon's frame-level Edit Decision List
    let lastValidVideoPath: string | null = null;

    for (const shot of options.script.shots) {
      const decision =
        options.editPlan.shots.find((s) => s.shot === shot.n) ||
        options.editPlan.shots[0];

      const rawVidBuf = options.videoBuffers[shot.n];
      const kfBuf = options.keyframeBuffers[shot.n];
      if (!rawVidBuf && !kfBuf) continue;

      const rawShotPath = path.join(tmpDir, `raw_shot_${shot.n}.mp4`);
      if (rawVidBuf) {
        fs.writeFileSync(rawShotPath, rawVidBuf);
        lastValidVideoPath = rawShotPath;
      } else if (kfBuf) {
        // Fallback: synthesize 3.5s video from keyframe if video buffer missing
        const kfPath = path.join(tmpDir, `kf_${shot.n}.jpg`);
        fs.writeFileSync(kfPath, kfBuf);
        await execFileAsync("ffmpeg", [
          "-y",
          "-loop",
          "1",
          "-t",
          "3.5",
          "-i",
          kfPath,
          "-f",
          "lavfi",
          "-t",
          "3.5",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-vf",
          `scale=${width}:${height},format=yuv420p`,
          "-r",
          String(fps),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-c:a",
          "aac",
          "-shortest",
          rawShotPath,
        ]);
        lastValidVideoPath = rawShotPath;
      }

      const actualDur = await probeMediaDuration(rawShotPath);
      const tStart = Math.max(0, Math.min(actualDur - 2.2, decision.trim_start_sec));
      const tEnd = Math.max(tStart + 2.2, Math.min(actualDur, decision.trim_end_sec));
      const segDur = Number((tEnd - tStart).toFixed(2));
      const relPeak = Math.max(
        0.3,
        Math.min(segDur - 0.35, Number((decision.peak_moment_sec - tStart).toFixed(2)))
      );
      const zExtra = Number(Math.max(0.12, (decision.zoom_factor || 1.24) - 1).toFixed(2));

      const hudPngPath = path.join(tmpDir, `hud_${shot.n}.png`);
      await renderShotHudOverlayPng(
        width,
        height,
        shot,
        decision,
        linesMap,
        hudPngPath,
        chatLang
      );

      // Build Argon's dynamic camera/zoom expression
      let motionFilter = `scale=${width}:${height}`;
      if (decision.effect === "triple_shock_zoom") {
        const s1 = (zExtra * 0.38).toFixed(3);
        const s2 = (zExtra * 0.72).toFixed(3);
        const s3 = zExtra.toFixed(3);
        motionFilter = `scale=w='${width}*(1+if(gt(t,${(relPeak + 0.32).toFixed(
          2
        )}),${s3},if(gt(t,${(relPeak + 0.16).toFixed(
          2
        )}),${s2},if(gt(t,${relPeak.toFixed(2)}),${s1},0))))':h='${height}*(1+if(gt(t,${(
          relPeak + 0.32
        ).toFixed(2)}),${s3},if(gt(t,${(relPeak + 0.16).toFixed(
          2
        )}),${s2},if(gt(t,${relPeak.toFixed(2)}),${s1},0))))':eval=frame,crop=${width}:${height}`;
      } else if (decision.effect === "crash_zoom_end" || decision.effect === "flash_impact") {
        const rampDur = Math.max(0.35, segDur - relPeak).toFixed(2);
        motionFilter = `scale=w='${width}*(1+${zExtra}*if(gt(t,${relPeak.toFixed(
          2
        )}),min(1,(t-${relPeak.toFixed(2)})/${rampDur}),0))':h='${height}*(1+${zExtra}*if(gt(t,${relPeak.toFixed(
          2
        )}),min(1,(t-${relPeak.toFixed(2)})/${rampDur}),0))':eval=frame,crop=${width}:${height}`;
      }

      // Build Argon's transition_out fade filter
      const fadeDur = 0.22;
      const fadeStart = Math.max(0.5, segDur - fadeDur).toFixed(2);
      let transFilter = `fade=t=in:st=0:d=0.15`;
      if (decision.transition_out === "flash_white") {
        transFilter += `,fade=t=out:st=${fadeStart}:d=${fadeDur}:color=white`;
      } else if (decision.transition_out === "crimson_flash") {
        transFilter += `,fade=t=out:st=${fadeStart}:d=${fadeDur}:color=#C8102E`;
      } else if (decision.transition_out === "fade_black") {
        transFilter += `,fade=t=out:st=${fadeStart}:d=0.28:color=black`;
      }

      const outSegPath = path.join(tmpDir, `seg_0${shot.n}_shot.mp4`);
      const dubBuf = options.dubBuffers[shot.n];

      if (dubBuf) {
        const dubPath = path.join(tmpDir, `dub_${shot.n}.wav`);
        fs.writeFileSync(dubPath, dubBuf);
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss",
          String(tStart),
          "-to",
          String(tEnd),
          "-i",
          rawShotPath,
          "-i",
          hudPngPath,
          "-i",
          dubPath,
          "-filter_complex",
          `[0:v]${motionFilter},${transFilter}[v0];[v0][1:v]overlay=0:0:format=auto,format=yuv420p[vout];[2:a]aresample=44100,apad,atrim=0:${segDur}[aout]`,
          "-map",
          "[vout]",
          "-map",
          "[aout]",
          "-r",
          String(fps),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-c:a",
          "aac",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-shortest",
          outSegPath,
        ]);
      } else {
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss",
          String(tStart),
          "-to",
          String(tEnd),
          "-i",
          rawShotPath,
          "-i",
          hudPngPath,
          "-filter_complex",
          `[0:v]${motionFilter},${transFilter}[v0];[v0][1:v]overlay=0:0:format=auto,format=yuv420p[vout];[0:a]aresample=44100,volume=1.35,apad,atrim=0:${segDur}[aout]`,
          "-map",
          "[vout]",
          "-map",
          "[aout]",
          "-r",
          String(fps),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-c:a",
          "aac",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-shortest",
          outSegPath,
        ]);
      }

      segmentPaths.push(outSegPath);
    }

    // 3. Ending Cliffhanger Freeze-Frame Segment (with Narrator TTS)
    const endFreezePng = path.join(tmpDir, "ending_bg.jpg");
    const lastShotSpec = options.script.shots[options.script.shots.length - 1];
    const lastKfBuf = lastShotSpec ? options.keyframeBuffers[lastShotSpec.n] : undefined;

    if (lastKfBuf) {
      await sharp(lastKfBuf).resize(width, height).jpeg().toFile(endFreezePng);
    } else if (lastValidVideoPath) {
      await execFileAsync("ffmpeg", [
        "-y",
        "-sseof",
        "-0.5",
        "-i",
        lastValidVideoPath,
        "-frames:v",
        "1",
        "-vf",
        `scale=${width}:${height}`,
        endFreezePng,
      ]);
    } else {
      await renderTitleCardPng(width, height, options.script, endFreezePng, genre);
    }

    const endOverlayPng = path.join(tmpDir, "ending_overlay.png");
    await renderEndingOverlayPng(width, height, options.script, endOverlayPng, genre);

    let endDur = options.editPlan.ending_freeze_sec || 4.0;
    const endSegPath = path.join(tmpDir, "seg_99_ending.mp4");

    if (options.narratorBuffer) {
      const narrPath = path.join(tmpDir, "narrator.wav");
      fs.writeFileSync(narrPath, options.narratorBuffer);
      const narrDur = await probeMediaDuration(narrPath);
      endDur = Math.max(3.6, Math.min(7.5, Number((narrDur + 0.8).toFixed(2))));

      await execFileAsync("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-t",
        String(endDur),
        "-i",
        endFreezePng,
        "-loop",
        "1",
        "-t",
        String(endDur),
        "-i",
        endOverlayPng,
        "-i",
        narrPath,
        "-filter_complex",
        `[0:v]scale=w='${width}*(1+0.10*(t/${endDur}))':h='${height}*(1+0.10*(t/${endDur}))':eval=frame,crop=${width}:${height},eq=contrast=1.25:saturation=0.65[bg];[bg][1:v]overlay=0:0:format=auto,fade=t=in:st=0:d=0.25,fade=t=out:st=${(
          endDur - 0.45
        ).toFixed(2)}:d=0.45:color=black,format=yuv420p[vout];[2:a]aresample=44100,volume=1.45,apad,atrim=0:${endDur}[aout]`,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-r",
        String(fps),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-shortest",
        endSegPath,
      ]);
    } else {
      await execFileAsync("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-t",
        String(endDur),
        "-i",
        endFreezePng,
        "-loop",
        "1",
        "-t",
        String(endDur),
        "-i",
        endOverlayPng,
        "-f",
        "lavfi",
        "-t",
        String(endDur),
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-filter_complex",
        `[0:v]scale=w='${width}*(1+0.10*(t/${endDur}))':h='${height}*(1+0.10*(t/${endDur}))':eval=frame,crop=${width}:${height},eq=contrast=1.25:saturation=0.65[bg];[bg][1:v]overlay=0:0:format=auto,fade=t=in:st=0:d=0.25,fade=t=out:st=${(
          endDur - 0.45
        ).toFixed(2)}:d=0.45:color=black,format=yuv420p[vout]`,
        "-map",
        "[vout]",
        "-map",
        "2:a",
        "-r",
        String(fps),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-shortest",
        endSegPath,
      ]);
    }
    segmentPaths.push(endSegPath);

    // 4. Concatenate all segments & mix Lyria 3 orchestral sting with Argon's dynamic ducking envelope
    const concatListPath = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(
      concatListPath,
      segmentPaths.map((p) => `file '${p}'`).join("\n"),
      "utf-8"
    );

    const concatMp4Path = path.join(tmpDir, "concat_raw.mp4");
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      concatMp4Path,
    ]);

    const masterOutPath = path.join(tmpDir, "master_final.mp4");
    if (options.stingBuffer) {
      const stingPath = path.join(tmpDir, "sting.mp3");
      fs.writeFileSync(stingPath, options.stingBuffer);
      const totalDur = await probeMediaDuration(concatMp4Path);
      const avgDuck =
        options.editPlan.shots.reduce((a, b) => a + (b.bgm_duck_volume || 0.18), 0) /
        Math.max(1, options.editPlan.shots.length);
      const shotsEndSec = Math.max(titleDur + 2, totalDur - endDur);

      // Volume envelope: 0.55 during Opening Title -> avgDuck during Shots 1..5 -> 0.50 during Cliffhanger -> fade out
      const volExpr = `if(lt(t,${titleDur.toFixed(1)}),0.55,if(gt(t,${shotsEndSec.toFixed(
        1
      )}),0.50,${avgDuck.toFixed(2)}))`;

      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        concatMp4Path,
        "-stream_loop",
        "-1",
        "-i",
        stingPath,
        "-filter_complex",
        `[1:a]aresample=44100,volume='${volExpr}':eval=frame,afade=t=out:st=${Math.max(
          1,
          totalDur - 0.8
        ).toFixed(2)}:d=0.8,atrim=0:${totalDur.toFixed(2)}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0:weights='1.2 0.85'[aout]`,
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        masterOutPath,
      ]);
    } else {
      fs.copyFileSync(concatMp4Path, masterOutPath);
    }

    return fs.readFileSync(masterOutPath);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
