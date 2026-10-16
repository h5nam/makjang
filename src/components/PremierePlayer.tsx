"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArgonEditPlan,
  ChatLine,
  ShowrunnerJSON,
  SSEEvent,
  VerifierResult,
} from "@/lib/types";
import { ParsedSessionData } from "./LandingUpload";
import { ReceiptsDrawer } from "./ReceiptsDrawer";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  SkipForward,
  Sparkles,
  ArrowLeft,
  Film,
  Download,
} from "lucide-react";

interface PremierePlayerProps {
  session: ParsedSessionData;
  initialScript: ShowrunnerJSON;
  initialSheets: Record<string, string>;
  initialKeyframes: Record<number, string>;
  initialVideos: Record<number, string>;
  initialShotDubs: Record<number, string>;
  initialNarratorUrl?: string;
  initialStingUrl?: string;
  initialMasterVideoUrl?: string;
  initialEditPlan?: ArgonEditPlan;
  initialVerifierLog: VerifierResult[];
  onBackToStoryboard: () => void;
}

type PlaybackStage = "master" | "title" | "shot" | "cliffhanger";

export function PremierePlayer({
  session,
  initialScript,
  initialSheets,
  initialKeyframes,
  initialVideos,
  initialShotDubs,
  initialNarratorUrl,
  initialStingUrl,
  initialMasterVideoUrl,
  initialEditPlan,
  initialVerifierLog,
  onBackToStoryboard,
}: PremierePlayerProps) {
  const [script] = useState<ShowrunnerJSON>(initialScript);
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
  const [masterVideoUrl, setMasterVideoUrl] = useState<string | undefined>(
    initialMasterVideoUrl
  );
  const [editPlan, setEditPlan] = useState<ArgonEditPlan | undefined>(
    initialEditPlan
  );
  const [verifierLog, setVerifierLog] =
    useState<VerifierResult[]>(initialVerifierLog);

  const [stage, setStage] = useState<PlaybackStage>(
    initialMasterVideoUrl ? "master" : "title"
  );
  const [shotIndex, setShotIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dubAudioRef = useRef<HTMLAudioElement | null>(null);
  const narratorAudioRef = useRef<HTMLAudioElement | null>(null);
  const stingAudioRef = useRef<HTMLAudioElement | null>(null);

  const shots = script.shots || [];
  const currentShot = shots[shotIndex];

  const lineMap = useMemo(() => {
    const map = new Map<number, ChatLine>();
    for (const l of session.lines) map.set(l.id, l);
    return map;
  }, [session.lines]);

  // Keep SSE connected in case assets finish arriving while in Premiere
  useEffect(() => {
    const es = new EventSource(`/api/run/${session.runId}/events`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as SSEEvent;
        if (data.type === "sheet_ready") {
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
          setStage("master");
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

  useEffect(() => {
    if (stage === "master") {
      if (stingAudioRef.current && !stingAudioRef.current.paused) {
        stingAudioRef.current.pause();
      }
      if (dubAudioRef.current && !dubAudioRef.current.paused) {
        dubAudioRef.current.pause();
      }
      if (narratorAudioRef.current && !narratorAudioRef.current.paused) {
        narratorAudioRef.current.pause();
      }
    }
  }, [stage]);

  // Title Card auto-advance & Lyria 3 orchestral sting
  useEffect(() => {
    if (!isPlaying) return;
    if (stage === "title") {
      if (stingAudioRef.current && stingAudioUrl && !muted) {
        stingAudioRef.current.volume = 0.45;
        stingAudioRef.current.currentTime = 0;
        stingAudioRef.current.play().catch(() => {});
      }
      const timer = setTimeout(() => {
        setStage("shot");
        setShotIndex(0);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [stage, isPlaying, stingAudioUrl, muted]);

  // Shot playback & synchronized TTS dub fallback
  useEffect(() => {
    if (stage !== "shot" || !currentShot || !isPlaying) return;

    const shotNum = currentShot.n;
    const vidUrl = videos[shotNum];
    const dubUrl = shotDubs[shotNum];

    if (stingAudioRef.current) {
      stingAudioRef.current.volume = 0.16;
    }

    if (dubAudioRef.current && dubUrl && !muted) {
      dubAudioRef.current.src = dubUrl;
      dubAudioRef.current.currentTime = 0;
      dubAudioRef.current.play().catch(() => {});
    }

    // Fallback timer if video is not available yet (keyframe-only mode)
    if (!vidUrl) {
      const fallbackTimer = setTimeout(() => {
        advanceFromCurrentShot();
      }, 5200);
      return () => clearTimeout(fallbackTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, shotIndex, isPlaying, currentShot, videos, shotDubs, muted]);

  // Cliffhanger narrator voiceover + Lyria 3 sting swell
  useEffect(() => {
    if (stage !== "cliffhanger" || !isPlaying) return;

    if (stingAudioRef.current && stingAudioUrl && !muted) {
      stingAudioRef.current.volume = 0.5;
      if (stingAudioRef.current.paused) {
        stingAudioRef.current.play().catch(() => {});
      }
    }

    if (narratorAudioRef.current && narratorAudioUrl && !muted) {
      narratorAudioRef.current.currentTime = 0;
      narratorAudioRef.current.play().catch(() => {});
    }
  }, [stage, isPlaying, narratorAudioUrl, stingAudioUrl, muted]);

  function advanceFromCurrentShot() {
    if (shotIndex + 1 < shots.length) {
      setShotIndex((prev) => prev + 1);
    } else {
      setStage("cliffhanger");
    }
  }

  function handleReplay() {
    setIsPlaying(true);
    if (masterVideoUrl) {
      setStage("master");
    } else {
      setShotIndex(0);
      setStage("title");
    }
  }

  function handleSelectShot(idx: number) {
    setIsPlaying(true);
    setStage("shot");
    setShotIndex(idx);
  }

  // Active shot receipt data
  const activeReceiptId = currentShot?.evidence?.[0];
  const activeReceiptLine = activeReceiptId
    ? lineMap.get(activeReceiptId)
    : undefined;
  const activeReceiptTextEn = useMemo(() => {
    if (!currentShot || !activeReceiptId) return undefined;
    const found = (currentShot.receipts || []).find(
      (r) => r.line_id === activeReceiptId
    );
    return found?.text_en;
  }, [currentShot, activeReceiptId]);

  const lastShot = shots[shots.length - 1];
  const cliffhangerKeyframe = lastShot ? keyframes[lastShot.n] : undefined;

  return (
    <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
      {/* Hidden Audio Elements for Lyria 3 Sting, TTS Dub, and Narrator Voice Design */}
      {stingAudioUrl && (
        <audio ref={stingAudioRef} src={stingAudioUrl} loop muted={muted} />
      )}
      <audio ref={dubAudioRef} muted={muted} />
      {narratorAudioUrl && (
        <audio ref={narratorAudioRef} src={narratorAudioUrl} muted={muted} />
      )}

      {/* Top Premiere Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStoryboard}
            className="px-3 py-1.5 rounded-xs bg-[#141417] border border-white/15 hover:border-white/35 text-xs font-mono-code text-[#F5F2EB] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>콘티/촬영장으로</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-xs bg-[#C8102E] text-white font-mono-code text-[11px] font-bold">
              PREMIERE SCREENING
            </span>
            <h1 className="font-drama-serif text-lg sm:text-xl font-extrabold text-[#F5F2EB]">
              《{script.title_ko}》{" "}
              <span className="text-xs font-mono-code text-[#D4B26A] font-normal">
                {script.title_en}
              </span>
            </h1>
          </div>
        </div>

        {/* Shot Stepper Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono-code text-xs">
          {masterVideoUrl && (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(true);
                setStage("master");
              }}
              className={`px-2.5 py-1 rounded-xs border cursor-pointer flex items-center gap-1 ${
                stage === "master"
                  ? "bg-[#C8102E] text-white border-[#C8102E] font-bold"
                  : "bg-[#141417] text-[#D4B26A] border-[#D4B26A]/40 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>MASTER CUT</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsPlaying(true);
              setStage("title");
            }}
            className={`px-2.5 py-1 rounded-xs border cursor-pointer ${
              stage === "title"
                ? "bg-[#D4B26A] text-[#0B0B0C] border-[#D4B26A] font-bold"
                : "bg-[#141417] text-[#9A968E] border-white/10 hover:text-white"
            }`}
          >
            TITLE
          </button>

          {shots.map((sh, i) => (
            <button
              key={sh.n}
              type="button"
              onClick={() => handleSelectShot(i)}
              className={`px-2.5 py-1 rounded-xs border cursor-pointer ${
                stage === "shot" && shotIndex === i
                  ? "bg-[#C8102E] text-white border-[#C8102E] font-bold"
                  : "bg-[#141417] text-[#9A968E] border-white/10 hover:text-white"
              }`}
            >
              S{sh.n}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setIsPlaying(true);
              setStage("cliffhanger");
            }}
            className={`px-2.5 py-1 rounded-xs border cursor-pointer ${
              stage === "cliffhanger"
                ? "bg-[#D4B26A] text-[#0B0B0C] border-[#D4B26A] font-bold"
                : "bg-[#141417] text-[#9A968E] border-white/10 hover:text-white"
            }`}
          >
            ENDING
          </button>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="ml-2 p-1.5 rounded-xs bg-[#141417] border border-white/15 text-[#F5F2EB] cursor-pointer"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#C8102E]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#D4B26A]" />
            )}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-2.5 py-1 rounded-xs bg-[#141417] border border-white/15 text-[#F5F2EB] hover:border-[#D4B26A] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>처음부터</span>
          </button>

          {masterVideoUrl && (
            <a
              href={masterVideoUrl}
              download={`makjang_${session.runId.slice(0, 8)}.mp4`}
              className="px-2.5 py-1 rounded-xs bg-[#D4B26A]/15 border border-[#D4B26A]/50 text-[#D4B26A] hover:bg-[#D4B26A]/25 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP4 저장</span>
            </a>
          )}
        </div>
      </div>

      {/* 2.39:1 / 16:9 Letterbox Cinema Viewport */}
      <div className="relative w-full aspect-video rounded-sm bg-[#0B0B0C] border border-[#D4B26A]/35 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden select-none">
        {/* Top Letterbox Matte Bar with Broadcast Rating Badge */}
        <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/95 via-black/60 to-transparent z-20 px-5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#C8102E] text-white font-mono-code text-[11px] font-extrabold flex items-center justify-center border border-white/30">
              19
            </span>
            <span className="font-mono-code text-[11px] tracking-widest text-[#D4B26A] uppercase">
              MAKJANG ORIGINAL SERIES · 특별 기획 드라마 예고편
            </span>
          </div>

          <div className="font-mono-code text-[11px] text-[#F5F2EB]/70">
            {stage === "master" && "ARGON MASTER CUT · FULL TRAILER"}
            {stage === "title" && "OPENING TITLE"}
            {stage === "shot" &&
              currentShot &&
              `SHOT ${currentShot.n}/5 · ${currentShot.trope_id}`}
            {stage === "cliffhanger" && "NEXT EPISODE CLIFFHANGER"}
          </div>
        </div>

        {/* STAGE 0: ARGON MASTER CUT */}
        {stage === "master" && masterVideoUrl && (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <video
              key={masterVideoUrl}
              src={masterVideoUrl}
              autoPlay
              controls
              playsInline
              muted={muted}
              className="w-full h-full object-contain"
            />
            {editPlan?.overall_edit_summary_ko && (
              <div className="absolute bottom-14 left-5 z-20 max-w-xl px-3 py-1.5 rounded-xs bg-black/75 border border-[#D4B26A]/40 text-[11px] text-[#D4B26A] pointer-events-none">
                <span className="font-mono-code font-bold mr-1.5">
                  [ARGON EDIT]
                </span>
                <span>{editPlan.overall_edit_summary_ko}</span>
              </div>
            )}
          </div>
        )}

        {/* STAGE 1: OPENING TITLE CARD */}
        {stage === "title" && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-8 relative bg-[radial-gradient(circle_at_center,rgba(200,16,46,0.22),#0B0B0C_72%)]">
            <div className="makjang-crash-zoom space-y-4 max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs border border-[#D4B26A]/50 bg-black/60 text-xs font-mono-code text-[#D4B26A]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>실제 카카오톡 단톡방 영수증 기반 막장 드라마</span>
              </div>

              <h2 className="font-drama-serif text-4xl sm:text-6xl font-black text-[#F5F2EB] tracking-tight drop-shadow-[0_4px_24px_rgba(200,16,46,0.8)]">
                《{script.title_ko}》
              </h2>

              <p className="font-mono-code text-base sm:text-xl text-[#D4B26A] font-semibold">
                {script.title_en}
              </p>

              <p className="text-sm sm:text-base text-[#F5F2EB]/90 max-w-2xl mx-auto pt-2 leading-relaxed">
                {script.logline_ko}
              </p>
              {script.logline_en && (
                <p className="text-xs sm:text-sm text-[#9A968E] italic max-w-2xl mx-auto">
                  {script.logline_en}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStage("shot");
                setShotIndex(0);
              }}
              className="absolute bottom-6 right-6 z-30 px-3.5 py-1.5 rounded-xs bg-black/75 border border-white/20 hover:border-[#D4B26A] text-xs font-mono-code text-[#F5F2EB] flex items-center gap-1.5 cursor-pointer"
            >
              <span>본편 재생</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STAGE 2: 5 TRAILER SHOTS */}
        {stage === "shot" && currentShot && (
          <div className="w-full h-full relative">
            {videos[currentShot.n] ? (
              <video
                key={videos[currentShot.n]}
                ref={videoRef}
                src={videos[currentShot.n]}
                poster={keyframes[currentShot.n]}
                autoPlay
                playsInline
                muted={muted || Boolean(shotDubs[currentShot.n])}
                onEnded={advanceFromCurrentShot}
                className={`w-full h-full object-cover ${
                  currentShot.camera_type === "shock_zoom"
                    ? "makjang-crash-zoom"
                    : ""
                }`}
              />
            ) : keyframes[currentShot.n] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={keyframes[currentShot.n]}
                src={keyframes[currentShot.n]}
                alt={`Shot ${currentShot.n}`}
                className="w-full h-full object-cover makjang-crash-zoom"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0B0B0C]">
                <Film className="w-10 h-10 text-[#D4B26A] animate-pulse" />
              </div>
            )}

            {/* Floating Torn-Paper KakaoTalk Receipt Overlay (Top-Right) */}
            {activeReceiptId && (
              <div className="absolute top-14 right-5 z-20 max-w-xs sm:max-w-sm">
                <div className="torn-receipt px-3.5 py-2.5 rounded-b-sm shadow-2xl border border-black/20">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono-code text-[#8A1022] font-bold border-b border-black/15 pb-1 mb-1">
                    <span>KAKAOTALK RECEIPT #{String(activeReceiptId).padStart(3, "0")}</span>
                    <span>{activeReceiptLine?.date || ""}</span>
                  </div>
                  {activeReceiptLine && (
                    <p className="text-xs font-bold text-neutral-900 leading-snug">
                      {activeReceiptLine.user}: “{activeReceiptLine.text}”
                    </p>
                  )}
                  {activeReceiptTextEn && (
                    <p className="text-[11px] text-neutral-700 italic leading-snug mt-0.5">
                      “{activeReceiptTextEn}”
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cinema Broadcast Lower-Third Subtitle Box (Korean + English for Foreign Judges) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-12 pb-6 px-6 sm:px-12 z-20 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xs bg-[#C8102E] text-white font-mono-code text-[11px] font-bold mb-2">
                <span>{currentShot.speaker}</span>
                <span className="opacity-75">· {currentShot.trope_id}</span>
                {shotDubs[currentShot.n] && (
                  <span className="px-1.5 py-0.2 bg-black/40 rounded-xs text-[10px] text-[#FEE500]">
                    TTS DUB
                  </span>
                )}
              </div>

              <p className="font-drama-serif text-xl sm:text-3xl md:text-4xl font-extrabold text-[#F5F2EB] tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                “{currentShot.line_ko}”
              </p>

              {currentShot.line_en && (
                <p className="mt-1.5 text-sm sm:text-base md:text-lg font-medium text-[#D4B26A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  “{currentShot.line_en}”
                </p>
              )}
            </div>

            {/* Manual Next Shot Button */}
            <button
              type="button"
              onClick={advanceFromCurrentShot}
              className="absolute bottom-5 right-5 z-30 px-3 py-1.5 rounded-xs bg-black/70 border border-white/20 hover:border-[#D4B26A] text-xs font-mono-code text-[#F5F2EB] flex items-center gap-1 cursor-pointer"
            >
              <span>다음 컷</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STAGE 3: ENDING CLIFFHANGER FREEZE-FRAME */}
        {stage === "cliffhanger" && (
          <div className="w-full h-full relative flex items-center justify-center">
            {cliffhangerKeyframe && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cliffhangerKeyframe}
                alt="Cliffhanger Freeze Frame"
                className="absolute inset-0 w-full h-full object-cover cliffhanger-freeze opacity-55"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/80" />

            <div className="relative z-20 max-w-3xl mx-auto px-6 text-center space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-wordmark.png"
                alt="막장톡"
                className="w-[180px] sm:w-[220px] h-auto mx-auto select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
              />

              <p className="font-drama-serif text-xl sm:text-3xl font-extrabold text-[#F5F2EB] leading-snug drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                “{script.narrator_ko}”
              </p>

              {script.narrator_en && (
                <p className="text-sm sm:text-base text-[#D4B26A] italic">
                  “{script.narrator_en}”
                </p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="font-drama-serif text-xl sm:text-2xl font-black text-[#D4B26A] tracking-widest border-y border-[#D4B26A]/50 py-1.5 px-6">
                  다음 이 시간…
                </div>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="px-5 py-2.5 rounded-sm bg-[#C8102E] hover:bg-[#e01234] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>예고편 다시 보기 (Replay)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cast Strip + Receipts & Verifier Audit Drawer */}
      <ReceiptsDrawer
        script={script}
        lines={session.lines}
        verifierLog={verifierLog}
        activeShotIndex={stage === "shot" ? shotIndex : null}
        onSelectShot={handleSelectShot}
      />

      {/* Character Sheets Gallery */}
      {Object.keys(characterSheets).length > 0 && (
        <div className="rounded-sm bg-[#141417] border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-drama-serif text-sm font-bold text-[#F5F2EB]">
              출연 배우 프로필 시트 (Cast Reference Sheets)
            </span>
            <span className="text-xs font-mono-code text-[#9A968E]">
              NANO BANANA 2.1 CHARACTER LOCK
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(script.cast || []).map((c) => (
              <div
                key={c.chat_name}
                className="rounded-xs bg-[#0B0B0C] border border-white/10 overflow-hidden flex items-center gap-2.5 p-2"
              >
                {characterSheets[c.chat_name] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={characterSheets[c.chat_name]}
                    alt={c.role_name}
                    className="w-12 h-16 object-cover rounded-xs shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F5F2EB] truncate">
                    {c.role_name}
                  </div>
                  <div className="text-[10px] font-mono-code text-[#D4B26A] truncate">
                    {c.chat_name}
                  </div>
                  <div className="text-[10px] text-[#9A968E] truncate">
                    {c.archetype}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
