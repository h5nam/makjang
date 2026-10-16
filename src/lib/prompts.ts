import fs from "fs";
import path from "path";
import { ChatLine, MemberConfig } from "./types";

interface TropeRecord {
  id: string;
  name_ko: string;
  name_en: string;
  category: string;
  safety: "G" | "Y" | "R";
  visual_signature?: string;
  camera_moves?: string[];
  audio_cues?: string[];
  typical_lines_ko?: string[];
  safe_twist?: string;
}

let cachedTropesText: string | null = null;

export function getTropeLibraryText(): string {
  if (cachedTropesText) return cachedTropesText;
  const tropesPath = path.join(process.cwd(), "data", "tropes", "tropes.json");
  const raw = JSON.parse(fs.readFileSync(tropesPath, "utf-8"));
  const allowed: TropeRecord[] = (raw.tropes || []).filter(
    (t: TropeRecord) => t.safety === "G" || t.safety === "Y"
  );
  cachedTropesText = allowed
    .map((t) => {
      const twist = t.safety === "Y" && t.safe_twist ? ` [Y-등급 안전 비틀기 필수: ${t.safe_twist}]` : "";
      const lines = (t.typical_lines_ko || []).slice(0, 2).join(" / ");
      return `- ${t.id} (${t.name_ko} / ${t.name_en}) [${t.safety}]: 시각=${t.visual_signature || ""}${twist} | 대표대사 예: ${lines}`;
    })
    .join("\n");
  return cachedTropesText;
}

export function buildShowrunnerPrompt(options: {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
  style: "live" | "webtoon";
  excludedTopics: string[];
}): string {
  const includedMembers = options.members.filter((m) => m.included);
  const excludedMembers = options.members.filter((m) => !m.included);

  const memberDesc = includedMembers
    .map((m) => `- 채팅명 "${m.name}" → 극중 이름 제안: "${m.alias || m.name}" (총 ${m.lineCount}줄 발화)`)
    .join("\n");

  const excludedMemberWarning =
    excludedMembers.length > 0
      ? `\n- 출연 제외 멤버(절대 등장·인용 금지): ${excludedMembers.map((m) => m.name).join(", ")}`
      : "";

  const excludedTopicWarning =
    options.excludedTopics.length > 0
      ? `\n- 금기 소재(절대 언급·연출 금지): ${options.excludedTopics.join(", ")}`
      : "";

  const formattedChat = options.lines
    .map((l) => `[${l.id}] (${l.date}) ${l.user}: ${l.text}`)
    .join("\n");

  const tropesText = getTropeLibraryText();

  return `당신은 한국 최고 시청률 주말 막장드라마 총괄 쇼러너(펜트하우스·아내의 유혹·사랑과 전쟁 스타일)입니다.
아래 카카오톡 단톡방 대화를 정밀 분석해, 단톡 속 사소한 일상 사건을 **과장된 한국 막장드라마 5샷 예고편(Next Episode Preview)** JSON으로 각색하십시오.

## 절대 수칙 (어기면 즉시 실격)
1. **단톡 근거 필수 (Zero Hallucination Receipt)**:
   - 모든 떡밥(\`seeds\`)과 모든 예고편 샷(\`shots\`)은 반드시 아래 단톡 로그에 실제로 존재하는 줄 번호(\`[번호]\`)를 \`evidence\` 배열(정수 배열)에 인용해야 합니다.
   - 동시에 외국인 심사위원을 위해 인용한 각 줄 번호의 원문을 자연스러운 영어로 번역한 \`receipts\` 배열(\`[{"line_id": 줄번호, "text_en": "자연스러운 영역"}]\`)을 \`seeds\`와 \`shots\` 모두에 반드시 포함하십시오.
2. **발화자 시점·지식 정합성**:
   - 각 샷의 화자(\`speaker\`)는 단톡 맥락상 그 사실을 알거나 의심할 수 있는 인물이어야 합니다.
3. **한국어 대사 규칙 (\`line_ko\` & \`line_en\`)**:
   - 각 샷의 \`line_ko\`는 **공백·문장부호 제외 한글 음절 수 20음절 이하**여야 합니다 (예: "그날 밤 강남역에 있었던 거… 다 알아!" = 16음절).
   - 반드시 **현대 구어체 종결어미**(\`-었어?\`, \`-잖아!\`, \`-지 마!\`, \`-야?\`, \`-다고!\`)만 사용하십시오. 사극투(\`-하오\`, \`-였소\`, \`-이오\`)는 절대 금지합니다.
   - 각 샷마다 외국인 심사위원용 영어 자막 \`line_en\`(자연스럽고 강렬한 K-드라마 예고편 영어 자막)을 함께 작성하십시오.
4. **샷당 등장인물 최대 3명**:
   - \`shots[].characters\` 배열에는 1~3명만 넣으십시오 (캐릭터 레퍼런스 한계).
5. **안전 등급 (PG-15 코믹/멜로 막장)**:
   - 흉기·유혈·자해·실제 폭력·성적 수치심·실존 브랜드 로고는 절대 금지합니다.
   - 갈등은 반드시 **물벼락(T01), 김치 싸대기(T02), 오렌지주스 뱉기(T03), 서류봉투 투척(T04), 무릎 꿇기(T06), 폭우 속 오열(T07), 3연속 줌인(T08)** 등 무해하고 상징적인 K-드라마 클리셰로만 연출하십시오.
6. **화풍**: ${options.style === "webtoon" ? "한국 네이버 로맨스/스릴러 웹툰 스타일 (Korean webtoon manhwa style)" : "시네마틱 한국 프라임타임 TV 드라마 실사 스타일 (Photorealistic Korean prime-time TV drama, 35mm anamorphic)"}${excludedMemberWarning}${excludedTopicWarning}

## 출연진 목록
${memberDesc}

## 사용 가능한 막장 클리셰 카탈로그 (G / Y 안전 등급)
${tropesText}

## 출력 JSON 스키마 (설명 없이 순수 JSON 객체만 출력)
{
  "title_ko": "강렬한 막장드라마 제목 (예: 펜트하우스 302호: 영수증의 비밀)",
  "title_en": "Dramatic English Subtitle",
  "logline_ko": "한 줄 요약 (한국어)",
  "logline_en": "One-sentence dramatic logline in English",
  "seeds": [
    {
      "id": "s1",
      "summary": "단톡에서 포착한 수상한 모순/비밀/갈등 요약 (한국어)",
      "summary_en": "Brief English summary of this suspicious clue/contradiction",
      "evidence": [14, 52],
      "receipts": [
        { "line_id": 14, "text_en": "Natural English translation of chat line #14" },
        { "line_id": 52, "text_en": "Natural English translation of chat line #52" }
      ],
      "twist_idea": "이를 막장드라마로 비튼 설정 (한국어)",
      "twist_idea_en": "How this chat clue is twisted into an over-the-top K-drama plot point"
    }
  ],
  "cast": [
    {
      "chat_name": "단톡 원래 이름 (위 출연진 목록과 정확히 일치)",
      "role_name": "극중 배역 이름 (예: 강민지)",
      "archetype": "배역 아키타입 (예: 복수의 화신 / 두 얼굴의 완벽남 / 야망의 팀장)",
      "secret_ko": "단톡 근거로 드러난 이 인물의 은밀한 비밀 한 줄",
      "look_en": "Detailed English visual description for character sheet generation: Korean actor/actress in their late 20s/30s/50s, specific hair color and style, distinct facial features, signature wardrobe (e.g. sharp burgundy blazer or charcoal cashmere coat), and 1 iconic accessory (e.g. gold rimmed glasses, pearl earrings, silver watch)."
    }
  ],
  "shots": [
    {
      "n": 1,
      "trope_id": "T07",
      "characters": ["민지", "지훈"],
      "speaker": "강민지",
      "line_ko": "그날 밤 거기 있었던 거… 다 알아!",
      "line_en": "I know everything... you were there that night!",
      "scene_ko": "장면 상황 설명 (한국어, 1~2문장)",
      "keyframe_prompt_en": "Detailed English image prompt for keyframe: specify exact character positions (left/right), facial expressions, lighting (high-contrast chiaroscuro rim light, cold blue & warm tungsten), props, and setting.",
      "video_prompt_en": "Detailed English motion prompt for 4-8s video: specify exact physical action, camera movement, and timing without background music.",
      "camera_type": "two_shot_confrontation",
      "sfx_en": "Realistic foley sound effects only, e.g. heavy rain on asphalt, distant thunder clap, sharp gasp",
      "evidence": [14, 52],
      "receipts": [
        { "line_id": 14, "text_en": "Natural English translation of chat line #14" },
        { "line_id": 52, "text_en": "Natural English translation of chat line #52" }
      ]
    }
  ],
  "narrator_ko": "예고편 엔딩 성우 내레이션 (예: 다음 이 시간, 영수증 뒤에 숨겨진 충격적 진실이 밝혀집니다.)",
  "narrator_en": "Next time on Makjang: the shocking truth hidden behind the receipt will finally be revealed."
}

주의사항:
- \`seeds\`는 정확히 5개(\`s1\`~\`s5\`)를 추출하십시오.
- \`shots\`는 정확히 5개(\`n: 1\`~\`5\`)로 구성하되, 기승전결(1: 불길한 전조 → 2: 비밀 폭로 → 3: 정면 대치 → 4: 클라이맥스 물벼락/김치싸대기/충격 → 5: 엔딩 3연속 줌인 클리프행어)을 갖추십시오.
- \`camera_type\`은 반드시 \`"two_shot_confrontation"\`, \`"slapstick_water"\`, \`"shock_zoom"\` 중 하나여야 합니다.

## 카카오톡 단톡방 원문 (${options.roomTitle}, 총 ${options.lines.length}줄)
${formattedChat}`;
}

export function buildShowrunnerPatchPrompt(failures: string[]): string {
  return `방금 생성한 예고편 JSON에서 검증기(Verifier #1)가 다음 오류를 발견했습니다:

${failures.map((f, i) => `${i + 1}. ${f}`).join("\n")}

위 문제가 된 필드만 정확히 수정하여, 전체 스키마를 유지한 **완전한 JSON 객체**를 다시 출력하십시오.
- \`line_ko\`는 반드시 공백·문장부호 제외 한글 20음절 이하, 현대 구어체 어미여야 하며, \`line_en\`(영어 자막)도 함께 맞추십시오.
- \`evidence\`는 반드시 실제 단톡에 존재하는 줄 번호여야 하며, 해당 줄이 장면 내용과 직접 연결되어야 합니다. \`receipts\`(\`[{"line_id": 줄번호, "text_en": "영역"}]\`)도 반드시 일치시키십시오.`;
}

export function buildValidityVerifierPrompt(options: {
  shotN: number;
  sceneKo: string;
  lineKo: string;
  citedLines: ChatLine[];
  contextLines: ChatLine[];
}): string {
  const citedText = options.citedLines
    .map((l) => `[${l.id}] (${l.date}) ${l.user}: ${l.text}`)
    .join("\n");
  const contextText = options.contextLines
    .map((l) => `[${l.id}] (${l.date}) ${l.user}: ${l.text}`)
    .join("\n");

  return `당신은 막장드라마 대본 검수관입니다.
예고편 Shot #${options.shotN}의 장면/대사가 인용된 카카오톡 줄 번호(\`evidence\`)에 실제로 근거하고 있는지 판정하십시오.
(단톡의 일상적인 대화를 막장드라마식으로 과장·비트는 것은 허용되며, 아예 무관한 줄 번호를 인용했는지만 검사합니다.)

[Shot #${options.shotN}]
- 장면: ${options.sceneKo}
- 대사: "${options.lineKo}"

[인용된 줄]
${citedText}

[주변 문맥 (±3줄)]
${contextText}

다음 JSON 형식으로만 답하십시오:
{
  "pass": true,
  "reason_ko": "인용된 대화가 장면의 핵심 소재와 어떻게 연결되는지 1문장 설명",
  "better_evidence": []
}`;
}

export function buildKnowledgeVerifierPrompt(options: {
  speaker: string;
  lineKo: string;
  sceneKo: string;
  speakerLines: ChatLine[];
}): string {
  const sampleLines = options.speakerLines
    .slice(0, 40)
    .map((l) => `[${l.id}] ${l.user}: ${l.text}`)
    .join("\n");

  return `당신은 드라마 시점·지식 정합성 검수관입니다.
화자 "${options.speaker}"가 예고편에서 "${options.lineKo}"라고 말하는 것이 단톡방 맥락상 가능한지(본인이 겪었거나, 단톡방에서 봤거나, 의심할 만한 위치인지) 판정하십시오.
극적인 과장이나 추궁은 허용됩니다.

- 화자: ${options.speaker}
- 대사: "${options.lineKo}"
- 장면: ${options.sceneKo}
- 화자의 단톡 발화 일부:
${sampleLines}

다음 JSON 형식으로만 답하십시오:
{
  "pass": true,
  "reason_ko": "화자가 이 대사를 발화할 개연성 1문장 설명"
}`;
}

export function buildSafetyVerifierPrompt(options: {
  shots: Array<{
    n: number;
    scene_ko: string;
    line_ko: string;
    keyframe_prompt_en: string;
    video_prompt_en: string;
  }>;
}): string {
  return `Check if the following 5 K-drama trailer shots comply with PG-15 safety rules:
- NO real weapons (knives, guns), blood, gore, self-harm, or severe physical injury.
- Harmless K-drama slapstick tropes (splashing water from a glass, kimchi slap, dropping orange juice, throwing paper documents, kneeling in rain, dramatic zoom-ins) ARE ALLOWED and safe.
- NO real-world brand logos.

Shots:
${JSON.stringify(options.shots, null, 2)}

Respond ONLY in JSON:
{
  "pass": true,
  "issues": []
}`;
}

export function buildCharacterSheetPrompt(options: {
  style: "live" | "webtoon";
  roleName: string;
  lookEn: string;
  hasSelfie: boolean;
}): string {
  const stylePrefix =
    options.style === "webtoon"
      ? "Korean romance-thriller webtoon style (Naver Webtoon manhwa aesthetic), clean sharp linework, dramatic cel shading, expressive eyes, webtoon character reference sheet."
      : "Photorealistic Korean prime-time TV drama character portrait (SBS/tvN Penthouse style), shot on 35mm anamorphic lens, shallow depth of field, high-contrast chiaroscuro studio rim lighting, rich skin texture.";

  const selfieInstruction = options.hasSelfie
    ? "Preserve the person's core facial identity, face shape, hairstyle, and glasses/features from the provided reference photo, restyled as a dramatic K-drama lead actor."
    : "";

  return `${stylePrefix} ${selfieInstruction}
Character: ${options.roleName}. ${options.lookEn}.
Framing: Medium close-up waist-up portrait (3:4 vertical), looking toward the camera with an intense, conflicted K-drama expression. Dark moody luxury background with warm tungsten and cold steel-blue rim light. No text, no watermarks, no split panels.`;
}

export function buildKeyframePrompt(options: {
  style: "live" | "webtoon";
  keyframePromptEn: string;
  characterNames: string[];
  extraFixInstructionEn?: string;
}): string {
  const styleDesc =
    options.style === "webtoon"
      ? "Korean dramatic webtoon panel (Naver Webtoon style), bold linework, high-contrast dramatic lighting, cinematic 16:9 widescreen composition."
      : "Photorealistic Korean prime-time makjang drama still frame, 35mm anamorphic lens, cinematic 16:9 widescreen, shallow depth of field, high-contrast chiaroscuro lighting with cold blue shadows and warm tungsten rim light.";

  const refNote =
    options.characterNames.length > 0
      ? `Maintain exact facial identity, hair color, hairstyle, and signature outfit/accessories from the attached character reference sheets for: ${options.characterNames.join(", ")}.`
      : "";

  const fixNote = options.extraFixInstructionEn
    ? `CRITICAL CORRECTION: ${options.extraFixInstructionEn}`
    : "";

  return `${styleDesc}
${refNote}
Scene: ${options.keyframePromptEn}
${fixNote}
No subtitles, no text overlays, no watermarks.`.trim();
}

export function buildVisionVerifierPrompt(options: {
  shotN: number;
  characterDescriptions: string[];
}): string {
  return `Compare the attached character reference sheet(s) (first image(s)) against the generated scene keyframe (last image) for Shot #${options.shotN}.
Expected characters:
${options.characterDescriptions.join("\n")}

Evaluate:
1. Hair color & hairstyle consistency (e.g., black hair must not drift to blonde/light brown).
2. Wardrobe & signature accessory consistency.
3. Dramatic cinematic composition & lighting quality.

Score from 0 to 10 (pass if score >= 7). If score < 7, provide a concise English fix instruction in "fix_instruction_en" to correct the drift on regeneration.
Respond ONLY in JSON:
{
  "score": 9,
  "pass": true,
  "drift_detail": "머리색·의상·시계 등 캐릭터 시트와 일관성 유지됨 (한국어 1문장 요약)",
  "fix_instruction_en": ""
}`;
}

export function buildOmniShotPrompt(options: {
  videoPromptEn: string;
  speakerRole: string;
  lineKo: string;
  sfxEn: string;
  cameraType: "two_shot_confrontation" | "slapstick_water" | "shock_zoom";
  durationSec: 4 | 8;
}): string {
  let cameraTemplate = "";
  if (options.cameraType === "two_shot_confrontation") {
    cameraTemplate =
      "Camera slowly pushes in on the speaker's trembling face with shallow depth of field, holding steady on their intense eyes at the end.";
  } else if (options.cameraType === "slapstick_water") {
    cameraTemplate =
      "Dynamic dramatic action beat followed by an immediate crash zoom-in onto the shocked face with water droplets / debris in sharp focus.";
  } else {
    cameraTemplate =
      "Classic Korean makjang drama triple rapid crash-zoom onto the character's wide-eyed shocked face as a flash of lightning illuminates the room.";
  }

  return `<FIRST_FRAME> Continuous single shot, no scene cuts, ${options.durationSec} seconds.
Photorealistic Korean prime-time TV drama cinematography, high-contrast lighting.
Action: ${options.videoPromptEn}
Camera: ${cameraTemplate}
Dialogue: ${options.speakerRole} speaks in Korean with intense dramatic emotion and accurate lip-sync: "${options.lineKo}"
Audio: Realistic foley sound effects only (${options.sfxEn}). Strictly NO background music, NO musical score.`;
}

export const NARRATOR_VOICE_PROMPT =
  "40대 한국 남성 성우. 심야 막장드라마 예고편 전용의 깊고 무게감 있는 바리톤 목소리. 낮고 긴장감 있게 깔리다가 마지막 단어에서 여운을 남기는 극적인 발성.";

export const LYRIA_STING_PROMPT =
  "Korean makjang drama trailer orchestral sting, tense pizzicato strings building into a dramatic minor-key brass and timpani hit, dark suspenseful prime-time television score, 128 BPM, no vocals.";
