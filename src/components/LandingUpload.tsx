"use client";

import React, { useRef, useState } from "react";
import { Upload, Film, Sparkles, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { ChatLine, MemberConfig } from "@/lib/types";

export interface ParsedSessionData {
  runId: string;
  roomTitle: string;
  lineCount: number;
  members: MemberConfig[];
  lines: ChatLine[];
  sampleKey: "A_friends" | "B_family" | "C_work" | null;
}

interface LandingUploadProps {
  onParsed: (data: ParsedSessionData) => void;
}

const SAMPLE_ROOMS: Array<{
  key: "A_friends" | "B_family" | "C_work";
  badge: string;
  title: string;
  subtitleEn: string;
  members: string;
  lines: string;
  hook: string;
}> = [
  {
    key: "A_friends",
    badge: "ROOM A · 대학 동기 단톡방",
    title: "강남역 영수증과 사라진 알리바이",
    subtitleEn: "Friends Room · The Gangnam Station Receipt",
    members: "민지 · 지훈 · 서연 · 도윤 · 하은 (5명)",
    lines: "447줄",
    hook: "“야근이라더니 왜 강남역 영수증이 찍혀 있어?”",
  },
  {
    key: "B_family",
    badge: "ROOM B · 우리집 가족 단톡방",
    title: "흔들린 수국 사진과 파란불의 비밀",
    subtitleEn: "Family Room · The Secret Behind the Hydrangeas",
    members: "엄마 · 아빠 · 수진 · 민수 · 이모 (5명)",
    lines: "851줄",
    hook: "“네가 태어난 날 비가 왔다고? 그날 서울은 쾌청이었어.”",
  },
  {
    key: "C_work",
    badge: "ROOM C · 프로젝트 TF 업무방",
    title: "새벽 2시 최종_최종.pptx 유출 사건",
    subtitleEn: "Work TF Room · The 2 AM Deck Leak",
    members: "태현 · 유나 · 성민 · 지아 (4명)",
    lines: "375줄",
    hook: "“경쟁사 제안서 폰트가… 왜 우리 팀장님 템플릿이랑 똑같죠?”",
  },
];

export function LandingUpload({ onParsed }: LandingUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      onParsed(data);
    } catch (err: any) {
      setError(err?.message || "오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setLoadingKey("upload");
    try {
      const text = await file.text();
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "파일 파싱 실패");
      onParsed(data);
    } catch (err: any) {
      setError(err?.message || "파일 처리 중 오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Left Hero Column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-[#D4B26A]/40 bg-[#D4B26A]/10 text-[#D4B26A] text-xs font-mono-code tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YELLOW CHAT → BLACK DRAMA · ZERO HALLUCINATION RECEIPTS</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-drama-serif text-4xl sm:text-5xl font-extrabold leading-[1.15] tracking-tight text-[#F5F2EB]">
            어젯밤 우리 단톡방,
            <br />
            <span className="text-[#D4B26A]">오늘 밤 10시 주말 특별기획</span>으로.
          </h1>
          <p className="text-sm font-mono-code text-[#9A968E]">
            Your KakaoTalk group chat, remade as a 60-second Korean makjang drama trailer — with line-by-line chat receipts.
          </p>
        </div>

        <p className="text-base text-[#F5F2EB]/80 leading-relaxed max-w-2xl">
          카카오톡 대화 내보내기(<code className="font-mono-code text-[#FEE500]">.txt</code> /{" "}
          <code className="font-mono-code text-[#FEE500]">.csv</code>)를 올리면{" "}
          <strong className="text-[#F5F2EB]">Gemini 4 Argon</strong> 쇼러너가 대화 속 숨겨진 모순과 떡밥을 찾아내고,{" "}
          <strong className="text-[#F5F2EB]">3단계 검증 루프</strong>를 거쳐 실제 대화 줄 번호가 찍힌{" "}
          <strong className="text-[#D4B26A]">5샷 막장드라마 예고편</strong>을 제작합니다.
        </p>

        {/* Sample Chat Picker */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-code uppercase tracking-wider text-[#D4B26A]">
              즉시 시연용 샘플 단톡방 (Sample Chats · Click to Load)
            </span>
            <span className="text-xs font-mono-code text-[#9A968E]">
              가상 셀카 프리셋 포함
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {SAMPLE_ROOMS.map((room) => {
              const isLoading = loadingKey === room.key;
              return (
                <button
                  key={room.key}
                  disabled={Boolean(loadingKey)}
                  onClick={() => handleSampleSelect(room.key)}
                  className="text-left group relative p-4 rounded-sm bg-[#141417] border border-white/10 hover:border-[#D4B26A] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 disabled:opacity-50"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-mono-code bg-[#FEE500] text-[#191919] font-semibold rounded-xs">
                        {room.badge}
                      </span>
                      <span className="text-xs font-mono-code text-[#9A968E]">
                        {room.members} · {room.lines}
                      </span>
                    </div>
                    <h3 className="font-drama-serif text-lg font-bold text-[#F5F2EB] group-hover:text-[#D4B26A] transition-colors">
                      {room.title}
                    </h3>
                    <p className="text-xs text-[#9A968E] font-mono-code">
                      {room.subtitleEn}
                    </p>
                    <p className="text-xs text-[#F5F2EB]/75 italic pt-0.5">
                      {room.hook}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-sm bg-[#C8102E] group-hover:bg-[#e01234] text-white text-xs font-semibold tracking-wide transition-colors">
                    <Film className="w-3.5 h-3.5" />
                    <span>{isLoading ? "로딩 중..." : "이 단톡방으로 제작 →"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Upload & Architecture Column */}
      <div className="lg:col-span-5 space-y-5">
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
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-sm border-2 border-dashed p-7 text-center transition-all bg-[#141417] ${
            dragActive
              ? "border-[#FEE500] bg-[#FEE500]/5"
              : "border-white/15 hover:border-[#D4B26A]/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="w-12 h-12 rounded-full bg-[#FEE500]/15 border border-[#FEE500]/40 text-[#FEE500] flex items-center justify-center mx-auto mb-3">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="font-drama-serif text-lg font-bold text-[#F5F2EB]">
            내 카카오톡 대화 파일 업로드
          </h2>
          <p className="text-xs text-[#9A968E] mt-1">
            Mac CSV (<code className="font-mono-code">.csv</code>) · Windows PC / iOS / Android (<code className="font-mono-code">.txt</code>) 지원
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-white/5 border border-white/10 text-xs font-mono-code text-[#F5F2EB]">
            <FileText className="w-3.5 h-3.5 text-[#D4B26A]" />
            <span>
              {loadingKey === "upload"
                ? "대화 파일 분석 중..."
                : "파일 선택 또는 여기로 드래그"}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-sm bg-[#C8102E]/15 border border-[#C8102E] text-xs text-[#F5F2EB]">
            {error}
          </div>
        )}

        {/* Verification Pipeline Card */}
        <div className="rounded-sm bg-[#141417] border border-white/10 p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="text-xs font-mono-code uppercase tracking-wider text-[#D4B26A]">
              3-Stage Verification Loop
            </span>
            <span className="text-[11px] font-mono-code text-[#2E9B68] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xs bg-[#0B0B0C] border border-white/5 space-y-1">
              <div className="font-mono-code text-[#D4B26A] font-semibold">
                Verifier #1 · Script & Receipt Grounding
              </div>
              <p className="text-[#9A968E] leading-relaxed">
                인용 줄 실존 여부(1a), 문맥 타당성(1b), 화자 지식 정합성(1c), PG-15 안전성(1d), 한국어 20음절 제한(1e) 검수 후 위반 시 Argon 즉시 재교정.
              </p>
            </div>

            <div className="p-2.5 rounded-xs bg-[#0B0B0C] border border-white/5 space-y-1">
              <div className="font-mono-code text-[#D4B26A] font-semibold">
                Verifier #2 · Vision Character Consistency
              </div>
              <p className="text-[#9A968E] leading-relaxed">
                캐릭터 시트 vs 키프레임 외형·머리색·의상 대조(0–10점). 드리프트 감지 시 보정 지시문 포함 즉시 재생성.
              </p>
            </div>

            <div className="p-2.5 rounded-xs bg-[#0B0B0C] border border-white/5 space-y-1">
              <div className="font-mono-code text-[#D4B26A] font-semibold">
                Verifier #3 · Korean Lip-Sync Audio CER
              </div>
              <p className="text-[#9A968E] leading-relaxed">
                생성된 영상 오디오를 받아쓰기해 원문 대사와 음절 오류율(CER ≤ 15%) 검증, 미달 시 재생성 또는 클린 TTS 더빙 교체.
              </p>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-2 text-[11px] text-[#9A968E]">
            <ShieldCheck className="w-4 h-4 text-[#D4B26A] shrink-0" />
            <span>업로드된 단톡 원문은 메모리에서만 처리되며 외부 DB에 영구 저장되지 않습니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
