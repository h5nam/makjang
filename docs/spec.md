# Makjang — 제품·기술 설계서 (현장에서 Antigravity/Argon에 그대로 붙여넣는 문서)

> 이 문서는 설계 문서다. 코드는 해커톤 시간(11:20~) 안에 새로 쓴다.

## 1. 한 줄
**"Makjang — your group chat, remade as a K-drama."**
단톡방 대화 내보내기 파일을 넣으면, 친구들이 주연인 **K-막장드라마 1화 예고편**(약 40초, 실사 K-드라마 영상 + 내레이션 + 음악)이 나온다. **모든 막장 반전에는 실제 메시지 근거가 화면에 붙는다.**

## 2. 사용자와 문제
- **이름 붙은 사용자:** 민지(28), 대학 동기 5인 단톡방 방장. 단톡방은 매일 시끄럽지만 "우리 얘기"를 다시 꺼내 볼 방법이 없다. 회비 미스터리·읽씹·생일 까먹은 사건은 묻히고 섭섭함만 남는다.
- **가치:** 우리 이야기를 웃긴 K-드라마로 만들어 단톡방에 다시 던지는 순간 → 놀이·화해·공유. (확장: 티키의 20–30대 여성 타깃 바이럴 콘텐츠, 사주 궁합 캐스팅)
- **Track 1 적합성:** 서울발 K-드라마 문법(출생의 비밀, 물벼락, 김치 싸대기, 3연속 줌인)을 전 세계 단톡방(KakaoTalk/WhatsApp)에 적용하는 새 엔터 경험.

## 3. 왜 Gemini 4 Argon이어야 하나 (심사 포인트)
1. **1M 컨텍스트:** 몇 달치 단톡 전체(수만 줄)를 한 번에 읽고 인물 관계·복선·사건 타임라인을 엮는다. 일부만 읽으면 "강남역 목격 + 시계 + 회비"가 이어지지 않는다.
2. **멀티모달 오케스트레이션:** Argon이 쇼러너로 nano-banana-2.1(캐스팅·키프레임), omni-1.1-flash(대사 있는 영상), 3.8-flash-tts(내레이터), lyria(음악)를 지휘한다.
3. **검증 루프 3단:** 근거 검증(텍스트) → 캐릭터 일관성 검증(비전) → 대사 정확도 검증(오디오). 실패 항목만 재생성. 화면에 루프가 보인다.

## 4. 사용자 흐름 (화면)
1. **Upload:** `.txt` 드래그 (카톡 PC/iOS/안드로이드, WhatsApp). 샘플 단톡 버튼(데모 폴백).
2. **Consent (HITL #1):** 참여자 목록 → 인물별 "출연 동의" 체크, 가명 토글, 빼고 싶은 사건 체크 해제. 스타일 선택 `K-Drama (photoreal)` / `Webtoon`. 서버에 원문 저장 안 함 고지.
3. **Writers' Room (진행 화면 = 쇼):** 단계별 카드가 실시간으로 뜬다.
   - "195줄 읽는 중…" → **떡밥 카드 5장** (사건 + 근거 메시지 원문 인용)
   - **캐스팅 보드** (이름 → 배역, 배정 이유 + 근거)
   - **검수관 로그**: ⚠ 빨간 지적 → ✅ 수정 (근거 불일치, 대사 20음절 초과, 수위)
   - 캐릭터 시트 5장 등장 → 키프레임 5장 → ⚠ "서연 머리색 불일치 → 재생성" → ✅
   - 영상 5샷 렌더 진행 바 → 🎙 "대사 정확도 5/5"
4. **Approve (HITL #2):** 대본·캐스팅을 보고 "이대로 촬영" 승인 (영상 생성 전, 비용 큰 단계 앞).
5. **Premiere:** 예고편 플레이어. 타이틀 카드 → 내레이션 → 샷 5개, **각 샷 하단에 "실제 대화" 근거 카드** (`8/16 [지훈] 지금 계좌에 12만원 찍혀있는데?`) → "다음 화 예고" → 공유/다운로드.

## 5. 파이프라인 (병렬 최대화, 목표 ≤3분)

```
parse(txt) ─► Argon SHOWRUNNER (JSON, ~35s)
               │
               ├─► Verifier#1 (Flash ×3 병렬 + 코드검사, ~8s) ──fail──► Argon PATCH (prev_interaction_id) ─┐
               │                                                                                     │(최대 2회)
               ├─► [동시에] 캐릭터 시트 ×N (nano-banana 병렬, ~20s)                                     │
               ▼                                                                                     ▼
          HITL #2 승인 ─► 키프레임 ×5 (nano-banana, 시트 레퍼런스, ~35s)
                              └─► Verifier#2 비전 (Flash/Argon, 시트 vs 컷 점수) ──<7점──► 해당 컷만 재생성
                         ─► 영상 ×5 (Omni, 첫 프레임=키프레임, 6–8s, ~60s 병렬)
                              └─► Verifier#3 오디오 (받아쓰기 vs line_ko) ──불일치──► 해당 샷 1회 재생성 or TTS 더빙 폴백
                         ─► [영상과 동시에] 내레이션 TTS (디자인 보이스) + Lyria 스팅
                         ─► Premiere 플레이어 (브라우저에서 순차 재생 + 오버레이)
```

예상 시간: 분석 35 + 검수 10 + 시트(병렬 겹침) + 키프레임 35 + 비전검수 10 + 영상 60 + 오디오검수 10 ≈ **2.5–3분**.

## 6. 데이터 스키마

**ChatLine** `{ id: "L37", ts: "2026-08-16T10:16", speaker: "지훈", text: "지금 계좌에 12만원 찍혀있는데?", kind: "text|photo|emoticon|deleted|system" }`

**Showrunner 출력 (Argon JSON)**
```json
{
  "title_ko": "단톡방의 유혹: 사라진 삼만원과 닭다리의 비밀",
  "logline_en": "...",
  "cast": [{"name":"지훈","archetype_ko":"모임통장 횡령범이자 이중생활 총무","why_en":"...","evidence":["L37","L89"],"look_en":"Fictional Korean actor, late 20s, ..."}],
  "seeds": [{"event_ko":"...","evidence":["L35","L37"],"makjang_twist_ko":"..."}],
  "trailer": [{"shot":1,"setting_en":"...","characters":["민지","지훈"],"action_en":"...","line_ko":"십오만 원인데 왜 십이만 원이야!","speaker":"민지","evidence":["L35","L37"],"trope_ko":"비자금 횡령"}],
  "narration_ko": ["단돈 삼만 원으로 시작된 우정의 균열,", "...", "..."]
}
```
규칙: 샷 정확히 5개, 샷당 인물 ≤3명, `line_ko` ≤20음절, 모든 `evidence`는 실제 줄 ID.

**Verifier 결과** `{ check: "evidence|knowledge|safety|syllables|consistency|lipsync", target: "shot3", pass: false, reason_ko: "L86은 지훈이 먹었다는 근거가 아님", fix_hint: "..." }`

## 7. 검증 루프 상세 (심사 1순위 항목)
| # | 대상 | 방법 | 실패 시 |
|---|---|---|---|
| 1a | 근거 존재 | **코드**: 모든 evidence ID가 실제 줄인지 | Argon 패치 |
| 1b | 근거 타당성 | Flash: "이 인용이 이 주장/대사를 뒷받침하나?" (샷별 병렬) | Argon 패치 |
| 1c | 정보 출처 | Flash: "대사의 화자가 그 시점에 이 사실을 알 수 있나?" (티키 드라마 규칙) | Argon 패치 |
| 1d | 수위·안전 | Flash-Lite: 성적/실제 범죄/한 명 몰아 조롱/동의 안 한 인물 등장 | Argon 패치 |
| 1e | 대사 길이 | **코드**: 한글 음절 수 ≤20 | Argon 패치 |
| 2 | 캐릭터 일관성 | Flash 비전: 시트 N장 + 컷 → 인물별 얼굴/머리/의상 0–10점 JSON | <7점 컷만 재생성 (fix 노트 프롬프트에 추가) |
| 3 | 대사 정확도 | 영상 오디오 → 받아쓰기 → `line_ko`와 정규화 비교(CER) | 1회 재생성, 재실패 시 TTS 더빙 오버레이 |

UI에는 모든 검사를 "검수관" 로그로 보여준다 (⚠ → ✅). **실패가 하나도 없으면 오히려 루프가 안 보이므로**, 데모 입력엔 자연스럽게 걸릴 요소(긴 대사 경향, 머리색 드리프트)가 있음을 이용.

## 8. 아키텍처
- **Next.js (App Router, TypeScript) 단일 서비스 → Cloud Run** (`asia-northeast3`). 가장 손에 익은 스택.
- **SDK:** `@google/genai` ≥ 2.29 (Interactions API). 키는 AI Studio에서 임시 프로젝트 키 → Cloud Run 환경변수/Secret Manager. **절대 커밋 금지** (public repo).
- **잡 실행:** `POST /api/run` → runId, 잡은 서버 메모리에서 비동기 진행. `GET /api/run/:id/events` **SSE**로 단계 이벤트 스트리밍. `GET /api/media/:id` 로 이미지/영상 바이트 서빙 (메모리 Map).
- **Cloud Run 설정 (중요):** `--no-cpu-throttling`(응답 밖 백그라운드 작업), `--min-instances 1 --max-instances 1`(메모리 상태 공유), `--timeout 900`, `--memory 2Gi`, `--concurrency 80`. 퍼블릭 버킷·DB 안 씀 (정책 위반 리스크 회피).
- **남용 방지:** 환경변수 `DEMO_PASSCODE` 입력해야 실행.
- **영상 합치기:** 서버 ffmpeg 쓰지 않는다(Buildpacks에 없음). 브라우저에서 샷 순차 재생 + 오디오 레이어(내레이션·스팅) + CSS 오버레이. 다운로드는 stretch(MediaRecorder).
- **개발 중 비용 절약:** `QUALITY=draft` → Omni 360p·4초, 이미지 1K. 데모 때만 720p·8초.

## 9. 범위 (4시간)
- **Must:** 카톡 PC 형식 파서 + 샘플 / 동의 화면 / Argon 쇼러너 / Verifier#1 / 시트+키프레임 / Verifier#2 / Omni 5샷 / Verifier#3 / 내레이션 TTS / 플레이어 + 근거 카드 / Cloud Run 배포
- **Should:** Lyria 스팅, 웹툰 스타일 토글, iOS·안드로이드·WhatsApp 파서, HITL#2 승인 화면
- **Won't:** 로그인, DB 저장, 2화 이후, 실존 인물 사진 업로드, 모바일 앱
- **컷 라인:** 13:00에 영상 단계가 안 붙었으면 **Lite 모드**(키프레임 Ken Burns + 멀티스피커 TTS 대사)로 확정하고 다듬기에 집중.
