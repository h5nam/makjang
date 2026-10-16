# Landing redesign — 막장톡 MAKJANG TALK

Service name: **막장톡** (MAKJANG TALK). Tagline KO: "어젯밤 우리 단톡방이, 오늘 밤 10시 특별기획이 됩니다." EN: "Your group chat, remade as a K-drama — every twist backed by a real message."

## Brand assets (already in `public/brand/`)
| File | Use |
|---|---|
| `logo-wordmark.png` (+ `@1x`) | gold brush-calligraphy "막장톡" + red seal + "MAKJANG TALK", transparent. Hero (420–560px wide), end card of the player |
| `logo-symbol.png`, `icon-32/180/512.png` | red seal + speech bubble with lightning tail. Header (28px), favicon, apple-touch-icon |
| `poster-A.webp` / `-B` / `-C` | 2:3 drama key-art posters for the three sample rooms (top 25% left empty for the title overlay) |
| `og.jpg` | 1200×630 Open Graph image |

## What is wrong with the current landing (fix all)
1. **It explains the machine, not the feeling.** First screen is a wall of text: CER, 1a–1e, PG-15, `.txt/.csv`, model names. Users decide in 3 seconds from emotion. Internals belong in the Writers' Room (live) and a "How it's built" section for judges at the bottom.
2. **No imagery at all** — a drama product with zero pictures. The hero must be visual.
3. **Flat hierarchy, too many accents.** Yellow tags, gold, red buttons, green "ACTIVE" all compete. Rule: per screen, gold + **one** accent (Kakao yellow for the upload CTA, crimson only for "ON AIR"/play).
4. **Title is generic bold sans.** Use the wordmark image + Nanum Myeongjo for headlines.
5. **Sample rooms look like admin list rows** with three identical red buttons. They should be posters you want to click.
6. **Two competing primary actions** (dashed upload box + 3 red buttons). One primary CTA.
7. **The 5-step stepper in the header** is noise on the landing. Show it only inside the flow.
8. **Bilingual clutter.** Korean is primary. English is always a single small secondary line (13–14px, `--fg-muted`, same position every time) — for the foreign judges, never the same size as Korean.

## New landing structure (desktop 1440 and mobile 390, both must look intentional)
**Header (64px, transparent over hero, solid `--ink` after scroll):** symbol 28px + "막장톡" in Nanum Myeongjo 800 20px gold. Right: ghost link "How it's built". No stepper.

**S1 — Hero (100svh)**
- Background: `poster-A.webp` full-bleed, `object-fit: cover`, slow Ken Burns (scale 1 → 1.08 over 20s), dark gradient from left (`rgba(11,11,12,.92)` → transparent at 60%), 4% film grain, letterbox bars 6vh top and bottom (pure black). If a finished trailer mp4 exists later, swap to a muted looping `<video>`.
- Left column (max-width 560px), vertically centered:
  - `logo-wordmark.png` 480px (mobile 280px). Entrance once: black → 80ms white thunder flash → logo fades/scales in 0.96 → 1.
  - H1 Nanum Myeongjo 800, 44/56px (mobile 30/40): "어젯밤 우리 단톡방이," / "오늘 밤 10시 **특별기획**이 됩니다." (특별기획 in gold)
  - EN line: "Your group chat, remade as a K-drama trailer — every twist backed by a real message."
  - CTAs: **primary** Kakao yellow `#FEE500` / text `#191919`, 56px tall, radius 14px: "💬 우리 단톡방 올리기" → opens Upload sheet. **Secondary** ghost (1px gold border): "샘플 드라마 보기 ↓" → scrolls to S2.
  - Micro trust line under CTAs (12px muted): "3분이면 1화 예고편 · 동의한 친구만 출연 · 원문은 저장하지 않아요"
- Bottom-left of hero: tiny "● ON AIR" (crimson dot pulsing) + "TONIGHT 10PM".

**S2 — "오늘 밤 편성표" (Tonight's lineup)**
- Section label in mono gold: `TONIGHT'S LINEUP`. Headline Myeongjo 32px: "샘플 단톡방으로 바로 시청하기".
- 3 poster cards in a row (mobile: horizontal scroll-snap, 78vw each). Card = poster image 2:3, radius 4px, title overlaid in the empty top area in Myeongjo 800 gold 26px with text-shadow, then below the image:
  - time slot chip mono: `PM 10:00` / `PM 10:30` / `PM 11:00`
  - title (KO) + EN title muted
  - one-line logline quote in italics: "야근이라더니 왜 강남역 영수증이 찍혀 있어?"
  - meta: "대학 동기 5인 · 447줄"
- Hover (desktop): image scale 1.03, gold 1px outline, a crimson "▶ 이 방으로 제작" pill fades in at bottom of the poster. Whole card is the click target. Tap on mobile = same.
- Poster mapping: A = friends (`poster-A`), B = family (`poster-B`), C = work (`poster-C`).

**S3 — How it works (3 steps as a transformation strip)**
Headline: "말도 안 되는 반전, **근거는 진짜.**" Three columns with a thin gold arrow between:
1. A mini Kakao chat (real bubble UI, `#B2C7DA` bg, 3 real bubbles from A_friends around line 549 with "어제 강남역에서 지훈이랑 서연이 본 거 같은데" highlighted gold) — "단톡방을 통째로 읽어요"
2. A mini script card (Myeongjo line "강남역에서 둘이 있었던 거 다 봤어!" + receipt chip `L549 · 도윤 · 오전 11:30 "어제 강남역에서 지훈이랑 서연이 본 거 같은데"` (use the real line id from the parser)) — "떡밥과 반전을 찾아 대본을 써요"
3. A film still (use a keyframe/poster crop) with letterbox and the torn-paper ReceiptCard overlay — "친구들이 주연인 예고편이 나와요"
Each caption KO 17px + EN 13px muted. No technical words here.

**S4 — Receipts showcase (the differentiator)**
Left: big ReceiptCard (perforated top edge, paper `#F6F3EA`, mono text, rotate(-1.5deg)) showing a real quoted line + time + line id + small EN translation. Right: headline Myeongjo "모든 반전엔 **영수증**이 붙어요." + 2 lines: "AI가 지어낸 얘기가 아니에요. 장면마다 실제 대화 줄을 증거로 붙이고, 세 번 검수해요."

**S5 — Trust (3 small items, icons lucide outline 20px gold)**
"본인 셀카만 — 친구 얼굴은 친구가 직접" · "동의한 사람만 출연" · "원문은 저장하지 않아요"

**S6 — How it's built (for judges, English, collapsible or compact grid)**
The 3 verification loops (one line each, technical terms allowed here), model chips (Gemini 4 Argon, Nano Banana 2.1, Omni 1.1 Flash, 3.8 Flash TTS, Lyria 3), "Built in 4 hours at Google DeepMind Hackathon Seoul". Then footer.

**Upload sheet (modal / bottom sheet on mobile):** drag-drop zone, small format help ("Mac 카카오톡: 채팅방 ≡ → 대화 내보내기 → CSV"), passcode field, "제작 시작". Kakao yellow only on the submit button.

## Global rules
- Type scale (px): 12 / 14 / 17 / 20 / 26 / 32 / 44 (+ hero logo). Body 17px, line-height 1.6, `word-break: keep-all`. Max text width 640px.
- Spacing on an 8px grid; sections 120px apart desktop, 72px mobile.
- Colors only from DESIGN.md tokens. Max one accent besides gold per screen.
- Motion: 320ms `cubic-bezier(.22,.61,.36,1)`; hero sequence once; posters fade-up staggered 80ms on scroll into view; respect `prefers-reduced-motion`.
- Favicon/apple-touch/OG from `public/brand/`. `<title>`: "막장톡 — 우리 단톡방이 막장드라마가 된다".
- Apply the same header (symbol + 막장톡), letterbox language and ReceiptCard to the Writers' Room and Premiere; the Premiere end card shows `logo-wordmark.png` + "다음 이 시간…".
- QA before commit: screenshot at 1440×900 and 390×844; nothing overlaps, no horizontal scroll, hero CTA visible without scrolling on both.
