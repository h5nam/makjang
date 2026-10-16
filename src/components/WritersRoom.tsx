"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArgonEditPlan,
  CastMember,
  ChatLine,
  SeedItem,
  ShowrunnerJSON,
  SSEEvent,
  VerifierResult,
} from "@/lib/types";
import { ParsedSessionData } from "./LandingUpload";
import { ReceiptCard } from "./ReceiptCard";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Film,
  ShieldAlert,
  Play,
  Terminal,
} from "lucide-react";

interface WritersRoomProps {
  session: ParsedSessionData;
  onProceedToApproveOrPremiere: (state: {
    script: ShowrunnerJSON;
    characterSheets: Record<string, string>;
    keyframes: Record<number, string>;
    videos: Record<number, string>;
    shotDubs: Record<number, string>;
    narratorAudioUrl?: string;
    stingAudioUrl?: string;
    masterVideoUrl?: string;
    editPlan?: ArgonEditPlan;
    verifierLog: VerifierResult[];
    status: string;
  }) => void;
}

export function WritersRoom({
  session,
  onProceedToApproveOrPremiere,
}: WritersRoomProps) {
  const [status, setStatus] = useState<string>("writers_room");
  const [citedLineIds, setCitedLineIds] = useState<number[]>([]);
  const [activeJumpLineId, setActiveJumpLineId] = useState<number | null>(null);
  const [titleKo, setTitleKo] = useState<string>("");
  const [titleEn, setTitleEn] = useState<string>("");
  const [loglineKo, setLoglineKo] = useState<string>("");
  const [loglineEn, setLoglineEn] = useState<string>("");
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [script, setScript] = useState<ShowrunnerJSON | null>(null);
  const [verifierLog, setVerifierLog] = useState<VerifierResult[]>([]);
  const [characterSheets, setCharacterSheets] = useState<Record<string, string>>({});
  const [keyframes, setKeyframes] = useState<Record<number, string>>({});
  const [videos, setVideos] = useState<Record<number, string>>({});
  const [shotDubs, setShotDubs] = useState<Record<number, string>>({});
  const [narratorAudioUrl, setNarratorAudioUrl] = useState<string | undefined>();
  const [stingAudioUrl, setStingAudioUrl] = useState<string | undefined>();
  const [masterVideoUrl, setMasterVideoUrl] = useState<string | undefined>();
  const [editPlan, setEditPlan] = useState<ArgonEditPlan | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const lineMap = useMemo(() => {
    const map = new Map<number, ChatLine>();
    for (const l of session.lines) map.set(l.id, l);
    return map;
  }, [session.lines]);

  const citedSet = useMemo(() => new Set(citedLineIds), [citedLineIds]);

  useEffect(() => {
    const es = new EventSource(`/api/run/${session.runId}/events`);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as SSEEvent;
        if (data.type === "status") {
          setStatus(data.status);
        } else if (data.type === "cite_lines") {
          setCitedLineIds((prev) =>
            Array.from(new Set([...prev, ...data.lineIds]))
          );
          if (data.lineIds.length > 0) {
            const firstId = data.lineIds[0];
            setActiveJumpLineId(firstId);
          }
        } else if (data.type === "seeds") {
          setSeeds(data.seeds || []);
          setTitleKo(data.title_ko || "");
          setTitleEn(data.title_en || "");
          setLoglineKo(data.logline_ko || "");
          setLoglineEn(data.logline_en || "");
        } else if (data.type === "cast") {
          setCast(data.cast || []);
        } else if (data.type === "verifier") {
          setVerifierLog((prev) => {
            const idx = prev.findIndex((item) => item.id === data.check.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = data.check;
              return copy;
            }
            return [...prev, data.check];
          });
        } else if (data.type === "script_ready") {
          setScript(data.script);
          if (data.script.seeds) setSeeds(data.script.seeds);
          if (data.script.cast) setCast(data.script.cast);
          if (data.script.title_ko) setTitleKo(data.script.title_ko);
          if (data.script.title_en) setTitleEn(data.script.title_en);
          if (data.script.logline_ko) setLoglineKo(data.script.logline_ko);
          if (data.script.logline_en) setLoglineEn(data.script.logline_en);
        } else if (data.type === "sheet_ready") {
          setCharacterSheets((prev) => ({
            ...prev,
            [data.member]: data.url,
          }));
        } else if (data.type === "keyframe_ready") {
          setKeyframes((prev) => ({
            ...prev,
            [data.shot]: data.url,
          }));
        } else if (data.type === "shot_ready") {
          setVideos((prev) => ({
            ...prev,
            [data.shot]: data.url,
          }));
          if (data.dubUrl) {
            setShotDubs((prev) => ({
              ...prev,
              [data.shot]: data.dubUrl!,
            }));
          }
        } else if (data.type === "audio_ready") {
          if (data.kind === "narrator") setNarratorAudioUrl(data.url);
          if (data.kind === "sting") setStingAudioUrl(data.url);
        } else if (data.type === "master_ready") {
          setMasterVideoUrl(data.url);
          setEditPlan(data.editPlan);
        } else if (data.type === "error") {
          setErrorMsg(data.message);
        }
      } catch (e) {
        console.warn("SSE parse error:", e);
      }
    };

    return () => {
      es.close();
    };
  }, [session.runId]);

  useEffect(() => {
    if (activeJumpLineId && lineRefs.current[activeJumpLineId]) {
      lineRefs.current[activeJumpLineId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeJumpLineId]);

  function jumpToLine(lineId: number) {
    setActiveJumpLineId(lineId);
    lineRefs.current[lineId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  const passCount = verifierLog.filter((v) => v.status === "pass").length;
  const warnCount = verifierLog.filter(
    (v) => v.status === "warn" || v.status === "fixing"
  ).length;

  return (
    <div className="max-w-[1440px] mx-auto px-5 py-6 space-y-5">
      {/* Top Status Banner */}
      <div className="p-4 rounded-sm bg-[#141417] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-xs bg-[#C8102E] text-white text-[11px] font-mono-code font-bold tracking-wider">
              WRITERS&apos; ROOM LIVE
            </span>
            <span className="text-xs font-mono-code text-[#D4B26A]">
              {status === "writers_room" &&
                "Gemini 4 Argon 대본 집필 및 Verifier #1 실시간 교정 중..."}
              {status === "awaiting_approval" &&
                "Verifier #1 전 항목 통과 완료 · 감독 대본 승인(HITL #2) 대기 중"}
              {status === "shooting" &&
                "Nano Banana 2.1 키프레임 & Omni 1.1 Flash 5샷 병렬 촬영 중..."}
              {status === "premiere" &&
                "전 5샷 촬영 및 검증 완료 · 시사회(Premiere) 준비 완료!"}
            </span>
          </div>

          {titleKo ? (
            <div>
              <h1 className="font-drama-serif text-2xl sm:text-3xl font-extrabold text-[#F5F2EB]">
                《{titleKo}》{" "}
                <span className="text-base font-normal text-[#D4B26A] font-mono-code">
                  {titleEn}
                </span>
              </h1>
              <p className="text-xs text-[#F5F2EB]/80 mt-0.5">{loglineKo}</p>
              {loglineEn && (
                <p className="text-[11px] text-[#9A968E] font-mono-code italic">
                  {loglineEn}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#9A968E] pt-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#D4B26A]" />
              <span>
                단톡방 {session.lineCount}줄에서 막장 떡밥 5개와 근거 줄 번호를 추출하고 있습니다...
              </span>
            </div>
          )}
        </div>

        {/* Action Button once Script is Verified */}
        {script && (
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onProceedToApproveOrPremiere({
                  script,
                  characterSheets,
                  keyframes,
                  videos,
                  shotDubs,
                  narratorAudioUrl,
                  stingAudioUrl,
                  masterVideoUrl,
                  editPlan,
                  verifierLog,
                  status,
                })
              }
              className="px-5 py-3 rounded-sm bg-[#C8102E] hover:bg-[#e01234] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-colors"
            >
              {status === "premiere" ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>시사회 극장 입장 (Premiere) →</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>대본 승인 및 촬영장 이동 (HITL #2) →</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-sm bg-[#C8102E]/20 border border-[#C8102E] text-sm text-[#F5F2EB] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#C8102E] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3-Column Writers' Room Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1: KakaoTalk Raw Chat Log (3 cols) */}
        <div className="lg:col-span-3 rounded-sm bg-[#141417] border border-white/10 overflow-hidden flex flex-col h-[720px]">
          <div className="px-3.5 py-2.5 bg-[#191919] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEE500]" />
              <span className="text-xs font-bold text-[#F5F2EB]">
                원본 단톡방 로그
              </span>
            </div>
            <span className="text-[11px] font-mono-code text-[#D4B26A]">
              인용 {citedSet.size}줄 점등
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {session.lines.map((line) => {
              const isCited = citedSet.has(line.id);
              const isActiveJump = activeJumpLineId === line.id;
              return (
                <div
                  key={line.id}
                  ref={(el) => {
                    lineRefs.current[line.id] = el;
                  }}
                  className={`p-2.5 rounded-sm text-xs transition-all border ${
                    isCited
                      ? "bg-[#FEE500]/15 border-[#D4B26A] shadow-[0_0_12px_rgba(212,178,106,0.2)]"
                      : "bg-[#0B0B0C]/70 border-white/5 opacity-75"
                  } ${isActiveJump ? "ring-2 ring-[#FEE500]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono-code mb-1">
                    <span
                      className={
                        isCited
                          ? "text-[#FEE500] font-bold"
                          : "text-[#9A968E]"
                      }
                    >
                      #{line.id} · {line.user}
                    </span>
                    {isCited && (
                      <span className="px-1.5 py-0.2 bg-[#D4B26A] text-[#0B0B0C] font-bold rounded-xs text-[9px]">
                        RECEIPT
                      </span>
                    )}
                  </div>
                  <p className="text-[#F5F2EB] leading-snug break-words">
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: 5 Makjang Seeds + Cast + 5 Shots (5 cols) */}
        <div className="lg:col-span-5 space-y-5 max-h-[720px] overflow-y-auto pr-1">
          {/* 5 Seeds Section */}
          <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4B26A]" />
                <h2 className="font-drama-serif text-base font-bold text-[#F5F2EB]">
                  발굴된 막장 떡밥 5선 (5 Makjang Seeds & Receipts)
                </h2>
              </div>
              <span className="text-xs font-mono-code text-[#D4B26A]">
                {seeds.length}/5 SEEDS
              </span>
            </div>

            {seeds.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#D4B26A] mx-auto" />
                <p className="text-xs font-mono-code text-[#9A968E]">
                  Gemini 4 Argon 쇼러너가 대화 행간의 모순을 대조하고 있습니다...
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {seeds.map((seed, idx) => {
                  const receiptMap = new Map<number, string>();
                  for (const r of seed.receipts || []) {
                    receiptMap.set(r.line_id, r.text_en);
                  }
                  return (
                    <div
                      key={seed.id || idx}
                      className="p-3.5 rounded-sm bg-[#0B0B0C] border border-[#D4B26A]/30 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-xs bg-[#D4B26A]/20 text-[#D4B26A] font-mono-code text-[11px] font-bold">
                          SEED #{idx + 1} ({seed.id})
                        </span>
                        <span className="text-[11px] font-mono-code text-[#9A968E]">
                          근거 줄: {(seed.evidence || []).map((id) => `#${id}`).join(", ")}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#F5F2EB]">
                          {seed.summary}
                        </p>
                        {seed.summary_en && (
                          <p className="text-xs text-[#9A968E] font-mono-code">
                            {seed.summary_en}
                          </p>
                        )}
                      </div>

                      <div className="p-2 rounded-xs bg-[#C8102E]/10 border-l-2 border-[#C8102E] text-xs space-y-0.5">
                        <div className="text-[#F5F2EB]/90">
                          <strong className="text-[#D4B26A] mr-1">막장 각색:</strong>
                          {seed.twist_idea}
                        </div>
                        {seed.twist_idea_en && (
                          <div className="text-[11px] text-[#9A968E] italic">
                            {seed.twist_idea_en}
                          </div>
                        )}
                      </div>

                      {/* Evidence Receipt Cards */}
                      <div className="space-y-2 pt-1">
                        {(seed.evidence || []).map((lineId) => (
                          <ReceiptCard
                            key={lineId}
                            lineId={lineId}
                            line={lineMap.get(lineId)}
                            textEn={receiptMap.get(lineId)}
                            compact
                            onClick={() => jumpToLine(lineId)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cast & Character Sheets Section */}
          {cast.length > 0 && (
            <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="font-drama-serif text-base font-bold text-[#F5F2EB]">
                  캐스팅 & 캐릭터 시트 (Nano Banana 2.1)
                </h2>
                <span className="text-xs font-mono-code text-[#D4B26A]">
                  {Object.keys(characterSheets).length}/{cast.length} READY
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cast.map((c) => {
                  const sheetUrl = characterSheets[c.chat_name];
                  return (
                    <div
                      key={c.chat_name}
                      className="p-3 rounded-sm bg-[#0B0B0C] border border-white/10 flex gap-3"
                    >
                      <div className="w-16 h-22 rounded-xs bg-[#141417] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {sheetUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sheetUrl}
                            alt={c.role_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-[#D4B26A]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-bold text-[#F5F2EB]">
                          {c.role_name}{" "}
                          <span className="text-[11px] font-mono-code text-[#9A968E]">
                            ({c.chat_name})
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-code text-[#D4B26A]">
                          {c.archetype}
                        </div>
                        <p className="text-[11px] text-[#9A968E] leading-snug line-clamp-2">
                          {c.secret_ko}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5-Shot Trailer Script Summary */}
          {script && script.shots && (
            <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="font-drama-serif text-base font-bold text-[#F5F2EB]">
                  검증 완료 5샷 예고편 콘티 (5-Shot Trailer Script)
                </h2>
                <span className="text-xs font-mono-code text-[#2E9B68]">
                  VERIFIED
                </span>
              </div>

              <div className="space-y-3">
                {script.shots.map((sh) => {
                  const receiptMap = new Map<number, string>();
                  for (const r of sh.receipts || []) {
                    receiptMap.set(r.line_id, r.text_en);
                  }
                  return (
                    <div
                      key={sh.n}
                      className="p-3 rounded-sm bg-[#0B0B0C] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono-code">
                        <span className="text-[#D4B26A] font-bold">
                          SHOT #{sh.n} · {sh.trope_id} · {sh.speaker}
                        </span>
                        <span className="text-[#9A968E]">{sh.camera_type}</span>
                      </div>
                      <p className="font-drama-serif text-sm font-bold text-[#F5F2EB]">
                        “{sh.line_ko}”
                      </p>
                      {sh.line_en && (
                        <p className="text-xs text-[#D4B26A]/90 italic">
                          “{sh.line_en}”
                        </p>
                      )}
                      <p className="text-xs text-[#9A968E]">{sh.scene_ko}</p>
                      <div className="space-y-1.5 pt-1">
                        {(sh.evidence || []).slice(0, 2).map((lineId) => (
                          <ReceiptCard
                            key={lineId}
                            lineId={lineId}
                            line={lineMap.get(lineId)}
                            textEn={receiptMap.get(lineId)}
                            compact
                            onClick={() => jumpToLine(lineId)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Real-time Verifier Inspector Log (4 cols) */}
        <div className="lg:col-span-4 rounded-sm bg-[#141417] border border-white/10 overflow-hidden flex flex-col h-[720px]">
          <div className="px-4 py-2.5 bg-[#191919] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#D4B26A]" />
              <span className="text-xs font-mono-code font-bold text-[#F5F2EB]">
                VERIFIER INSPECTOR LOG
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono-code">
              <span className="text-[#2E9B68]">✅ {passCount}</span>
              {warnCount > 0 && (
                <span className="text-[#E6A817]">⚠ {warnCount}</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 font-mono-code text-xs">
            {verifierLog.length === 0 ? (
              <div className="py-12 text-center text-[#9A968E] space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#D4B26A] mx-auto" />
                <p>대본 초안 생성 후 5단계 검증기(1a~1e)가 즉시 가동됩니다...</p>
              </div>
            ) : (
              verifierLog.map((item) => {
                const isResolved = item.detail.includes("⚠ → ✅");
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xs border transition-all ${
                      isResolved
                        ? "bg-[#2E9B68]/15 border-[#2E9B68]"
                        : item.status === "pass"
                        ? "bg-[#0B0B0C] border-white/10"
                        : item.status === "warn" || item.status === "fixing"
                        ? "bg-[#E6A817]/15 border-[#E6A817]"
                        : "bg-[#C8102E]/15 border-[#C8102E]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#D4B26A]">
                        [{item.stage}] {item.target}
                      </span>
                      {item.status === "pass" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#2E9B68]/20 text-[#2E9B68] text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {isResolved ? "⚠ → ✅ RESOLVED" : "✅ PASS"}
                        </span>
                      ) : item.status === "fixing" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#E6A817]/20 text-[#E6A817] text-[10px] font-bold">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          PATCHING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#E6A817]/20 text-[#E6A817] text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          ⚠ WARN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#F5F2EB]/90 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
