export type ChatLineKind =
  | "text"
  | "photo"
  | "video"
  | "emoticon"
  | "link"
  | "deleted"
  | "system";

export interface ChatLine {
  id: string; // e.g. "L37"
  ts: string; // ISO string or "YYYY-MM-DD HH:mm"
  speaker: string;
  text: string;
  kind: ChatLineKind;
}

export interface MemberConfig {
  name: string;
  alias: string;
  consented: boolean;
  selfieMediaId?: string;
  selfieSource?: "sample" | "audition" | "none";
  messageCount: number;
  sampleLine: string;
}

export type VisualStyle = "photoreal" | "webtoon";

export interface CastMember {
  name: string;
  originalName?: string;
  archetype_ko: string;
  why_en: string;
  evidence: string[];
  look_en: string;
  screen_side?: "LEFT" | "RIGHT";
  never?: string;
  sheetMediaId?: string;
}

export interface SeedItem {
  event_ko: string;
  evidence: string[];
  makjang_twist_ko: string;
}

export interface TrailerShot {
  shot: number;
  setting_en: string;
  characters: string[];
  action_en: string;
  motive_en?: string;
  laugh_beat?: string;
  prop_en?: string;
  line_ko: string;
  speaker: string;
  evidence: string[];
  trope_ko: string;
  keyframeMediaId?: string;
  videoMediaId?: string;
  dubAudioMediaId?: string;
  liteMode?: boolean;
  visionScore?: number;
  cerScore?: number;
  transcript?: string;
}

export interface ShowrunnerJSON {
  title_ko: string;
  logline_en: string;
  cast: CastMember[];
  seeds: SeedItem[];
  trailer: TrailerShot[];
  narration_ko: string[];
}

export type VerifierCheckType =
  | "evidence"
  | "validity"
  | "knowledge"
  | "safety"
  | "syllables"
  | "consistency"
  | "lipsync";

export interface VerifierResult {
  id: string;
  check: VerifierCheckType;
  target: string;
  pass: boolean;
  status: "warn" | "fixing" | "pass";
  reason_ko: string;
  fix_hint?: string;
  timestamp: string;
}

export type RunPhase =
  | "draft" // parsed, waiting on Cast & Consent (HITL #1)
  | "writers_room" // Argon showrunner + Verifier #1 + sheets
  | "awaiting_approval" // HITL #2 waiting on user click (unless autoApprove)
  | "shooting" // Keyframes + Verifier #2 + Omni x5 + Verifier #3 + TTS + Lyria
  | "premiere" // Ready to play
  | "error";

export interface SSEEvent {
  seq: number;
  type:
    | "phase"
    | "status"
    | "cite_lines"
    | "seeds"
    | "cast"
    | "script"
    | "verifier"
    | "sheet_ready"
    | "keyframe_ready"
    | "shot_ready"
    | "audio_ready"
    | "member_updated"
    | "complete"
    | "error";
  payload: Record<string, unknown>;
  ts: string;
}

export interface RunState {
  id: string;
  createdAt: number;
  roomTitle: string;
  sampleKey?: "A_friends" | "B_family" | "C_work";
  lines: ChatLine[];
  members: MemberConfig[];
  style: VisualStyle;
  excludedTopics: string;
  autoApprove: boolean;
  quality: "draft" | "final";
  liteModeForced?: boolean;
  phase: RunPhase;
  statusMessage: string;
  citedLineIds: string[];
  script?: ShowrunnerJSON;
  verifiers: VerifierResult[];
  narratorAudioMediaId?: string;
  stingAudioMediaId?: string;
  endingAudioMediaId?: string;
  error?: string;
  events: SSEEvent[];
  listeners: Set<(ev: SSEEvent) => void>;
  approvalResolver?: () => void;
}
