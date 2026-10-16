import { GoogleGenAI } from "@google/genai";
import { ShowrunnerJSON } from "./types";
import { NARRATOR_VOICE_PROMPT, LYRIA_STING_PROMPT } from "./prompts";
import { getStore } from "./store";

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export function cleanJsonText(raw: string): string {
  let text = (raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function normalizeShowrunnerJSON(raw: any): ShowrunnerJSON {
  if (!raw || typeof raw !== "object") return raw;
  const normalizeItem = (item: any) => {
    const rawEv = Array.isArray(item.evidence) ? item.evidence : [];
    const rawReceipts = Array.isArray(item.receipts) ? item.receipts : [];
    const evidenceNums: number[] = [];
    const receiptsMap = new Map<number, string>();

    for (const r of rawReceipts) {
      if (r && typeof r.line_id === "number") {
        receiptsMap.set(r.line_id, String(r.text_en || ""));
      }
    }
    for (const ev of rawEv) {
      if (typeof ev === "number") {
        evidenceNums.push(ev);
      } else if (ev && typeof ev === "object" && typeof ev.line_id === "number") {
        evidenceNums.push(ev.line_id);
        if (ev.text_en) receiptsMap.set(ev.line_id, String(ev.text_en));
      }
    }
    if (evidenceNums.length === 0 && receiptsMap.size > 0) {
      evidenceNums.push(...Array.from(receiptsMap.keys()));
    }
    item.evidence = Array.from(new Set(evidenceNums));
    item.receipts = item.evidence.map((id: number) => ({
      line_id: id,
      text_en: receiptsMap.get(id) || "",
    }));
  };

  if (Array.isArray(raw.seeds)) {
    for (const s of raw.seeds) normalizeItem(s);
  }
  if (Array.isArray(raw.shots)) {
    for (const sh of raw.shots) {
      normalizeItem(sh);
      if (!sh.line_en) sh.line_en = "";
    }
  }
  return raw as ShowrunnerJSON;
}

export async function runShowrunnerArgon(prompt: string): Promise<{
  data: ShowrunnerJSON;
  interactionId: string;
}> {
  const ai = getAI();
  // NEVER pass temperature or top_p to gemini-4-argon
  const interaction = await (ai.interactions as any).create({
    model: "gemini-4-argon",
    input: prompt,
    generation_config: { thinking_level: "medium" },
    response_format: { type: "text", mime_type: "application/json" },
  });

  const text = cleanJsonText(interaction.output_text || "");
  const data = normalizeShowrunnerJSON(JSON.parse(text));
  return {
    data,
    interactionId: interaction.id || "",
  };
}

export async function patchShowrunnerArgon(
  previousInteractionId: string,
  patchPrompt: string
): Promise<{
  data: ShowrunnerJSON;
  interactionId: string;
}> {
  const ai = getAI();
  const interaction = await (ai.interactions as any).create({
    model: "gemini-4-argon",
    previous_interaction_id: previousInteractionId,
    input: patchPrompt,
    generation_config: { thinking_level: "medium" },
    response_format: { type: "text", mime_type: "application/json" },
  });

  const text = cleanJsonText(interaction.output_text || "");
  const data = normalizeShowrunnerJSON(JSON.parse(text));
  return {
    data,
    interactionId: interaction.id || previousInteractionId,
  };
}

export async function runFlashJson<T>(
  prompt: string,
  model: "gemini-3.8-flash" | "gemini-3.5-flash-lite" = "gemini-3.8-flash"
): Promise<T> {
  const ai = getAI();
  const interaction = await (ai.interactions as any).create({
    model,
    input: prompt,
    generation_config: { thinking_level: "low" },
    response_format: { type: "text", mime_type: "application/json" },
  });
  const text = cleanJsonText(interaction.output_text || "{}");
  return JSON.parse(text) as T;
}

export async function generateNanoBananaImage(options: {
  prompt: string;
  aspectRatio: "3:4" | "16:9";
  referenceImagesB64?: Array<{ data: string; mimeType?: string }>;
}): Promise<Buffer> {
  const ai = getAI();
  const inputParts: any[] = [];
  if (options.referenceImagesB64 && options.referenceImagesB64.length > 0) {
    // Max 4 reference images allowed by gemini-nano-banana-2.1
    for (const ref of options.referenceImagesB64.slice(0, 4)) {
      inputParts.push({
        type: "image",
        mime_type: ref.mimeType || "image/jpeg",
        data: ref.data,
      });
    }
  }
  inputParts.push({
    type: "text",
    text: options.prompt,
  });

  const interaction = await (ai.interactions as any).create({
    model: "gemini-nano-banana-2.1",
    input: inputParts.length === 1 ? options.prompt : inputParts,
    response_format: {
      type: "image",
      mime_type: "image/jpeg",
      aspect_ratio: options.aspectRatio,
      image_size: "1K",
    },
  });

  const b64 = interaction.output_image?.data;
  if (!b64) {
    throw new Error("gemini-nano-banana-2.1 returned no image data");
  }
  return Buffer.from(b64, "base64");
}

export async function verifyVisionConsistency(options: {
  sheetBuffers: Buffer[];
  keyframeBuffer: Buffer;
  prompt: string;
}): Promise<{
  score: number;
  pass: boolean;
  drift_detail: string;
  fix_instruction_en?: string;
}> {
  const ai = getAI();
  const inputParts: any[] = [];
  for (const sheet of options.sheetBuffers.slice(0, 3)) {
    inputParts.push({
      type: "image",
      mime_type: "image/jpeg",
      data: sheet.toString("base64"),
    });
  }
  inputParts.push({
    type: "image",
    mime_type: "image/jpeg",
    data: options.keyframeBuffer.toString("base64"),
  });
  inputParts.push({
    type: "text",
    text: options.prompt,
  });

  const interaction = await (ai.interactions as any).create({
    model: "gemini-3.8-flash",
    input: inputParts,
    generation_config: { thinking_level: "low" },
    response_format: { type: "text", mime_type: "application/json" },
  });

  const text = cleanJsonText(interaction.output_text || "{}");
  return JSON.parse(text);
}

export async function verifyVideoFramesNoText(
  frameBuffers: Buffer[]
): Promise<{
  has_text: boolean;
  detail_ko: string;
}> {
  if (!frameBuffers || frameBuffers.length === 0) {
    return { has_text: false, detail_ko: "프레임 텍스트 없음" };
  }
  const ai = getAI();
  const inputParts: any[] = [];
  for (const buf of frameBuffers.slice(0, 2)) {
    inputParts.push({
      type: "image",
      mime_type: "image/jpeg",
      data: buf.toString("base64"),
    });
  }
  inputParts.push({
    type: "text",
    text: `Inspect these 2 video frames (middle frame and last frame).
Are there any visible burned-in subtitles, captions, speech bubbles, or overlay text/letters in the frame?
(Ignore tiny background props like distant street signs unless there are subtitle/caption overlays or prominent letters.)
Respond ONLY in JSON:
{
  "has_text": false,
  "detail_ko": "화면 내 자막·캡션 없음 확인"
}`,
  });

  const interaction = await (ai.interactions as any).create({
    model: "gemini-3.8-flash",
    input: inputParts,
    generation_config: { thinking_level: "low" },
    response_format: { type: "text", mime_type: "application/json" },
  });

  const text = cleanJsonText(interaction.output_text || "{}");
  const parsed = JSON.parse(text);
  return {
    has_text: Boolean(parsed.has_text),
    detail_ko: String(parsed.detail_ko || (parsed.has_text ? "화면 내 자막 감지" : "화면 내 자막 없음")),
  };
}

export async function generateOmniShotVideo(options: {
  keyframeBuffer: Buffer;
  prompt: string;
  quality: "draft" | "final";
  durationSec?: number;
}): Promise<Buffer> {
  const ai = getAI();
  const resolution = options.quality === "final" ? "720p" : "360p";
  const clampedSec = Math.min(
    8,
    Math.max(6, Math.round(options.durationSec || (options.quality === "final" ? 8 : 6)))
  );
  const duration = options.quality === "final" ? "8s" : `${clampedSec}s`;

  const interaction = await (ai.interactions as any).create({
    model: "gemini-omni-1.1-flash",
    input: [
      {
        type: "image",
        mime_type: "image/jpeg",
        data: options.keyframeBuffer.toString("base64"),
      },
      {
        type: "text",
        text: options.prompt,
      },
    ],
    response_format: {
      type: "video",
      resolution,
      duration, // MUST be string e.g. "6s", "7s", "8s"
      aspect_ratio: "16:9",
    },
  });

  const b64 = interaction.output_video?.data;
  if (!b64) {
    throw new Error("gemini-omni-1.1-flash returned no video data");
  }
  return Buffer.from(b64, "base64");
}

export async function transcribeVideoDialogue(videoBuffer: Buffer): Promise<string> {
  const ai = getAI();
  const interaction = await (ai.interactions as any).create({
    model: "gemini-3.8-flash",
    input: [
      {
        type: "video",
        mime_type: "video/mp4",
        data: videoBuffer.toString("base64"),
      },
      {
        type: "text",
        text: "이 영상에서 발화되는 한국어 대사만 정확히 받아쓰시오. 숫자는 아라비아 숫자 대신 한글 발음(예: 사십오만, 삼백이호)으로 적고, 다른 설명이나 따옴표 없이 들리는 한국어 문장만 출력하시오.",
      },
    ],
    generation_config: { thinking_level: "low" },
  });
  return (interaction.output_text || "").trim();
}

export async function ensureNarratorVoiceId(): Promise<string> {
  const store = getStore();
  if (store.narratorVoiceId) {
    return store.narratorVoiceId;
  }
  const ai = getAI();
  const created = await (ai.voices as any).create({
    store: true,
    voice: {
      model: "gemini-3.8-flash-tts",
      type: "prompted",
      display_name: "makjang-narrator-ko",
      gender: "male",
      language_code: "ko-KR",
      prompted: {
        input: NARRATOR_VOICE_PROMPT,
      },
    },
  });
  const voiceId = created.id || created.name || "Charon";
  store.narratorVoiceId = voiceId;
  return voiceId;
}

export async function synthesizeNarratorTTS(text: string): Promise<Buffer> {
  const ai = getAI();
  let voiceId = "Charon";
  try {
    voiceId = await ensureNarratorVoiceId();
  } catch (err) {
    console.warn("Voice design fallback to prebuilt Charon:", err);
  }

  const interaction = await (ai.interactions as any).create({
    model: "gemini-3.8-flash-tts",
    input: [
      {
        type: "user_input",
        content: [{ type: "text", text }],
      },
    ],
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice: voiceId }],
    },
  });

  const b64 = interaction.output_audio?.data;
  if (!b64) {
    throw new Error("gemini-3.8-flash-tts returned no audio data");
  }
  return Buffer.from(b64, "base64");
}

export async function synthesizeCharacterDubTTS(
  lineKo: string,
  genderHint: "female" | "male" = "female"
): Promise<Buffer> {
  const ai = getAI();
  const prebuiltVoice = genderHint === "male" ? "Puck" : "Kore";
  const interaction = await (ai.interactions as any).create({
    model: "gemini-3.8-flash-tts",
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: `[격정적인 한국 막장드라마 연기 톤으로 또렷하게] ${lineKo}`,
          },
        ],
      },
    ],
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice: prebuiltVoice }],
    },
  });

  const b64 = interaction.output_audio?.data;
  if (!b64) {
    throw new Error("Character dub TTS returned no audio data");
  }
  return Buffer.from(b64, "base64");
}

export async function generateLyriaSting(): Promise<Buffer> {
  const ai = getAI();
  const interaction = await (ai.interactions as any).create({
    model: "lyria-3-clip-preview",
    input: LYRIA_STING_PROMPT,
  });
  const b64 = interaction.output_audio?.data;
  if (!b64) {
    throw new Error("lyria-3-clip-preview returned no audio data");
  }
  return Buffer.from(b64, "base64");
}
