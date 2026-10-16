# Makjang — DESIGN.md (feed this to Antigravity on the day)

## Concept: "Yellow chat → Black drama"
The whole product is one transformation: a mundane **KakaoTalk-yellow** group chat becomes an over-the-top **K-makjang trailer** (ink black, champagne gold serif, crimson). The UI must make that switch *felt*:
- Input & evidence layer = chat world (light, yellow `#FEE500`, chat bubbles, monospace receipt).
- Output layer = theater world (near-black, letterboxed 2.39:1 bars, gold serif title, crimson only for play/live/"twist").
- The moment between them (Argon reading the chat) is the show: a "writers' room" log, lines from the chat lighting up as they get cited.

Mood words: lean-back theater (Netflix), festival program (Reel Theory), daily-drama title card (gold Myeongjo on black + thunder flash), receipts (proof). Not: SaaS dashboard, purple gradients, glassmorphism, emoji-heavy.

## Tokens
```
--ink:        #0B0B0C   page background (theater)
--ink-2:      #141414   cards / player surround (Netflix canvas)
--ink-3:      #1F1F22   raised surface, borders #2A2A2E
--gold:       #D4B26A   titles, credits, accolades (champagne)
--gold-dim:   #8C7647   meta text on black
--crimson:    #C8102E   play, LIVE, "twist" badge, progress — use sparingly
--paper:      #F6F3EA   receipt / evidence card background
--kakao:      #FEE500   chat-world accent (upload CTA, chat bubbles), text on it #191919
--bubble:     #FFFFFF   other people's bubbles, chat bg #B2C7DA (Kakao default blue-grey)
--fg:         #F5F5F5   body on black; muted #A3A3A3
--ok:         #3BB273   verifier pass;  --warn: #E0A526  verifier flag
radius: 4px (theater), 14px (chat bubbles), 2px (receipts)
grain: 3–4% SVG noise overlay on --ink surfaces
```

## Type (all Google Fonts / CDN, Korean-first)
Google Fonts (verified 200): `https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@800&family=Song+Myung&family=Black+Han+Sans&family=JetBrains+Mono&display=swap`
- **Drama title / episode title:** `Nanum Myeongjo` 800 or `Song Myung` — gold, tracking -0.02em, huge (clamp 48–120px). Optional gold gradient + 1px dark stroke for the daily-drama look.
- **Impact words ("출생의 비밀", "TWIST"):** `Black Han Sans`, crimson or white, used once per screen.
- **UI / body:** `Pretendard` (`https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`), 15–17px, `word-break: keep-all`.
- **Receipts / line IDs / timestamps:** `JetBrains Mono` or `IBM Plex Mono` 12–13px.
- English pitch copy: `Pretendard` covers Latin; title Latin in `Playfair Display` if needed.

## Screens (mobile-first 390px, but the stage is a 16:9 projector → every screen must also look good at 1440×900)
1. **Landing** — black, single line in gold serif: "당신의 단톡방은 이미 막장드라마다." + yellow "단톡방 올리기" button. Background: slow muted loop of a past trailer (Ken Burns of keyframes).
2. **Consent (HITL #1)** — chat-world styling. Detected members as Kakao-style profile chips → toggle consent, alias, excluded topics. Copy is short and warm.
3. **Writers' Room (live, SSE)** — split: left = the chat scrolling like KakaoTalk (bubbles), cited lines highlight gold as Argon references them; right = "검수관" log lines (⚠ → ✅) in mono. Cast cards fly in when sheets finish (portrait 3:4, archetype in gold serif, "why" in one line with line refs).
4. **Premiere (player)** — full black, letterbox bars, shots play sequentially; title card at start (thunder flash + triple zoom), lower-third **receipt card** per shot: torn-paper card showing the real chat line (`L214 · 지훈 · 오후 4:20`) that the scene is based on. End card: "다음 이 시간…" + share.
5. **Receipts drawer** — all shots × evidence lines, verifier scores. This is the judges' "verification loop" proof.

## Motion
- Default ease `cubic-bezier(0.22, 0.61, 0.36, 1)`, 320ms (projector-paced, Reel Theory).
- Signature moves (each used once): thunder flash (white 80ms → black), **triple zoom** on title (scale 1 → 1.15 → 1.3 → 1.5 with 120ms holds), receipt slide-up with slight rotate(-1.5deg), gold line-highlight sweep in chat.
- Respect `prefers-reduced-motion`.
- Library: `motion` (framer-motion) only; no heavy 3D.

## Components
- Tailwind + shadcn/ui primitives (Dialog, Sheet, Toggle, Progress) re-themed to tokens above. Starter templates are allowed by the rules.
- Chat bubble, ReceiptCard (perforated top edge via CSS mask, mono text, paper bg), CastCard, VerifierLogLine, LetterboxPlayer, TitleCard.

## Don'ts
- No purple/blue AI gradients, no generic dashboard cards, no emoji as icons (use lucide outline).
- Crimson never as large fills. Gold never for body text.
- Never show real phone numbers / full real names on screen; aliases from consent step.

## References (local copies in `design/refs/`)
| Ref | Take from it | Link |
|---|---|---|
| Netflix DESIGN.md | theater principle: dim the room, light the screen; #141414 canvas; one red | `refs/netflix.design.md` · oh-my-design.kr/design-systems/netflix |
| TVING / WATCHA / CGV DESIGN.md | Korean OTT/cinema type scale & Korean UI copy tone | `refs/tving|watcha|cgv.design.md` |
| Kakao DESIGN.md | `#FEE500` yellow, chat-world tokens | `refs/kakao.design.md` |
| Naver Webtoon DESIGN.md | if webtoon style is chosen | `refs/naverwebtoon.design.md` |
| Reel Theory (DESIGN.md) | ink black + champagne gold + crimson, letterbox, film grain, 320ms motion | `refs/reel-theory.md` · designmd.ai/duanhdan/reel-theory |
| A24 site | editorial restraint, huge type, few elements | designrush.com/best-designs/websites/a24-films-website-design |
| Cinema Typography (Awwwards) | type-as-hero for title cards | awwwards.com/sites/cinema-typography |
| 산돌 "넷플릭스 2026 라인업 폰트" | Korean drama title lettering choices | sandollcloud.com/font-recommendations/article/362 |
| Tear ticket / receipt UI | perforated receipt card | ui.levenium.com/ui/tear-ticket · koalaui.com/docs/components/receipt |
| AI citation UX | inline citation → source reveal pattern for evidence | aiuxplayground.com/guides/how-to-design-ai-citations |
