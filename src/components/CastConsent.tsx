"use client";

import React, { useEffect, useState } from "react";
import { MemberConfig, SSEEvent } from "@/lib/types";
import { ParsedSessionData } from "./LandingUpload";
import { QRCodeSVG } from "qrcode.react";
import {
  UserCheck,
  UserX,
  Camera,
  Lock,
  Clapperboard,
  ArrowLeft,
  Sparkles,
  QrCode,
  X,
  ExternalLink,
} from "lucide-react";

interface CastConsentProps {
  session: ParsedSessionData;
  onBack: () => void;
  onStarted: (config: {
    members: MemberConfig[];
    style: "live" | "webtoon";
    excludedTopics: string[];
    autoApprove: boolean;
  }) => void;
}

const TOPIC_OPTIONS = [
  "정치/이념",
  "종교",
  "건강/병원",
  "실제 채무/계좌",
  "가족 실명 언급",
];

export function CastConsent({
  session,
  onBack,
  onStarted,
}: CastConsentProps) {
  const [members, setMembers] = useState<MemberConfig[]>(session.members);
  const [style, setStyle] = useState<"live" | "webtoon">("live");
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);
  const [passcode, setPasscode] = useState<string>("makjang");
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrMember, setQrMember] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  // Listen for live mobile audition selfie uploads via SSE
  useEffect(() => {
    const es = new EventSource(`/api/run/${session.runId}/events`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as SSEEvent;
        if (data.type === "audition_selfie") {
          const mediaId = data.selfieUrl.split("/").pop();
          setMembers((prev) =>
            prev.map((m) =>
              m.name === data.member
                ? { ...m, selfieId: mediaId, included: true }
                : m
            )
          );
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [session.runId]);

  function toggleMember(idx: number) {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, included: !m.included } : m))
    );
  }

  function updateAlias(idx: number, alias: string) {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, alias } : m))
    );
  }

  function toggleSelfieDetach(idx: number) {
    setMembers((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        const origSelfieId = session.members[idx]?.selfieId;
        return {
          ...m,
          selfieId: m.selfieId ? undefined : origSelfieId,
        };
      })
    );
  }

  function toggleTopic(topic: string) {
    setExcludedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleStart() {
    setError(null);
    const activeCount = members.filter((m) => m.included).length;
    if (activeCount < 2) {
      setError("최소 2명 이상의 출연자가 동의해야 드라마가 성립합니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: session.runId,
          passcode,
          members,
          style,
          excludedTopics,
          autoApprove,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "제작 시작 실패");
      onStarted({ members, style, excludedTopics, autoApprove });
    } catch (err: any) {
      setError(err?.message || "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const auditionUrl =
    qrMember && originUrl
      ? `${originUrl}/audition/${session.runId}/${encodeURIComponent(qrMember)}`
      : "";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-mono-code text-[#9A968E] hover:text-[#F5F2EB] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>다른 단톡방 선택</span>
            </button>
            <span className="text-white/20">|</span>
            <span className="text-xs font-mono-code text-[#D4B26A]">
              HITL #1 · CAST & CONSENT BOARD
            </span>
          </div>
          <h1 className="font-drama-serif text-2xl sm:text-3xl font-bold text-[#F5F2EB]">
            출연 동의 및 캐스팅 보드 —{" "}
            <span className="text-[#FEE500]">{session.roomTitle}</span>
          </h1>
          <p className="text-xs font-mono-code text-[#9A968E]">
            총 {session.lineCount}줄 파싱 완료 · 출연 제외된 멤버의 대사는 AI 작가에게 전달되지 않습니다.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#141417] border border-white/10 text-xs font-mono-code text-[#D4B26A]">
          <span>RUN ID: #{session.runId}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Member Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-drama-serif text-lg font-bold text-[#F5F2EB]">
              단톡방 멤버 ({members.filter((m) => m.included).length}/{members.length}명 출연)
            </h2>
            <span className="text-xs font-mono-code text-[#9A968E]">
              QR 오디션으로 본인 셀카 업로드 가능
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {members.map((m, idx) => {
              const origHasSelfie = Boolean(session.members[idx]?.selfieId);
              return (
                <div
                  key={m.name}
                  className={`p-4 rounded-sm border transition-all ${
                    m.included
                      ? "bg-[#141417] border-[#D4B26A]/40"
                      : "bg-[#141417]/40 border-white/5 opacity-55"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Selfie Avatar or Virtual Actor Placeholder */}
                    <div className="relative w-16 h-20 rounded-xs overflow-hidden bg-[#0B0B0C] border border-white/15 shrink-0 flex items-center justify-center">
                      {m.selfieId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/media/${m.selfieId}`}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-1">
                          <Camera className="w-4 h-4 text-[#9A968E] mx-auto mb-1" />
                          <span className="text-[10px] font-mono-code text-[#9A968E] block leading-tight">
                            가상 배우
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-[#F5F2EB]">
                            {m.name}
                          </span>
                          <span className="ml-2 text-[11px] font-mono-code text-[#9A968E]">
                            {m.lineCount}줄
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleMember(idx)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono-code transition-colors cursor-pointer ${
                            m.included
                              ? "bg-[#2E9B68]/20 text-[#2E9B68] border border-[#2E9B68]/40"
                              : "bg-white/5 text-[#9A968E] border border-white/10"
                          }`}
                        >
                          {m.included ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>출연 ON</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>제외 OFF</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Alias Input */}
                      <div>
                        <label className="block text-[10px] font-mono-code text-[#9A968E] mb-0.5">
                          극중 배역 가명 (Role Alias)
                        </label>
                        <input
                          type="text"
                          value={m.alias}
                          disabled={!m.included}
                          onChange={(e) => updateAlias(idx, e.target.value)}
                          className="w-full px-2.5 py-1 rounded-xs bg-[#0B0B0C] border border-white/10 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4B26A]"
                          placeholder="극중 이름 입력"
                        />
                      </div>

                      {/* Selfie attach / detach / QR controls */}
                      {m.included && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {origHasSelfie && (
                            <button
                              type="button"
                              onClick={() => toggleSelfieDetach(idx)}
                              className="text-[11px] font-mono-code px-2 py-0.5 rounded-xs border border-[#D4B26A]/30 text-[#D4B26A] hover:bg-[#D4B26A]/10 cursor-pointer"
                            >
                              {m.selfieId
                                ? "셀카 해제 (가상배우)"
                                : "샘플 셀카 다시 연결"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setQrMember(m.name)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono-code px-2 py-0.5 rounded-xs border border-white/15 text-[#F5F2EB]/80 hover:border-[#D4B26A] hover:text-[#D4B26A] cursor-pointer"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR 셀카 오디션</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Production Options & Launch */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-sm bg-[#141417] border border-white/10 space-y-5">
            {/* Visual Style */}
            <div className="space-y-2">
              <label className="block text-xs font-mono-code uppercase tracking-wider text-[#D4B26A]">
                연출 화풍 선택 (Visual Style)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStyle("live")}
                  className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
                    style === "live"
                      ? "bg-[#D4B26A]/15 border-[#D4B26A] text-[#F5F2EB]"
                      : "bg-[#0B0B0C] border-white/10 text-[#9A968E]"
                  }`}
                >
                  <div className="text-xs font-bold">실사 K-드라마</div>
                  <div className="text-[10px] font-mono-code opacity-80 mt-0.5">
                    35mm 아나모픽 · 펜트하우스 톤
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("webtoon")}
                  className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
                    style === "webtoon"
                      ? "bg-[#D4B26A]/15 border-[#D4B26A] text-[#F5F2EB]"
                      : "bg-[#0B0B0C] border-white/10 text-[#9A968E]"
                  }`}
                >
                  <div className="text-xs font-bold">웹툰 무빙툰</div>
                  <div className="text-[10px] font-mono-code opacity-80 mt-0.5">
                    네이버 로맨스릴러 작화
                  </div>
                </button>
              </div>
            </div>

            {/* Excluded Topics */}
            <div className="space-y-2">
              <label className="block text-xs font-mono-code uppercase tracking-wider text-[#D4B26A]">
                금기 소재 필터 (Excluded Topics)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_OPTIONS.map((topic) => {
                  const active = excludedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`px-2.5 py-1 rounded-xs text-xs font-mono-code border transition-colors cursor-pointer ${
                        active
                          ? "bg-[#C8102E]/20 border-[#C8102E] text-[#F5F2EB]"
                          : "bg-[#0B0B0C] border-white/10 text-[#9A968E] hover:border-white/25"
                      }`}
                    >
                      {active ? `✕ ${topic}` : topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-approve toggle */}
            <div className="pt-1 border-t border-white/10">
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span className="text-[#F5F2EB]/90">
                  대본 검수 후 자동으로 영상 촬영 진행
                </span>
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="accent-[#D4B26A] w-4 h-4"
                />
              </label>
              <p className="text-[11px] text-[#9A968E] mt-1">
                체크 해제 시 작가실 대본 완성 후 대사/클리셰를 직접 수정하고 촬영을 승인(HITL #2)할 수 있습니다.
              </p>
            </div>

            {/* Demo Passcode */}
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <label className="flex items-center gap-1.5 text-xs font-mono-code text-[#D4B26A]">
                <Lock className="w-3.5 h-3.5" />
                <span>DEMO PASSCODE</span>
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="데모 패스코드 입력 (makjang)"
                className="w-full px-3 py-2 rounded-xs bg-[#0B0B0C] border border-white/15 text-xs font-mono-code text-[#F5F2EB] focus:outline-none focus:border-[#D4B26A]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xs bg-[#C8102E]/20 border border-[#C8102E] text-xs text-[#F5F2EB]">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleStart}
              className="w-full py-3.5 px-4 rounded-sm bg-[#C8102E] hover:bg-[#e01234] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Clapperboard className="w-4 h-4" />
              <span>
                {submitting
                  ? "작가실 오픈 중..."
                  : "작가실 오픈 · 대본 집필 시작 →"}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono-code text-[#9A968E]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4B26A]" />
              <span>Gemini 4 Argon + Nano Banana 2.1 병렬 가동</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Audition Modal */}
      {qrMember && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#D4B26A] rounded-sm max-w-sm w-full p-6 space-y-5 relative text-center">
            <button
              type="button"
              onClick={() => setQrMember(null)}
              className="absolute top-4 right-4 text-[#9A968E] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-mono-code text-[#D4B26A] uppercase tracking-wider">
                MOBILE SELFIE AUDITION
              </span>
              <h3 className="font-drama-serif text-xl font-bold text-[#F5F2EB]">
                {qrMember} 님의 모바일 셀카 오디션
              </h3>
              <p className="text-xs text-[#9A968E]">
                스마트폰 카메라로 아래 QR을 스캔해 셀카를 올리면 즉시 캐릭터 시트에 반영됩니다.
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm inline-block mx-auto">
              {auditionUrl && <QRCodeSVG value={auditionUrl} size={180} />}
            </div>

            <div className="space-y-2">
              <a
                href={auditionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono-code text-[#D4B26A] hover:underline"
              >
                <span>새 탭에서 오디션 페이지 열기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
