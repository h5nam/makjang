import Papa from "papaparse";
import fs from "node:fs";
import path from "node:path";
import { ChatLine, MemberConfig } from "./types";
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
};

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

export function parseKakaoChat(
  rawContent: string,
  filename = "KakaoTalk_Chat.txt"
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  // Strip UTF-8 BOM if present
  const content = rawContent.replace(/^\uFEFF/, "");
  const firstLine = content.split(/\r?\n/)[0]?.trim() || "";

  if (
    filename.toLowerCase().endsWith(".csv") ||
    /^Date\s*,\s*User\s*,\s*Message/i.test(firstLine)
  ) {
    return parseCsvExport(content, filename);
  }
  return parseTxtExport(content, filename);
}

function parseCsvExport(
  content: string,
  filename: string
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  const roomTitle = filename
    .replace(/\.(csv|txt)$/i, "")
    .replace(/^KakaoTalk_Chat_?/i, "")
    .trim();

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
    lines.push({
      id: lines.length + 1,
      date,
      user,
      text: rawMessage,
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
  let roomTitle = filename.replace(/\.(txt|csv)$/i, "");
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
      const text = winMatch[4];
      const { hhmm, minutes } = parseKoreanAmPmTime(ampm, hm);

      // Midnight rollover check when date separator was omitted
      if (lastMinutesOfDay !== -1 && minutes < lastMinutesOfDay - 60) {
        currentDate = addOneDay(currentDate);
      }
      lastMinutesOfDay = minutes;

      lines.push({
        id: lines.length + 1,
        date: `${currentDate} ${hhmm}`,
        user,
        text,
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
      const text = mobileMatch[7];
      currentDate = `${y}-${m}-${d}`;
      const { hhmm, minutes } = parseKoreanAmPmTime(ampm, hm);
      lastMinutesOfDay = minutes;

      lines.push({
        id: lines.length + 1,
        date: `${currentDate} ${hhmm}`,
        user,
        text,
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
    if (!l.user || l.user === "SYSTEM" || l.user === "(알 수 없음)") {
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

export function loadSampleChat(
  sampleKey: "A_friends" | "B_family" | "C_work"
): {
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
} {
  const filePath = path.join(
    process.cwd(),
    "data",
    "chats",
    `${sampleKey}.txt`
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = parseKakaoChat(raw, `${sampleKey}.txt`);

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
