import { NextRequest, NextResponse } from "next/server";
import {
  extractChatTxtFromZip,
  loadSampleChat,
  parseKakaoChat,
  SampleChatKey,
} from "@/lib/parser";
import { saveRun } from "@/lib/store";
import { RunState } from "@/lib/types";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sampleKey, text, zipBase64, filename } = body as {
      sampleKey?: SampleChatKey;
      text?: string;
      zipBase64?: string;
      filename?: string;
    };

    let parsed: ReturnType<typeof parseKakaoChat>;
    if (sampleKey) {
      parsed = loadSampleChat(sampleKey);
    } else if (zipBase64) {
      const zipBuf = Buffer.from(zipBase64, "base64");
      const { content } = extractChatTxtFromZip(zipBuf);
      parsed = parseKakaoChat(content, filename || "WhatsApp_Chat.zip");
    } else {
      parsed = parseKakaoChat(text || "", filename || "KakaoTalk_Chat.txt");
    }

    if (!parsed.lines || parsed.lines.length === 0) {
      return NextResponse.json(
        { error: "유효한 카카오톡·WhatsApp 대화를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID().slice(0, 8);
    const qualityEnv = process.env.QUALITY === "final" ? "final" : "draft";

    const run: RunState = {
      id: runId,
      createdAt: Date.now(),
      roomTitle: parsed.roomTitle,
      lines: parsed.lines,
      members: parsed.members,
      chatLang: parsed.chatLang,
      sourceFormat: parsed.sourceFormat,
      style: "live",
      excludedTopics: [],
      quality: qualityEnv,
      autoApprove: false,
      status: "consent",
      verifierLog: [],
      characterSheets: {},
      keyframes: {},
      videos: {},
      shotDubs: {},
      events: [],
      listeners: new Set(),
    };

    saveRun(run);

    return NextResponse.json({
      runId,
      roomTitle: run.roomTitle,
      lineCount: run.lines.length,
      members: run.members,
      lines: run.lines,
      chatLang: run.chatLang,
      sourceFormat: run.sourceFormat,
      sampleKey: sampleKey || null,
    });
  } catch (err: any) {
    console.error("Parse API error:", err);
    return NextResponse.json(
      { error: err?.message || "대화 파일 파싱 실패" },
      { status: 500 }
    );
  }
}
