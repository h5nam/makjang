# 피치·제출 문구 (최종판, 2026-10-16 13:30 기준) — 제출물은 전부 영어

## 0. 한 줄 / 짧은 소개 (폼에 칸이 작을 때)
- **One-liner:** 막장톡 (MAKJANG TALK) — your group chat, remade as a K-drama. Every twist comes with a receipt.
- **50 words:** Upload a KakaoTalk or WhatsApp group chat. Gemini 4 Argon reads all of it, finds the hidden storylines, and directs a 40-second K-drama trailer starring your friends — modern makjang or romance-fantasy. Every twist is pinned to the real message behind it, and three verification loops check the script, the faces, and the spoken lines.

## 제출 폼 (cerebralvalley.ai/e/google-deepmind-ai-hackathon → Submit Project, 15:20 마감 엄수)
| 칸 | 넣을 것 |
|---|---|
| Team Name * | 막장톡 (MAKJANG TALK) |
| Team Members | Honam Kang (자동, 개인전) |
| Project Description + Google Cloud Link * | 아래 1장 Description 전체 + 맨 위에 `Live (Google Cloud Run): https://makjang-3116986546.asia-northeast3.run.app · passcode: makjang` |
| Public GitHub Repository * | https://github.com/h5nam/makjang |
| Demo Video * | YouTube 일부 공개 링크 (≤2분) |
- 발표 자료(슬라이드) 제출 칸은 없음. Top 4만 16:00 이벤트홀에서 라이브 5분 발표. 15:50까지 이벤트홀 착석.

## 1. Project Description (제출용, 그대로 붙여넣기)

**막장톡 (MAKJANG TALK) — your group chat, remade as a K-drama.**

Every group chat is full of unfinished stories: the ₩90,000 that vanished from the trip fund, the friend who "worked late" but was spotted at Gangnam Station, the birthday everyone forgot. 막장톡 turns that chat into Episode 1 of an over-the-top Korean *makjang* drama — a 40-second trailer starring your friends, with real dialogue, narration and score — where **every plot twist comes with a receipt: the actual message it was based on.**

**How it works**
1. **Upload** a KakaoTalk (CSV/TXT) or WhatsApp (TXT/ZIP) export. Pick who appears, aliases, and topics to exclude.
2. **Audition:** each friend scans a QR code and uploads *their own* selfie with consent. Anyone who doesn't is played by a fictional actor cast from their personality.
3. **Gemini 4 Argon is the showrunner.** It reads the entire chat in one 1M-token context, finds the seeds and contradictions across months, casts each friend as an archetype, and writes a 5-shot trailer in one of two genres — **Modern Makjang** or **Romance Fantasy** (dukes, crown princes, broken engagements at the imperial ball). Every line cites the chat lines it came from.
4. **Three verification loops keep it honest:**
   - *Grounding* — code checks every cited line exists; Flash checks it supports the twist and that the speaker could actually know it; failures go back to Argon as a patch.
   - *Character consistency* — Flash vision scores each keyframe against the cast sheets (face, hair, outfit, age) and reshoots drifted shots.
   - *Spoken-line accuracy* — every generated shot is transcribed and compared with the script; mismatches are re-rendered or dubbed.
5. **Nano Banana 2.1** builds cast sheets and keyframes, **Gemini Omni 1.1 Flash** shoots the dialogue scenes, **Gemini 3.8 Flash TTS** voices a designed trailer narrator, **Lyria 3** scores the sting.
6. **Premiere:** a letterboxed player shows each shot with Korean/English subtitles and its receipt card.

**Why only Argon:** one model holds months of chat at once, connects clues no single message reveals, directs four media models, and checks its own work against the evidence.

**Built with:** gemini-4-argon, gemini-3.8-flash, gemini-3.5-flash-lite, gemini-nano-banana-2.1, gemini-omni-1.1-flash, gemini-3.8-flash-tts (Voice Design), lyria-3-clip-preview · Antigravity · Next.js on Google Cloud Run.

**Safety by design:** faces only from self-uploaded selfies with self-consent; consent-gated cast, aliases and excluded topics; a safety reviewer blocks sexual content, crime, clinical labels, and piling on one person; chats and selfies live in memory only for the run and are never stored.

**What's next:** multi-episode seasons, more genres (사극, office thriller), and a launch inside our K-content app for 20–30s users, where every shared trailer brings the whole group chat in.

---
## 2. 데모 영상 대본 (≤2분, 영어 내레이션 — 직접 녹음 or 자막)

| 시간 | 화면 | Narration (EN) |
|---|---|---|
| 0:00–0:07 | 랜딩 히어로 (천둥 플래시 → 로고) | "Every group chat hides a drama." |
| 0:07–0:18 | 편성표 → WhatsApp 방 D 또는 현장 카톡방 업로드 | "Drop in a KakaoTalk or WhatsApp chat." |
| 0:18–0:30 | 캐스팅 화면: QR 오디션, 폰으로 셀카 업로드, 장르 토글 (로판) | "Friends audition with their own selfie. Pick a genre — modern makjang, or romance fantasy." |
| 0:30–0:55 | 작가실: 단톡 말풍선에 금색 하이라이트, 떡밥 카드, 캐스팅 보드 | "Gemini 4 Argon reads the whole chat and finds the storylines — every twist cites a real message." |
| 0:55–1:10 | 검수관 로그 ⚠→✅ (키프레임 재촬영, 대사 불일치 잡기) | "Three verification loops check the evidence, the faces, and every spoken line." |
| 1:10–1:45 | **예고편 풀재생** (영수증 카드 + 영어 자막) | (예고편 사운드) |
| 1:45–2:00 | 영수증 서랍 → 로고 엔드카드 | "막장톡. Your group chat, remade as a K-drama. Built with Argon, Omni, Nano Banana and Lyria on Cloud Run." |

녹화 팁: 실제 생성은 3분 → 작가실 구간은 2배속, 프리미어는 원속도. YouTube **일부 공개**.

## 3. 무대 5분 대본 (Top 4, 영어로 진행 · 외국인 심사위원 있음)
**준비:** 발표 전 마지막 성공 실행 결과 탭 하나 + 라이브용 새 탭 하나. 무대 QR은 화면에 크게.

1. **(0:00–0:30) Hook**
   "Raise your hand if your group chat has a mystery nobody talks about." (손 듦) "Ours had ninety thousand won disappear from a Jeju trip fund. So we made it a K-drama."
2. **(0:30–1:00) Live start**
   WhatsApp 방 D(영어) 또는 오늘 만든 현장 카톡방 업로드 → 장르 **로판** 선택 → "Two of you — scan this QR and send a selfie. You're in the cast." (심사위원/관객 2명 오디션) → 촬영 시작.
3. **(1:00–2:30) While it generates — narrate the Writers' Room**
   "Argon is reading four months of messages at once… here are the storylines it found — and each one has a receipt… the reviewer just caught a line the character couldn't have known and sent it back… the vision check caught an age drift on shot 3 and is reshooting it."
4. **(2:30–3:40) Premiere**
   예고편 재생. 끝나고 영수증 서랍 열어 한 줄 짚기: "This twist? It's this message, sent at 11:30 on a Saturday."
5. **(3:40–4:30) Why Argon + safety**
   "One model holds the whole chat, directs four media models, and checks its own work. And it's safe by design: only your own selfie, only people who consent, nothing stored."
6. **(4:30–5:00) Close**
   "Next: seasons, more genres, and launch in our K-content app for 20-to-30-year-olds — where every trailer gets shared back into the group chat. 막장톡. Thank you."
- **폴백:** 생성이 3분 안에 안 끝나면 3단계 설명 후 미리 연 결과 탭으로 프리미어 → 마지막에 라이브 결과가 나오면 "and here's the one we just made".

## 4. 예상 Q&A (영어 답 한 줄씩)
- **Deepfakes / using friends' faces?** "Faces only come from a selfie the person uploads themselves, with consent, through their own phone. Everyone else is a fictional actor. Nothing is stored."
- **Bullying?** "Only consenting people appear, a safety reviewer blocks crime, sexual content and clinical labels, and no one can be the target in more than two shots."
- **Why not just prompt a video model?** "Finding grounded twists needs the whole chat at once — Argon's 1M context — plus orchestration of four models and self-verification. The receipts prove it."
- **Hallucination?** "Every line must cite real line IDs; code and a second model verify them before anything is shot."
- **Cost / speed?** "About three minutes; roughly four to five dollars per final-quality trailer, mostly video. Draft mode is a fraction of that."
- **Business?** "A share-native format: every trailer goes back into the group chat. We'll launch it inside our K-content app for 20–30s users; seasons and genres are the paid layer."
- **WhatsApp / global?** "Same pipeline; the parser handles KakaoTalk and WhatsApp exports, and English chats get English dialogue."
