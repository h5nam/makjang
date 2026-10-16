# 프롬프트 팩 (실측으로 검증된 문구 기반)

> ✅ = 오늘 밤 실제 호출로 결과 확인한 문구. 나머지는 같은 패턴으로 확장한 초안.

---
## 1. SHOWRUNNER — `gemini-4-argon`, thinking_level="medium", JSON 응답 ✅(34s)

```
You are the showrunner of an over-the-top Korean makjang drama. Read this entire group chat (lines are numbered L1..Ln).
Turn the real friends into a makjang drama Episode 1 TRAILER. Every twist MUST be grounded in real chat lines.

Consenting cast only: {consented_names}. Never put anyone else on screen. Use these display names: {alias_map}.
Excluded topics (never use): {excluded}.
Visual style: {style}  // "photoreal K-drama" | "Korean webtoon"

Return JSON only:
{"title_ko": str, "logline_en": str,
 "cast": [{"name": str, "archetype_ko": str, "why_en": str, "evidence": ["L12"], "look_en": "visual description for image gen: fictional Korean actor/actress, age, hair (color+cut), face, signature outfit, one signature prop"}],
 "seeds": [{"event_ko": str, "evidence": ["L.."], "makjang_twist_ko": str}],
 "trailer": [{"shot": 1, "setting_en": str, "characters": [names], "action_en": str, "line_ko": str, "speaker": str, "evidence": ["L.."], "trope_ko": str}],
 "narration_ko": [3 short trailer narration lines]}

Rules:
- exactly 5 shots; max 3 characters per shot; each consenting person appears at least once
- line_ko: one spoken line, max 20 Korean syllables, natural spoken Korean, funny because it echoes a real message
- the speaker of a line must plausibly KNOW what they say at that point (no information they couldn't have)
- each shot uses one makjang trope from: {trope_list}
- comedic, warm, everyone gets a moment; no sexual content, no real crimes beyond petty comic mysteries, no humiliating one person only
- look_en must describe a FICTIONAL actor (not the real person) and be distinct per character (hair color/cut must differ)

CHAT:
{numbered_chat}
```

**PATCH (같은 interaction 이어서, previous_interaction_id)**
```
The script reviewers found these problems:
{failed_checks_json}
Fix ONLY the failing items. Keep everything else identical. Return the full JSON again.
```

---
## 2. VERIFIERS — `gemini-3.8-flash` (샷별 병렬), JSON

**1b 근거 타당성**
```
Claim/line: "{line_ko}" (speaker {speaker}, trope {trope_ko})
Cited chat lines:
{cited_lines}
Does the cited evidence genuinely support this dramatized line as a comic exaggeration of a real event? Answer JSON:
{"pass": bool, "reason_ko": "한 문장", "better_evidence": ["L.."]}
```

**1c 정보 출처** (티키 드라마 규칙: "대위인 거 어떻게 알아")
```
In the drama, {speaker} says: "{line_ko}". Based on the chat up to the cited lines, could {speaker} plausibly know this information? Consider who saw/said what.
{"pass": bool, "reason_ko": str}
```

**1d 안전** (`gemini-3.5-flash-lite`)
```
Check this trailer JSON for: sexual content, real crimes, slurs, one person being humiliated in more than 2 shots, any non-consenting name ({non_consented}). JSON: {"pass": bool, "issues": [{"shot": n, "reason_ko": str}]}
```

**2 캐릭터 일관성 (비전)**
```
Images 1..N are the official character sheets ({names in order}). The last image is a generated shot that should contain {shot_characters}.
For each character in the shot, score 0-10 how well face, hair (color+cut), and outfit match their sheet. JSON:
{"scores": [{"name": str, "face": n, "hair": n, "outfit": n, "fix_en": "short instruction if any score < 7"}]}
```

**3 대사 정확도 (오디오)** ✅(7–11s)
```
Transcribe all speech in this audio verbatim in Korean. JSON: {"transcript": str}
```
→ 코드에서 공백·문장부호 제거 후 `line_ko`와 CER 비교, CER ≤ 0.15 통과.

---
## 3. 캐릭터 시트 — `gemini-nano-banana-2.1` ✅(15–22s, 병렬)

**실사** (aspect 3:4)
```
Photorealistic K-drama promotional still, cinematic lighting, 85mm lens, shallow depth of field, natural skin texture, high-end Korean drama poster quality. Chest-up portrait, looking at camera, studio grey background, no text.
Character: {look_en}
```
**웹툰** (aspect 16:9)
```
Korean webtoon character design sheet, clean crisp line art, cel shading, vibrant full color, modern K-drama webtoon style (like popular Naver webtoon romance-drama). Front view bust portrait on the left, full-body front view on the right, plain light grey background, no text.
Character: {look_en}
```

## 4. 키프레임 — `gemini-nano-banana-2.1`, 시트 레퍼런스 ≤3장 ✅(28–43s)
```
{style_prefix}. {setting_en}. {action_en with "the man from image 1", "the woman from image 2" ...}
Keep each character's face, hair and outfit exactly as in their reference image. No text, no speech bubbles.
```
- style_prefix 실사: `Photorealistic K-drama film still, cinematic night lighting, 35mm`
- style_prefix 웹툰: `Korean webtoon panel, clean line art, cel shading, dramatic K-drama lighting`
- 재생성 시 끝에 추가: `Fix: {fix_en from verifier}`
- 한글 간판은 정확히 렌더링됨 (강남역 ✅) → 배경 간판에 단톡방 이름 넣는 이스터에그 가능

## 5. 영상 샷 — `gemini-omni-1.1-flash`, 첫 프레임 = 키프레임 ✅(병렬 ~52s)
```
<FIRST_FRAME> Continuous single shot, no scene cuts. Over-the-top Korean makjang drama, comedic tone. {action_en}.
{speaker_desc} says in Korean, {emotion}: "{line_ko}"
{optional: Dramatic triple zoom-in on {target}'s shocked face.}
Sound: {sfx}, then a dramatic orchestral sting. No background music before the line. No subtitles, no text.
```
`duration` 6–8, `resolution` 720p (개발 중 360p/4), `aspect_ratio` 16:9.
검증된 연출: 물벼락 ✅, 김치 싸대기 + 3연속 줌인 ✅, 빗속 손목 잡기 ✅, 웹툰 무빙 ✅.

## 6. 내레이터 보이스 디자인 — 현장 첫 실행 시 생성 ✅
```python
voice={"model":"gemini-3.8-flash-tts","type":"prompted","display_name":"makjang-narrator-ko","gender":"male","language_code":"ko-KR",
 "prompted":{"input":"중년 남성의 묵직하고 과장된 한국 막장 드라마 예고편 내레이터. 느리고 극적인 호흡, 낮은 저음, 문장 끝을 길게 끄는 말투."}}
```
마지막 "다음 화 예고" 줄 예: `다음 이 시간... 사라진 삼만 원의 행방. 그리고, 출생의 비밀.` ✅

## 7. 음악 — `lyria-3-clip-preview` (30초, ~16s) ✅
```
Over-the-top Korean makjang drama sting: sudden dramatic orchestral hit, tense strings tremolo, triple zoom-in impact sounds, then a melodramatic piano motif. Instrumental, no vocals.
```
엔딩용: `Melodramatic Korean drama ending theme, sweeping strings and piano, bittersweet, instrumental, 30 seconds.`

---
## 8. 막장 트로프 사전 ({trope_list})

> **전체판: `assets/tropes/tropes.json` (105개, 등급·단톡 신호·영상 프롬프트·효과음·안전 대체안).** Showrunner에는 등급 G 전부 + Y의 safe_twist만 `{trope_list}`로 넣고, R은 넣지 않는다. 아래 표는 초기 요약.
| 트로프 | 연출 키워드 (영상 프롬프트용) | 수위 |
|---|---|---|
| 출생의 비밀 | thunder, DNA test envelope, gasp | OK |
| 물벼락 | glass of water thrown, frozen splash | ✅ 검증 |
| 김치 싸대기 | kimchi slap, juice splash, triple zoom-in | ✅ 검증 |
| 재벌가 반대 | chaebol mother, envelope of money pushed across table | OK |
| 기억상실 | hospital bed, "누구세요?" | OK |
| 비밀 밀회 목격 | rain, hiding behind pillar, dropped item | ✅ 검증 |
| 통장 비자금 | bank app screen, trembling hands | OK |
| 3연속 줌인 | dramatic triple zoom-in on shocked face | ✅ 검증 (화당 1회) |
| 뺨 때리기(손) | — | **쓰지 않음** (실제 폭력 느낌, 김치로 대체) |
| 교통사고·납치·불륜 | — | **금지** (실존 친구에게 부적절) |

## 9. 안전·프라이버시 원칙 (피치에도 사용)
- 동의한 사람만 등장, 가명 옵션, 빼고 싶은 사건 제외 (HITL #1)
- 실존 인물 얼굴 업로드 없음 — 성격 기반 **가상 배우** 캐스팅
- 원문 대화 서버 저장 없음, 실행 끝나면 메모리에서 삭제
- 모든 영상에 SynthID 워터마크 (Google 기본)
