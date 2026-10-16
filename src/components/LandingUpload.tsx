"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  ShieldCheck,
  UserCheck,
  Lock,
  FileText,
  X,
  ArrowRight,
  ArrowDown,
  Play,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { ChatLine, MemberConfig } from "@/lib/types";

export interface ParsedSessionData {
  runId: string;
  roomTitle: string;
  lineCount: number;
  members: MemberConfig[];
  lines: ChatLine[];
  sampleKey: "A_friends" | "B_family" | "C_work" | null;
  passcode?: string;
}

interface LandingUploadProps {
  onParsed: (data: ParsedSessionData) => void;
}

const SAMPLE_ROOMS: Array<{
  key: "A_friends" | "B_family" | "C_work";
  timeSlot: string;
  poster: string;
  overlayTitle: string;
  titleKo: string;
  titleEn: string;
  quoteKo: string;
  metaKo: string;
}> = [
  {
    key: "A_friends",
    timeSlot: "PM 10:00",
    poster: "/brand/poster-A.webp",
    overlayTitle: "강남역 영수증과\n사라진 알리바이",
    titleKo: "강남역 영수증과 사라진 알리바이",
    titleEn: "The Gangnam Station Receipt & The Vanished Alibi",
    quoteKo: "“야근이라더니 왜 강남역 영수증이 찍혀 있어?”",
    metaKo: "대학 동기 5인 · 447줄",
  },
  {
    key: "B_family",
    timeSlot: "PM 10:30",
    poster: "/brand/poster-B.webp",
    overlayTitle: "흔들린 수국 사진과\n파란불의 비밀",
    titleKo: "흔들린 수국 사진과 파란불의 비밀",
    titleEn: "The Blurred Hydrangeas & The Secret of the Blue Light",
    quoteKo: "“네가 태어난 날 비가 왔다고? 그날 서울은 쾌청이었어.”",
    metaKo: "우리집 가족 5인 · 851줄",
  },
  {
    key: "C_work",
    timeSlot: "PM 11:00",
    poster: "/brand/poster-C.webp",
    overlayTitle: "새벽 2시\n최종_최종.pptx",
    titleKo: "새벽 2시 최종_최종.pptx 유출 사건",
    titleEn: "The 2 AM Final_Final.pptx Leak",
    quoteKo: "“경쟁사 제안서 폰트가… 왜 우리 팀장님 템플릿이랑 똑같죠?”",
    metaKo: "프로젝트 TF 4인 · 375줄",
  },
];

export function LandingUpload({ onParsed }: LandingUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [passcode, setPasscode] = useState("makjang");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleSampleSelect(key: "A_friends" | "B_family" | "C_work") {
    setError(null);
    setLoadingKey(key);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleKey: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "샘플 로드 실패");
      onParsed({ ...data, passcode: passcode || "makjang" });
    } catch (err: any) {
      setError(err?.message || "오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleStartUpload() {
    if (!selectedFile) {
      setError("카카오톡 대화 파일(.txt 또는 .csv)을 먼저 선택해 주세요.");
      return;
    }
    if (!passcode.trim()) {
      setError("데모 패스코드를 입력해 주세요.");
      return;
    }
    setError(null);
    setLoadingKey("upload");
    try {
      const text = await selectedFile.text();
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename: selectedFile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "파일 파싱 실패");
      setUploadSheetOpen(false);
      onParsed({ ...data, passcode: passcode.trim() });
    } catch (err: any) {
      setError(err?.message || "파일 처리 중 오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="w-full bg-[#0B0B0C] text-[#F5F5F5] overflow-x-hidden">
      {/* =====================================================================
          S1 — HERO (100svh)
      ===================================================================== */}
      <section className="relative w-full h-[100svh] min-h-[660px] flex items-center overflow-hidden select-none">
        {/* Background Key-Art Poster with 20s Slow Ken Burns */}
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/poster-A.webp"
            alt="막장톡 키아트 배경"
            className="w-full h-full object-cover object-center animate-hero-kenburns"
          />
          {/* Dark gradient from left: rgba(11,11,12,.92) -> transparent at 60%, plus mobile legibility scrim */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(11,11,12,0.95) 0%, rgba(11,11,12,0.88) 42%, rgba(11,11,12,0.35) 68%, rgba(11,11,12,0.6) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-[#0B0B0C]/60" />
          {/* 4% Film Grain Overlay */}
          <div className="absolute inset-0 bg-grain pointer-events-none" />
        </div>

        {/* One-shot 80ms White Thunder Flash on Entrance */}
        <div className="absolute inset-0 bg-white animate-thunder-once z-20 pointer-events-none" />

        {/* Pure Black 6vh Letterbox Bars Top & Bottom */}
        <div className="absolute top-0 inset-x-0 h-[6vh] bg-black z-10 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-[6vh] bg-black z-10 pointer-events-none" />

        {/* Hero Inner Content (Left Column max-width 560px, vertically centered) */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-16 flex flex-col justify-center h-full">
          <div className="max-w-[560px] space-y-4 sm:space-y-5">
            {/* Wordmark Logo: 480px desktop, 280px mobile */}
            <div className="animate-logo-enter">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-wordmark.png"
                alt="막장톡 MAKJANG TALK"
                className="w-[260px] sm:w-[420px] lg:w-[480px] h-auto object-contain -ml-2"
              />
            </div>

            {/* H1 Nanum Myeongjo 800, 44/56px desktop, 30/40px mobile */}
            <div className="space-y-2">
              <h1 className="font-drama-serif font-extrabold text-[30px] leading-[40px] sm:text-[40px] sm:leading-[52px] lg:text-[44px] lg:leading-[56px] text-[#F5F5F5] tracking-tight">
                어젯밤 우리 단톡방이,
                <br />
                오늘 밤 10시{" "}
                <span className="text-[#D4B26A]">특별기획</span>이 됩니다.
              </h1>
              <p className="text-[13px] sm:text-[14px] text-[#A3A3A3] leading-relaxed max-w-[540px]">
                Your group chat, remade as a K-drama trailer — every twist backed
                by a real message.
              </p>
            </div>

            {/* CTAs: Primary Kakao Yellow (#FEE500 / #191919, 56px, radius 14px) + Secondary Ghost (1px gold) */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setUploadSheetOpen(true);
                }}
                className="h-[56px] px-7 rounded-[14px] bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold text-[17px] flex items-center justify-center gap-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition-transform duration-300 active:scale-[0.99] cursor-pointer"
              >
                <span>💬 우리 단톡방 올리기</span>
              </button>

              <a
                href="#tonights-lineup"
                className="h-[48px] sm:h-[56px] px-6 rounded-[4px] border border-[#D4B26A] text-[#F5F5F5] hover:bg-[#D4B26A]/10 font-medium text-[15px] sm:text-[17px] flex items-center justify-center gap-2 transition-colors duration-300"
              >
                <span>샘플 드라마 보기 ↓</span>
              </a>
            </div>

            {/* Micro Trust Line (12px muted) */}
            <p className="text-[12px] text-[#A3A3A3] tracking-tight">
              3분이면 1화 예고편 · 동의한 친구만 출연 · 원문은 저장하지 않아요
            </p>
          </div>

          {/* Bottom-Left of Hero: tiny "● ON AIR" (crimson dot pulsing) + "TONIGHT 10PM" */}
          <div className="absolute left-5 sm:left-8 bottom-[calc(6vh+14px)] flex items-center gap-2.5 font-mono-code text-[12px] tracking-widest">
            <span className="inline-flex items-center gap-1.5 text-[#F5F5F5] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" />
              ON AIR
            </span>
            <span className="text-[#8C7647]">·</span>
            <span className="text-[#D4B26A]">TONIGHT 10PM</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          S2 — "오늘 밤 편성표" (TONIGHT'S LINEUP)
      ===================================================================== */}
      <section
        id="tonights-lineup"
        className="max-w-7xl mx-auto px-5 sm:px-8 pt-[72px] lg:pt-[120px]"
      >
        <div className="space-y-2 mb-8">
          <div className="font-mono-code text-[12px] tracking-widest text-[#D4B26A] uppercase">
            TONIGHT&apos;S LINEUP
          </div>
          <h2 className="font-drama-serif font-extrabold text-[26px] sm:text-[32px] text-[#F5F5F5]">
            샘플 단톡방으로 바로 시청하기
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#A3A3A3]">
            Select a sample chat room to step straight into the casting &amp;
            production studio.
          </p>
        </div>

        {error && !uploadSheetOpen && (
          <div className="mb-6 p-4 rounded-[4px] bg-[#141414] border border-[#C8102E] text-[14px] text-[#F5F5F5]">
            {error}
          </div>
        )}

        {/* 3 Poster Cards: Desktop 3-col grid, Mobile horizontal scroll-snap 78vw */}
        <div className="flex md:grid md:grid-cols-3 gap-5 lg:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 no-scrollbar">
          {SAMPLE_ROOMS.map((room) => {
            const isLoading = loadingKey === room.key;
            return (
              <button
                key={room.key}
                type="button"
                disabled={Boolean(loadingKey)}
                onClick={() => handleSampleSelect(room.key)}
                className="group text-left w-[78vw] max-w-[330px] md:w-auto md:max-w-none shrink-0 snap-center flex flex-col cursor-pointer disabled:opacity-60 focus:outline-none"
              >
                {/* 2:3 Poster Frame */}
                <div className="relative w-full aspect-[2/3] rounded-[4px] overflow-hidden bg-[#141414] border border-[#2A2A2E] group-hover:border-[#D4B26A] transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={room.poster}
                    alt={room.titleKo}
                    className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.03]"
                  />

                  {/* Top 25% Dark Scrim + Gold Myeongjo 800 26px Title Overlay */}
                  <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-black/90 via-black/55 to-transparent p-5 flex flex-col justify-start">
                    <span className="font-mono-code text-[11px] tracking-widest text-[#D4B26A]/90 mb-1">
                      MAKJANG ORIGINAL
                    </span>
                    <div className="font-drama-serif font-extrabold text-[22px] lg:text-[26px] leading-[1.22] text-[#D4B26A] whitespace-pre-line drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                      {room.overlayTitle}
                    </div>
                  </div>

                  {/* Bottom Hover Pill: Crimson "▶ 이 방으로 제작" */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#C8102E] text-white text-[13px] font-bold tracking-wide shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isLoading ? "단톡방 불러오는 중..." : "이 방으로 제작"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Below Poster Meta */}
                <div className="pt-4 space-y-1.5">
                  <div className="inline-block px-2 py-0.5 rounded-[2px] bg-[#141414] border border-[#2A2A2E] font-mono-code text-[12px] text-[#D4B26A]">
                    {room.timeSlot}
                  </div>
                  <h3 className="font-drama-serif font-extrabold text-[20px] text-[#F5F5F5] group-hover:text-[#D4B26A] transition-colors">
                    {room.titleKo}
                  </h3>
                  <p className="text-[13px] text-[#A3A3A3]">{room.titleEn}</p>
                  <p className="text-[14px] text-[#F5F5F5]/90 italic pt-1">
                    {room.quoteKo}
                  </p>
                  <p className="text-[12px] font-mono-code text-[#8C7647] pt-0.5">
                    {room.metaKo}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          S3 — HOW IT WORKS (3 Steps Transformation Strip)
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-[72px] lg:pt-[120px]">
        <div className="space-y-2 mb-8">
          <div className="font-mono-code text-[12px] tracking-widest text-[#D4B26A] uppercase">
            HOW IT WORKS
          </div>
          <h2 className="font-drama-serif font-extrabold text-[26px] sm:text-[32px] text-[#F5F5F5]">
            말도 안 되는 반전,{" "}
            <span className="text-[#D4B26A]">근거는 진짜.</span>
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#A3A3A3]">
            From mundane KakaoTalk bubbles to a Penthouse-style trailer — every
            scene is anchored to a real message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-stretch">
          {/* Step 1: Mini Kakao Chat (#B2C7DA bg, 3 real bubbles around L505 / raw L549) */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            <div className="rounded-[4px] bg-[#B2C7DA] p-4 text-[#191919] space-y-2.5 shadow-inner min-h-[230px] flex flex-col justify-center">
              {/* Bubble 1 */}
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-[#191919]/75">
                  하은
                </div>
                <div className="flex items-end gap-1.5">
                  <div className="bg-white text-[#191919] px-3 py-2 rounded-[14px] rounded-tl-[2px] text-[12px] leading-snug max-w-[85%] shadow-2xs">
                    나도 아직 회사야 서연 언니 ㅎㅎ.. 조심해서 들어가!
                  </div>
                  <span className="text-[10px] text-[#191919]/60 font-mono-code shrink-0">
                    오후 9:10
                  </span>
                </div>
              </div>

              {/* Bubble 2 (Highlighted Gold) */}
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-[#191919]/80">
                  도윤
                </div>
                <div className="flex items-end gap-1.5">
                  <div className="bg-[#FEE500] text-[#191919] font-semibold px-3 py-2 rounded-[14px] rounded-tl-[2px] text-[12px] leading-snug max-w-[85%] ring-2 ring-[#D4B26A] shadow-md">
                    어제 강남역에서 지훈이랑 서연이 본 거 같은데
                  </div>
                  <span className="text-[10px] text-[#191919]/70 font-mono-code shrink-0">
                    오전 11:30
                  </span>
                </div>
              </div>

              {/* Bubble 3 */}
              <div className="space-y-0.5">
                <div className="flex items-end gap-1.5">
                  <div className="bg-white text-[#191919] px-3 py-2 rounded-[14px] rounded-tl-[2px] text-[12px] leading-snug max-w-[88%] shadow-2xs">
                    11번 출구 쪽에서 걸어가는 거 봤음 ㅋㅋㅋ 지훈이 손목에서 시계
                    반짝거려서 눈뽕 맞을 뻔 ㄹㅇ
                  </div>
                  <span className="text-[10px] text-[#191919]/60 font-mono-code shrink-0">
                    오전 11:31
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[17px] font-bold text-[#F5F5F5]">
                1. 단톡방을 통째로 읽어요
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Reads your full group chat and spots hidden contradictions and
                inside jokes.
              </p>
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="lg:col-span-1 flex items-center justify-center text-[#D4B26A]">
            <ArrowRight className="hidden lg:block w-5 h-5" />
            <ArrowDown className="lg:hidden w-5 h-5" />
          </div>

          {/* Step 2: Mini Script Card */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            <div className="rounded-[4px] bg-[#141414] border border-[#2A2A2E] p-5 min-h-[230px] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="font-mono-code text-[12px] text-[#D4B26A]">
                  SHOT #4 · S#4 펜트하우스 라운지 (밤)
                </div>
                <p className="font-drama-serif font-extrabold text-[20px] leading-snug text-[#F5F5F5]">
                  “강남역에서 둘이 있었던 거 다 봤어!”
                </p>
                <p className="text-[13px] text-[#A3A3A3] italic">
                  “I saw the two of you together at Gangnam Station!”
                </p>
              </div>

              <div className="pt-3 border-t border-[#2A2A2E]">
                <div className="p-2.5 rounded-[2px] bg-[#F6F3EA] text-[#191919] font-mono-code text-[12px] leading-snug">
                  <span className="font-bold">L505 · 도윤 · 오전 11:30</span>
                  <div className="truncate mt-0.5">
                    &quot;어제 강남역에서 지훈이랑 서연이 본 거 같은데&quot;
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[17px] font-bold text-[#F5F5F5]">
                2. 떡밥과 반전을 찾아 대본을 써요
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Turns real messages into a 5-shot K-drama script with exact line
                receipts.
              </p>
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="lg:col-span-1 flex items-center justify-center text-[#D4B26A]">
            <ArrowRight className="hidden lg:block w-5 h-5" />
            <ArrowDown className="lg:hidden w-5 h-5" />
          </div>

          {/* Step 3: Film Still with Letterbox & Torn-Paper ReceiptCard Overlay */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            <div className="relative rounded-[4px] overflow-hidden bg-black border border-[#D4B26A]/40 min-h-[230px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/poster-A.webp"
                alt="예고편 스틸컷"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/70" />
              {/* Top & bottom letterbox bars */}
              <div className="absolute top-0 inset-x-0 h-4 bg-black z-10" />
              <div className="absolute bottom-0 inset-x-0 h-4 bg-black z-10" />

              {/* Torn-paper ReceiptCard overlay */}
              <div className="relative z-20 mt-auto mb-5 mx-3 w-full receipt-edge bg-[#F6F3EA] text-[#191919] p-2.5 rounded-[2px] shadow-xl -rotate-1 font-mono-code text-[11px]">
                <div className="flex items-center justify-between font-bold border-b border-[#191919]/15 pb-1 mb-1">
                  <span>RECEIPT · L505</span>
                  <span>도윤 · 오전 11:30</span>
                </div>
                <div className="truncate">
                  “어제 강남역에서 지훈이랑 서연이 본 거 같은데”
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[17px] font-bold text-[#F5F5F5]">
                3. 친구들이 주연인 예고편이 나와요
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Generates a dramatic trailer starring your friends with
                on-screen receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          S4 — RECEIPTS SHOWCASE (The Differentiator)
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-[72px] lg:pt-[120px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Big Perforated ReceiptCard */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[460px] receipt-edge bg-[#F6F3EA] text-[#191919] p-6 sm:p-7 rounded-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] -rotate-[1.5deg] font-mono-code space-y-4">
              <div className="flex items-center justify-between border-b border-dashed border-[#191919]/30 pb-3 text-[12px]">
                <span className="font-bold tracking-wider">
                  MAKJANG EVIDENCE RECEIPT
                </span>
                <span>LINE #L505</span>
              </div>

              <div className="space-y-1 text-[12px] text-[#191919]/75">
                <div>ROOM: 대학 동기 단톡방 (5명)</div>
                <div>SPEAKER: 도윤 · 2026-09-05 오전 11:30</div>
              </div>

              <div className="p-3.5 bg-black/5 rounded-[2px] space-y-1.5">
                <p className="text-[14px] font-bold text-[#191919] leading-snug">
                  “어제 강남역에서 지훈이랑 서연이 본 거 같은데”
                </p>
                <p className="text-[12px] text-[#191919]/70 italic leading-snug">
                  “I think I saw Jihun and Seoyeon at Gangnam Station
                  yesterday.”
                </p>
              </div>

              <div className="p-3.5 bg-black/5 rounded-[2px] space-y-1.5">
                <div className="text-[11px] text-[#191919]/60">
                  LINE #L506 · 오전 11:31
                </div>
                <p className="text-[13px] font-semibold text-[#191919] leading-snug">
                  “11번 출구 쪽에서 걸어가는 거 봤음 ㅋㅋㅋ 지훈이 손목에서 시계
                  반짝거려서 눈뽕 맞을 뻔 ㄹㅇ”
                </p>
                <p className="text-[12px] text-[#191919]/70 italic leading-snug">
                  “Saw them walking near Exit 11 lol Jihun&apos;s watch was
                  sparkling so much on his wrist.”
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-[#191919]/30 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#191919]">
                  STATUS: 3-STAGE VERIFIED
                </span>
                <span>ZERO HALLUCINATION</span>
              </div>
            </div>
          </div>

          {/* Right: Editorial Copy */}
          <div className="lg:col-span-6 space-y-4 max-w-[640px]">
            <div className="font-mono-code text-[12px] tracking-widest text-[#D4B26A] uppercase">
              EVIDENCE-BACKED DRAMA
            </div>
            <h2 className="font-drama-serif font-extrabold text-[26px] sm:text-[32px] leading-[1.3] text-[#F5F5F5]">
              모든 반전엔{" "}
              <span className="text-[#D4B26A]">영수증</span>이 붙어요.
            </h2>
            <p className="text-[17px] leading-[1.6] text-[#F5F5F5]/90">
              AI가 지어낸 얘기가 아니에요. 장면마다 실제 대화 줄을 증거로
              붙이고, 세 번 검수해요.
            </p>
            <p className="text-[14px] leading-relaxed text-[#A3A3A3]">
              Every dramatic accusation is grounded in an actual line from your
              chat log — displayed right on screen as a torn-paper receipt with
              Korean original and English translation.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          S5 — TRUST (3 Small Items, Lucide Outline 20px Gold)
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-[72px] lg:pt-[120px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-[4px] bg-[#141414] border border-[#2A2A2E] p-6 sm:p-8">
          <div className="flex items-start gap-3.5">
            <UserCheck className="w-5 h-5 text-[#D4B26A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[17px] font-semibold text-[#F5F5F5]">
                본인 셀카만 — 친구 얼굴은 친구가 직접
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Each friend scans their own QR audition link to upload their own
                selfie.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-[#D4B26A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[17px] font-semibold text-[#F5F5F5]">
                동의한 사람만 출연
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Opt-in casting per member, with alias support and sensitive
                topic filters.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Lock className="w-5 h-5 text-[#D4B26A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[17px] font-semibold text-[#F5F5F5]">
                원문은 저장하지 않아요
              </div>
              <p className="text-[13px] text-[#A3A3A3]">
                Processed strictly in-memory for the session — zero database
                retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          S6 — HOW IT'S BUILT (For Judges, English, Compact Grid) + FOOTER
      ===================================================================== */}
      <section
        id="how-its-built"
        className="max-w-7xl mx-auto px-5 sm:px-8 pt-[72px] lg:pt-[120px] pb-16"
      >
        <div className="rounded-[4px] bg-[#141414] border border-[#2A2A2E] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A2A2E] pb-4">
            <div>
              <div className="font-mono-code text-[12px] tracking-widest text-[#D4B26A] uppercase">
                HOW IT&apos;S BUILT · ARCHITECTURE &amp; VERIFICATION
              </div>
              <h3 className="font-drama-serif font-extrabold text-[20px] text-[#F5F5F5] mt-1">
                3-Stage Self-Correcting Verification Loop
              </h3>
            </div>
            <span className="font-mono-code text-[12px] text-[#A3A3A3]">
              Built in 4 hours at Google DeepMind Hackathon Seoul
            </span>
          </div>

          {/* 3 Verification Loops (One concise row/card each) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            <div className="p-4 rounded-[4px] bg-[#0B0B0C] border border-[#2A2A2E] space-y-1.5">
              <div className="font-mono-code text-[12px] text-[#D4B26A] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3BB273]" />
                <span>Verifier #1 · Script &amp; Receipt Grounding</span>
              </div>
              <p className="text-[#A3A3A3] leading-relaxed">
                Checks line-ID existence (1a), semantic validity (1b), speaker
                knowledge (1c), PG-15 comic safety (1d), and ≤20 Hangul
                syllables (1e); auto-rewrites via Argon on violation.
              </p>
            </div>

            <div className="p-4 rounded-[4px] bg-[#0B0B0C] border border-[#2A2A2E] space-y-1.5">
              <div className="font-mono-code text-[12px] text-[#D4B26A] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3BB273]" />
                <span>Verifier #2 · Vision Identity &amp; Age Lock</span>
              </div>
              <p className="text-[#A3A3A3] leading-relaxed">
                Scores each 16:9 keyframe against the 3-angle character sheet on
                a 0–10 rubric (face, hair, outfit, late-20s age consistency) and
                regenerates once with fix instructions if &lt; 7.
              </p>
            </div>

            <div className="p-4 rounded-[4px] bg-[#0B0B0C] border border-[#2A2A2E] space-y-1.5">
              <div className="font-mono-code text-[12px] text-[#D4B26A] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3BB273]" />
                <span>Verifier #3 · Korean Lip-Sync CER &amp; Frames</span>
              </div>
              <p className="text-[#A3A3A3] leading-relaxed">
                Transcribes generated video audio (CER ≤ 15%) and inspects
                extracted frames for burned-in text; triggers 1× Omni regen or
                falls back to voice-designed TTS dubbing.
              </p>
            </div>
          </div>

          {/* Model Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              "Gemini 4 Argon",
              "Nano Banana 2.1",
              "Omni 1.1 Flash",
              "3.8 Flash TTS",
              "Lyria 3",
            ].map((model) => (
              <span
                key={model}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#1F1F22] border border-[#2A2A2E] font-mono-code text-[12px] text-[#D4B26A]"
              >
                <Cpu className="w-3 h-3" />
                <span>{model}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-6 border-t border-[#2A2A2E] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#A3A3A3] font-mono-code">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-symbol.png"
              alt="막장톡"
              className="w-5 h-5 object-contain"
            />
            <span className="font-drama-serif font-extrabold text-[14px] text-[#D4B26A]">
              막장톡
            </span>
            <span>MAKJANG TALK — 어젯밤 우리 단톡방이, 오늘 밤 10시 특별기획이 됩니다.</span>
          </div>
          <span>GOOGLE DEEPMIND HACKATHON SEOUL 2026</span>
        </div>
      </section>

      {/* =====================================================================
          UPLOAD SHEET (Modal on Desktop / Bottom Sheet on Mobile)
      ===================================================================== */}
      {uploadSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setUploadSheetOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-[14px] sm:rounded-[4px] bg-[#141414] border-t sm:border border-[#2A2A2E] p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-symbol.png"
                  alt="막장톡"
                  className="w-6 h-6 object-contain"
                />
                <h3 className="font-drama-serif font-extrabold text-[20px] text-[#F5F5F5]">
                  우리 단톡방 올리기
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadSheetOpen(false)}
                className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag-Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setError(null);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-[4px] border-2 border-dashed p-7 text-center transition-colors bg-[#0B0B0C] ${
                dragActive || selectedFile
                  ? "border-[#D4B26A] bg-[#D4B26A]/5"
                  : "border-[#2A2A2E] hover:border-[#D4B26A]/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setError(null);
                  }
                }}
              />
              <Upload className="w-7 h-7 text-[#D4B26A] mx-auto mb-2.5" />
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="text-[15px] font-bold text-[#F5F5F5] flex items-center justify-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#D4B26A]" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <p className="text-[12px] text-[#A3A3A3]">
                    다른 파일로 바꾸려면 클릭하세요
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[15px] font-bold text-[#F5F5F5]">
                    대화 내보내기 파일(.txt / .csv) 선택 또는 드래그
                  </div>
                  <p className="text-[12px] text-[#A3A3A3]">
                    Mac 카카오톡: 채팅방 ≡ → 대화 내보내기 → CSV
                  </p>
                </div>
              )}
            </div>

            {/* Passcode Field */}
            <div className="space-y-1.5">
              <label className="block font-mono-code text-[12px] text-[#D4B26A]">
                데모 패스코드 (Passcode)
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="makjang"
                className="w-full h-11 px-3.5 rounded-[4px] bg-[#0B0B0C] border border-[#2A2A2E] text-[14px] text-[#F5F5F5] font-mono-code focus:outline-none focus:border-[#D4B26A]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-[4px] bg-[#C8102E]/15 border border-[#C8102E] text-[13px] text-[#F5F5F5]">
                {error}
              </div>
            )}

            {/* Submit Button (Kakao yellow only on submit button) */}
            <button
              type="button"
              disabled={loadingKey === "upload"}
              onClick={handleStartUpload}
              className="w-full h-[52px] rounded-[14px] bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold text-[16px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>
                {loadingKey === "upload" ? "대화 분석 중..." : "제작 시작"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
