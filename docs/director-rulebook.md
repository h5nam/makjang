# Makjang 연출 규칙집 — 티키 드라마 제작 노하우 이식

> 출처: 티키 숏드라마 5개 작품(손금 로판 7화+번외, 궁중 암투 티저+4화, 집착광공 티저, 마법학교 일진영애 티저, 사내무당/백령 무빙툰)을 만들며 감독(대표)이 직접 준 피드백을 규칙으로 굳힌 것.
> 원문: `tiki-web/pomfret/docs/product/drama/` 기획서(상궁 `ep4-script-v4.md` 4장 연출 문법, 손금 `ep7-direction-v1.md`, 집착광공 `teaser-script-v3.md`)와 드라마 메모리 40여 건.
>
> **쓰는 곳:** ① Showrunner 시스템 지시문(`RULES` 블록) ② Verifier 검수 항목 ③ Omni 샷 프롬프트 문법 ④ 피치("규칙 50개를 가진 쇼러너").
> 영어 블록은 프롬프트에 그대로 넣는 문구다.

---

## 1. 이야기 규칙 (Showrunner가 지킨다)

| # | 규칙 | 티키에서 얻은 계기 | Makjang 적용 |
|---|---|---|---|
| S1 | **장면마다 웃음 비트 하나 이상.** 설명만 하는 장면은 지루하다 | 손금 7화 1판 "재미 요소를 더 넣자" | 5샷 각각에 `laugh_beat` 필드 필수 |
| S2 | **막장 클리셰는 '착각·뒤집기' 웃음 틀로만**, 화면 효과 흉내(3연속 줌인·천둥)는 **한 화에 한 번** | 손금 7화 3판 | 줌인은 예고편 전체에 1회, 클라이맥스 샷에만 |
| S3 | **정보 출처 규칙:** 대사마다 "이 인물이 이걸 어떻게 아나" | 집착광공 "대위인 거 리아가 어떻게 알아" | Verifier 1c. 목격하지 않은 사람은 그 사실을 말할 수 없다 |
| S4 | **로직 구멍 금지:** 누가 왜 그 행동을 하나가 서야 한다. 동기 없는 동작(갑작스러운 손목 잡기 등) 금지 | 상궁 1~4화 반복 지적 | `action_en`마다 `motive` 한 줄 |
| S5 | **주인공이 비극(손해)에 가담할 땐 '순순함'이 아니라 '꺾임'**: 거절 → 불가항력 → 몸으로 막다 막힘 | 상궁 4화 3판 | 친구가 '범인' 역이 될 때도 일방적 악역 말고 사정이 있게 (따뜻한 결) |
| S6 | **매회 사이다 하나 + 설렘(감정) 하나** | 상궁 시즌 기획 "매회 시청자의 선택을 받아야" | 예고편 5샷 = 훅 · 미스터리 · 사이다(통쾌) · 감정(서운함/우정) · 클리프행어 |
| S7 | **설명하는 대목은 뺀다.** 사이다나 설렘에 일하지 않는 주고받기 삭제 | 상궁 2화 "대화가 너무 길고 흐름도 깨고" | 대사는 샷당 1줄 |
| S8 | **유행어·시대 문물은 그때 그 사람의 말로**, 본인은 최신인 줄 아는 태도에서 웃음 | 손금 오베론 2009년 "킹왕짱·지못미" | 단톡방의 실제 말버릇·밈을 대사에 그대로 재사용 (근거 카드와 연결) |
| S9 | **협박·감정 장면에서는 유행어를 뺀다** | 손금 7화 | 클라이맥스 샷은 진지하게, 웃음은 반응 컷에서 |
| S10 | **화면 글자는 직설보다 '고도의 수'가 보이게**, 미래를 미리 보여 주지 않는다 | 상궁 1화 36계, 나이 카드 "미래가 예측돼서 별로" | 근거 카드는 사건 순서대로만, 결말 암시 금지 |
| S11 | **훅은 첫 3초, 가장 센 그림(정체의 낙차)** | 상궁 썸네일 "40년 차 상궁, 눈 떠 보니 로판 악녀", 집착광공 "총 겨누고 여주 얼굴은 무조건 후킹" | 1번 샷 = 가장 센 막장 순간 + 제목 |
| S12 | **한 명만 몰아 조롱하지 않는다**, 모두에게 한 장면씩 | (Makjang 신규, 실존 친구) | Verifier 1d |

```text
RULES (paste into showrunner system prompt):
- Every shot has at least one laugh beat; the laugh comes from a character's misunderstanding or a reversal, never from mocking.
- Makjang screen gags (triple zoom-in, thunder) are used ONCE in the whole trailer, on the climax shot only.
- Every line passes the knowledge test: the speaker must have seen or been told this fact in the chat before saying it.
- Every action has a motive; no unmotivated grabs, hugs or slaps.
- If a friend becomes the "culprit", give them a sympathetic reason (warmth over villainy).
- Trailer arc in 5 shots: 1 hook (strongest makjang image) · 2 mystery · 3 cider (satisfying payback) · 4 heart (hurt or friendship) · 5 cliffhanger.
- Reuse each person's real catchphrases and memes from the chat as punchlines; drop slang in serious beats.
- On-screen text never reveals what comes later.
- Everyone who consented gets a moment; no one is the butt of more than one joke.
```

---

## 2. 촬영 규칙 (Omni 샷 프롬프트 문법)

| # | 규칙 | 계기 | Makjang 적용 |
|---|---|---|---|
| C1 | **한 장면 = 생성 한 번, 그 안에서 샷 3~5개로 컷을 나눈다** ("Shot 1 … Cut to Shot 2 …"). 따로 뽑은 클립·인서트를 이어 붙이지 않는다 | 상궁 티저 "뒤죽박죽", 손금 7화 "똑같은 모습으로만", 집착광공 인서트 실패 | Omni 8–10초 한 생성 안에 Shot 2~3개 (Omni도 기본이 멀티샷) |
| C2 | **넓은 설정 샷은 장소마다 처음 한 번만**, 이후 단독·어깨 너머·근접 | 손금 7화 원칙 2 | 샷 1만 와이드 허용 |
| C3 | **웃음은 반응 컷이 맡는다.** 펀치라인 뒤 반응 단독 1~2초, 한 박자 더 머문다 | 손금 7화 원칙 3 | 모든 샷 끝에 "Cut to {listener} reaction close-up, holds 1.5 seconds" |
| C4 | **권력은 카메라 높이로.** 이기는 쪽 로우 앵글, 지는 쪽 하이 앵글, 권력이 넘어가는 순간 높이를 뒤집는다 | 손금 7화 원칙 4, 상궁 국청 | 사이다 샷(3번)에서 높이 반전 |
| C5 | **화면 방향(180도 규칙) 고정.** 인물별 좌우를 정하고 끝까지 지킨다. 방향을 깨는 건 의미가 있을 때 한 번만 | 상궁 "금순 왼쪽·도겸 오른쪽", 4화 거울에서 처음 깸 | 캐스팅 때 인물별 `screen_side` 지정, 모든 샷 프롬프트에 "X is always on the LEFT of frame" |
| C6 | **마주 보되 사이에 물건 하나**, 그 물건이 관계를 말한다 | 상궁 4화 은비녀·사발·창살 | 단톡방 사건의 소품을 둘 사이에: 모임통장 카드, 마지막 치킨 다리, 시계, 생일 케이크 |
| C7 | **소품은 크고 읽히는 것으로.** 미세한 표시에 뜻을 걸지 않는다. 소품 출처는 대사가 말한다 | 상궁 3화 "사발 자국으로 안 보인다" → 쪽지 접기 | 치킨 다리·금시계·통장처럼 한눈에 읽히는 소품만 |
| C8 | **연속성 상태표**: 장면마다 문·소품·의상·누가 무엇을 들었나를 표로 적고 프롬프트에 넣는다 | 집착광공 "문이 열렸다 닫혔다", "왜 갑자기 자기 총을 빼" | Showrunner 출력에 `continuity` (인물별 의상·소품 상태) |
| C9 | **손 근접 금지**, 손은 화면 아래. 깨지기 쉬운 부위로 뜻을 전하지 않는다 | 손금 드라마 손가락 깨짐 | "hands mostly below frame; no hand close-ups" |
| C10 | **멈춤·느리게 늘리기·정지 인서트 금지.** 여운은 길이와 소리로 | 사내무당 "귀걸이 인서트 존나 이상해", 손금 정지 인서트 | 플레이어에서도 프리즈 프레임 쓰지 않음 |
| C11 | **인물 고정 표정 규칙** (예: 백령은 절대 웃지 않는다) | 사내무당 백령 | 캐스팅 때 `never` 필드 (예: "서연 never smiles until shot 5") |
| C12 | **미모 우선, 캐스팅은 비현실적으로 잘생기고 예쁘게** | 집착광공 "다 초초초 비현실적일 만큼" | 시트 프롬프트 맨 앞에 "strikingly attractive, flawless skin, flattering beauty lighting" |
| C13 | **근접은 3/4 각도·85mm.** 정면 꽉 찬 근접에 'cold'를 쓰면 미간이 몰린다 | 상궁 2화 레온 | 근접 샷 기본값 |
| C14 | **카메라 밀기(push-in)는 감정이 바뀌는 순간에만** | 상궁 4화 [밀기] 목록 | 샷당 최대 1회, 깨달음·충격 순간 |

```text
SHOT PROMPT GRAMMAR (Omni):
[# Sources <FIRST_FRAME>@Image1] Over-the-top Korean makjang drama, comedic tone. Same location, same lighting throughout.
{A} is always on the LEFT of frame, {B} always on the RIGHT. Between them on the table: {prop}.
Shot 1 ({size}, {height}, one movement): {action}. {speaker} says in Korean: "{line}"
Cut to Shot 2: {listener} reaction close-up, 3/4 angle, 85mm, holds 1.5 seconds; {reaction}.
{climax only: Dramatic triple zoom-in on {target}'s shocked face.}
Hands stay below the frame edge. No freeze frames, no slow motion. Characters are strikingly attractive.
Sound: dialogue and natural sound effects only. No background music, no score. No subtitles, no text.
```

---

## 3. 대사·발음 규칙 (립싱크)

| # | 규칙 | 계기 |
|---|---|---|
| D1 | **한 문장 20음절, 한 샷 대사 합 25음절 이하.** 넘으면 쪼갠다 | 상궁 2화 34음절 줄 세 판 모두 꼬임 |
| D2 | **발음 위험 어미·낱말 회피:** -하오/-였소/-이오(→ -시오, -지), "의" 이음, 같은 소리 반복(따른/따르라/따로), ㅎ+반모음 첫소리(혀), 끝음절 삼키는 -구나 | 손금 하오체, 상궁 "혀로" 7연속 실패 |
| D3 | **두 번 틀린 낱말은 재생성 말고 다른 말로 바꾼다** (조항→계약, 대신관→그자) | 손금 3·7화 |
| D4 | **소리로 바로 알아듣는 말만.** 직업 은어·전문 용어는 앞에서 깔지 않으면 못 읽는다 | 집착광공 "현장 조사다" |
| D5 | **대사마다 받아쓰기 확인, 긴 클립은 두 모델 교차.** 누락 오판으로 멀쩡한 장면 재생성 금지 | 손금 4화 $1.6 낭비 |
| D6 | **같은 인물 나이 차이는 목소리 말고 얼굴·의상으로** | 상궁 4화 F0 측정 |

```text
LINE RULES: max 20 Korean syllables per sentence, max 25 per shot. Avoid -하오/-였소/-이오 endings (use -시오 or plain speech), avoid tongue-twister repeats and 혀-type onsets. Use only words a listener instantly understands by ear.
```
→ Verifier 1e(음절 수, 코드) + 위험 어미 정규식 검사 + Verifier 3(받아쓰기 CER).

---

## 4. 소리·음악 규칙

| # | 규칙 | 계기 |
|---|---|---|
| M1 | **영상 생성에는 배경음악 금지**, 대사와 자연 효과음만. 음악은 후편집으로 한 층에서 | 전 드라마 공통 (2026-10-14 결정) |
| M2 | **음악은 큐 시트로**: 들어오고·부풀고·멎는 순간을 컷·대사 시각에 맞춘다. 한 곡 잘라 깔기 금지 | 상궁 3화 "이거밖에 안 돼?" |
| M3 | **정적도 큐다** (웃음 직전, 충격 직후). 단, 죽은 공기는 안 되니 곡 꼬리를 흘린다 | 상궁 3화 "…국밥?" |
| M4 | **한 곡으로 쭉, 흐름 끊지 않기.** 곡이 자꾸 바뀌면 몰입이 깨진다 | 일진영애 마감 2판 |
| M5 | **절정은 음량이 아니라 음역으로.** epic·full orchestra·fortissimo 금지 | 상궁 3화 창호지 "갑자기 너무 웅장" |
| M6 | **덕킹은 대사 구간 자동화** (-6dB, 0.25초 내려가고 0.6초 올라옴) | 상궁 3화 |
| M7 | **효과음 크기는 소리 나는 몸통으로 잰다** (파일 전체 RMS 아님) | 상궁 3화 "튀고 불쾌한 소리" |
| M8 | **소리 모티프:** 같은 소리를 무게만 바꿔 반복하면 뜻이 생긴다 (가벼운 "탁"은 사랑, 무거운 "탁"은 칼) | 상궁 4화 사발 소리 |

Makjang 적용: Omni 프롬프트에 "No background music" 고정 → Lyria 스팅 1곡을 예고편 전체에 깔고, 플레이어에서 대사 구간 -6dB 덕킹, 클라이맥스 줌인 직전 0.5초 정적 → 스팅 타격. 소리 모티프는 "카톡 알림음"(가벼운 = 일상, 무거운 = 폭로).

---

## 5. 편집·화면 글자 규칙
| # | 규칙 | 계기 |
|---|---|---|
| E1 | 컷은 프레임 경계에서 자른다 (안 맞추면 영상이 소리보다 최대 0.45초 앞섬) | 집착광공·상궁 |
| E2 | 인물 카드는 그 인물이 화면에 있고 이름이 불릴 때, 얼굴을 가리지 않는 빈자리에 크게 | 상궁 1화, 집착광공 마감 |
| E3 | 무엇을 빼 달라는 요청은 그 컷만 뺀다. 나머지를 갈아엎지 않는다 | 집착광공 v10→v11 |
| E4 | 레퍼런스 재현은 눈대중 금지, 픽셀로 재서 똑같이 | 손금 7화 하이킥 엔딩 패러디 |
| E5 | 화면 안에 "AI 생성" 표기 줄을 넣지 않는다 (AI 표시는 플랫폼 기능·워터마크로) | 티키 공통 |

Makjang 적용: 근거 카드 = 인물 카드 규칙(E2)대로, 그 대사를 한 인물이 화면에 있을 때, 얼굴 피한 빈자리에 카톡 말풍선 모양으로. 제목 카드는 "회차 제목은 다른 뜻으로 읽히지 않게".

---

## 6. 검수 절차 (티키의 실제 공정 → Verifier 매핑)

| 티키 공정 | Makjang Verifier |
|---|---|
| 대본: 상황 표(원하는 것·아는 것·하는 일) → "누가 무엇을 어떻게 아나" 표 | 1c 정보 출처 |
| 대본: 음절 수 측정, 위험 어미 제거 | 1e 코드 검사 |
| 촬영 설계: 시간·거리표, 연속성 상태표, 화면 방향 | Showrunner `continuity`·`screen_side` 필드 + 2 비전 검수 |
| 생성 후: 컷 경계 직전·직후 프레임 대조, 인물 좌우 대조 | 2 비전 검수 (일관성 + 좌우) |
| 생성 후: 줄마다 받아쓰기 두 모델 교차 | 3 오디오 검수 |
| 감정선 검증표 (인물마다 겉/속/보이는 법) | Showrunner `cast[].inner_vs_outer` (stretch) |
| 생성 전 비용 확인 | HITL #2 "이대로 촬영" 승인 화면에 예상 비용 표시 |

---

## 7. 피치용 한 줄 (영어)
> "We produce AI K-dramas every week for our fortune-telling app. Every note our director ever gave — 'how does she know his rank?', 'lines over 20 syllables get garbled', 'never cut in a separate insert' — became a rule. Makjang's showrunner and its reviewers run on those 50+ rules. That's why the trailer feels directed, not generated."

숫자(정확): 작품 5개 · 손금 로판 본편 7화+번외 · 궁중 암투 티저+4화 대본 · 집착광공·일진영애 티저 마감 · 연출 규칙 문서화 50개 이상.

---
## 8. Omni 실측 확인 (2026-10-15, `tests/out/vid/v5_shot_grammar.mp4`)
위 촬영 문법을 Omni에 그대로 넣어 10초 1회 생성(48초): Shot 1 투샷 → Cut to 지훈 근접(로우, 3/4, 어색한 웃음) → Cut to 서연 반응 근접(하이, 안 믿는 눈, 웃지 않음) 순서대로 나옴. 좌우 고정 유지, 배경 인물 유지, 음악 없음, 한국어 대사 2줄 정확.
**보완:** 지시 안 한 와이드 샷을 끝에 하나 덧붙였다 → 프롬프트 끝에 `End on Shot 3. No additional shots after Shot 3.` 추가.
