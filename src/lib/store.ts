import { RunState, SSEEvent } from "./types";
import crypto from "node:crypto";

export interface StoredMedia {
  id: string;
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

export interface MakjangGlobalStore {
  runs: Map<string, RunState>;
  media: Map<string, StoredMedia>;
  narratorVoiceId?: string;
}

const globalForMakjang = globalThis as unknown as {
  __makjangStore?: MakjangGlobalStore;
};

if (!globalForMakjang.__makjangStore) {
  globalForMakjang.__makjangStore = {
    runs: new Map(),
    media: new Map(),
  };
}

export const store = globalForMakjang.__makjangStore;

export function getStore(): MakjangGlobalStore {
  return store;
}

const MAX_RUNS = 8;
const MAX_MEDIA = 200;

export function saveRun(run: RunState): RunState {
  store.runs.set(run.id, run);
  if (store.runs.size > MAX_RUNS) {
    const oldest = Array.from(store.runs.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    )[0];
    if (oldest && oldest.id !== run.id) {
      store.runs.delete(oldest.id);
    }
  }
  return run;
}

export function getRun(id: string): RunState | undefined {
  return store.runs.get(id);
}

export function saveMedia(
  buffer: Buffer,
  mimeType: string,
  customId?: string
): string {
  const id = customId || `m_${crypto.randomBytes(6).toString("hex")}`;
  store.media.set(id, {
    id,
    buffer,
    mimeType,
    createdAt: Date.now(),
  });
  if (store.media.size > MAX_MEDIA) {
    const oldest = Array.from(store.media.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    )[0];
    if (oldest && oldest.id !== id) {
      store.media.delete(oldest.id);
    }
  }
  return id;
}

export const putMedia = saveMedia;

export function getMedia(id: string): StoredMedia | undefined {
  return store.media.get(id);
}

export function emitRunEvent(run: RunState, ev: SSEEvent): void {
  run.events.push(ev);
  for (const listener of run.listeners) {
    try {
      listener(ev);
    } catch {
      // ignore disconnected listener errors
    }
  }
}
