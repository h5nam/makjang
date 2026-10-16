"use client";

import React, { useEffect, useRef, useState } from "react";
import { Hahmlet, Instrument_Serif } from "next/font/google";
import { Play, Loader2, Upload, X, ShieldCheck, UserCheck, Lock, Check, MessageCircle, ArrowDown } from "lucide-react";
import type { ParsedSessionData } from "@/components/LandingUpload";
import "./landing.css";

const display = Hahmlet({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display", preload: false });
const accent = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic"], variable: "--font-accent" });

type SampleKey = "A_friends" | "B_family" | "C_work" | "D_seoul_squad";
export type UILang = "ko" | "en";

interface RoomItem {
  key: SampleKey;
  slot: string;
  poster: string;
  overlayKo: string;
  overlayEn: string;
  ko: string;
  en: string;
  quoteKo: string;
  quoteEn: string;
  infoKo: string;
  infoEn: string;
  app: "kakao" | "wa";
}

const ROOMS: RoomItem[] = [
  {
    key: "A_friends",
    slot: "PM 10:00",
    poster: "/brand/poster-A.webp",
    overlayKo: "강남역 영수증과\n사라진 알리바이",
    overlayEn: "The Gangnam Receipt\n& Vanished Alibi",
    ko: "강남역 영수증과 사라진 알리바이",
    en: "The Gangnam Receipt & Vanished Alibi",
    quoteKo: "“어제 강남역에서 지훈이랑 서연이 본 거 같은데”",
    quoteEn: "“I think I saw Jihoon and Seoyeon at Gangnam Station last night”",
    infoKo: "대학 동기 5인 · 4개월",
    infoEn: "5 college friends · 4 months · KakaoTalk",
    app: "kakao",
  },
  {
    key: "D_seoul_squad",
    slot: "PM 10:30",
    poster: "/brand/poster-D.webp",
    overlayKo: "Seoul Survivors:\nThe Missing ₩90,000",
    overlayEn: "Seoul Survivors:\nThe Missing ₩90,000",
    ko: "서울 생존기: 사라진 9만 원",
    en: "Seoul Survivors — The Missing ₩90,000",
    quoteKo: "“it says 360,000 won right now, must be a bank app glitch”",
    quoteEn: "“it says 360,000 won right now, must be a bank app glitch”",
    infoKo: "International friends · 3 months",
    infoEn: "5 international friends in Seoul · 3 months · WhatsApp",
    app: "wa",
  },
  {
    key: "B_family",
    slot: "PM 11:00",
    poster: "/brand/poster-B.webp",
    overlayKo: "흔들린 수국과\n파란불의 비밀",
    overlayEn: "The Blurred Hydrangeas\n& Green Light",
    ko: "흔들린 수국 사진과 파란불의 비밀",
    en: "The Blurred Hydrangeas & Green Light",
    quoteKo: "“언니 그날 맑았는데?”",
    quoteEn: "“Wait sis, wasn't the weather clear that day?”",
    infoKo: "우리집 가족 5인 · 4개월",
    infoEn: "Family of 5 · 4 months · KakaoTalk",
    app: "kakao",
  },
  {
    key: "C_work",
    slot: "PM 11:30",
    poster: "/brand/poster-C.webp",
    overlayKo: "입사동기\n마지막 회식",
    overlayEn: "The Last\nTeam Dinner",
    ko: "입사동기 마지막 회식",
    en: "The Last Team Dinner",
    quoteKo: "“나 진짜 아무 말도 안 했다”",
    quoteEn: "“I swear I didn't say a single word”",
    infoKo: "입사 동기 4인 · 4개월",
    infoEn: "4 coworkers · 4 months · KakaoTalk",
    app: "kakao",
  },
];

const WALL = [
  ["/brand/poster-A.webp", "/brand/poster-C.webp", "/brand/poster-A.webp", "/brand/poster-C.webp"],
  ["/brand/poster-D.webp", "/brand/poster-B.webp", "/brand/poster-D.webp", "/brand/poster-B.webp"],
  ["/brand/poster-B.webp", "/brand/poster-A.webp", "/brand/poster-B.webp", "/brand/poster-A.webp"],
  ["/brand/poster-C.webp", "/brand/poster-D.webp", "/brand/poster-C.webp", "/brand/poster-D.webp"],
  ["/brand/poster-D.webp", "/brand/poster-A.webp", "/brand/poster-D.webp", "/brand/poster-A.webp"],
];

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".mk-reveal"));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("on")), { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function toBase64(buf: ArrayBuffer) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function MakjangLanding({
  onParsed,
  lang: controlledLang,
  onLangChange,
}: {
  onParsed: (data: ParsedSessionData) => void;
  lang?: UILang;
  onLangChange?: (lang: UILang) => void;
}) {
  const [internalLang, setInternalLang] = useState<UILang>("ko");
  const lang = controlledLang ?? internalLang;
  const isEn = lang === "en";

  const [solid, setSolid] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<"kakao" | "wa">("kakao");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [passcode, setPasscode] = useState("makjang");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useReveal();

  function setLang(next: UILang) {
    setInternalLang(next);
    onLangChange?.(next);
    setTab(next === "en" ? "wa" : "kakao");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("makjang_lang", next);
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (isEn) setTab("wa");
  }, [isEn]);

  useEffect(() => {
    if (!sheet) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [sheet]);

  async function parse(body: Record<string, unknown>, key: string) {
    setError(null);
    setLoading(key);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEn ? "Failed to parse chat" : "불러오지 못했어요"));
      setSheet(false);
      onParsed({ ...data, passcode: passcode.trim() || "makjang" });
    } catch (e: any) {
      setError(e?.message || (isEn ? "Something went wrong. Please try again." : "문제가 생겼어요. 다시 시도해 주세요."));
      if (key !== "upload") setSheet(true);
    } finally {
      setLoading(null);
    }
  }

  async function startUpload() {
    if (!file) return setError(isEn ? "Please choose a chat export file first." : "대화 파일을 먼저 골라 주세요.");
    if (!passcode.trim()) return setError(isEn ? "Please enter the demo passcode." : "패스코드를 입력해 주세요.");
    if (file.name.toLowerCase().endsWith(".zip")) {
      return parse({ zipBase64: toBase64(await file.arrayBuffer()), filename: file.name }, "upload");
    }
    return parse({ text: await file.text(), filename: file.name }, "upload");
  }

  const pick = (f?: File | null) => { if (f) { setFile(f); setError(null); } };

  const orderedRooms = isEn
    ? [ROOMS[1], ROOMS[0], ROOMS[2], ROOMS[3]]
    : ROOMS;

  return (
    <div className={`mk ${display.variable} ${accent.variable}`}>
      <div className="mk-flash" aria-hidden />

      <header className={`mk-header ${solid ? "solid" : ""}`}>
        <div className="wrap">
          <a className="mk-brand" href="#top" aria-label={isEn ? "MAKJANG TALK Home" : "막장톡 홈"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mk-brand-icon" src="/brand/icon-180.png?v=2" alt="막장톡" width={32} height={32} />
            <span className="ko-display mk-brand-title">{isEn ? "MAKJANG TALK" : "막장톡"}</span>
            <span className="mono mk-brand-sub">{isEn ? "막장톡" : "MAKJANG TALK"}</span>
          </a>
          <nav className="mk-nav">
            <a href="#lineup">{isEn ? "Lineup" : "편성표"}</a>
            <a href="#how">{isEn ? "How it works" : "작동 방식"}</a>
            <a href="#built">How it&apos;s built</a>
            <div className="mk-lang" role="group" aria-label="Language selector">
              <button
                type="button"
                className={lang === "ko" ? "on" : ""}
                onClick={() => setLang("ko")}
                aria-pressed={lang === "ko"}
              >
                KO
              </button>
              <button
                type="button"
                className={lang === "en" ? "on" : ""}
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
              >
                EN
              </button>
            </div>
            <a className="pill" href="#upload" onClick={(e) => { e.preventDefault(); setSheet(true); }}>
              {isEn ? "Upload Chat" : "단톡방 올리기"}
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="mk-hero grain">
        <div className="mk-hero-wall" aria-hidden>
          {WALL.map((col, i) => (
            <div className="mk-hero-col" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {col.concat(col).map((src, j) => <img key={j} src={src} alt="" loading={j < 3 ? "eager" : "lazy"} />)}
            </div>
          ))}
        </div>
        <div className="mk-hero-shade" />
        <div className="mk-letterbox top" /><div className="mk-letterbox bottom" />
        <div className="wrap mk-hero-inner">
          <div className="mk-hero-copy">
            <div className="mk-onair mono mk-in"><i />On air · Tonight 10PM</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mk-wordmark mk-in logo d1" src="/brand/logo-wordmark@1x.png?v=2" alt="막장톡 MAKJANG TALK" />
            {isEn ? (
              <>
                <h1 className="mk-h1 ko-display mk-in d2">
                  Last night&apos;s group chat,<br />tonight&apos;s 10 PM <em>K-Drama</em>.
                </h1>
                <p className="mk-sub-en en-accent mk-in d3">
                  Upload any KakaoTalk or WhatsApp chat — every twist is backed by a real message receipt.
                </p>
              </>
            ) : (
              <>
                <h1 className="mk-h1 ko-display mk-in d2">
                  어젯밤 우리 단톡방이,<br />오늘 밤 10시 <em>특별기획</em>이&nbsp;됩니다.
                </h1>
                <p className="mk-sub-en en-accent mk-in d3">
                  Your group chat, remade as a K-drama — every twist backed by a real message.
                </p>
              </>
            )}
            <div className="mk-cta-row mk-in d4">
              <button className="mk-btn mk-btn-kakao" onClick={() => setSheet(true)}>
                <MessageCircle size={20} strokeWidth={2.4} />
                {isEn ? "Upload Chat & Make Ep. 1" : "단톡방 올리고 1화 만들기"}
              </button>
              <a className="mk-btn mk-btn-ghost" href="#lineup">
                <Play size={16} fill="currentColor" />
                {isEn ? "Watch Sample Drama" : "샘플 드라마 보기"}
              </a>
            </div>
            <div className="mk-trust-line mk-in d5">
              <span>{isEn ? "KakaoTalk · WhatsApp" : "카카오톡 · WhatsApp"}</span>
              <span>{isEn ? "Ep. 1 trailer in 3 min" : "3분이면 1화 예고편"}</span>
              <span>{isEn ? "Raw chat is never stored" : "원문은 저장하지 않아요"}</span>
            </div>
          </div>
        </div>
        <div className="mk-scrollcue mono" aria-hidden>Scroll<b /></div>
      </section>

      {/* LINEUP */}
      <section id="lineup" className="mk-section">
        <div className="wrap">
          <div className="mk-head-row mk-reveal">
            <div>
              <div className="mk-eyebrow mono">Tonight&apos;s lineup</div>
              <h2 className="mk-h2 ko-display">
                {isEn ? (
                  <>Tonight&apos;s <em>10 PM Lineup</em></>
                ) : (
                  <>오늘 밤 <em>편성표</em></>
                )}
              </h2>
              <div className="mk-h2-en en-accent">
                {isEn
                  ? "Pick a sample group chat (English WhatsApp or Korean KakaoTalk) and watch Episode 1 get made."
                  : "Pick a sample group chat and watch episode one get made."}
              </div>
            </div>
          </div>
          <div className="mk-lineup">
            {orderedRooms.map((r, i) => (
              <button
                key={r.key}
                className={`mk-card mk-reveal ${loading === r.key ? "loading" : ""}`}
                style={{ transitionDelay: `${i * 80}ms` }}
                onClick={() => parse({ sampleKey: r.key }, r.key)}
                disabled={!!loading}
                aria-label={isEn ? `Produce sample drama: ${r.en}` : `${r.ko} 샘플로 제작`}
              >
                <div className="mk-card-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.poster} alt="" loading="lazy" />
                  <div className={`mk-card-title ${r.app === "wa" || isEn ? "en-accent" : "ko-display"}`}>
                    {isEn ? r.overlayEn : r.overlayKo}
                  </div>
                  <span className="mk-card-slot mk-chip mono">{r.slot}</span>
                  <div className="mk-card-badge">
                    <span className={`mk-chip ${r.app === "wa" ? "wa" : "kakao"}`}>
                      {r.app === "wa" ? "WhatsApp · EN" : isEn ? "KakaoTalk · KO" : "카카오톡"}
                    </span>
                  </div>
                  <span className="mk-card-play">{loading === r.key ? <Loader2 size={20} /> : <Play size={18} fill="#fff" color="#fff" />}</span>
                </div>
                <div className="mk-card-meta">
                  <h3>{isEn ? r.en : r.ko}</h3>
                  <div className="en en-accent">{isEn ? r.ko : r.en}</div>
                  <q>{isEn ? r.quoteEn : r.quoteKo}</q>
                  <div className="info">{isEn ? r.infoEn : r.infoKo}</div>
                </div>
              </button>
            ))}
          </div>
          {error && !sheet && <div className="mk-err">{error}</div>}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mk-section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="mk-head-row mk-reveal">
            <div>
              <div className="mk-eyebrow mono">How it works</div>
              <h2 className="mk-h2 ko-display">
                {isEn ? (
                  <>Absurd K-Drama Twists,<br /><em>Real Evidence.</em></>
                ) : (
                  <>말도 안 되는 반전,<br /><em>근거는 진짜.</em></>
                )}
              </h2>
              <div className="mk-h2-en en-accent">
                {isEn
                  ? "Every dramatic accusation is grounded in an actual line from your chat."
                  : "The twists are absurd. The evidence is real."}
              </div>
            </div>
          </div>
          <div className="mk-steps">
            <div className="mk-step mk-reveal">
              <div className="mk-step-stage">
                <div className="mk-kakao">
                  <span className="mk-kakao-day">{isEn ? "Saturday, Sep 5, 2026" : "2026년 9월 5일 토요일"}</span>
                  <div className="mk-bub hit">
                    <span className="av" style={{ backgroundImage: "url(/brand/av-doyun.jpg)" }} />
                    <div>
                      <div className="nm">{isEn ? "Doyun" : "도윤"}</div>
                      <div className="tx">{isEn ? "I think I saw Jihoon and Seoyeon at Gangnam Station last night" : "어제 강남역에서 지훈이랑 서연이 본 거 같은데"}</div>
                    </div>
                    <span className="tm">11:30 AM</span>
                  </div>
                  <div className="mk-bub">
                    <span className="av" style={{ backgroundImage: "url(/brand/av-minji.jpg)" }} />
                    <div>
                      <div className="nm">{isEn ? "Minji" : "민지"}</div>
                      <div className="tx">{isEn ? "Wait WHAT?? Why were the two of them at Gangnam together??" : "헐 대박 진짜?? 둘이 왜 강남역에 같이 있었어??"}</div>
                    </div>
                    <span className="tm">11:45 AM</span>
                  </div>
                  <div className="mk-bub">
                    <span className="av" style={{ backgroundImage: "url(/brand/av-jihoon.jpg)" }} />
                    <div>
                      <div className="nm">{isEn ? "Jihoon" : "지훈"}</div>
                      <div className="tx">{isEn ? "lol what are you talking about, I passed out at home" : "뭔소리야ㅋㅋ나어제집에서기절해서잤는데"}</div>
                    </div>
                    <span className="tm">12:10 PM</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="mk-step-num mono">01 · Read</div>
                <h3>{isEn ? "Reads the Entire Group Chat" : "단톡방을 통째로 읽어요"}</h3>
                <p>{isEn ? "Scans months of messages to uncover hidden contradictions, alibis, and receipts." : "몇 달치 대화에서 떡밥과 모순을 찾아요."}</p>
              </div>
            </div>
            <div className="mk-step mk-reveal" style={{ transitionDelay: "100ms" }}>
              <div className="mk-step-stage">
                <div className="mk-script">
                  <div className="sh">SHOT 3 — INT. GANGNAM EXIT 11 — NIGHT</div>
                  <div className="who">{isEn ? "DOYUN" : "도 윤"}</div>
                  <div className="line">“강남역에서 둘이 있었던 거 다 봤어!”</div>
                  <div className="en">“I saw you two at Gangnam Station!”</div>
                  <div className="rc"><b>RECEIPT</b> · 9/5 (Sat) 11:30 · {isEn ? "Doyun — “I think I saw Jihoon and Seoyeon at Gangnam Station”" : "도윤 — “어제 강남역에서 지훈이랑 서연이 본 거 같은데”"}</div>
                </div>
              </div>
              <div>
                <div className="mk-step-num mono">02 · Write</div>
                <h3>{isEn ? "Writes the Script with Receipts" : "반전마다 증거를 붙여 대본을 써요"}</h3>
                <p>{isEn ? "No hallucinated drama — every twist cites the exact message ID, sender, and timestamp." : "지어낸 대사가 아니라 실제 메시지에서 나와요."}</p>
              </div>
            </div>
            <div className="mk-step mk-reveal" style={{ transitionDelay: "200ms" }}>
              <div className="mk-step-stage">
                <div className="mk-still">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/poster-D.webp" alt="" loading="lazy" />
                  <div className="sub">강남역에서 둘이 있었던 거 다 봤어!<small>I saw you two at Gangnam Station!</small></div>
                </div>
              </div>
              <div>
                <div className="mk-step-num mono">03 · Shoot</div>
                <h3>{isEn ? "Shoots a Trailer Starring Your Friends" : "친구들이 주연인 예고편이 나와요"}</h3>
                <p>{isEn ? "Consenting friends star via their own selfie; others are played by AI actors." : "동의한 친구는 본인 셀카로 직접 출연해요."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="mk-section">
        <div className="wrap mk-proof">
          <div className="mk-receipt mk-reveal">
            <div className="top"><span>MAKJANG TALK · RECEIPT</span><span>No. 003</span></div>
            <hr />
            <div className="meta">
              {isEn ? (
                <>2026. 9. 5 (Sat) 11:30 AM<br />Sender · Doyun (도윤)</>
              ) : (
                <>2026. 9. 5 (토) 오전 11:30<br />보낸 사람 · 도윤</>
              )}
            </div>
            <hr />
            <div className="quote">“어제 강남역에서 지훈이랑 서연이 본 거 같은데”</div>
            <div className="quote-en">“I think I saw Jihoon and Seoyeon at Gangnam Station last night.”</div>
            <hr />
            <div className="used">
              <span>USED IN · SHOT 3</span>
              <span>{isEn ? "TROPE · SECRET TRYST" : "TROPE · 밀회 목격"}</span>
            </div>
            <div className="stamp">VERIFIED<br />{isEn ? "RECEIPT" : "증거 확인"}</div>
          </div>
          <div className="mk-reveal">
            <div className="mk-eyebrow mono">Receipts</div>
            <h2 className="mk-h2 ko-display">
              {isEn ? (
                <>Every Twist Comes with a<br /><em>Receipt</em>.</>
              ) : (
                <>모든 반전엔<br /><em>영수증</em>이 붙어요.</>
              )}
            </h2>
            <div className="mk-h2-en en-accent">
              {isEn ? "Zero hallucinated plotlines — verified three times." : "Every twist comes with a receipt."}
            </div>
            <p className="lead">
              {isEn
                ? "Nothing is made up out of thin air. Every scene attaches a real chat message as a forensic receipt, audited three times before and after video generation."
                : "AI가 지어낸 얘기가 아니에요. 장면마다 실제 대화 한 줄을 증거로 붙이고, 영상으로 만들기 전과 후에 세 번 검수해요."}
            </p>
            <div className="mk-checks">
              <div>
                <Check size={18} />
                {isEn
                  ? "Grounding Audit: Verifies cited message IDs exist and support the dramatic line"
                  : "인용한 메시지가 실제로 있는지, 그 대사를 뒷받침하는지"}
              </div>
              <div>
                <Check size={18} />
                {isEn
                  ? "Visual Continuity: Checks face, hair, age, and wardrobe against cast sheets"
                  : "장면 속 얼굴·머리·의상이 캐스팅과 같은지"}
              </div>
              <div>
                <Check size={18} />
                {isEn
                  ? "Spoken Dialogue: Transcribes generated video audio to verify line accuracy"
                  : "배우가 대본대로 말했는지 — 받아쓰기로 확인"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="wrap mk-trust mk-reveal">
          <div>
            <UserCheck size={24} />
            <h4>{isEn ? "Selfies by Consent Only" : "얼굴은 본인만"}</h4>
            <p>
              {isEn
                ? "Friends upload their own selfie via QR audition. Without a selfie, a bespoke fictional actor is cast."
                : "친구 얼굴은 친구가 직접 셀카로 올려요. 안 올리면 성격에 맞는 가상 배우가 연기해요."}
            </p>
          </div>
          <div>
            <ShieldCheck size={24} />
            <h4>{isEn ? "Opt-In & Topic Filters" : "동의한 사람만 출연"}</h4>
            <p>
              {isEn
                ? "Choose who appears, set aliases, and exclude sensitive topics before shooting starts."
                : "출연·가명·빼고 싶은 사건을 고른 다음에야 촬영을 시작해요."}
            </p>
          </div>
          <div>
            <Lock size={24} />
            <h4>{isEn ? "Zero Persistent Storage" : "원문은 저장하지 않아요"}</h4>
            <p>
              {isEn
                ? "Chat logs and selfies live only in memory during production and are wiped afterward."
                : "대화와 셀카는 제작하는 동안에만 메모리에 있고 끝나면 사라져요."}
            </p>
          </div>
        </div>
      </section>

      {/* BUILT */}
      <section id="built" className="mk-section" style={{ paddingTop: 40 }}>
        <div className="wrap mk-built">
          <div className="mk-reveal">
            <div className="mk-eyebrow mono">How it&apos;s built</div>
            <h2 className="mk-h2 en-accent" style={{ fontSize: "clamp(34px,3.6vw,52px)" }}>
              A showrunner that reads the whole chat — and three verifiers that check its work.
            </h2>
            <div className="mk-models">
              <span>Gemini 4 Argon · showrunner</span>
              <span>Gemini 3.8 Flash · verifiers</span>
              <span>Nano Banana 2.1 · casting & keyframes</span>
              <span>Omni 1.1 Flash · shots</span>
              <span>3.8 Flash TTS · narrator</span>
              <span>Lyria 3 · score</span>
              <span>Cloud Run</span>
            </div>
          </div>
          <ol className="mk-reveal">
            <li>
              <b>Grounding check</b>
              <span>Every twist cites real line IDs. Code verifies they exist; Flash verifies they support the line and that the speaker could know it. Failures go back to Argon as a patch.</span>
            </li>
            <li>
              <b>Character consistency</b>
              <span>Flash vision scores each keyframe against the cast sheets (face, hair, outfit, age). Below 7/10 → regenerate that shot only.</span>
            </li>
            <li>
              <b>Spoken-line accuracy</b>
              <span>Each video is transcribed and compared with the script (CER). Mismatch → one regen, then a clean TTS dub.</span>
            </li>
          </ol>
        </div>
      </section>

      {/* FINAL */}
      <section className="mk-final grain">
        <div className="wrap mk-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wm" src="/brand/logo-wordmark@1x.png?v=2" alt="막장톡 MAKJANG TALK" />
          <h2 className="mk-h2 ko-display">
            {isEn ? (
              <>Next Time at 10 PM: <em>Your Group Chat</em>.</>
            ) : (
              <>다음 이 시간, <em>당신의 단톡방</em>.</>
            )}
          </h2>
          <div className="mk-h2-en en-accent">
            {isEn ? "다음 이 시간, 당신의 단톡방." : "Next time: your group chat."}
          </div>
          <div className="mk-cta-row" style={{ justifyContent: "center" }}>
            <button className="mk-btn mk-btn-kakao" onClick={() => setSheet(true)}>
              <MessageCircle size={20} strokeWidth={2.4} />
              {isEn ? "Upload Chat & Make Ep. 1" : "단톡방 올리고 1화 만들기"}
            </button>
          </div>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="wrap">
          <span>막장톡 MAKJANG TALK</span>
          <span>Built in 4 hours at Google DeepMind Hackathon Seoul · 2026</span>
        </div>
      </footer>

      {/* UPLOAD SHEET */}
      {sheet && (
        <div className="mk-sheet-bg" onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label={isEn ? "Upload Group Chat" : "단톡방 올리기"}>
          <div className="mk-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="mk-x" onClick={() => setSheet(false)} aria-label={isEn ? "Close" : "닫기"}><X size={20} /></button>
            <h3 className="ko-display">{isEn ? "Upload Your Group Chat" : "우리 단톡방 올리기"}</h3>
            <div className="en en-accent">
              {isEn ? "KakaoTalk (.csv / .txt) or WhatsApp (.zip / .txt)" : "Upload your group chat export"}
            </div>
            <div className="mk-tabs">
              <button className={tab === "kakao" ? "on" : ""} onClick={() => setTab("kakao")}>{isEn ? "KakaoTalk" : "카카오톡"}</button>
              <button className={tab === "wa" ? "on" : ""} onClick={() => setTab("wa")}>WhatsApp</button>
            </div>
            <div className="mk-how">
              {tab === "kakao" ? (
                isEn ? (
                  <>Desktop (PC/Mac): Open chat → <b>≡ Menu → Export Chat</b> (.csv / .txt)<br />Mobile: Open chat → <b>Settings → Export Chat → Text Only</b></>
                ) : (
                  <>PC·Mac: 채팅방 <b>≡ 메뉴 → 대화 내보내기</b> (.csv / .txt)<br />모바일: 채팅방 <b>설정 → 대화 내용 내보내기 → 텍스트만</b></>
                )
              ) : (
                <>Open the chat → <b>⋮ / group name → Export chat → Without media</b><br />Upload the <b>.zip</b> or <b>.txt</b> as is.</>
              )}
            </div>
            <div
              className={`mk-drop ${drag ? "on" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            >
              <Upload size={26} color="#d4b26a" />
              <p>{file ? file.name : isEn ? "Drag & drop your chat file here, or click to browse" : "파일을 끌어다 놓거나 눌러서 고르기"}</p>
              <small>{file ? `${Math.ceil(file.size / 1024)} KB` : ".csv · .txt · .zip"}</small>
              <input ref={fileRef} type="file" accept=".csv,.txt,.zip" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <label className="mk-field">
              {isEn ? "Demo Passcode" : "데모 패스코드"}
              <input value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            </label>
            {error && <div className="mk-err">{error}</div>}
            <button className="mk-btn mk-btn-kakao" onClick={startUpload} disabled={loading === "upload"}>
              {loading === "upload" ? <Loader2 size={18} className="spin" /> : <ArrowDown size={18} style={{ transform: "rotate(-90deg)" }} />}
              {loading === "upload" ? (isEn ? "Reading group chat…" : "단톡방 읽는 중…") : (isEn ? "Start Casting" : "캐스팅 시작")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
