# WhatsApp "Export chat" formats (parser spec)

Users export via: chat → ⋮ / contact name → **Export chat → Without media**. iOS gives `WhatsApp Chat - <Group>.zip` containing `_chat.txt`; Android gives `WhatsApp Chat with <Group>.txt`. **Accept `.txt` and `.zip`** (unzip in the browser or server, read `_chat.txt`).

## Line formats (detect per file from the first ~50 timestamped lines)
| Variant | Example |
|---|---|
| iOS, en-GB (24h, seconds) | `[16/08/2026, 23:41:05] Emma: message` |
| iOS, en-US (12h) | `[8/16/26, 11:41:05 PM] Emma: message` — note **U+202F narrow no-break space** before AM/PM in newer exports |
| Android, en-GB | `16/08/2026, 23:41 - Emma: message` |
| Android, en-US | `8/16/26, 11:41 PM - Emma: message` |
| Korean-locale phones | `2026. 8. 16. 오후 11:41 - Emma: message` (Android) / `[2026. 8. 16. 오후 11:41:05] Emma: message` (iOS) |

Robust regex (after stripping U+200E/U+200F and normalizing U+202F/U+00A0 to space):
```
^\[?(?<date>\d{1,4}[./-]\s?\d{1,2}[./-]\s?\d{1,4}\.?),?\s(?<time>(?:오전|오후)?\s?\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)\]?(?:\s-\s|\s)(?<rest>.*)$
```
`rest` = `Name: text` for messages; **no `": "` → system line** (e.g. "Mia left", "Emma added Mia", "Messages and calls are end-to-end encrypted…", "Emma created group …", "Emma changed the subject…").
iOS system lines use the **group name as sender** followed by text starting with U+200E — treat `sender == group name` (the most frequent non-person sender / the name in "created group") as system.

**Date order (DD/MM vs MM/DD):** scan all dates; if any first field > 12 → DD/MM; if any second field > 12 → MM/DD; else default DD/MM unless times are 12h AM/PM (then MM/DD). Two-digit years → 20YY.

**Multi-line messages:** a line that does not match the timestamp regex is a continuation of the previous message (append with `\n`).

## Special bodies → `ChatLine.kind`
| Body (after stripping U+200E) | kind |
|---|---|
| `image omitted`, `<Media omitted>`, `<attached: …PHOTO…>` | photo |
| `video omitted`, `<attached: …VIDEO…>` | video |
| `sticker omitted`, `GIF omitted` | emoticon |
| `audio omitted`, `<attached: …AUDIO…>` | audio → treat as photo-like placeholder |
| `This message was deleted.` / `You deleted this message.` / `This message was deleted` | **deleted** (trope signal, keep) |
| bare URL | link |
| `… left`, `… added …`, `… removed …`, `… joined using this group's invite link`, `… changed …` | system (exclude from cast, keep as events: leave/re-add is a trope signal) |
| `<This message was edited>` suffix | strip suffix, keep text |

## Language
- Detect chat language from message text (Hangul ratio). If the chat is mostly **English**, the trailer dialogue `line_*` is written in **English** (Omni is evaluated on English), with Korean subtitles optional; the drama is still a K-makjang (tropes, title card, narrator can stay Korean with EN subtitle — or English narrator if simpler).
- Verifier #3 compares in the dialogue language (CER for Korean, WER/CER on lowercased letters for English).

## Sample data
- `data/chats/D_seoul_squad_ios.txt` (iOS en-GB) and `data/chats/D_seoul_squad_android.txt` (Android en-US, same content) — 5 international friends in Seoul, planted seeds in `D_seoul_squad.json`.
- Selfies `data/selfies/D_{emma,lucas,priya,kenji,mia}.jpg`, poster `public/brand/poster-D.webp`.
