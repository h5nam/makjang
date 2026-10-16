# 피치·제출 문구 초안 (영어 — 제출물은 전부 영어)

## 1. Project Description (제출용)

**Makjang — your group chat, remade as a K-drama.**

Every friend group has a chat full of unfinished stories: the 30,000 won that vanished from the trip fund, the friend who "worked late" but was spotted at Gangnam Station, the birthday everyone forgot. Makjang turns that chat into Episode 1 of an over-the-top Korean makjang drama — a 40-second trailer with real K-drama footage, voiced lines, narration and music, where **every plot twist is grounded in a real message.**

**How it works**
1. Drop in a KakaoTalk (or WhatsApp) export. Choose who consents to appear, add aliases, exclude topics. Nothing is stored.
2. **Gemini 4 Argon** reads the entire chat in its 1M-token context and acts as showrunner: it finds the hidden storylines, casts each friend as a makjang archetype, and writes a 5-shot trailer — every line cites the chat lines it came from.
3. A **three-stage verification loop** keeps it honest: Flash reviewers check that every twist is supported by evidence, that characters only say what they could know, and that it stays kind and safe; a vision check compares each keyframe against the character sheets and regenerates drifted shots; an audio check transcribes each generated line and re-renders any shot whose dialogue doesn't match the script.
4. **Nano Banana 2.1** casts fictional actors and draws consistent keyframes, **Gemini Omni Flash** turns them into dialogue-driven K-drama shots, **Gemini 3.8 Flash TTS** voices a designed trailer narrator, and **Lyria** scores the dramatic sting.
5. The premiere player shows each shot with its "receipt" — the real message that inspired it.

**Built with:** gemini-4-argon, gemini-3.8-flash, gemini-3.5-flash-lite, gemini-nano-banana-2.1, gemini-omni-1.1-flash, gemini-3.8-flash-tts (Voice Design), Lyria, Antigravity, Google Cloud Run.

**Who it's for:** group-chat friends who want to relive (and laugh at) their own stories — and creators/entertainment apps who want a viral, personal K-drama format. Next: multi-episode seasons, astrology-based casting (we run a K-fortune content app with 20–30s users), and WhatsApp/LINE support for global K-drama fans.

**Safety by design:** consent per person, no real faces uploaded (fictional actors cast from personality), no chat stored, petty-mystery humor only, SynthID on every generated video.

---
## 2. 데모 영상 대본 (≤2분, 영어 자막/내레이션)

| 시간 | 화면 | 내레이션/자막 |
|---|---|---|
| 0:00–0:08 | 카톡 단톡방 스크롤 (실제 데모 방) | "Every group chat hides a drama." |
| 0:08–0:20 | 파일 드롭 → 동의 화면 (체크, 가명) | "Drop in your chat. Everyone consents. Nothing is stored." |
| 0:20–0:45 | Writers' Room: 떡밥 카드가 근거와 함께 뜸, 캐스팅 보드 | "Gemini 4 Argon reads the entire chat and finds the storylines — every twist cites a real message." |
| 0:45–1:05 | 검수관 로그 ⚠→✅, 키프레임 머리색 드리프트 잡고 재생성 | "Three verification loops: evidence, character consistency, and dialogue accuracy." |
| 1:05–1:45 | **예고편 풀재생** (근거 카드 오버레이) | (예고편 자체 사운드) |
| 1:45–2:00 | 아키텍처 한 장 + 로고 | "Makjang. Your group chat, remade as a K-drama. Built with Argon, Omni, Nano Banana, Lyria on Cloud Run." |

## 3. 무대 3분 대본 (Top 4)
1. **(0:00–0:20) 훅:** "Raise your hand if your group chat has a mystery nobody talks about." → "This morning, I made a group chat with the people sitting next to me. Let's see what drama we wrote."
2. **(0:20–0:40) 라이브 시작:** 아침에 만든 현장 단톡방 업로드 → 실행 버튼. (생성 2.5–3분 동안 아래 설명)
3. **(0:40–1:40) 생성 중 해설:** Writers' Room 화면을 가리키며 — "Argon is reading every message… here are the storylines it found, each with its receipt… the reviewer just caught a line the character couldn't have known… the vision check caught a hair-color drift and is reshooting it."
4. **(1:40–2:30) 프리미어:** 예고편 재생. 근거 카드에서 웃음 포인트.
5. **(2:30–3:00) 클로징:** "Why Argon: one model holds the whole chat, directs four media models, and checks its own work. Next: seasons, astrology casting for our 20–30s fortune app users, and every group chat in the world."
- 라이브가 3분을 넘기면: 직전 실행 결과로 2–4를 진행하고 마지막에 라이브 결과 공개.

## 4. 예상 Q&A
- **Privacy?** 동의·가명·제외, 저장 없음, 실존 얼굴 미사용, 가상 배우 캐스팅.
- **Why not just a prompt to a video model?** 몇 달치 대화 전체에서 근거 있는 반전을 찾아내고(1M ctx), 4개 미디어 모델을 지휘하고, 3단 검증으로 스스로 고친다. 근거 카드가 그 증거.
- **Cost?** 1회 약 $4.5 (영상 40초가 대부분). 프리뷰는 웹툰 Lite 모드로 $0.5 이하.
- **Business?** 티키(20–30대 여성 K-운세·드라마 콘텐츠) 신기능 → 공유될 때마다 유입. 시즌제·사주 궁합 캐스팅 유료화.
- **Harmful use (bullying)?** 동의 안 한 사람은 등장 불가, 한 명 몰아 조롱 금지 검수, 범죄·성적 내용 금지, 사소한 미스터리만.

## 5. README 뼈대 (리포에 그대로)
```
# Makjang — your group chat, remade as a K-drama
> Built in one day at Google DeepMind AI Hackathon Seoul (2026-10-16). All code written during the event.
Live: <Cloud Run URL>  ·  Demo video: <link>

## What it does  (3 lines + GIF)
## How it works  (pipeline diagram + 3 verification loops)
## Models  (table: job → model ID)
## Safety & privacy
## Run locally  (GEMINI_API_KEY, npm i, npm run dev)
## Deploy  (gcloud run deploy …)
```
