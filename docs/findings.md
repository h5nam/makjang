# 사전 실측 결과 (2026-10-15 밤, 개인 키로 실제 호출)

> 모든 수치는 `tests/`의 리서치 스크립트로 실제 호출해 잰 값. 이 스크립트들은 **해커톤 제출 코드가 아니다** — 내일 코드는 현장에서 새로 쓴다.

## 결론 한 줄
**전 파이프라인이 현실적으로 3분 안에 돈다.** 얼굴(실사·웹툰), 캐릭터 일관성, 한국어 대사 립싱크, 막장 연출(물벼락·김치 싸대기) 모두 통과. 병목은 Argon 텍스트 생성 속도와 영상 단가.

## 모델별 실측

| 단계 | 모델 | 실측 지연 | 품질 판정 | 단가 |
|---|---|---|---|---|
| 단톡 분석·캐스팅·5샷 예고편 JSON | `gemini-4-argon` (thinking low/medium 동일) | **34s** (입력 6k, 출력 2.3k tok) | 심어둔 떡밥 5/5 탐지, 근거 줄번호 10/10 정확 | ~$0.03 |
| 긴 텍스트 생성 (단톡 195줄) | `gemini-4-argon` medium | 78s (출력 4.7k tok ≈ 60 tok/s) | 한국어 단톡 말투 매우 자연스러움. 요청 420줄 → 195줄로 짧게 씀 | ~$0.05 |
| 캐릭터 시트 1장 | `gemini-nano-banana-2.1` 1K | 15–22s (10장 병렬 **벽시계 23s**) | 실사 = K-드라마 포스터급, 웹툰 = 네이버 웹툰급 | $0.034 |
| 레퍼런스 3장 넣은 장면 | `gemini-nano-banana-2.1` 1K / 2K | 28–43s / 41–44s | 얼굴·의상·시계 유지 양호. **실사 강남역 컷에서 서연 흑발→갈색 드리프트 1건** (검증 루프로 잡을 대상) | $0.034 / $0.05 |
| 영상 8초 (첫 프레임 = 실사 컷) | `gemini-omni-1.1-flash` 720p | 3개 병렬 **벽시계 52s** | **실사 첫 프레임 허용됨**(Seedance와 다름). 한국어 대사 정확·자연. 후반부 여성 얼굴 약간 둥글어짐 | ~$0.10/초 |
| 영상 8초 (캐릭터 시트 2장 레퍼런스) | 〃 | 〃 | 두 인물 얼굴·시계·의상 유지, 한국어 대사 2줄 정확 | 〃 |
| 영상 6초 (웹툰 컷 → 무빙툰) | 〃 | 〃 | 웹툰 화풍 유지, 코믹 비트(치킨 상자 떨어뜨림) 연출 OK, 한 번 컷 전환 | 〃 |
| 김치 싸대기 (안전 필터 테스트) | 〃 | ~50s | **통과**. 김치 들고 → 철썩 → 3연속 줌인 충격 얼굴까지 연출 | 〃 |
| 대사 받아쓰기 검증 | `gemini-3.8-flash` (오디오 입력) | 7–11s | 영상 대사 = 대본 100% 일치 판정 | 미미 |
| 2인 TTS (내레이터+민지) 16초 | `gemini-3.8-flash-tts` | 9.8s | 받아쓰기 100% 일치, 연기 톤 자연 | ~$0.004 |
| 보이스 디자인 (막장 예고 내레이터) | `voices.create` + TTS | 생성 28s + 발화 7s | "다음 이 시간…" 톤 정확 | 미미 |
| 막장 스팅 음악 30초 | `lyria-3-clip-preview` | 15.7s | (직접 들어볼 것) | 미미 |

**직접 확인할 샘플 (꼭 보고/들어보기)**
- 얼굴: `tests/out/cs_photo.jpg`, `tests/out/cs_webtoon.jpg`, `tests/out/cs_scene_*.jpg`
- 영상: `tests/out/vid/v1_photo_firstframe.mp4`, `v2_photo_refs.mp4`, `v3_webtoon_motion.mp4`, `v4_kimchi_slap.mp4`
- 소리: `tests/out/audio/tts_multi.wav`, `voice_design_line.wav`, `lyria_sting.mp3`
- Argon 분석 결과: `tests/out/analysis_medium.json`

## 1회 실행 비용 추정 (5샷 예고편)
Argon ~$0.05 + 이미지 10장 ~$0.35 + **영상 5×8초 = 40초 ≈ $4.0** + TTS/음악 ~$0.1 → **약 $4.5/회**.
→ 현장 계정은 빌링이 걸려 있지만 "과도한 리소스" 정지 조항이 있으니, **데모 패스코드**로 남용을 막고 개발 중엔 `360p`·4초로 돌린다.

## 함정·제약 (설계에 반영 필수)
1. **Argon은 텍스트 출력이 느리다 (~60 tok/s).** 긴 대본을 쓰게 하지 말고, 짧은 구조화 JSON만 받는다. 샷별 상세 프롬프트 확장은 Flash 병렬로.
2. **Argon에 temperature/top_p 넣지 말 것** (무시+경고). `thinking_level`만. 응답 JSON은 `response_format={"type":"text","mime_type":"application/json"}`.
3. **nano-banana-2.1 캐릭터 레퍼런스는 이미지당 최대 4명.** 샷당 등장인물 ≤3명으로 대본 규칙에 박는다.
4. **실사 머리색·얼굴 드리프트가 생긴다** → 비전 검증 루프(시트 vs 컷 비교)가 진짜로 필요하고, 데모에서 "잡아내는 장면"이 나온다.
5. **Omni는 기본이 멀티샷**이다. 한 컷으로 원하면 "Continuous single shot, no scene cuts" 명시. 3–10초 정수만.
6. **Omni: "인식 가능한 실존 인물" 이미지 업로드는 지원 안 됨** → 친구 셀카 업로드 기능은 만들지 않는다. 등장인물은 **채팅 성격에서 뽑은 가상 배우**로 캐스팅 (프라이버시 서사에도 유리).
7. **보이스 디자인 voice_id는 프로젝트별** → 오늘 만든 목소리는 내일 임시 프로젝트에서 못 쓴다. 프롬프트 문구만 가져가고, 현장에서 앱 첫 실행 때 생성·캐시.
8. **멀티스피커 TTS는 프리빌트 보이스 2명까지.** 디자인 보이스를 섞으려면 턴별로 따로 합성해 이어 붙인다.
9. **Omni 대사는 영어 외 언어 "미평가"**라고 문서에 있지만 실측상 한국어 짧은 대사(≤20음절)는 정확. 긴 대사는 위험 → 대본 규칙에 20음절 제한.
10. 카톡 내보내기 형식은 **PC / iOS / 안드로이드가 다르다** → 오늘 밤 직접 3종을 내보내 형식 메모 (day-plan 참고).

## 추가 실측 (같은 날 밤)
- **긴 단톡도 분석 시간이 그대로:** 가족방 851줄(입력 32k 토큰)을 Argon medium으로 **31.9초**. 195줄(6k)일 때 34초와 같다 → 입력 길이는 병목이 아니다. 실제 몇 년치 단톡도 데모 가능.
  - 결과 제목 "흔들린 수국: 파란불의 비밀"(아빠의 흔들린 수국 사진 + 주식 파란불), 5샷 모두 근거 줄 인용, 떡밥(아빠 주식·민수 출생 날씨 모순·이모 중매·민수 몰래 인턴·가족회의) 전부 회수.
- **티키 촬영 문법이 Omni에서도 먹힌다:** "Shot 1 … Cut to Shot 2 …" 3샷, 좌우 고정, 반응 근접, 음악 금지 모두 지킴(`tests/out/vid/v5_shot_grammar.mp4`, 10초 48s). 단 마지막에 지시 안 한 와이드를 덧붙임 → "End on Shot 3" 필요. 상세는 director-rulebook.md 8장.
- **생성 단톡의 함정:** 자정 넘긴 메시지에 날짜 줄을 빼먹는다(친구방 27곳) → `tests/t9_fix_chat.py`로 보정, `tests/t8_validate_chat.py`로 검사(세 방 오류 0). **당일 파서도 "시간이 거꾸로 가면 다음 날"로 처리**해야 실제 내보내기 파일에서도 안전.

## 당일 현장 확인 (10/16 10:45, 해커톤 프로젝트 `h2gdm-hack26icn-2662`)
- 키: AI Studio 대신 `gcloud services api-keys create --api-target=service=generativelanguage.googleapis.com`로 발급 → `~/.hack-key` (리포 밖). Argon·Flash·nano-banana·Omni·TTS·Lyria 모두 목록에 있음.
- 실호출: Argon 7.7s, Flash 11.6s, nano-banana 1K 21.9s, Omni 360p 4초 20.1s.
- **Omni `response_format.duration`은 문자열 `"4s"`** (정수 4 → `Invalid input at 'response_format'`).
- Cloud 약관 동의 전엔 `gcloud services enable`이 `UREQ_TOS_NOT_ACCEPTED`. 한국은 "commercial purpose" 체크까지 해야 버튼이 켜짐. run·cloudbuild·artifactregistry·apikeys 활성화 완료.
- Antigravity 로그인: gcplab 계정 → Billing Model **Pay As You Go** + 프로젝트 ID. 개인 계정 상태에선 Argon "Unavailable". CLI `agy`는 앱 로그인을 공유 (`agy -p ... --model gemini-4-argon-low` 응답 확인).
- **Lyria는 효과음 팩이 안 된다:** 타임스탬프로 "큐 사이 무음" 지시해도 30초 내내 이어지는 음악으로 나옴(초당 RMS -9~-33dB, 무음 구간 0). → 장면 효과음은 Omni 영상 오디오(물벼락·싸대기 실측 OK), 타이틀/엔딩 스팅은 Lyria 클립 앞부분 2~3초 + 페이드아웃. 샘플: `tests/out/audio/lyria_sfx_pack_test.mp3` (13.4s 생성).
- **셀카 → 캐스팅 실측 (`tests/t10_selfie.py`, 가상 셀카 `A_jihoon.jpg`):** 실사 시트 19.7s · 웹툰 시트 19.9s · 물벼락 키프레임 17.1s · Omni(키프레임 첫 프레임) 20.8s · Omni(셀카 원본 첫 프레임) 20.5s — **전부 거절 없이 통과, 얼굴 닮음 유지**. 실사 시트는 "배우처럼" 조금 미화됨. 결과: `tests/out/selfie_jihoon/all.jpg`.
  - ⚠ 이건 AI 생성 얼굴. **실제 사람 셀카**가 Omni "recognizable people" 필터에 걸리는지는 아직 미확인 → 현장에서 본인 셀카 1장으로 확인할 것.
- 데모용 가상 셀카 14장 (`assets/demo-chat/selfies/`, gpt-image-2.5 flare high, 장당 ~17s·~$0.05, 프롬프트 `personas.json`). 데모 **입력 데이터**일 뿐, 제품 안의 생성은 전부 Google 모델.
