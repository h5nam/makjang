"use client";

import React, { useEffect, useRef, useState } from "react";
import { Hahmlet, Instrument_Serif } from "next/font/google";
import { Play, Loader2, Upload, X, ShieldCheck, UserCheck, Lock, Check, MessageCircle, ArrowDown } from "lucide-react";
import type { ParsedSessionData } from "@/components/LandingUpload";
import "./landing.css";

const display = Hahmlet({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display", preload: false });
const accent = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic"], variable: "--font-accent" });

type SampleKey = "A_friends" | "B_family" | "C_work" | "D_seoul_squad";

const ROOMS: Array<{
  key: SampleKey; slot: string; poster: string; overlay: string; ko: string; en: string;
  quote: string; info: string; app: "kakao" | "wa";
}> = [
  { key: "A_friends", slot: "PM 10:00", poster: "/brand/poster-A.webp", overlay: "강남역 영수증과\n사라진 알리바이",
    ko: "강남역 영수증과 사라진 알리바이", en: "The Gangnam Receipt", quote: "“어제 강남역에서 지훈이랑 서연이 본 거 같은데”",
    info: "대학 동기 5인 · 4개월", app: "kakao" },
  { key: "D_seoul_squad", slot: "PM 10:30", poster: "/brand/poster-D.webp", overlay: "Seoul Survivors:\nThe Missing ₩90,000",
    ko: "서울 생존기: 사라진 9만 원", en: "Seoul Survivors — in English", quote: "“it says 360,000 won right now, must be a bank app glitch”",
    info: "International friends · 3 months", app: "wa" },
  { key: "B_family", slot: "PM 11:00", poster: "/brand/poster-B.webp", overlay: "흔들린 수국과\n파란불의 비밀",
    ko: "흔들린 수국 사진과 파란불의 비밀", en: "The Blurred Hydrangeas", quote: "“언니 그날 맑았는데?”",
    info: "우리집 가족 5인 · 4개월", app: "kakao" },
  { key: "C_work", slot: "PM 11:30", poster: "/brand/poster-C.webp", overlay: "입사동기\n마지막 회식",
    ko: "입사동기 마지막 회식", en: "The Last Team Dinner", quote: "“나 진짜 아무 말도 안 했다”",
    info: "입사 동기 4인 · 4개월", app: "kakao" },
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

export function MakjangLanding({ onParsed }: { onParsed: (data: ParsedSessionData) => void }) {
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

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

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
      if (!res.ok) throw new Error(data.error || "불러오지 못했어요");
      setSheet(false);
      onParsed({ ...data, passcode: passcode.trim() || "makjang" });
    } catch (e: any) {
      setError(e?.message || "문제가 생겼어요. 다시 시도해 주세요.");
      if (key !== "upload") setSheet(true);
    } finally {
      setLoading(null);
    }
  }

  async function startUpload() {
    if (!file) return setError("대화 파일을 먼저 골라 주세요.");
    if (!passcode.trim()) return setError("패스코드를 입력해 주세요.");
    if (file.name.toLowerCase().endsWith(".zip")) {
      return parse({ zipBase64: toBase64(await file.arrayBuffer()), filename: file.name }, "upload");
    }
    return parse({ text: await file.text(), filename: file.name }, "upload");
  }

  const pick = (f?: File | null) => { if (f) { setFile(f); setError(null); } };

  return (
    <div className={`mk ${display.variable} ${accent.variable}`}>
      <div className="mk-flash" aria-hidden />

      <header className={`mk-header ${solid ? "solid" : ""}`}>
        <div className="wrap">
          <a className="mk-brand" href="#top" aria-label="막장톡 홈">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-180.png" alt="" />
            <span className="ko-display">막장톡</span>
          </a>
          <nav className="mk-nav">
            <a href="#lineup">편성표</a>
            <a href="#how">작동 방식</a>
            <a href="#built">How it&apos;s built</a>
            <a className="pill" href="#upload" onClick={(e) => { e.preventDefault(); setSheet(true); }}>단톡방 올리기</a>
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
            <img className="mk-wordmark mk-in logo d1" src="/brand/logo-wordmark@1x.png" alt="막장톡 MAKJANG TALK" />
            <h1 className="mk-h1 ko-display mk-in d2">어젯밤 우리 단톡방이,<br />오늘 밤 10시 <em>특별기획</em>이&nbsp;됩니다.</h1>
            <p className="mk-sub-en en-accent mk-in d3">Your group chat, remade as a K-drama — every twist backed by a real message.</p>
            <div className="mk-cta-row mk-in d4">
              <button className="mk-btn mk-btn-kakao" onClick={() => setSheet(true)}><MessageCircle size={20} strokeWidth={2.4} />단톡방 올리고 1화 만들기</button>
              <a className="mk-btn mk-btn-ghost" href="#lineup"><Play size={16} fill="currentColor" />샘플 드라마 보기</a>
            </div>
            <div className="mk-trust-line mk-in d5"><span>카카오톡 · WhatsApp</span><span>3분이면 1화 예고편</span><span>원문은 저장하지 않아요</span></div>
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
              <h2 className="mk-h2 ko-display">오늘 밤 <em>편성표</em></h2>
              <div className="mk-h2-en en-accent">Pick a sample group chat and watch episode one get made.</div>
            </div>
          </div>
          <div className="mk-lineup">
            {ROOMS.map((r, i) => (
              <button key={r.key} className={`mk-card mk-reveal ${loading === r.key ? "loading" : ""}`} style={{ transitionDelay: `${i * 80}ms` }}
                onClick={() => parse({ sampleKey: r.key }, r.key)} disabled={!!loading} aria-label={`${r.ko} 샘플로 제작`}>
                <div className="mk-card-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.poster} alt="" loading="lazy" />
                  <div className={`mk-card-title ${r.app === "wa" ? "en-accent" : "ko-display"}`}>{r.overlay}</div>
                  <span className="mk-card-slot mk-chip mono">{r.slot}</span>
                  <div className="mk-card-badge">
                    <span className={`mk-chip ${r.app === "wa" ? "wa" : "kakao"}`}>{r.app === "wa" ? "WhatsApp · EN" : "카카오톡"}</span>
                  </div>
                  <span className="mk-card-play">{loading === r.key ? <Loader2 size={20} /> : <Play size={18} fill="#fff" color="#fff" />}</span>
                </div>
                <div className="mk-card-meta">
                  <h3>{r.ko}</h3>
                  <div className="en en-accent">{r.en}</div>
                  <q>{r.quote}</q>
                  <div className="info">{r.info}</div>
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
              <h2 className="mk-h2 ko-display">말도 안 되는 반전,<br /><em>근거는 진짜.</em></h2>
              <div className="mk-h2-en en-accent">The twists are absurd. The evidence is real.</div>
            </div>
          </div>
          <div className="mk-steps">
            <div className="mk-step mk-reveal">
              <div className="mk-step-stage">
                <div className="mk-kakao">
                  <span className="mk-kakao-day">2026년 9월 5일 토요일</span>
                  <div className="mk-bub hit"><span className="av" style={{ backgroundImage: "url(/brand/av-doyun.jpg)" }} /><div><div className="nm">도윤</div><div className="tx">어제 강남역에서 지훈이랑 서연이 본 거 같은데</div></div><span className="tm">오전 11:30</span></div>
                  <div className="mk-bub"><span className="av" style={{ backgroundImage: "url(/brand/av-minji.jpg)" }} /><div><div className="nm">민지</div><div className="tx">헐 대박 진짜?? 둘이 왜 강남역에 같이 있었어??</div></div><span className="tm">오전 11:45</span></div>
                  <div className="mk-bub"><span className="av" style={{ backgroundImage: "url(/brand/av-jihoon.jpg)" }} /><div><div className="nm">지훈</div><div className="tx">뭔소리야ㅋㅋ나어제집에서기절해서잤는데</div></div><span className="tm">오후 12:10</span></div>
                </div>
              </div>
              <div><div className="mk-step-num mono">01 · Read</div><h3>단톡방을 통째로 읽어요</h3><p>몇 달치 대화에서 떡밥과 모순을 찾아요.</p></div>
            </div>
            <div className="mk-step mk-reveal" style={{ transitionDelay: "100ms" }}>
              <div className="mk-step-stage">
                <div className="mk-script">
                  <div className="sh">SHOT 3 — INT. 강남역 11번 출구 — NIGHT</div>
                  <div className="who">도 윤</div>
                  <div className="line">“강남역에서 둘이 있었던 거 다 봤어!”</div>
                  <div className="en">“I saw you two at Gangnam Station!”</div>
                  <div className="rc"><b>RECEIPT</b> · 9/5 (토) 오전 11:30 · 도윤 — “어제 강남역에서 지훈이랑 서연이 본 거 같은데”</div>
                </div>
              </div>
              <div><div className="mk-step-num mono">02 · Write</div><h3>반전마다 증거를 붙여 대본을 써요</h3><p>지어낸 대사가 아니라 실제 메시지에서 나와요.</p></div>
            </div>
            <div className="mk-step mk-reveal" style={{ transitionDelay: "200ms" }}>
              <div className="mk-step-stage">
                <div className="mk-still">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/poster-D.webp" alt="" loading="lazy" />
                  <div className="sub">강남역에서 둘이 있었던 거 다 봤어!<small>I saw you two at Gangnam Station!</small></div>
                </div>
              </div>
              <div><div className="mk-step-num mono">03 · Shoot</div><h3>친구들이 주연인 예고편이 나와요</h3><p>동의한 친구는 본인 셀카로 직접 출연해요.</p></div>
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
            <div className="meta">2026. 9. 5 (토) 오전 11:30<br />보낸 사람 · 도윤</div>
            <hr />
            <div className="quote">“어제 강남역에서 지훈이랑 서연이 본 거 같은데”</div>
            <div className="quote-en">“I think I saw Jihoon and Seoyeon at Gangnam Station last night.”</div>
            <hr />
            <div className="used"><span>USED IN · SHOT 3</span><span>TROPE · 밀회 목격</span></div>
            <div className="stamp">VERIFIED<br />증거 확인</div>
          </div>
          <div className="mk-reveal">
            <div className="mk-eyebrow mono">Receipts</div>
            <h2 className="mk-h2 ko-display">모든 반전엔<br /><em>영수증</em>이 붙어요.</h2>
            <div className="mk-h2-en en-accent">Every twist comes with a receipt.</div>
            <p className="lead">AI가 지어낸 얘기가 아니에요. 장면마다 실제 대화 한 줄을 증거로 붙이고, 영상으로 만들기 전과 후에 세 번 검수해요.</p>
            <div className="mk-checks">
              <div><Check size={18} />인용한 메시지가 실제로 있는지, 그 대사를 뒷받침하는지</div>
              <div><Check size={18} />장면 속 얼굴·머리·의상이 캐스팅과 같은지</div>
              <div><Check size={18} />배우가 대본대로 말했는지 — 받아쓰기로 확인</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="wrap mk-trust mk-reveal">
          <div><UserCheck size={24} /><h4>얼굴은 본인만</h4><p>친구 얼굴은 친구가 직접 셀카로 올려요. 안 올리면 성격에 맞는 가상 배우가 연기해요.</p></div>
          <div><ShieldCheck size={24} /><h4>동의한 사람만 출연</h4><p>출연·가명·빼고 싶은 사건을 고른 다음에야 촬영을 시작해요.</p></div>
          <div><Lock size={24} /><h4>원문은 저장하지 않아요</h4><p>대화와 셀카는 제작하는 동안에만 메모리에 있고 끝나면 사라져요.</p></div>
        </div>
      </section>

      {/* BUILT */}
      <section id="built" className="mk-section" style={{ paddingTop: 40 }}>
        <div className="wrap mk-built">
          <div className="mk-reveal">
            <div className="mk-eyebrow mono">How it&apos;s built</div>
            <h2 className="mk-h2 en-accent" style={{ fontSize: "clamp(34px,3.6vw,52px)" }}>A showrunner that reads the whole chat — and three verifiers that check its work.</h2>
            <div className="mk-models">
              <span>Gemini 4 Argon · showrunner</span><span>Gemini 3.8 Flash · verifiers</span><span>Nano Banana 2.1 · casting & keyframes</span>
              <span>Omni 1.1 Flash · shots</span><span>3.8 Flash TTS · narrator</span><span>Lyria 3 · score</span><span>Cloud Run</span>
            </div>
          </div>
          <ol className="mk-reveal">
            <li><b>Grounding check</b><span>Every twist cites real line IDs. Code verifies they exist; Flash verifies they support the line and that the speaker could know it. Failures go back to Argon as a patch.</span></li>
            <li><b>Character consistency</b><span>Flash vision scores each keyframe against the cast sheets (face, hair, outfit, age). Below 7/10 → regenerate that shot only.</span></li>
            <li><b>Spoken-line accuracy</b><span>Each video is transcribed and compared with the script (CER). Mismatch → one regen, then a clean TTS dub.</span></li>
          </ol>
        </div>
      </section>

      {/* FINAL */}
      <section className="mk-final grain">
        <div className="wrap mk-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wm" src="/brand/logo-wordmark@1x.png" alt="" />
          <h2 className="mk-h2 ko-display">다음 이 시간, <em>당신의 단톡방</em>.</h2>
          <div className="mk-h2-en en-accent">Next time: your group chat.</div>
          <div className="mk-cta-row" style={{ justifyContent: "center" }}>
            <button className="mk-btn mk-btn-kakao" onClick={() => setSheet(true)}><MessageCircle size={20} strokeWidth={2.4} />단톡방 올리고 1화 만들기</button>
          </div>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="wrap"><span>막장톡 MAKJANG TALK</span><span>Built in 4 hours at Google DeepMind Hackathon Seoul · 2026</span></div>
      </footer>

      {/* UPLOAD SHEET */}
      {sheet && (
        <div className="mk-sheet-bg" onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label="단톡방 올리기">
          <div className="mk-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="mk-x" onClick={() => setSheet(false)} aria-label="닫기"><X size={20} /></button>
            <h3 className="ko-display">우리 단톡방 올리기</h3>
            <div className="en en-accent">Upload your group chat export</div>
            <div className="mk-tabs">
              <button className={tab === "kakao" ? "on" : ""} onClick={() => setTab("kakao")}>카카오톡</button>
              <button className={tab === "wa" ? "on" : ""} onClick={() => setTab("wa")}>WhatsApp</button>
            </div>
            <div className="mk-how">
              {tab === "kakao" ? (
                <>PC·Mac: 채팅방 <b>≡ 메뉴 → 대화 내보내기</b> (.csv / .txt)<br />모바일: 채팅방 <b>설정 → 대화 내용 내보내기 → 텍스트만</b></>
              ) : (
                <>Open the chat → <b>⋮ / group name → Export chat → Without media</b><br />Upload the <b>.zip</b> or <b>.txt</b> as is.</>
              )}
            </div>
            <div className={`mk-drop ${drag ? "on" : ""}`} onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
              <Upload size={26} color="#d4b26a" />
              <p>{file ? file.name : "파일을 끌어다 놓거나 눌러서 고르기"}</p>
              <small>{file ? `${Math.ceil(file.size / 1024)} KB` : ".csv · .txt · .zip"}</small>
              <input ref={fileRef} type="file" accept=".csv,.txt,.zip" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <label className="mk-field">데모 패스코드<input value={passcode} onChange={(e) => setPasscode(e.target.value)} /></label>
            {error && <div className="mk-err">{error}</div>}
            <button className="mk-btn mk-btn-kakao" onClick={startUpload} disabled={loading === "upload"}>
              {loading === "upload" ? <Loader2 size={18} className="spin" /> : <ArrowDown size={18} style={{ transform: "rotate(-90deg)" }} />}
              {loading === "upload" ? "단톡방 읽는 중…" : "캐스팅 시작"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
