import fs from "fs";
import path from "path";
import { ChatLine, GenreMode, MemberConfig } from "./types";

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

export interface MemberAgeGenderInfo {
  ageGenderEn: string; // e.g. "late-20s man", "late-20s woman"
  ageRangeKo: string; // e.g. "20대 후반 남성(28세)"
  gender: "male" | "female";
}

const KNOWN_MEMBER_AGE_GENDER: Record<string, MemberAgeGenderInfo> = {
  // A_friends (대학동기 찐친방 — 모두 27~29세, late-20s)
  민지: { ageGenderEn: "late-20s woman", ageRangeKo: "20대 후반 여성(28세)", gender: "female" },
  지훈: { ageGenderEn: "late-20s man", ageRangeKo: "20대 후반 남성(28세)", gender: "male" },
  서연: { ageGenderEn: "late-20s woman", ageRangeKo: "20대 후반 여성(28세)", gender: "female" },
  도윤: { ageGenderEn: "late-20s man", ageRangeKo: "20대 후반 남성(29세)", gender: "male" },
  하은: { ageGenderEn: "late-20s woman", ageRangeKo: "20대 후반 여성(27세)", gender: "female" },
  // B_family (우리가족)
  엄마: { ageGenderEn: "late-50s woman", ageRangeKo: "50대 후반 여성(58세)", gender: "female" },
  아빠: { ageGenderEn: "early-60s man", ageRangeKo: "60대 초반 남성(61세)", gender: "male" },
  수진: { ageGenderEn: "early-30s woman", ageRangeKo: "30대 초반 여성(31세)", gender: "female" },
  민수: { ageGenderEn: "late-20s man", ageRangeKo: "20대 후반 남성(27세)", gender: "male" },
  이모: { ageGenderEn: "mid-50s woman", ageRangeKo: "50대 중반 여성(55세)", gender: "female" },
  // C_work (2023 입사동기)
  태현: { ageGenderEn: "early-30s man", ageRangeKo: "30대 초반 남성(32세)", gender: "male" },
  유나: { ageGenderEn: "early-30s woman", ageRangeKo: "30대 초반 여성(31세)", gender: "female" },
  성민: { ageGenderEn: "early-30s man", ageRangeKo: "30대 초반 남성(33세)", gender: "male" },
  지아: { ageGenderEn: "early-30s woman", ageRangeKo: "30대 초반 여성(30세)", gender: "female" },
  // D_seoul_squad (Seoul Survivors 🇰🇷 — international friends in Seoul)
  Emma: { ageGenderEn: "late-20s British woman", ageRangeKo: "20대 후반 영국인 여성(27세)", gender: "female" },
  Lucas: { ageGenderEn: "late-20s Brazilian man", ageRangeKo: "20대 후반 브라질인 남성(28세)", gender: "male" },
  Priya: { ageGenderEn: "mid-20s Indian-American woman", ageRangeKo: "20대 중반 인도계 미국인 여성(26세)", gender: "female" },
  Kenji: { ageGenderEn: "late-20s Japanese man", ageRangeKo: "20대 후반 일본인 남성(29세)", gender: "male" },
  Mia: { ageGenderEn: "late-20s German woman", ageRangeKo: "20대 후반 독일인 여성(27세)", gender: "female" },
};

export const DEFAULT_ROFAN_LOOK_BY_MEMBER: Record<string, { roleKo: string; lookEn: string }> = {
  민지: {
    roleKo: "악녀 공작영애 민지",
    lookEn:
      "villainess duchess — crimson silk ball gown with black lace, ruby choker, diamond tiara, holding a black lace fan, fierce aristocratic expression",
  },
  지훈: {
    roleKo: "황태자 지훈",
    lookEn:
      "crown prince — white-and-gold royal dress uniform with gold epaulettes, royal blue sash, holding an ornate gold pocket watch, conflicted noble expression",
  },
  서연: {
    roleKo: "비밀의 성녀 서연",
    lookEn:
      "saintess with a secret — luminous ivory silk gown with silver embroidery, translucent lace veil, clutching a sealed royal letter, mysterious serene expression",
  },
  도윤: {
    roleKo: "북부대공 도윤",
    lookEn:
      "northern grand duke — black velvet military coat with dark fur trim, silver crest brooch, holding a silver-topped imperial cane, cold piercing gaze",
  },
  하은: {
    roleKo: "사교계 백작영애 하은",
    lookEn:
      "imperial salon countess / lady-in-waiting gossip — emerald satin empire dress with pearl necklace, holding a quill and ledger scroll, knowing smirk",
  },
};

export function getDefaultRofanLook(memberName: string, gender: "male" | "female"): string {
  const preset = DEFAULT_ROFAN_LOOK_BY_MEMBER[memberName];
  if (preset) return preset.lookEn;
  return gender === "male"
    ? "imperial grand duke — tailored black-and-gold 19th-century aristocrat coat with silver cravat, ornate pocket watch, intense noble expression"
    : "imperial villainess duchess — deep burgundy velvet ball gown with gold embroidery, ruby choker, tiara, holding a lace fan, haughty aristocratic expression";
}

export function getMemberAgeGender(
  memberName: string,
  lookEn?: string
): MemberAgeGenderInfo {
  const clean = (memberName || "").trim();
  if (KNOWN_MEMBER_AGE_GENDER[clean]) {
    return KNOWN_MEMBER_AGE_GENDER[clean];
  }
  for (const [k, v] of Object.entries(KNOWN_MEMBER_AGE_GENDER)) {
    if (clean.endsWith(k)) return v;
  }
  const lower = (lookEn || "").toLowerCase();
  const isMale =
    /\b(man|male|actor|father|son|brother|husband|boy|prince|duke)\b/.test(lower) &&
    !/\b(woman|female|actress|mother|daughter|sister|wife|duchess|saintess|princess)\b/.test(lower);
  const gender: "male" | "female" = isMale ? "male" : "female";
  const noun = gender === "male" ? "man" : "woman";

  if (/\b(50s|60s|middle-aged|older)\b/.test(lower)) {
    return {
      ageGenderEn: `late-50s ${noun}`,
      ageRangeKo: `50대 후반 ${gender === "male" ? "남성" : "여성"}`,
      gender,
    };
  }
  if (/\b(early 30s|early-30s|30s)\b/.test(lower)) {
    return {
      ageGenderEn: `early-30s ${noun}`,
      ageRangeKo: `30대 초반 ${gender === "male" ? "남성" : "여성"}`,
      gender,
    };
  }
  return {
    ageGenderEn: `late-20s ${noun}`,
    ageRangeKo: `20대 후반 ${gender === "male" ? "남성" : "여성"}`,
    gender,
  };
}

export const NO_ON_SCREEN_TEXT_SENTENCE =
  "No on-screen text, no captions, no subtitles, no letters anywhere in the frame.";

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
      const twist =
        t.safety === "Y" && t.safe_twist
          ? ` [Y-등급 안전 비틀기 필수: ${t.safe_twist}]`
          : "";
      const lines = (t.typical_lines_ko || []).slice(0, 2).join(" / ");
      return `- ${t.id} (${t.name_ko} / ${t.name_en}) [${t.safety}]: 시각=${t.visual_signature || ""}${twist} | 대표대사 예: ${lines}`;
    })
    .join("\n");
  return cachedTropesText;
}

const ROFAN_WORLD_BIBLE_BLOCK = `## 로판 막장 세계관 바이블 (Genre = 로판 막장 / Romance-Fantasy Makjang)
- **세계관**: 가상의 19세기 유럽풍 제국 **"칼레도르 제국(Caledor Empire)"**.
- **주요 배경(Locations)**: 황궁 무도회장(Imperial grand ballroom with chandeliers), 공작가 저택 응접실(Duke's manor drawing room), 장미 정원(moonlit royal rose garden), 황실 마차(ornate royal carriage), 신전(marble temple sanctuary), 북부 대공성(Northern Grand Duke's candlelit castle hall), 가면무도회(masquerade ball), 사교계 티파티(aristocratic garden tea party). (실존 국가·실존 역사·종교 비하 절대 금지)

### 단톡 일상 → 로판 막장 변환표 (인용 증거 \`evidence\` 줄 번호는 반드시 실제 단톡 원문을 그대로 유지!)
| 실제 단톡 시그널 | 로판 막장 반전 설정 |
|---|---|
| 회비/정산/계좌/더치페이 | 공작가 금고·영지 세금 횡령, 사라진 금화 |
| 누가 누구랑 어디서 목격됨 (강남역 등) | 가면무도회·장미 정원 밀회 목격 |
| 읽씹 / 답장 없음 | 답장 없는 서신, 봉인된 편지 파기 |
| 방 나감 / 재초대 | 가문 파문·사교계 추방 후 화려한 복귀 |
| 생일 잊힘 | 성년식·데뷔탕트를 아무도 기억 못 함 |
| 비싼 시계·물건 자랑 | 출처 불명의 황실 회중시계·금화 보석 |
| "입양될 뻔" / 출생 얘기 | 뒤바뀐 공녀, 숨겨진 황실 혈통 |
| 마지막 치킨 닭다리 / 음식 | 황실 만찬의 마지막 마카롱·칠면조 다리 결투 |
| 퇴사 / 이직 | 황실 기사단 탈퇴, 적국 공작가로 망명 |
| 조직개편·승진 | 작위 수여, 최연소 기사단장 임명 |
| 가족회의 / "할 말 있다" | 가문 비상회의 소집, 선대 공작 유언장 공개 |
| 소개팅·결혼 압박 | 정략결혼, 북부대공과의 계약결혼 제안 |

### 사용 가능한 로판 클리셰 목록 (G-tier 안전 등급)
- 회귀(이번 생엔 다르게), 악녀 빙의, 계약결혼, **무도회 파혼 선언**, 가면무도회 밀회, 장갑 던져 결투 신청, 드레스에 와인 쏟기, 뒤바뀐 공녀·사생아 출생의 비밀, 황태자와 성녀의 삼각관계, 북부대공의 청혼, 가문 몰락과 복수, 흑막 공작, 시녀의 고자질, 마차 추격, 금화 주머니 던지기(돈봉투의 로판 버전), 장미 정원 고백, 성녀의 신탁.
- **절대 금지(R-tier)**: 독살/암살, 처형, 시한부 투병 금지 → 코믹 안전 대체 필수: "쓴 홍차 대접", "가문 회계 장부 압수", "금화 대신 마카롱".

### 로판 대사 톤 & 웹소설식 1화 제목 공식
- **대사 스타일**: 기품 있으면서 격정적인 **로판 귀족 어투**, 공백·문장부호 제외 **한글 20음절 이하** 필수!
  - 예시: \`"감히 공녀에게!"\`, \`"전하, 그 금화는 어디 갔습니까?"\`, \`"이번 생엔 정산부터 하겠어요."\`, \`"공녀와의 약혼을 파기하겠다!"\`
  - 호칭 어휘 적극 활용: \`전하\`, \`공녀\`, \`공작\`, \`황태자\`, \`성녀\`, \`대공\`, \`영애\`.
- **웹소설 스타일 에피소드 제목(\`title_ko\`) 공식 (필수)**:
  - \`"[주인공 직함]는 [사건]을 [행동]하기로 했다"\` / \`"이번 생엔 [사건]부터 하겠습니다"\` / \`"[인물]가 수상하다"\`
  - 예시: \`"악녀는 단톡방을 나가기로 했다"\`, \`"회비를 횡령한 황태자가 수상하다"\`, \`"이번 생엔 정산부터 하겠습니다"\`
- **내레이션(\`narrator_ko\`) 스타일**: \`"다음 이 시간… 사라진 금화 아홉 닢, 그리고 뒤바뀐 공녀의 비밀."\``;

export function buildShowrunnerPrompt(options: {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
  style: "live" | "webtoon";
  excludedTopics: string[];
  chatLang?: "ko" | "en";
  genre?: GenreMode;
}): string {
  const isEn = options.chatLang === "en";
  const isRofan = options.genre === "rofan";
  const includedMembers = options.members.filter((m) => m.included);
  const excludedMembers = options.members.filter((m) => !m.included);

  const memberDesc = includedMembers
    .map((m) => {
      const info = getMemberAgeGender(m.name);
      const rofanPreset = isRofan ? DEFAULT_ROFAN_LOOK_BY_MEMBER[m.name] : undefined;
      const rofanHint = rofanPreset
        ? ` | 로판 고정 배역/의상: "${rofanPreset.roleKo}" (${rofanPreset.lookEn})`
        : isRofan
        ? ` | 로판 귀족 배역: ${getDefaultRofanLook(m.name, info.gender)}`
        : "";
      return `- 채팅명 "${m.name}" → 극중 이름 제안: "${rofanPreset ? rofanPreset.roleKo : m.alias || m.name}" | 연령·국적·성별 고정: ${info.ageRangeKo} (영어 프롬프트 표기: "the ${info.ageGenderEn}")${rofanHint} | 총 ${m.lineCount}줄 발화`;
    })
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

  const dialogueRuleBlock = isEn
    ? `3. **영어 단톡방 대사 규칙 (English Primary, Korean Secondary — \`line_en\` & \`line_ko\`)**:
   - 이 대화방은 **영어(English)** 대화방입니다. 예고편 배우들이 실제로 입을 맞춰 발화하는 주 대사는 **영어(\`line_en\`)**이고, **한국어(\`line_ko\`)**는 보조 자막입니다!
   - 각 샷의 \`line_en\`은 **단어 수 14단어 이하(최대 16단어)**의 강렬하고 자연스러운 영어 ${isRofan ? "로맨스 판타지 귀족 드라마" : "막장드라마"} 대사여야 합니다.
   - 각 샷의 \`line_ko\`는 자연스러운 한국어 자막(공백·문장부호 제외 한글 음절 수 20음절 이하)으로 작성하십시오.`
    : isRofan
    ? `3. **로판 막장 한국어 대사 규칙 (\`line_ko\` & \`line_en\`)**:
   - 각 샷의 \`line_ko\`는 **공백·문장부호 제외 한글 음절 수 18음절 이하(최대 20음절)**의 **로판(로맨스 판타지) 귀족 어투**여야 합니다!
   - 예시: \`"감히 공녀에게!"\`, \`"전하, 그 금화는 어디 갔습니까?"\`, \`"이번 생엔 정산부터 하겠어요."\`, \`"공녀와의 약혼을 파기하겠다!"\`
   - 대사에 \`전하\`, \`공녀\`, \`공작\`, \`황태자\`, \`성녀\`, \`대공\`, \`영애\` 같은 로판 작위/호칭을 적극 사용하십시오.
   - 각 샷마다 외국인 심사위원용 영어 자막 \`line_en\`(자연스럽고 격정적인 로판 영어 대사, 예: "I hereby annul my engagement to the Lady!", "Your Highness, where did the gold coins go?")을 함께 작성하십시오.`
    : `3. **한국어 대사 규칙 (\`line_ko\` & \`line_en\`)**:
   - 각 샷의 \`line_ko\`는 **공백·문장부호 제외 한글 음절 수 18음절 이하(최대 20음절)**여야 합니다 (예: "그날 밤 거기 있었던 거… 다 알아!" = 13음절).
   - 반드시 **현대 구어체 종결어미**(\`-었어?\`, \`-잖아!\`, \`-지 마!\`, \`-야?\`, \`-다고!\`)만 사용하십시오. 사극투(\`-하오\`, \`-였소\`, \`-이오\`)는 절대 금지합니다.
   - 각 샷마다 외국인 심사위원용 영어 자막 \`line_en\`(자연스럽고 강렬한 K-드라마 예고편 영어 자막)을 함께 작성하십시오.`;

  return `당신은 ${
    isRofan
      ? "한국 최고 인기 로맨스판타지(로판) 막장 웹소설·드라마 총괄 쇼러너(재혼 황후·악녀는 마리오네트·펜트하우스 로판 버전 스타일)"
      : "한국 최고 시청률 주말 막장드라마 총괄 쇼러너(펜트하우스·아내의 유혹·사랑과 전쟁 스타일)"
  }입니다.
아래 단톡방 대화를 정밀 분석해, 단톡 속 사소한 일상 사건을 **${
    isRofan
      ? "가상의 19세기 유럽풍 '칼레도르 제국' 귀족들의 유쾌하고 과장된 로판 막장드라마 5샷 예고편"
      : "유쾌하고 과장된 한국 막장드라마 5샷 예고편(Next Episode Preview)"
  }** JSON으로 각색하십시오.
${isRofan ? `\n${ROFAN_WORLD_BIBLE_BLOCK}\n` : ""}
## 절대 수칙 (어기면 즉시 실격)
1. **단톡 근거 필수 (Zero Hallucination Receipt)**:
   - 모든 떡밥(\`seeds\`)과 모든 예고편 샷(\`shots\`)은 반드시 아래 단톡 로그에 실제로 존재하는 줄 번호(\`[번호]\`)를 \`evidence\` 배열(정수 배열)에 인용해야 합니다. (단, \`SYSTEM\` 줄은 인용하지 말고 실제 출연진 멤버가 발화한 줄 번호만 인용하십시오. 영수증은 로판으로 바꾸지 않고 실제 단톡 원문을 그대로 인용합니다.)
   - 동시에 인용한 각 줄 번호의 원문을 자연스러운 영어로 번역(이미 영어 원문이면 원문 그대로 유지)한 \`receipts\` 배열(\`[{"line_id": 줄번호, "text_en": "English text"}]\`)을 \`seeds\`와 \`shots\` 모두에 반드시 포함하십시오.
2. **발화자 시점·지식 정합성**:
   - 각 샷의 화자(\`speaker\`)는 단톡 맥락상 그 사실을 알거나 의심할 수 있는 인물이어야 합니다.
${dialogueRuleBlock}
4. **샷당 등장인물 최대 3명 & 연령·국적 고정 (Age & Identity Lock 필수)**:
   - \`shots[].characters\` 배열에는 1~3명만 넣으십시오 (캐릭터 레퍼런스 한계).
   - **연령·인종 드리프트 방지(매우 중요)**: \`cast[].look_en\`, \`shots[].keyframe_prompt_en\`, \`shots[].video_prompt_en\`에서 인물을 언급할 때마다 반드시 출연진 목록의 고정 연령·성별·국적 구문(예: \`"the late-20s man"\`, \`"the late-20s woman"\`)을 명시하십시오. 20대 후반 인물이 40대 중년처럼 묘사되거나 노화되지 않도록 \`youthful late-20s\`를 반복 명시하십시오.${
     isRofan
       ? `\n   - **로판 의상·배경 고정**: \`cast[].look_en\`에는 반드시 19세기 유럽풍 제국 귀족 의상(예: crimson silk ball gown with ruby choker and tiara, white-and-gold crown prince dress uniform with gold pocket watch, ivory saintess gown with silver embroidery, northern grand duke black fur-trimmed coat with silver cane)을 명시하고, \`shots[].keyframe_prompt_en\`과 \`shots[].video_prompt_en\`의 모든 배경도 황궁 무도회장(imperial ballroom with chandeliers), 공작가 응접실, 장미 정원, 북부 대공성 등 칼레도르 제국 로판 배경으로 묘사하십시오.`
       : ""
   }
5. **단일 연속 샷 고정 (No Multi-Shot Cuts)**:
   - \`shots[].video_prompt_en\`은 반드시 장면 전환(cut)이 없는 **단일 연속 샷(Continuous single shot, no scene cuts)** 동작만 묘사하십시오. 여러 컷으로 쪼개거나 "cut to..."를 쓰지 마십시오.
6. **안전 등급 (PG-15 코믹/멜로 막장 & 비디오 필터 안전 규칙)**:
   - 흉기·유혈·자해·독살·암살·처형·실제 폭력·성적 수치심·실존 브랜드 로고는 절대 금지합니다.
   - 특히 \`keyframe_prompt_en\`과 \`video_prompt_en\` 영어 프롬프트에는 \`sword\`, \`blade\`, \`dagger\`, \`weapon\`, \`bone\`, \`blood\`, \`poison\`, \`slap\`, \`strike\`, \`attack\`, \`kill\`, \`duel\`, \`affair\` 같은 단어를 절대 포함하지 말고, 대신 \`imperial scepter\`, \`royal ledger\`, \`lace fan\`, \`gold pocket watch\`, \`dramatically steps forward\`, \`points at the royal scroll\` 등 안전한 귀족 소품과 동작만 사용하십시오.
   - 갈등은 반드시 ${
     isRofan
       ? "**무도회 파혼 선언, 찻잔 내려놓기, 가문 회계 장부/금화 주머니 제시, 가면무도회 비밀 회동 발각, 폭우 속 대공성 앞 무릎 꿇기, 3연속 충격 줌인**"
       : "**물벼락(T01), 김치 싸대기(T02), 오렌지주스 뱉기(T03), 서류봉투 투척(T04), 무릎 꿇기(T06), 폭우 속 오열(T07), 3연속 줌인(T08)**"
   } 등 무해하고 상징적인 클리셰로만 연출하십시오.
7. **코믹 과장 톤 유지 — 정신의학·임상 진단명 및 실존 범죄 낙인 절대 금지**:
   - 실제 친구·동료·가족의 대화를 각색하므로 반드시 **코믹하고 애정 어린 드라마틱 과장**만 사용하십시오.
   - \`소시오패스\`, \`사이코패스\`, \`나르시시스트\`, \`정신병\`, \`인격장애\`, \`조현병\`, \`환자\`, \`횡령범\`, \`사기꾼\`, \`범죄자\` 같은 **정신의학/임상 진단 용어나 실제 범죄자 낙인 어휘는 \`seeds\`, \`cast\`, \`shots\` 어디에도 절대 쓰지 마십시오.**
8. **화풍**: ${
    options.style === "webtoon"
      ? isRofan
        ? "한국 로맨스판타지 웹툰 표지 일러스트 스타일 (Korean romance-fantasy webtoon cover illustration style)"
        : "한국 네이버 로맨스/스릴러 웹툰 스타일 (Korean webtoon manhwa style)"
      : isRofan
      ? "시네마틱 한국 로맨스판타지(로판) 실사 드라마 스타일 (Photoreal Korean romance-fantasy drama, 19th-century European empire palace & candlelight)"
      : "시네마틱 한국 프라임타임 TV 드라마 실사 스타일 (Photorealistic Korean prime-time TV drama, 35mm anamorphic)"
  }${excludedMemberWarning}${excludedTopicWarning}

## 출연진 목록 (연령·성별 고정)
${memberDesc}

## 사용 가능한 막장 클리셰 카탈로그 (G / Y 안전 등급)
${tropesText}

## 출력 JSON 스키마 (설명 없이 순수 JSON 객체만 출력)
{
  "title_ko": "${
    isRofan
      ? "웹소설 스타일 로판 에피소드 제목 (예: 회비를 횡령한 황태자가 수상하다 / 이번 생엔 정산부터 하겠습니다 / 악녀는 단톡방을 나가기로 했다)"
      : "강렬한 막장드라마 제목 (예: 펜트하우스 302호: 영수증의 비밀)"
  }",
  "title_en": "Dramatic English Subtitle",
  "logline_ko": "한 줄 요약 (한국어)",
  "logline_en": "One-sentence dramatic logline in English",
  "seeds": [
    {
      "id": "s1",
      "summary": "단톡에서 포착한 수상한 모순/비밀/갈등 요약 (한국어, 정신의학·범죄 낙인 단어 금지)",
      "summary_en": "Brief English summary of this suspicious clue/contradiction",
      "evidence": [14, 52],
      "receipts": [
        { "line_id": 14, "text_en": "Natural English translation of chat line #14" },
        { "line_id": 52, "text_en": "Natural English translation of chat line #52" }
      ],
      "twist_idea": "${
        isRofan
          ? "이를 칼레도르 제국 로판 클리셰(공작가 금고, 가면무도회 밀회, 무도회 파혼 선언 등)로 비튼 설정 (한국어)"
          : "이를 유쾌한 막장드라마 클리셰로 비튼 설정 (한국어, 정신의학/임상 용어 절대 금지)"
      }",
      "twist_idea_en": "How this chat clue is twisted into a comic over-the-top plot point"
    }
  ],
  "cast": [
    {
      "chat_name": "단톡 원래 이름 (위 출연진 목록과 정확히 일치)",
      "role_name": "${
        isRofan
          ? "로판 극중 배역 이름 (예: 악녀 공작영애 민지 / 황태자 지훈 / 비밀의 성녀 서연 / 북부대공 도윤)"
          : "극중 배역 이름 (예: 강민지 또는 Emma)"
      }",
      "archetype": "${
        isRofan
          ? "로판 배역 아키타입 (예: 회귀한 악녀 공녀 / 금고지기 황태자 / 두 얼굴의 성녀 / 냉혈 북부대공)"
          : "배역 아키타입 (예: 복수의 총무 / 두 얼굴의 미식가 / 비밀의 기획자)"
      }",
      "secret_ko": "단톡 근거로 드러난 이 인물의 코믹-시리어스 비밀 한 줄",
      "look_en": "${
        isRofan
          ? "Detailed English rofan costume & role description: MUST start with exact youthful age & gender (e.g. 'Youthful late-20s woman, villainess duchess — crimson silk ball gown, black lace, ruby choker, tiara, black lace fan, fierce aristocratic expression' or 'Youthful late-20s man, crown prince — white-and-gold dress uniform, epaulettes, blue sash, gold pocket watch')."
          : "Detailed English visual description for character sheet generation: MUST start with exact youthful age, nationality/ethnicity & gender from the cast list, specific hair color and style, distinct facial features, signature wardrobe, and 1 iconic accessory."
      }"
    }
  ],
  "shots": [
    {
      "n": 1,
      "trope_id": "T07",
      "characters": ["민지", "지훈"],
      "speaker": "${isRofan ? "악녀 공작영애 민지" : "강민지"}",
      "line_ko": "${
        isRofan
          ? "전하, 그 금화는 어디 갔습니까?"
          : "그날 밤 거기 있었던 거… 다 알아!"
      }",
      "line_en": "${
        isRofan
          ? "Your Highness, where did those gold coins go?!"
          : "I know everything... you were there that night!"
      }",
      "scene_ko": "장면 상황 설명 (한국어, 1~2문장)",
      "keyframe_prompt_en": "Detailed English image prompt for keyframe: ALWAYS lock character age in every mention (e.g. 'the late-20s woman on the left confronts the late-20s man on the right'), facial expressions, lighting, props, and setting.",
      "video_prompt_en": "Detailed English single-shot motion prompt: ALWAYS lock character age in every mention, specify exact continuous physical action in a single shot with no scene cuts.",
      "camera_type": "two_shot_confrontation",
      "sfx_en": "Realistic foley sound effects only, e.g. wine glass shattering on marble floor, rustle of silk gown, sharp gasp",
      "evidence": [14, 52],
      "receipts": [
        { "line_id": 14, "text_en": "Natural English translation of chat line #14" },
        { "line_id": 52, "text_en": "Natural English translation of chat line #52" }
      ]
    }
  ],
  "narrator_ko": "${
    isRofan
      ? "다음 이 시간… 사라진 금화 아홉 닢, 그리고 뒤바뀐 공녀의 비밀."
      : "다음 이 시간, 영수증 뒤에 숨겨진 충격적 진실이 밝혀집니다."
  }",
  "narrator_en": "Next time on Makjang: the shocking truth hidden behind the receipt will finally be revealed."
}

주의사항:
- \`seeds\`는 정확히 5개(\`s1\`~\`s5\`)를 추출하십시오.
- \`shots\`는 정확히 5개(\`n: 1\`~\`5\`)로 구성하되, 기승전결(1: 불길한 전조 → 2: 비밀 폭로 → 3: 정면 대치 → 4: 클라이맥스 ${
    isRofan ? "무도회 파혼 선언/와인 세례/결투장 투척" : "물벼락/김치싸대기/충격"
  } → 5: 엔딩 3연속 줌인 클리프행어)을 갖추십시오.
- \`camera_type\`은 반드시 \`"two_shot_confrontation"\`, \`"slapstick_water"\`, \`"shock_zoom"\` 중 하나여야 합니다.

## 단톡방 원문 (${options.roomTitle}, 총 ${options.lines.length}줄)
${formattedChat}`;
}

export function buildShowrunnerPatchPrompt(
  failures: string[],
  chatLang?: "ko" | "en",
  genre?: GenreMode
): string {
  const isRofan = genre === "rofan";
  const langNote =
    chatLang === "en"
      ? `- \`line_en\`(영어 주 대사)은 반드시 16단어 이하의 자연스러운 구어체 영어 대사여야 하며, \`line_ko\`(한국어 보조 자막)도 한글 20음절 이하로 함께 맞추십시오.`
      : isRofan
      ? `- \`line_ko\`는 반드시 공백·문장부호 제외 한글 20음절 이하의 로판 귀족 어투(전하, 공녀, 황태자, 대공 등)여야 하며, \`line_en\`(영어 자막)도 함께 맞추십시오.`
      : `- \`line_ko\`는 반드시 공백·문장부호 제외 한글 20음절 이하, 현대 구어체 어미여야 하며, \`line_en\`(영어 자막)도 함께 맞추십시오.`;

  return `방금 생성한 예고편 JSON에서 검증기(Verifier #1)가 다음 오류를 발견했습니다:

${failures.map((f, i) => `${i + 1}. ${f}`).join("\n")}

위 문제가 된 필드만 정확히 수정하여, 전체 스키마를 유지한 **완전한 JSON 객체**를 다시 출력하십시오.
${langNote}
- \`evidence\`는 반드시 실제 단톡에 존재하는 줄 번호(SYSTEM 제외)여야 하며, 해당 줄이 장면 내용과 직접 연결되어야 합니다. \`receipts\`(\`[{"line_id": 줄번호, "text_en": "영역"}]\`)도 반드시 일치시키십시오.
- \`소시오패스\`, \`사이코패스\`, \`정신병\` 등 임상/정신의학 용어나 실존 범죄 낙인은 절대 사용하지 말고 코믹한 막장드라마 표현으로 순화하십시오.`;
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
(단톡의 일상적인 대화를 현대 막장드라마나 로맨스판타지(로판: 황궁, 금화, 무도회, 공녀, 황태자 등)로 과장·비트는 것은 완전히 허용되며, 아예 무관한 줄 번호를 인용했는지만 검사합니다.)

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
화자 "${options.speaker}"가 예고편에서 "${options.lineKo}"라고 말하는 것이 단톡방 맥락상 가능한지(본인이 겪었거나, 단톡방에서 봤거나, 의심할 만한 위치인지, 혹은 로판 각색 버전인지) 판정하십시오.
극적인 과장이나 로판 세계관 치환(회비→금화, 강남역→가면무도회 등)은 완전히 허용됩니다.

- 화자: ${options.speaker}
- 대사: "${options.lineKo}"
- 장면: "${options.sceneKo}"
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
- NO real weapons used for gore/blood/murder, NO self-harm, or severe physical injury. (Ceremonial aristocratic swords at a noble's waist in romance-fantasy costume are safe.)
- Harmless K-drama / romance-fantasy slapstick tropes (splashing water or wine from a glass, kimchi slap, dropping orange juice, throwing paper documents or gold coin pouches, throwing a glove for a duel, kneeling in rain, dramatic zoom-ins) ARE ALLOWED and safe.
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
  genre?: GenreMode;
  roleName: string;
  lookEn: string;
  hasSelfie: boolean;
  ageGenderEn?: string;
}): string {
  const ageStr = options.ageGenderEn || "late 20s";
  if (options.genre === "rofan") {
    if (options.style === "webtoon") {
      return `${NO_ON_SCREEN_TEXT_SENTENCE}
Korean romance-fantasy webtoon cover illustration (로판 웹툰 표지 style) of ${
        options.hasSelfie
          ? `the person in the image as ${options.roleName} (${ageStr})`
          : `a youthful ${ageStr} noble as ${options.roleName}`
      }, sparkling jewels, flowing hair, roses, luminous soft shading, clearly recognizable likeness. No text.
Role: ${options.roleName} — ${options.lookEn}.
${NO_ON_SCREEN_TEXT_SENTENCE}`;
    }
    return `${NO_ON_SCREEN_TEXT_SENTENCE}
Korean romance-fantasy (로판) drama costume portrait of ${
      options.hasSelfie
        ? `the person in the image — keep their face, age (${ageStr}) and identity clearly recognizable`
        : `a youthful Korean actor (${ageStr})`
    }. Set in a fictional 19th-century-inspired European empire. Cinematic photoreal, soft candlelight, painterly palace background, 85mm, chest-up. No text.
Role: ${options.roleName} — ${options.lookEn}.
${NO_ON_SCREEN_TEXT_SENTENCE}`;
  }

  const stylePrefix =
    options.style === "webtoon"
      ? "Korean romance-thriller webtoon style (Naver Webtoon manhwa aesthetic), clean sharp linework, dramatic cel shading, expressive eyes, webtoon character reference sheet."
      : "Photorealistic Korean prime-time TV drama character portrait (SBS/tvN Penthouse style), shot on 35mm anamorphic lens, shallow depth of field, high-contrast chiaroscuro studio rim lighting, rich skin texture.";

  const ageLock = options.ageGenderEn
    ? `Strictly depict a youthful ${options.ageGenderEn} (exact age match, do NOT make them look older or middle-aged unless specified as 50s/60s).`
    : "";

  const selfieInstruction = options.hasSelfie
    ? `Preserve the person's core facial identity, youthful age (${options.ageGenderEn || "late-20s"}), face shape, hairstyle, and glasses/features from the provided reference photo, restyled as a dramatic K-drama lead actor.`
    : "";

  return `${NO_ON_SCREEN_TEXT_SENTENCE}
${stylePrefix} ${selfieInstruction} ${ageLock}
Character: ${options.roleName} (the ${options.ageGenderEn || "late-20s character"}). ${options.lookEn}.
Framing: Medium close-up waist-up portrait (3:4 vertical), looking toward the camera with an intense, conflicted K-drama expression. Dark moody luxury background with warm tungsten and cold steel-blue rim light. No split panels.
${NO_ON_SCREEN_TEXT_SENTENCE}`;
}

export function buildKeyframePrompt(options: {
  style: "live" | "webtoon";
  genre?: GenreMode;
  keyframePromptEn: string;
  characterRefsWithAge: string[];
  extraFixInstructionEn?: string;
}): string {
  const fixNote = options.extraFixInstructionEn
    ? ` CRITICAL CORRECTION: ${options.extraFixInstructionEn}`
    : "";

  if (options.genre === "rofan") {
    const rofanStyle =
      options.style === "webtoon"
        ? "Korean romance-fantasy webtoon illustration still, 16:9"
        : "Photoreal Korean romance-fantasy drama film still, 16:9";
    const refList =
      options.characterRefsWithAge.length > 0
        ? ` Characters in frame: ${options.characterRefsWithAge.join("; ")}.`
        : "";
    return `${NO_ON_SCREEN_TEXT_SENTENCE}
${rofanStyle}, set in a fictional 19th-century-inspired European empire palace. ${options.keyframePromptEn}.${refList} Keep each face, youthful age, hair and royal costume exactly as their reference. Candlelight, cinematic.${fixNote}
${NO_ON_SCREEN_TEXT_SENTENCE}`.trim();
  }

  const styleDesc =
    options.style === "webtoon"
      ? "Korean dramatic webtoon panel (Naver Webtoon style), bold linework, high-contrast dramatic lighting, cinematic 16:9 widescreen composition."
      : "Photorealistic Korean prime-time makjang drama still frame, 35mm anamorphic lens, cinematic 16:9 widescreen, shallow depth of field, high-contrast chiaroscuro lighting with cold blue shadows and warm tungsten rim light.";

  const refNote =
    options.characterRefsWithAge.length > 0
      ? `Character Identity & Age Lock: Maintain exact facial identity, youthful age, hair color, hairstyle, and signature outfit/accessories from the attached character reference sheets: ${options.characterRefsWithAge.join("; ")}. Never age late-20s characters into their 40s.`
      : "";

  return `${NO_ON_SCREEN_TEXT_SENTENCE}
${styleDesc}
${refNote}
Scene: ${options.keyframePromptEn}
${fixNote}
${NO_ON_SCREEN_TEXT_SENTENCE}`.trim();
}

export function buildVisionVerifierPrompt(options: {
  shotN: number;
  characterDescriptions: string[];
}): string {
  return `Compare the attached character reference sheet(s) (first image(s)) against the generated scene keyframe (last image) for Shot #${options.shotN}.
Expected characters:
${options.characterDescriptions.join("\n")}

Evaluate this strict 4-point rubric:
1. Age consistency (CRITICAL): Does each character match their specified age (e.g. a late-20s man or woman must look strictly in their late 20s with youthful skin and features, NOT in their 40s or middle-aged)? If a late-20s character drifted to look like they are in their 40s, score <= 5 and fail immediately.
2. Hair color & hairstyle consistency (e.g., black hair must not drift to blonde/light brown).
3. Wardrobe & signature accessory consistency.
4. Dramatic cinematic composition & lighting quality, with NO burned-in text or subtitles.

Score from 0 to 10 (pass if score >= 7). If score < 7, provide a concise English fix instruction in "fix_instruction_en" to correct the age, hair, or wardrobe drift on regeneration.
Respond ONLY in JSON:
{
  "score": 9,
  "pass": true,
  "drift_detail": "연령대(20대 후반)·머리색·의상·시계 등 캐릭터 시트와 일관성 유지됨 (한국어 1문장 요약)",
  "fix_instruction_en": ""
}`;
}

export function buildOmniShotPrompt(options: {
  videoPromptEn: string;
  speakerRoleWithAge: string;
  characterRefsInFrameWithAge: string[];
  lineKo: string;
  lineEn?: string;
  chatLang?: "ko" | "en";
  genre?: GenreMode;
  sfxEn: string;
  cameraType: "two_shot_confrontation" | "slapstick_water" | "shock_zoom";
  durationSec: number;
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
      "Classic Korean makjang drama rapid crash-zoom onto the character's wide-eyed shocked face as a flash of lightning illuminates the room.";
  }

  const usesExplicitShotGrammar = /\bCut to Shot 2\b/i.test(options.videoPromptEn);
  const cleanedVideoPrompt = usesExplicitShotGrammar
    ? options.videoPromptEn
    : options.videoPromptEn
        .replace(/\b(cut to|cuts to|scene cut|montage|split screen)\b/gi, "smoothly transitions within the same continuous shot to");

  const shotContinuityRule = usesExplicitShotGrammar
    ? "Follow the specified Shot grammar and end on the final shot."
    : "Continuous single shot, no scene cuts. End on this shot.";

  const charLockLine =
    options.characterRefsInFrameWithAge.length > 0
      ? `Characters in frame (locked age & appearance from image 1): ${options.characterRefsInFrameWithAge.join(", ")}. Preserve their exact age and facial identity from image 1 throughout the entire clip.`
      : "";

  const isEn = options.chatLang === "en";
  const spokenLang = isEn ? "English" : "Korean";
  const spokenLine = isEn ? options.lineEn || options.lineKo : options.lineKo;

  if (options.genre === "rofan") {
    return `${NO_ON_SCREEN_TEXT_SENTENCE}
<FIRST_FRAME> ${shotContinuityRule} Over-the-top Korean romance-fantasy makjang drama (${options.durationSec}s). ${cameraTemplate} ${charLockLine} ${options.speakerRoleWithAge} says in ${spokenLang}, with intense aristocratic emotion and accurate lip-sync: "${spokenLine}" The line starts within the first second and is fully finished before the clip ends. ${cleanedVideoPrompt} Sound: ${options.sfxEn}. ${shotContinuityRule}
${NO_ON_SCREEN_TEXT_SENTENCE}`;
  }

  return `${NO_ON_SCREEN_TEXT_SENTENCE}
<FIRST_FRAME> ${shotContinuityRule} Duration: ${options.durationSec} seconds.
Photorealistic Korean prime-time TV drama cinematography, high-contrast lighting.
${charLockLine}
Action: ${cleanedVideoPrompt} ${shotContinuityRule}
Camera: ${cameraTemplate}
Dialogue: ${options.speakerRoleWithAge} speaks in ${spokenLang} with intense dramatic emotion and accurate lip-sync: "${spokenLine}". The line starts within the first second and is fully finished before the clip ends.
Audio: Realistic foley sound effects only (${options.sfxEn}). Strictly NO background music, NO musical score.
${NO_ON_SCREEN_TEXT_SENTENCE}`;
}

export const NARRATOR_VOICE_PROMPT =
  "40대 한국 남성 성우. 심야 막장드라마 예고편 전용의 깊고 무게감 있는 바리톤 목소리. 낮고 긴장감 있게 깔리다가 마지막 단어에서 여운을 남기는 극적인 발성.";

export const LYRIA_STING_PROMPT =
  "Korean makjang drama trailer orchestral sting, tense pizzicato strings building into a dramatic minor-key brass and timpani hit, dark suspenseful prime-time television score, 128 BPM, no vocals.";

export const ROFAN_LYRIA_STING_PROMPT =
  "Romantic-fantasy royal court score: harpsichord and strings waltz turning into a dramatic orchestral hit, Korean romance-fantasy drama trailer, instrumental.";
