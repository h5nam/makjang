export interface ChatLine {
  id: number; // 1-indexed line number
  date: string; // e.g., "2026-10-12 23:14"
  user: string; // sender name in chat
  text: string;
}

export interface MemberConfig {
  name: string; // original chat name
  alias: string; // drama alias / display name
  included: boolean; // consent toggle (default true)
  lineCount: number;
  selfieId?: string; // media store ID if selfie attached
  sampleSelfiePath?: string; // path in data/selfies if sample chat
}

export interface EvidenceReceipt {
  line_id: number; // 1-indexed line ID from ChatLine
  text_en: string; // natural English translation of the cited KakaoTalk line
}

export interface SeedItem {
  id: string;
  summary: string;
  summary_en?: string;
  evidence: number[];
  receipts?: EvidenceReceipt[];
  twist_idea: string;
  twist_idea_en?: string;
}

export interface CastMember {
  chat_name: string;
  role_name: string;
  archetype: string;
  secret_ko: string;
  look_en: string;
}

export interface ShotSpec {
  n: number;
  trope_id: string;
  characters: string[]; // chat_name or role_name (max 3)
  speaker: string;
  line_ko: string; // <= 20 Korean syllables
  line_en: string; // natural English subtitle for foreign judges
  scene_ko: string;
  keyframe_prompt_en: string;
  video_prompt_en: string;
  camera_type: "two_shot_confrontation" | "slapstick_water" | "shock_zoom";
  sfx_en: string;
  evidence: number[];
  receipts?: EvidenceReceipt[];
}

export interface ShowrunnerJSON {
  title_ko: string;
  title_en: string;
  logline_ko: string;
  logline_en?: string;
  seeds: SeedItem[];
  cast: CastMember[];
  shots: ShotSpec[];
  narrator_ko: string;
  narrator_en?: string;
}

export type VerifierStage =
  | "v1_existence"
  | "v1_validity"
  | "v1_knowledge"
  | "v1_safety"
  | "v1_syllables"
  | "v2_vision"
  | "v3_audio";

export interface VerifierResult {
  id: string;
  stage: VerifierStage;
  target: string; // e.g., "Shot #2" or "Seed s1"
  status: "pass" | "warn" | "fixing" | "fail";
  detail: string;
  timestamp: number;
}

export type SSEEvent =
  | { type: "status"; status: RunState["status"]; message?: string }
  | { type: "cite_lines"; lineIds: number[] }
  | {
      type: "seeds";
      seeds: SeedItem[];
      title_ko: string;
      title_en: string;
      logline_ko: string;
      logline_en?: string;
    }
  | { type: "cast"; cast: CastMember[] }
  | { type: "verifier"; check: VerifierResult }
  | { type: "script_ready"; script: ShowrunnerJSON }
  | { type: "sheet_ready"; member: string; url: string }
  | { type: "keyframe_ready"; shot: number; url: string }
  | { type: "shot_ready"; shot: number; url: string; dubUrl?: string }
  | { type: "audio_ready"; kind: "narrator" | "sting"; url: string }
  | { type: "audition_selfie"; member: string; selfieUrl: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface RunState {
  id: string;
  createdAt: number;
  roomTitle: string;
  lines: ChatLine[];
  members: MemberConfig[];
  style: "live" | "webtoon";
  excludedTopics: string[];
  quality: "draft" | "final";
  autoApprove: boolean;
  status:
    | "parsed"
    | "consent"
    | "writers_room"
    | "awaiting_approval"
    | "shooting"
    | "premiere"
    | "error";
  argonInteractionId?: string;
  script?: ShowrunnerJSON;
  verifierLog: VerifierResult[];
  characterSheets: Record<string, string>; // chat_name -> /api/media/:id
  keyframes: Record<number, string>; // shot.n -> /api/media/:id
  videos: Record<number, string>; // shot.n -> /api/media/:id
  shotDubs: Record<number, string>; // shot.n -> /api/media/:id (fallback TTS dub)
  narratorAudioUrl?: string;
  stingAudioUrl?: string;
  error?: string;
  events: SSEEvent[];
  listeners: Set<(ev: SSEEvent) => void>;
}
