import Papa from "papaparse";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ChatLine, ChatLineKind, MemberConfig } from "./types";
import { saveMedia } from "./store";

const SAMPLE_SELFIE_MAP: Record<string, Record<string, string>> = {
  A_friends: {
    민지: "A_minji.jpg",
    지훈: "A_jihoon.jpg",
    서연: "A_seoyeon.jpg",
    도윤: "A_doyun.jpg",
    하은: "A_haeun.jpg",
  },
  B_family: {
    엄마: "B_mom.jpg",
    아빠: "B_dad.jpg",
    수진: "B_sujin.jpg",
    민수: "B_minsu.jpg",
    이모: "B_imo.jpg",
  },
  C_work: {
    태현: "C_taehyun.jpg",
    유나: "C_yuna.jpg",
    성민: "C_sungmin.jpg",
    지아: "C_jia.jpg",
  },
  D_seoul_squad: {
    Emma: "D_emma.jpg",
    Lucas: "D_lucas.jpg",
    Priya: "D_priya.jpg",
    Kenji: "D_kenji.jpg",
    Mia: "D_mia.jpg",
  },
};

export type SampleChatKey =
  | "A_friends"
  | "B_family"
  | "C_work"
  | "D_seoul_squad";

function stripInvisibleChars(str: string): string {
  return str
    .replace(/[\uFEFF\u200E\u200F]/g, "")
    .replace(/[\u202F\u00A0]/g, " ");
}

/**
 * Extracts `_chat.txt` (or the first `.txt` entry) from a `.zip` buffer
 * using Node's built-in `zlib`.
 */
export function extractChatTxtFromZip(zipBuffer: Buffer): {
  content: string;
  innerFilename: string;
  roomTitleFromZip?: string;
} {
  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, zipBuffer.length - 65557);
  for (let i = zipBuffer.length - 22; i >= minEocdSearch; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  interface ZipEntryMeta {
    name: string;
    compressionMethod: number;
    compressedSize: number;
    localHeaderOffset: number;
  }

  const entries: ZipEntryMeta[] = [];

  if (eocdOffset !== -1) {
    const cdCount = zipBuffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
    let ptr = cdOffset;
    for (let i = 0; i < cdCount && ptr + 46 <= zipBuffer.length; i++) {
      if (zipBuffer.readUInt32LE(ptr) !== 0x02014b50) break;
      const compressionMethod = zipBuffer.readUInt16LE(ptr + 10);
      const compressedSize = zipBuffer.readUInt32LE(ptr + 20);
      const nameLen = zipBuffer.readUInt16LE(ptr + 28);
      const extraLen = zipBuffer.readUInt16LE(ptr + 30);
      const commentLen = zipBuffer.readUInt16LE(ptr + 32);
      const localHeaderOffset = zipBuffer.readUInt32LE(ptr + 42);
      const name = zipBuffer
        .subarray(ptr + 46, ptr + 46 + nameLen)
        .toString("utf-8");
      entries.push({
        name,
        compressionMethod,
        compressedSize,
        localHeaderOffset,
      });
      ptr += 46 + nameLen + extraLen + commentLen;
    }
  } else {
    // Fallback: scan local file headers (0x04034b50)
    let ptr = 0;
    while (ptr + 30 <= zipBuffer.length) {
      if (zipBuffer.readUInt32LE(ptr) !== 0x04034b50) break;
      const compressionMethod = zipBuffer.readUInt16LE(ptr + 8);
      const compressedSize = zipBuffer.readUInt32LE(ptr + 18);
      const nameLen = zipBuffer.readUInt16LE(ptr + 26);
      const extraLen = zipBuffer.readUInt16LE(ptr + 28);
      const name = zipBuffer
        .subarray(ptr + 30, ptr + 30 + nameLen)
        .toString("utf-8");
      entries.push({
        name,
        compressionMethod,
        compressedSize,
        localHeaderOffset: ptr,
      });
      ptr += 30 + nameLen + extraLen + compressedSize;
    }
  }

  const txtEntries = entries.filter(
    (e) =>
      !e.name.startsWith("__MACOSX/") &&
      !e.name.split("/").pop()?.startsWith("._") &&
      e.name.toLowerCase().endsWith(".txt")
  );

  const chosen =
    txtEntries.find((e) => e.name === "_chat.txt" || e.name.endsWith("/_chat.txt")) ||
    txtEntries[0];

  if (!chosen) {
    throw new Error("ZIP 파일 안에서 대화 텍스트(.txt) 파일을 찾을 수 없습니다.");
  }

  const lho = chosen.localHeaderOffset;
  if (zipBuffer.readUInt32LE(lho) !== 0x04034b50) {
    throw new Error("유효하지 않은 ZIP 로컬 헤더입니다.");
  }
  const localNameLen = zipBuffer.readUInt16LE(lho + 26);
  const localExtraLen = zipBuffer.readUInt16LE(lho + 28);
  const dataStart = lho + 30 + localNameLen + localExtraLen;
  const compressedSlice = zipBuffer.subarray(
    dataStart,
    dataStart + chosen.compressedSize
  );

  let rawBuffer: Buffer;
  if (chosen.compressionMethod === 0) {
    rawBuffer = compressedSlice;
  } else if (chosen.compressionMethod === 8) {
    rawBuffer = zlib.inflateRawSync(compressedSlice);
  } else {
    throw new Error(`지원하지 않는 ZIP 압축 방식입니다 (${chosen.compressionMethod}).`);
  }

  return {
    content: rawBuffer.toString("utf-8"),
    innerFilename: path.basename(chosen.name),
  };
}

function classifyChatLineKind(rawBody: string): {
  text: string;
  kind: ChatLineKind;
} {
  const cleaned = stripInvisibleChars(rawBody)
    .replace(/\s*<This message was edited>\s*$/i, "")
    .trim();

  if (
    /^<Media omitted>$/i.test(cleaned) ||
    /^image omitted$/i.test(cleaned) ||
    /^<attached:\s*.*PHOTO.*\.(jpg|jpeg|png|webp|heic)>$/i.test(cleaned) ||
    /^사진(\s+\d+장)?$/.test(cleaned)
  ) {
    return { text: cleaned, kind: "photo" };
  }

  if (
    /^video omitted$/i.test(cleaned) ||
    /^<attached:\s*.*VIDEO.*\.(mp4|mov)>$/i.test(cleaned) ||
    /^동영상$/.test(cleaned)
  ) {
    return { text: cleaned, kind: "video" };
  }

  if (
    /^audio omitted$/i.test(cleaned) ||
    /^<attached:\s*.*AUDIO.*\.(opus|m4a|mp3|wav)>$/i.test(cleaned) ||
    /^음성메시지$/.test(cleaned)
  ) {
    return { text: cleaned, kind: "audio" };
  }

  if (
    /^(sticker|GIF) omitted$/i.test(cleaned) ||
    /^<attached:\s*.*STICKER.*>$/i.test(cleaned) ||
    /^이모티콘$/.test(cleaned)
  ) {
    return { text: cleaned, kind: "emoticon" };
  }

  if (
    /^This message was deleted\.?$/i.test(cleaned) ||
    /^You deleted this message\.?$/i.test(cleaned) ||
    /^삭제된 메시지입니다\.?$/.test(cleaned)
  ) {
    return { text: cleaned, kind: "deleted" };
  }

  if (/^https?:\/\/\S+$/i.test(cleaned)) {
    return { text: cleaned, kind: "link" };
  }

  return { text: cleaned, kind: "text" };
}

export function detectChatLanguage(lines: ChatLine[]): "ko" | "en" {
  let hangulCount = 0;
  let latinCount = 0;

  for (const line of lines) {
    if (line.user === "SYSTEM" || line.kind === "system") continue;
    const text = line.text || "";
    const hangulMatches = text.match(/[\uAC00-\uD7A3]/g);
    const latinMatches = text.match(/[A-Za-z]/g);
    if (hangulMatches) hangulCount += hangulMatches.length;
    if (latinMatches) latinCount += latinMatches.length;
  }

  if (hangulCount === 0 && latinCount === 0) return "ko";
  // If Hangul characters make up at least 20% of Latin characters, treat as Korean chat
  return hangulCount >= latinCount * 0.2 ? "ko" : "en";
}

function parseKoreanAmPmTime(
  ampm: string,
  hm: string
): { hhmm: string; minutes: number } {
  const parts = hm.split(":");
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || "0", 10);

  if (ampm === "오후" && h < 12) h += 12;
  if (ampm === "오전" && h === 12) h = 0;

  const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { hhmm, minutes: h * 60 + m };
}

function addOneDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const WHATSAPP_LINE_RE =
  /^\[?(?<date>\d{1,4}[./-]\s?\d{1,2}[./-]\s?\d{1,4}\.?),?\s+(?<time>(?:오전|오후)?\s?\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)\]?(?:\s-\s|\s)(?<rest>.*)$/;

function detectSourceFormat(
  content: string,
  filename: string
): "kakao_csv" | "kakao_txt" | "whatsapp" {
  const nonEmptyLines = content
    .split(/\r?\n/)
    .map((l) => stripInvisibleChars(l).trim())
    .filter(Boolean)
    .slice(0, 12);

  const firstLine = nonEmptyLines[0] || "";
  if (
    filename.toLowerCase().endsWith(".csv") ||
    /^Date\s*,\s*User\s*,\s*Message/i.test(firstLine)
  ) {
    return "kakao_csv";
  }

  for (const l of nonEmptyLines) {
    if (
      l.includes("님과 카카오톡 대화") ||
      l.startsWith("저장한 날짜") ||
      /^-{3,}\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(l) ||
      /^\[[^\]]+\]\s*\[(오전|오후)\s*\d{1,2}:\d{2}\]/.test(l) ||
      /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(오전|오후)\s*\d{1,2}:\d{2},/.test(l)
    ) {
      return "kakao_txt";
    }
  }

  for (const l of nonEmptyLines) {
    if (WHATSAPP_LINE_RE.test(l)) {
      return "whatsapp";
    }
  }

  return "kakao_txt";
}

export function parseKakaoChat(
  rawContent: string,
  filename = "KakaoTalk_Chat.txt"
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
  chatLang: "ko" | "en";
  sourceFormat: "kakao" | "whatsapp";
} {
  const content = rawContent.replace(/^\uFEFF/, "");
  const format = detectSourceFormat(content, filename);

  if (format === "whatsapp") {
    const parsed = parseWhatsAppExport(content, filename);
    return {
      ...parsed,
      chatLang: detectChatLanguage(parsed.lines),
      sourceFormat: "whatsapp",
    };
  }

  const parsed =
    format === "kakao_csv"
      ? parseCsvExport(content, filename)
      : parseTxtExport(content, filename);

  return {
    ...parsed,
    chatLang: detectChatLanguage(parsed.lines),
    sourceFormat: "kakao",
  };
}

function cleanRoomTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.(csv|txt|zip)$/i, "")
    .replace(/^KakaoTalk_Chat_?/i, "")
    .replace(/^WhatsApp Chat with\s+/i, "")
    .replace(/^WhatsApp Chat\s*-\s*/i, "")
    .replace(/^_chat$/i, "")
    .trim();
}

function parseWhatsAppTime(rawTime: string): string {
  const t = stripInvisibleChars(rawTime).trim();
  const koMatch = t.match(/^(오전|오후)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (koMatch) {
    return parseKoreanAmPmTime(koMatch[1], `${koMatch[2]}:${koMatch[3]}`).hhmm;
  }

  const enMatch = t.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([APap]\.?[Mm]\.?))?$/
  );
  if (!enMatch) return "09:00";

  let h = parseInt(enMatch[1], 10);
  const m = parseInt(enMatch[2], 10);
  const mer = (enMatch[3] || "").replace(/\./g, "").toUpperCase();

  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isWhatsAppSystemBody(body: string): boolean {
  const b = stripInvisibleChars(body).trim();
  return (
    /^Messages and calls are end-to-end encrypted/i.test(b) ||
    /created group\s+["“].+["”]/i.test(b) ||
    /^.+ added .+$/i.test(b) ||
    /^.+ left$/i.test(b) ||
    /^.+ removed .+$/i.test(b) ||
    /^.+ joined using this group's invite link$/i.test(b) ||
    /^.+ changed (the subject|this group's icon|their phone number)/i.test(b) ||
    /security code with .+ changed/i.test(b)
  );
}

function parseWhatsAppExport(
  content: string,
  filename: string
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  const rawLines = content.split(/\r?\n/);
  let roomTitle = cleanRoomTitleFromFilename(filename);

  // First pass: infer date order (DD/MM vs MM/DD) and detect group name
  let ddmmVotes = 0;
  let mmddVotes = 0;
  let detectedGroupName = "";

  for (const rawLine of rawLines) {
    const cleaned = stripInvisibleChars(rawLine);
    const m = cleaned.match(WHATSAPP_LINE_RE);
    if (!m || !m.groups) continue;

    const dateParts = m.groups.date
      .replace(/\.$/, "")
      .split(/[./-]/)
      .map((s) => parseInt(s.trim(), 10));

    if (dateParts.length === 3 && dateParts[0] < 1000) {
      const [p0, p1] = dateParts;
      if (p0 > 12 && p1 <= 12) ddmmVotes++;
      else if (p1 > 12 && p0 <= 12) mmddVotes++;
    }

    const rest = m.groups.rest;
    const groupCreateMatch = rest.match(/created group\s+["“](.+?)["”]/i);
    if (groupCreateMatch) {
      detectedGroupName = groupCreateMatch[1].trim();
    } else if (!detectedGroupName) {
      const colonIdx = rest.indexOf(":");
      if (colonIdx > 0) {
        const candidateSender = rest.slice(0, colonIdx).trim();
        const candidateBody = stripInvisibleChars(rest.slice(colonIdx + 1)).trim();
        if (
          /^Messages and calls are end-to-end encrypted/i.test(candidateBody)
        ) {
          detectedGroupName = candidateSender;
        }
      }
    }
  }

  if (detectedGroupName) {
    roomTitle = detectedGroupName;
  }

  const preferMmDd = mmddVotes > ddmmVotes;
  const lines: ChatLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const cleanedLine = stripInvisibleChars(rawLine);
    if (!cleanedLine.trim()) continue;

    const m = cleanedLine.match(WHATSAPP_LINE_RE);
    if (m && m.groups) {
      const rawDate = m.groups.date.replace(/\.$/, "");
      const parts = rawDate.split(/[./-]/).map((s) => parseInt(s.trim(), 10));
      let year = 2026;
      let month = 1;
      let day = 1;

      if (parts.length === 3) {
        if (parts[0] >= 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else {
          year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
          if (parts[0] > 12 && parts[1] <= 12) {
            day = parts[0];
            month = parts[1];
          } else if (parts[1] > 12 && parts[0] <= 12) {
            month = parts[0];
            day = parts[1];
          } else if (preferMmDd) {
            month = parts[0];
            day = parts[1];
          } else {
            day = parts[0];
            month = parts[1];
          }
        }
      }

      const isoDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hhmm = parseWhatsAppTime(m.groups.time);
      const dateStr = `${isoDate} ${hhmm}`;
      const rest = m.groups.rest;

      // Determine sender vs system line
      const senderMatch = rest.match(/^([^:]{1,50}):\s*(.*)$/);
      if (!senderMatch) {
        lines.push({
          id: lines.length + 1,
          date: dateStr,
          user: "SYSTEM",
          text: stripInvisibleChars(rest).trim(),
          kind: "system",
        });
        continue;
      }

      const sender = stripInvisibleChars(senderMatch[1]).trim();
      const rawBody = senderMatch[2];

      if (
        (detectedGroupName && sender === detectedGroupName) ||
        isWhatsAppSystemBody( sender ) ||
        (isWhatsAppSystemBody(rawBody) &&
          (/^Messages and calls are end-to-end encrypted/i.test(
            stripInvisibleChars(rawBody).trim()
          ) ||
            /created group\s+["“].+["”]/i.test(rawBody) ||
            /^.+ (added|removed) .+$/i.test(
              stripInvisibleChars(rawBody).trim()
            ) ||
            /^.+ left$/i.test(stripInvisibleChars(rawBody).trim())))
      ) {
        lines.push({
          id: lines.length + 1,
          date: dateStr,
          user: "SYSTEM",
          text: stripInvisibleChars(rawBody).trim(),
          kind: "system",
        });
        continue;
      }

      const { text, kind } = classifyChatLineKind(rawBody);
      lines.push({
        id: lines.length + 1,
        date: dateStr,
        user: sender,
        text,
        kind,
      });
      continue;
    }

    // Multi-line continuation
    if (lines.length > 0) {
      lines[lines.length - 1].text += `\n${cleanedLine}`;
    }
  }

  return {
    roomTitle: roomTitle || detectedGroupName || "Group Chat",
    lines,
    members: extractMembers(lines),
  };
}

function parseCsvExport(
  content: string,
  filename: string
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  const roomTitle = cleanRoomTitleFromFilename(filename);

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const lines: ChatLine[] = [];
  let prevDate = "2026-07-01 09:00";

  for (const row of parsed.data) {
    const rawDate = (row.Date || row.date || "").trim();
    const rawUser = (row.User || row.user || "").trim();
    const rawMessage = (row.Message || row.message || "").trim();

    if (!rawMessage && !rawUser) continue;

    const date = rawDate ? rawDate.slice(0, 16) : prevDate;
    if (rawDate) prevDate = date;

    const user = rawUser || "(알 수 없음)";
    const { text, kind } = classifyChatLineKind(rawMessage);
    lines.push({
      id: lines.length + 1,
      date,
      user,
      text,
      kind,
    });
  }

  return {
    roomTitle: roomTitle || "단톡방",
    lines,
    members: extractMembers(lines),
  };
}

function parseTxtExport(
  content: string,
  filename: string
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  const rawLines = content.split(/\r?\n/);
  let roomTitle = cleanRoomTitleFromFilename(filename);
  let currentDate = "2026-07-01";
  let lastMinutesOfDay = -1;
  const lines: ChatLine[] = [];

  if (rawLines[0]?.includes("님과 카카오톡 대화")) {
    roomTitle = rawLines[0].replace(/\s*님과 카카오톡 대화.*$/, "").trim();
  }

  const dateSepRe =
    /^-{3,}\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*-{3,}$/;
  const winMsgRe = /^\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}:\d{2})\]\s*(.*)$/;
  const mobileMsgRe =
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}:\d{2}),\s*([^:]+?)\s*:\s*(.*)$/;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      i <= 2 &&
      (trimmed.includes("님과 카카오톡 대화") ||
        trimmed.startsWith("저장한 날짜"))
    ) {
      continue;
    }

    const dateMatch = trimmed.match(dateSepRe);
    if (dateMatch) {
      const y = dateMatch[1];
      const m = dateMatch[2].padStart(2, "0");
      const d = dateMatch[3].padStart(2, "0");
      currentDate = `${y}-${m}-${d}`;
      lastMinutesOfDay = -1;
      continue;
    }

    const winMatch = line.match(winMsgRe);
    if (winMatch) {
      const user = winMatch[1].trim();
      const ampm = winMatch[2];
      const hm = winMatch[3];
      const rawText = winMatch[4];
      const { hhmm, minutes } = parseKoreanAmPmTime(ampm, hm);

      // Midnight rollover check when date separator was omitted
      if (lastMinutesOfDay !== -1 && minutes < lastMinutesOfDay - 60) {
        currentDate = addOneDay(currentDate);
      }
      lastMinutesOfDay = minutes;

      const { text, kind } = classifyChatLineKind(rawText);
      lines.push({
        id: lines.length + 1,
        date: `${currentDate} ${hhmm}`,
        user,
        text,
        kind,
      });
      continue;
    }

    const mobileMatch = line.match(mobileMsgRe);
    if (mobileMatch) {
      const y = mobileMatch[1];
      const m = mobileMatch[2].padStart(2, "0");
      const d = mobileMatch[3].padStart(2, "0");
      const ampm = mobileMatch[4];
      const hm = mobileMatch[5];
      const user = mobileMatch[6].trim();
      const rawText = mobileMatch[7];
      currentDate = `${y}-${m}-${d}`;
      const { hhmm, minutes } = parseKoreanAmPmTime(ampm, hm);
      lastMinutesOfDay = minutes;

      const { text, kind } = classifyChatLineKind(rawText);
      lines.push({
        id: lines.length + 1,
        date: `${currentDate} ${hhmm}`,
        user,
        text,
        kind,
      });
      continue;
    }

    if (
      /님이 나갔습니다\.?$/.test(trimmed) ||
      /님을 초대했습니다\.?$/.test(trimmed) ||
      /님이 들어왔습니다\.?$/.test(trimmed)
    ) {
      const prevDate =
        lines.length > 0 ? lines[lines.length - 1].date : `${currentDate} 09:00`;
      lines.push({
        id: lines.length + 1,
        date: prevDate,
        user: "SYSTEM",
        text: trimmed,
        kind: "system",
      });
      continue;
    }

    // Continuation of previous multiline message
    if (lines.length > 0) {
      lines[lines.length - 1].text += `\n${line}`;
    }
  }

  return {
    roomTitle: roomTitle || "단톡방",
    lines,
    members: extractMembers(lines),
  };
}

function extractMembers(lines: ChatLine[]): MemberConfig[] {
  const counts = new Map<string, number>();

  for (const l of lines) {
    if (
      !l.user ||
      l.user === "SYSTEM" ||
      l.user === "(알 수 없음)" ||
      l.kind === "system"
    ) {
      continue;
    }
    counts.set(l.user, (counts.get(l.user) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, lineCount]) => ({
      name,
      alias: name,
      included: true,
      lineCount,
    }));
}

export function loadSampleChat(sampleKey: SampleChatKey): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
  chatLang: "ko" | "en";
  sourceFormat: "kakao" | "whatsapp";
} {
  const fileName =
    sampleKey === "D_seoul_squad"
      ? "D_seoul_squad_ios.txt"
      : `${sampleKey}.txt`;

  const filePath = path.join(process.cwd(), "data", "chats", fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = parseKakaoChat(raw, fileName);

  // Pre-attach sample selfies per member (User Decision #2)
  const selfieMap = SAMPLE_SELFIE_MAP[sampleKey] || {};
  for (const member of parsed.members) {
    const selfieFile = selfieMap[member.name];
    if (selfieFile) {
      const selfiePath = path.join(
        process.cwd(),
        "data",
        "selfies",
        selfieFile
      );
      if (fs.existsSync(selfiePath)) {
        const buf = fs.readFileSync(selfiePath);
        const mediaId = saveMedia(
          buf,
          "image/jpeg",
          `sample_${sampleKey}_${Buffer.from(member.name).toString("hex")}`
        );
        member.selfieId = mediaId;
        member.sampleSelfiePath = selfieFile;
      }
    }
  }

  return parsed;
}
