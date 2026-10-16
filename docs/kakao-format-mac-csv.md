# KakaoTalk export — macOS app (CSV)

Captured 2026-10-16 from a real 148-member room (15 months). Names below are masked.

- Filename: `KakaoTalk_Chat_<room name>_<YYYY-MM-DD-HH-MM-SS>.csv`
- Encoding: UTF-8 **with BOM** → open with `utf-8-sig` (JS: strip `﻿`)
- Header: `Date,User,Message`
- Date: `YYYY-MM-DD HH:MM:SS` (24h, full date on every row → no day-separator / midnight problem)
- Fields quoted with `"`; **messages can contain newlines** (563 / 2281 rows) → use a real CSV parser, never split on `\n`
- Physical lines 4482 vs records 2281

```
Date,User,Message
2025-07-08 08:13:21,"A | 엔터문화연구소","A | 엔터문화연구소님의 초대링크로 B님을 초대했습니다."
2026-10-15 19:08:17,"C","다이나믹 듀오 포함."
,,"메시지가 삭제되었습니다."
```

## Special rows
| Pattern | Count | Handling |
|---|---|---|
| empty Date **and** empty User, `메시지가 삭제되었습니다.` | 36 | keep as event "deleted message" (trope signal!), attach to previous timestamp |
| empty Date/User, `관리자가 메시지를 가렸습니다.` | 1 | same, "hidden by admin" |
| `…님을 초대했습니다.` (system, User = inviter) | 171 | join event |
| `…님이 나갔습니다.` | 5 | leave event |
| `사진`, `사진 N장`, `동영상`, `이모티콘` | 83 / 28 / 5 / 10 | media placeholders |
| URL-only | 76 | link |

- User names can include ` | org`, English names, emoji, or a single `.`
- Size: 186k chars ≈ well under Argon 1M context — whole room fits in one call.

## Other formats (still to capture)
- Windows PC `.txt`: `[이름] [오후 3:21] 메시지` with `--------------- 2026년 8월 3일 월요일 ---------------` separators
- iOS / Android `.txt`: `2026. 8. 3. 오후 3:21, 이름 : 메시지`
