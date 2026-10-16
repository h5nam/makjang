# AGENTS.md — Makjang (Google DeepMind Hackathon Seoul, 2026-10-16)

> Built during the hackathon (11:20–15:20 KST). Everything in `docs/` and `data/` is planning material and demo data prepared beforehand; **all code is written today**.

## 1. Product
**Makjang — your group chat, remade as a K-drama.**
Upload a KakaoTalk export → friends who opted in upload their own selfie → Gemini 4 Argon (showrunner) reads the *entire* chat and writes an over-the-top Korean "makjang" drama **Episode 1 trailer** (5 shots, ~40s) starring them → images, video, narration, music are generated → a premiere player shows the trailer with a **"receipt" card under every shot quoting the real chat line it is based on**. Three verification loops (text evidence, visual consistency, spoken-line accuracy) run visibly on screen.

Track 1 (entertainment). Judging: working demo + verification loop, problem/impact, originality ("only possible with Argon": 1M context, long decode, multimodal orchestration), clarity.

## 2. User flow (screens)
1. **Upload** — drag a KakaoTalk export. **Primary format: macOS CSV** (`Date,User,Message`, UTF-8 BOM, multi-line quoted messages, deleted messages have empty Date/User — see `docs/kakao-format-mac-csv.md`). Secondary: Windows `.txt` `[이름] [오후 3:21] 메시지` with date separator lines (a backwards time jump = next day). Button "Use sample chat" → `data/chats/A_friends.txt` (+ B_family, C_work).
2. **Cast & consent (HITL #1)** — members detected from the chat (system/invite messages excluded). Per member: consent toggle, alias, and **audition**: a QR/link `/audition/<runId>/<member>` the person opens on their own phone to upload **their own selfie** and tick consent. Members without a selfie get a fictional actor cast from personality. Style toggle: `K-Drama (photoreal)` / `Webtoon`. Excluded topics free text. For demo fallback, sample selfies in `data/selfies/` (fictional people) can be attached per member.
3. **Writers' Room (live, SSE)** — the show while Argon works: chat scrolls on the left as Kakao bubbles, cited lines light up gold; right side "검수관" (inspector) log lines go ⚠ → ✅; seed cards (5 events + quoted evidence), casting board (member → archetype + why + evidence), character sheets appear.
4. **Approve (HITL #2)** — script + cast review, "이대로 촬영" (before the expensive video step). Can be auto-skipped with a toggle for stage demo.
5. **Shooting (live)** — keyframes → vision check (regen drifted ones) → 5 Omni shots in parallel → lip-line check; narration TTS + Lyria in parallel.
6. **Premiere** — letterboxed player: title card (thunder flash + triple zoom) → narration → 5 shots each with a receipt card (`L214 · 지훈 · 오후 4:20 "…"`) → "다음 이 시간…" end card. Receipts drawer lists every evidence line + verifier results.

## 3. Architecture (keep it this simple)
- **Next.js (App Router, TypeScript) single service → Cloud Run** `asia-northeast3`, project `h2gdm-hack26icn-2662`.
- Tailwind + shadcn/ui + `motion`. Design system: **`docs/DESIGN.md`** (tokens, fonts, screens, motion). Follow it strictly.
- SDK: **`@google/genai` ≥ 2.29.1, Interactions API (`ai.interactions.create`)**. Docs offline in `docs/api/`.
- Jobs run **in server memory**: `POST /api/run` → runId; `GET /api/run/:id/events` (SSE); `GET /api/media/:id` serves image/video/audio bytes from an in-memory Map. Audition uploads: `POST /api/audition/:runId/:member`.
- Cloud Run flags: `--no-cpu-throttling --min-instances 1 --max-instances 1 --timeout 900 --memory 2Gi --allow-unauthenticated`. No database, no public bucket, no open ports besides Cloud Run HTTPS, no PHP.
- Abuse guard: env `DEMO_PASSCODE` required to start a run.
- Video assembly happens **in the browser** (sequential shot playback + audio layers + CSS overlays). No server ffmpeg.
- `QUALITY=draft` (dev): Omni `360p` + `"4s"`, images 1K. `QUALITY=final` (demo): `720p` + `"8s"`.

## 4. Models and API gotchas (all measured — see `docs/findings.md`)
| Step | Model | Notes |
|---|---|---|
| Showrunner | `gemini-4-argon` | `thinking_level` only (**no temperature/top_p**). JSON via `response_format={type:"text", mime_type:"application/json"}`. ~32–35s for 195–851 lines (input length is not the bottleneck). Output is slow (~60 tok/s) → keep its JSON short; expand per-shot prompts with Flash in parallel. Patch with `previous_interaction_id`. |
| Verifiers | `gemini-3.8-flash`, `gemini-3.5-flash-lite` | Parallel per shot. Audio transcription for lip-line check. |
| Sheets / keyframes | `gemini-nano-banana-2.1` | `response_format={type:"image", aspect_ratio, image_size:"1K"}`; **max 4 reference images**; ≤3 characters per shot. ~20s each, run in parallel. Selfie → sheet keeps likeness (tested). |
| Shots | `gemini-omni-1.1-flash` | First frame via `<FIRST_FRAME>` + image part. `response_format={type:"video", resolution:"360p"|"720p", duration:"4s".."8s" (**string with s**), aspect_ratio:"16:9"}`. ~20s (360p/4s) to ~50s (720p/8s), parallel OK. Say "Continuous single shot, no scene cuts" and "End on Shot N. No additional shots." Korean lines ≤20 syllables are spoken accurately. |
| Narration | `gemini-3.8-flash-tts` | Designed voice via `voices.create` is **per project** → create on first run and cache. Multi-speaker max 2 prebuilt voices. |
| Music | `lyria-3-clip-preview` | Always 30s **continuous music** — cannot make isolated SFX. Use first 2–3s as title sting (fade out) and a clip as end theme. Scene SFX come from Omni's own audio (`Sound:` line in prompt). |

Key: `GEMINI_API_KEY` env (local `.env.local` from `~/.hack-key`; Cloud Run `--set-env-vars`). **Never commit keys** — public repo. Run `git grep -n "AIza"` before every push.

## 5. Pipeline (target ≤ 3 min, parallel everywhere)
```
parse → Argon SHOWRUNNER (JSON) ──► Verifier#1 (code + Flash ×N) ──fail──► Argon PATCH (≤2)
      └─ [parallel] character sheets (selfie-based or fictional)
→ HITL#2 → keyframes ×5 (sheets as refs) → Verifier#2 vision (score <7 → regen that shot only)
→ Omni ×5 (first frame = keyframe) → Verifier#3 (transcribe vs line_ko, CER ≤ 0.15, else 1 regen or TTS dub)
→ [parallel] narration TTS + Lyria → Premiere
```
Prompts: **`docs/prompts.md`** (showrunner, patch, verifiers, sheet, keyframe, Omni, voice, Lyria — verified wording). Directing rules for the showrunner and shot prompts: **`docs/director-rulebook.md`** (shot grammar "Shot 1 … Cut to Shot 2 …", reaction close-ups, ≤20 syllables, no BGM inside generation, triple zoom once).
Trope library: **`data/tropes/tropes.json`** (105 tropes, tiers G/Y/R). Give the showrunner all **G** + **Y as `safe_twist`**; never R.

## 6. Data contracts
- `ChatLine { id:"L37", ts:ISO, speaker, text, kind:"text|photo|video|emoticon|link|deleted|system" }`
- Showrunner JSON: see `docs/spec.md` §6 (title_ko, logline_en, cast[], seeds[], trailer[5], narration_ko[3]). Every `evidence` must be real line IDs; `line_ko` ≤ 20 Hangul syllables; ≤3 characters per shot; only consenting members on screen.
- Verifier result `{ check, target, pass, reason_ko, fix_hint }` → streamed to the inspector log.

## 7. Safety (also part of the pitch)
- Faces: **only self-uploaded selfies with self-consent** via the audition link. Never accept a photo of someone else. Everyone else → fictional actor.
- Consent-gated cast, aliases, excluded topics. Safety verifier blocks sexual content, real crimes, one person humiliated in >2 shots, non-consenting names.
- Raw chat and selfies live only in memory for the run; nothing persisted.
- No autonomous agents running inside the GCP project; the app only makes model calls.

## 8. Milestones and gates (commit + push + deploy at each)
| By | Deliverable | Gate |
|---|---|---|
| 11:35 | Next.js scaffold deployed to Cloud Run (hello page) | URL works in incognito |
| 12:30 | Parser (CSV + txt) → Showrunner → Verifier#1 → Writers' Room SSE with seed cards & inspector log | seed cards on the **deployed** URL |
| 13:10 | Audition link + sheets + keyframes + Verifier#2 | 5 keyframes on screen |
| 13:50 | Omni ×5 + Verifier#3 + TTS + Lyria | **If no video shot by 13:20 → Lite mode** (keyframe Ken Burns + TTS lines) |
| 14:25 | Premiere player polish per DESIGN.md → **feature freeze** | two full runs on the deployed URL |
| 15:10 | English README (architecture diagram, models, verification loops, Cloud Run URL, "built during the hackathon") | public repo, no keys |

## 9. Working rules for the agent
- Ask clarifying questions and list edge cases/trade-offs **before** the first big build; then execute milestones end to end without waiting for per-file approval.
- Test on the deployed URL, not only localhost. Push every ~30 min.
- Prefer boring, working code over clever code. No feature outside this file without asking.
