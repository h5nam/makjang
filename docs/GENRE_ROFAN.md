# Genre: 로판 막장 (Romance-Fantasy Makjang)

A second genre next to 현대 막장. Same pipeline, same receipts — but the friends are recast as nobles of a fictional empire, in costume, and the chat events are translated into romance-fantasy tropes. **Tested end to end (tests/t11_rofan.py in the prep repo):** selfie → rofan costume sheet 19–22s (likeness kept), 3-character ballroom keyframe 31s, Omni 720p "6s" 35s with the full line spoken ("공녀와의 약혼을 파기하겠다!"), wine-glass drop SFX. Webtoon-cover style also works.

## UI
- Genre toggle on the Cast & Consent screen (and as a chip on each lineup card): **현대 막장 | 로판 막장** (EN: Modern Makjang | Romance Fantasy). Default 현대; remember per run.
- Lineup card hover shows a small "로판으로 보기" secondary action.
- Title card / end card: rofan web-novel title format (see below), gold serif on deep burgundy instead of black.

## World bible (put into the showrunner prompt when genre = rofan)
Fictional 19th-century-inspired European empire "칼레도르 제국". Locations: 황궁 무도회장, 공작가 저택 응접실, 장미 정원, 황실 마차, 신전, 북부 대공성, 가면무도회, 사교계 티파티. No real countries, no religion mockery, no real history.

### Chat → rofan translation (the receipt still quotes the real chat line)
| Real chat signal | Rofan twist |
|---|---|
| 회비/정산/계좌 | 공작가 금고·영지 세금 횡령, 사라진 금화 |
| 누가 누구랑 어디서 목격됨 (강남역) | 가면무도회·장미 정원 밀회 목격 |
| 읽씹 / 답장 없음 | 답장 없는 서신, 봉인된 편지 |
| 방 나감 / 재초대 | 가문 파문·사교계 추방 후 복귀 |
| 생일 잊힘 | 성년식·데뷔탕트를 아무도 기억 못 함 |
| 비싼 시계·물건 자랑 | 출처 불명의 황실 회중시계·보석 |
| "입양될 뻔" / 출생 얘기 | 뒤바뀐 공녀, 숨겨진 황실 혈통 |
| 마지막 치킨 닭다리 | 만찬의 마지막 마카롱·칠면조 다리 결투 |
| 퇴사 / 이직 | 기사단 탈퇴, 적국 가문으로 망명 |
| 조직개편·승진 | 작위 수여, 최연소 기사단장 임명 |
| 가족회의 / "할 말 있다" | 가문 회의 소집, 유언장 공개 |
| 소개팅·결혼 압박 | 정략결혼, 계약결혼 제안 |

### Rofan trope list (G-tier unless noted)
회귀(이번 생엔 다르게), 악녀 빙의, 계약결혼, **무도회 파혼 선언**, 가면무도회 밀회, 장갑 던져 결투 신청, 드레스에 와인 쏟기, 뒤바뀐 공녀·사생아 출생의 비밀, 황태자와 성녀의 삼각관계, 북부대공의 청혼, 가문 몰락과 복수, 흑막 공작, 시녀의 고자질, 마차 추격, 금화 주머니 던지기(돈봉투의 로판 버전), 장미 정원 고백, 성녀의 신탁.
Avoid: poison/assassination, executions, illness countdowns (R-tier). Use comic swaps: "쓴 홍차", "가문 회계 장부 압수", "금화 대신 마카롱".

### Dialogue style
Rofan register, still ≤20 syllables: "감히 공녀에게!", "전하, 그 금화는 어디 갔습니까?", "이번 생엔 정산부터 하겠어요.", "공녀와의 약혼을 파기하겠다!" Title words: 전하, 공녀, 공작, 황태자, 성녀, 대공, 영애.

### Episode title formula (web-novel style)
"[주인공 직함]는 [사건]을 [행동]하기로 했다" / "이번 생엔 [사건]부터 하겠습니다" / "[인물]가 수상하다". Examples: "악녀는 단톡방을 나가기로 했다", "회비를 횡령한 황태자가 수상하다", "이번 생엔 정산부터 하겠습니다".

## Prompts (verified wording)
**Character sheet (selfie or fictional):**
```
Korean romance-fantasy (로판) drama costume portrait of the person in the image — keep their face, age (late 20s) and identity clearly recognizable. Set in a fictional 19th-century-inspired European empire. Cinematic photoreal, soft candlelight, painterly palace background, 85mm, chest-up. No text.
Role: {rofan_role_en} — {costume_en}, {signature_prop_en}, {expression_en}.
```
Role examples: villainess duchess (crimson silk ball gown, black lace, ruby choker, tiara, black lace fan) · crown prince (white-and-gold dress uniform, epaulettes, blue sash, gold pocket watch) · saintess with a secret (ivory gown, silver embroidery, veil) · northern grand duke (black fur-trimmed coat, sword) · lady-in-waiting gossip (simple maid dress, letter in hand).
Webtoon variant: "Korean romance-fantasy webtoon cover illustration (로판 웹툰 표지 style) of the person in the image as {role}, sparkling jewels, flowing hair, roses, luminous soft shading, clearly recognizable likeness. No text."

**Keyframe:** "Photoreal Korean romance-fantasy drama film still, 16:9, {location_en}. {action with 'the man from image 1, late 20s' …}. Keep each face, hair and costume exactly as their reference. Candlelight, cinematic. No on-screen text, no captions, no letters anywhere."

**Omni:** "<FIRST_FRAME> No on-screen text, no captions, no subtitles. Continuous single shot, no scene cuts. Over-the-top Korean romance-fantasy makjang drama. {camera}. {speaker} says in Korean, {emotion}: "{line_ko}" The line starts within the first second and finishes before the clip ends. {reaction}. Sound: {sfx}, dramatic orchestral sting. End on this shot. No on-screen text."

## Lyria / narrator
- Music: "Romantic-fantasy royal court score: harpsichord and strings waltz turning into a dramatic orchestral hit, Korean romance-fantasy drama trailer, instrumental."
- Narrator line style: "다음 이 시간… 사라진 금화 아홉 닢, 그리고 뒤바뀐 공녀의 비밀."
