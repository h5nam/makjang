"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChatLine,
  ShotSpec,
  ShowrunnerJSON,
  SSEEvent,
  VerifierResult,
} from "@/lib/types";
import { ParsedSessionData } from "./LandingUpload";
import { ReceiptCard } from "./ReceiptCard";
import {
  CheckCircle2,
  AlertTriangle,
  Clapperboard,
  Loader2,
  Play,
  Sparkles,
  Volume2,
  Camera,
  Terminal,
} from "lucide-react";

interface ScriptApproveProps {
  session: ParsedSessionData;
  initialScript: ShowrunnerJSON;
  initialSheets: Record<string, string>;
  initialKeyframes: Record<number, string>;
  initialVideos: Record<number, string>;
  initialShotDubs: Record<number, string>;
  initialNarratorUrl?: string;
  initialStingUrl?: string;
  initialVerifierLog: VerifierResult[];
  initialStatus: string;
  onEnterPremiere: (finalState: {
    script: ShowrunnerJSON;
    characterSheets: Record<string, string>;
    keyframes: Record<number, string>;
    videos: Record<number, string>;
    shotDubs: Record<number, string>;
    narratorAudioUrl?: string;
    stingAudioUrl?: string;
    verifierLog: VerifierResult[];
  }) => void;
}

const TROPE_OPTIONS = [
  { id: "T01", label: "T01 · 물벼락 (Water Glass Splash)" },
  { id: "T02", label: "T02 · 김치 싸대기 (Kimchi Slap)" },
  { id: "T03", label: "T03 · 주스 뱉기 (Juice Spit-Take)" },
  { id: "T04", label: "T04 · 서류봉투 투척 (Envelope Slam)" },
  { id: "T05", label: "T05 · 점 찍고 귀환 (Mole Transformation)" },
  { id: "T06", label: "T06 · 무릎 꿇기 (Kneeling Plea)" },
  { id: "T07", label: "T07 · 폭우 속 오열 (Crying in Rain)" },
  { id: "T08", label: "T08 · 3연속 충격 줌인 (Triple Shock Zoom)" },
  { id: "T09", label: "T09 · 출생의 비밀 (Birth Secret)" },
  { id: "T11", label: "T11 · 이중생활 폭로 (Double Life Reveal)" },
];

function countSyllables(str: string): number {
  const m = (str || "").match(/[가-힣]/g);
  return m ? m.length : 0;
}

export function ScriptApprove({
  session,
  initialScript,
  initialSheets,
  initialKeyframes,
  initialVideos,
  initialShotDubs,
  initialNarratorUrl,
  initialStingUrl,
  initialVerifierLog,
  initialStatus,
  onEnterPremiere,
}: ScriptApproveProps) {
  const [script, setScript] = useState<ShowrunnerJSON>(initialScript);
  const [shots, setShots] = useState<ShotSpec[]>(initialScript.shots || []);
  const [characterSheets, setCharacterSheets] =
    useState<Record<string, string>>(initialSheets);
  const [keyframes, setKeyframes] =
    useState<Record<number, string>>(initialKeyframes);
  const [videos, setVideos] = useState<Record<number, string>>(initialVideos);
  const [shotDubs, setShotDubs] =
    useState<Record<number, string>>(initialShotDubs);
  const [narratorAudioUrl, setNarratorAudioUrl] = useState<string | undefined>(
    initialNarratorUrl
  );
  const [stingAudioUrl, setStingAudioUrl] = useState<string | undefined>(
    initialStingUrl
  );
  const [verifierLog, setVerifierLog] =
    useState<VerifierResult[]>(initialVerifierLog);
  const [status, setStatus] = useState<string>(initialStatus);
  const [startingShoot, setStartingShoot] = useState(false);

  const lineMap = useMemo(() => {
    const map = new Map<number, ChatLine>();
    for (const l of session.lines) map.set(l.id, l);
    return map;
  }, [session.lines]);

  useEffect(() => {
    const es = new EventSource(`/api/run/${session.runId}/events`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as SSEEvent;
        if (data.type === "status") {
          setStatus(data.status);
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
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [session.runId]);

  function updateShotField<K extends keyof ShotSpec>(
    idx: number,
    field: K,
    value: ShotSpec[K]
  ) {
    setShots((prev) =>
      prev.map((sh, i) => (i === idx ? { ...sh, [field]: value } : sh))
    );
  }

  async function handleStartShooting() {
    setStartingShoot(true);
    try {
      const updatedScript = { ...script, shots };
      setScript(updatedScript);
      const res = await fetch(`/api/run/${session.runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shots }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "촬영 시작 오류");
      }
      setStatus("shooting");
    } catch (e) {
      console.error(e);
    } finally {
      setStartingShoot(false);
    }
  }

  const keyframeCount = Object.keys(keyframes).length;
  const videoCount = Object.keys(videos).length;
  const isShootingOrDone = status === "shooting" || status === "premiere";

  const v2AndV3Logs = verifierLog.filter(
    (v) => v.stage === "v2_vision" || v.stage === "v3_audio"
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-7 space-y-7">
      {/* Header & Action Bar */}
      <div className="p-5 rounded-sm bg-[#141417] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-xs bg-[#D4B26A] text-[#0B0B0C] font-mono-code text-[11px] font-bold">
              HITL #2 · DIRECTOR STORYBOARD & SHOOTING STAGE
            </span>
            <span className="text-xs font-mono-code text-[#9A968E]">
              KEYFRAMES {keyframeCount}/5 · VIDEOS {videoCount}/5
            </span>
          </div>

          <h1 className="font-drama-serif text-2xl sm:text-3xl font-extrabold text-[#F5F2EB]">
            《{script.title_ko}》{" "}
            <span className="text-base font-mono-code font-normal text-[#D4B26A]">
              {script.title_en}
            </span>
          </h1>
          <p className="text-xs text-[#9A968E]">{script.logline_ko}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!isShootingOrDone && (
            <button
              type="button"
              disabled={startingShoot}
              onClick={handleStartShooting}
              className="px-5 py-3.5 rounded-sm bg-[#C8102E] hover:bg-[#e01234] text-white font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Clapperboard className="w-4 h-4" />
              <span>
                {startingShoot
                  ? "촬영장 가동 중..."
                  : "대본 확정 및 5샷 본촬영 시작 →"}
              </span>
            </button>
          )}

          {isShootingOrDone && (
            <button
              type="button"
              onClick={() =>
                onEnterPremiere({
                  script: { ...script, shots },
                  characterSheets,
                  keyframes,
                  videos,
                  shotDubs,
                  narratorAudioUrl,
                  stingAudioUrl,
                  verifierLog,
                })
              }
              className={`px-5 py-3.5 rounded-sm font-bold text-sm flex items-center gap-2 cursor-pointer transition-all ${
                status === "premiere" || videoCount === 5
                  ? "bg-[#C8102E] hover:bg-[#e01234] text-white shadow-[0_0_24px_rgba(200,16,46,0.5)]"
                  : "bg-[#141417] border border-[#D4B26A] text-[#D4B26A] hover:bg-[#D4B26A]/10"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {status === "premiere" || videoCount === 5
                  ? "전 5샷 촬영 완료 · 시사회 극장 입장 (Premiere) →"
                  : `시사회 미리보기 (${videoCount}/5 영상 완료)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Character Sheets Strip */}
      <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4B26A]" />
            <h2 className="font-drama-serif text-base font-bold text-[#F5F2EB]">
              출연진 캐릭터 시트 (Nano Banana 2.1 Reference Sheets)
            </h2>
          </div>
          <span className="text-xs font-mono-code text-[#9A968E]">
            모든 키프레임 촬영 시 외형 고정 레퍼런스로 주입됨
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {(script.cast || []).map((c) => {
            const url = characterSheets[c.chat_name];
            return (
              <div
                key={c.chat_name}
                className="rounded-sm bg-[#0B0B0C] border border-white/10 overflow-hidden flex flex-col"
              >
                <div className="aspect-[3/4] bg-[#141417] relative flex items-center justify-center overflow-hidden">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={c.role_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-1.5 p-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#D4B26A] mx-auto" />
                      <span className="text-[10px] font-mono-code text-[#9A968E] block">
                        시트 생성 중...
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5">
                    <div className="text-xs font-bold text-[#F5F2EB]">
                      {c.role_name}{" "}
                      <span className="text-[10px] font-mono-code text-[#D4B26A]">
                        ({c.chat_name})
                      </span>
                    </div>
                    <div className="text-[10px] font-mono-code text-[#9A968E] truncate">
                      {c.archetype}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Shot Storyboard & Live Shooting Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          {shots.map((shot, idx) => {
            const kfUrl = keyframes[shot.n];
            const vidUrl = videos[shot.n];
            const dubUrl = shotDubs[shot.n];
            const syllables = countSyllables(shot.line_ko);
            const receiptMap = new Map<number, string>();
            for (const r of shot.receipts || []) {
              receiptMap.set(r.line_id, r.text_en);
            }

            return (
              <div
                key={shot.n}
                className="rounded-sm bg-[#141417] border border-white/10 p-4 grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                {/* Left: Keyframe / Video Preview (16:9) */}
                <div className="md:col-span-5 space-y-2">
                  <div className="aspect-video rounded-xs bg-[#0B0B0C] border border-white/15 overflow-hidden relative flex items-center justify-center">
                    {vidUrl ? (
                      <video
                        src={vidUrl}
                        poster={kfUrl}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : kfUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={kfUrl}
                          alt={`Shot ${shot.n}`}
                          className="w-full h-full object-cover"
                        />
                        {isShootingOrDone && (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-xs bg-black/80 border border-[#D4B26A] text-[10px] font-mono-code text-[#D4B26A] flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Omni 1.1 영상 렌더링 중...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-4 space-y-1.5">
                        {isShootingOrDone ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin text-[#D4B26A] mx-auto" />
                            <span className="text-xs font-mono-code text-[#9A968E] block">
                              Shot #{shot.n} 키프레임 생성 중...
                            </span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-[#9A968E] mx-auto" />
                            <span className="text-xs font-mono-code text-[#9A968E] block">
                              승인 시 16:9 키프레임 & 영상 생성
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-xs bg-black/80 text-[11px] font-mono-code font-bold text-[#D4B26A]">
                      SHOT #{shot.n}
                    </div>
                  </div>

                  {dubUrl && (
                    <div className="px-2.5 py-1.5 rounded-xs bg-[#2E9B68]/15 border border-[#2E9B68]/40 text-[11px] font-mono-code text-[#2E9B68] flex items-center justify-between">
                      <span>✅ 클린 TTS 더빙 트랙 결합됨</span>
                      <audio src={dubUrl} controls className="h-6 w-28" />
                    </div>
                  )}

                  {/* Evidence Receipt */}
                  <div className="space-y-1.5">
                    {(shot.evidence || []).slice(0, 2).map((lineId) => (
                      <ReceiptCard
                        key={lineId}
                        lineId={lineId}
                        line={lineMap.get(lineId)}
                        textEn={receiptMap.get(lineId)}
                        compact
                      />
                    ))}
                  </div>
                </div>

                {/* Right: Editable Script Fields */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono-code text-[#D4B26A] font-bold">
                      화자: {shot.speaker} (등장: {(shot.characters || []).join(", ")})
                    </span>

                    <select
                      value={shot.trope_id}
                      disabled={isShootingOrDone}
                      onChange={(e) =>
                        updateShotField(idx, "trope_id", e.target.value)
                      }
                      className="px-2.5 py-1 rounded-xs bg-[#0B0B0C] border border-white/15 text-xs font-mono-code text-[#F5F2EB] focus:outline-none focus:border-[#D4B26A]"
                    >
                      {TROPE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Korean Line Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-code">
                      <span className="text-[#9A968E]">
                        한국어 대사 (Korean Dialogue)
                      </span>
                      <span
                        className={
                          syllables <= 20 ? "text-[#2E9B68]" : "text-[#C8102E]"
                        }
                      >
                        {syllables}/20 음절
                      </span>
                    </div>
                    <input
                      type="text"
                      value={shot.line_ko}
                      disabled={isShootingOrDone}
                      onChange={(e) =>
                        updateShotField(idx, "line_ko", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xs bg-[#0B0B0C] border border-white/15 font-drama-serif text-sm font-bold text-[#F5F2EB] focus:outline-none focus:border-[#D4B26A]"
                    />
                  </div>

                  {/* English Subtitle Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono-code text-[#9A968E]">
                      영어 자막 (English Subtitle for Foreign Judges)
                    </label>
                    <input
                      type="text"
                      value={shot.line_en || ""}
                      disabled={isShootingOrDone}
                      onChange={(e) =>
                        updateShotField(idx, "line_en", e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-xs bg-[#0B0B0C] border border-white/15 text-xs text-[#D4B26A] italic focus:outline-none focus:border-[#D4B26A]"
                    />
                  </div>

                  <p className="text-xs text-[#9A968E] leading-relaxed">
                    {shot.scene_ko}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Live Verifier #2 (Vision) & Verifier #3 (Audio CER) Inspector */}
        <div className="lg:col-span-4 space-y-4 sticky top-20">
          <div className="rounded-sm bg-[#141417] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-[#191919] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#D4B26A]" />
                <span className="text-xs font-mono-code font-bold text-[#F5F2EB]">
                  VISION (#2) & AUDIO (#3) VERIFIER
                </span>
              </div>
              <span className="text-[11px] font-mono-code text-[#D4B26A]">
                {v2AndV3Logs.length} CHECKS
              </span>
            </div>

            <div className="p-3.5 max-h-[540px] overflow-y-auto space-y-2.5 font-mono-code text-xs">
              {v2AndV3Logs.length === 0 ? (
                <div className="py-10 text-center text-[#9A968E] space-y-2">
                  <p>
                    본촬영 시작 시 캐릭터 시트 vs 키프레임 비전 대조(Verifier #2)와
                    한국어 대사 받아쓰기 CER 검증(Verifier #3)이 실시간 표시됩니다.
                  </p>
                </div>
              ) : (
                v2AndV3Logs.map((item) => {
                  const isResolved = item.detail.includes("⚠ → ✅");
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xs border ${
                        isResolved
                          ? "bg-[#2E9B68]/15 border-[#2E9B68]"
                          : item.status === "pass"
                          ? "bg-[#0B0B0C] border-white/10"
                          : "bg-[#E6A817]/15 border-[#E6A817]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[#D4B26A]">
                          [{item.stage}] {item.target}
                        </span>
                        {item.status === "pass" ? (
                          <span className="inline-flex items-center gap-1 text-[#2E9B68] text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {isResolved ? "⚠ → ✅ FIXED" : "✅ PASS"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#E6A817] text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            ⚠ DRIFT
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

          {/* Narrator & Lyria Audio Status */}
          <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono-code text-[#D4B26A]">
              <Volume2 className="w-4 h-4" />
              <span>TRAILER SOUNDTRACK & NARRATION</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xs bg-[#0B0B0C] border border-white/5">
                <span className="font-mono-code text-[#9A968E]">
                  성우 내레이션 (Voice Design)
                </span>
                {narratorAudioUrl ? (
                  <span className="text-[#2E9B68] font-mono-code font-bold">
                    ✅ READY
                  </span>
                ) : (
                  <span className="text-[#9A968E] font-mono-code">대기 중</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-xs bg-[#0B0B0C] border border-white/5">
                <span className="font-mono-code text-[#9A968E]">
                  막장 오케스트라 스팅 (Lyria 3)
                </span>
                {stingAudioUrl ? (
                  <span className="text-[#2E9B68] font-mono-code font-bold">
                    ✅ READY
                  </span>
                ) : (
                  <span className="text-[#9A968E] font-mono-code">대기 중</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
