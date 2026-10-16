"use client";

import React, { useEffect, useState } from "react";
import { ParsedSessionData } from "@/components/LandingUpload";
import { MakjangLanding, UILang } from "@/components/landing/MakjangLanding";
import { CastConsent } from "@/components/CastConsent";
import { WritersRoom } from "@/components/WritersRoom";
import { ScriptApprove } from "@/components/ScriptApprove";
import { PremierePlayer } from "@/components/PremierePlayer";
import { ArgonEditPlan, ShowrunnerJSON, VerifierResult } from "@/lib/types";

type Step = "upload" | "consent" | "writers_room" | "approve" | "premiere";

interface ProductionAssets {
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
}

export default function HomePage() {
  const [step, setStep] = useState<Step>("upload");
  const [session, setSession] = useState<ParsedSessionData | null>(null);
  const [assets, setAssets] = useState<ProductionAssets | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [uiLang, setUiLang] = useState<UILang>("ko");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qLang = params.get("lang");
      if (qLang === "en" || qLang === "ko") {
        setUiLang(qLang);
        window.localStorage.setItem("makjang_lang", qLang);
        return;
      }
      const saved = window.localStorage.getItem("makjang_lang");
      if (saved === "en" || saved === "ko") {
        setUiLang(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleLangChange(next: UILang) {
    setUiLang(next);
    try {
      window.localStorage.setItem("makjang_lang", next);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLanding = step === "upload";
  const isEn = uiLang === "en";

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#0B0B0C] text-[#F5F5F5]">
      {/* Header (64px, shown inside flow steps 2-5; landing has its own fixed header) */}
      {!isLanding && (
        <header
          className={`w-full h-16 px-5 sm:px-8 flex items-center justify-between transition-colors duration-300 z-40 sticky top-0 ${
            !isLanding || scrolled
              ? "bg-[#0B0B0C]/95 border-b border-[#2A2A2E] backdrop-blur-xs"
              : "bg-transparent border-b border-transparent"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setStep("upload");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-180.png?v=2"
              alt="막장톡"
              width={30}
              height={30}
              className="w-7.5 h-7.5 rounded-[6px] object-contain shrink-0 shadow-[0_4px_14px_rgba(200,16,46,0.35)]"
            />
            <span className="font-drama-serif text-[20px] font-extrabold tracking-tight text-[#F1DCA4] group-hover:opacity-90 transition-opacity">
              {isEn ? "MAKJANG TALK" : "막장톡"}
            </span>
            <span className="hidden sm:inline font-mono-code text-[11px] tracking-[0.14em] text-[#D4B26A] border-l border-[#D4B26A]/30 pl-2.5">
              {isEn ? "막장톡" : "MAKJANG TALK"}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-wrap items-center gap-1.5 text-[11px] font-mono-code">
              <span className="text-[#A3A3A3]">
                {isEn ? "1. UPLOAD" : "1. 단톡방"}
              </span>
              <span className="text-white/20">→</span>
              <span
                className={`px-2 py-0.5 rounded-[4px] ${
                  step === "consent"
                    ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                    : "text-[#A3A3A3]"
                }`}
              >
                {isEn ? "2. CAST & CONSENT" : "2. 캐스팅·동의"}
              </span>
              <span className="text-white/20">→</span>
              <span
                className={`px-2 py-0.5 rounded-[4px] ${
                  step === "writers_room"
                    ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                    : "text-[#A3A3A3]"
                }`}
              >
                {isEn ? "3. WRITERS' ROOM" : "3. 작가실"}
              </span>
              <span className="text-white/20">→</span>
              <span
                className={`px-2 py-0.5 rounded-[4px] ${
                  step === "approve"
                    ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                    : "text-[#A3A3A3]"
                }`}
              >
                {isEn ? "4. STORYBOARD" : "4. 대본·콘티"}
              </span>
              <span className="text-white/20">→</span>
              <span
                className={`px-2 py-0.5 rounded-[4px] ${
                  step === "premiere"
                    ? "bg-[#C8102E] text-white font-bold"
                    : "text-[#A3A3A3]"
                }`}
              >
                {isEn ? "5. PREMIERE" : "5. 첫방 시사회"}
              </span>
            </div>

            {/* Header Language Toggle */}
            <div
              className="inline-flex items-center bg-white/[0.06] border border-[#D4B26A]/40 rounded-full p-0.5 gap-0.5 shrink-0"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => handleLangChange("ko")}
                className={`px-2.5 py-1 rounded-full font-mono-code text-[11px] font-bold tracking-wider cursor-pointer transition-colors ${
                  uiLang === "ko"
                    ? "bg-[#D4B26A] text-[#0B0B0C]"
                    : "text-[#F4F1EA]/70 hover:text-white"
                }`}
              >
                KO
              </button>
              <button
                type="button"
                onClick={() => handleLangChange("en")}
                className={`px-2.5 py-1 rounded-full font-mono-code text-[11px] font-bold tracking-wider cursor-pointer transition-colors ${
                  uiLang === "en"
                    ? "bg-[#D4B26A] text-[#0B0B0C]"
                    : "text-[#F4F1EA]/70 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {step === "upload" && (
          <MakjangLanding
            lang={uiLang}
            onLangChange={handleLangChange}
            onParsed={(data) => {
              setSession(data);
              setAssets(null);
              setStep("consent");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}

        {step === "consent" && session && (
          <CastConsent
            session={session}
            uiLang={uiLang}
            onBack={() => setStep("upload")}
            onStarted={() => {
              setStep("writers_room");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}

        {step === "writers_room" && session && (
          <WritersRoom
            session={session}
            onProceedToApproveOrPremiere={(state) => {
              setAssets(state);
              if (state.status === "premiere") {
                setStep("premiere");
              } else {
                setStep("approve");
              }
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}

        {step === "approve" && session && assets && (
          <ScriptApprove
            session={session}
            initialScript={assets.script}
            initialSheets={assets.characterSheets}
            initialKeyframes={assets.keyframes}
            initialVideos={assets.videos}
            initialShotDubs={assets.shotDubs}
            initialNarratorUrl={assets.narratorAudioUrl}
            initialStingUrl={assets.stingAudioUrl}
            initialMasterVideoUrl={assets.masterVideoUrl}
            initialEditPlan={assets.editPlan}
            initialVerifierLog={assets.verifierLog}
            initialStatus={assets.status}
            onEnterPremiere={(finalState) => {
              setAssets({
                ...finalState,
                status: "premiere",
              });
              setStep("premiere");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}

        {step === "premiere" && session && assets && (
          <PremierePlayer
            session={session}
            initialScript={assets.script}
            initialSheets={assets.characterSheets}
            initialKeyframes={assets.keyframes}
            initialVideos={assets.videos}
            initialShotDubs={assets.shotDubs}
            initialNarratorUrl={assets.narratorAudioUrl}
            initialStingUrl={assets.stingAudioUrl}
            initialMasterVideoUrl={assets.masterVideoUrl}
            initialEditPlan={assets.editPlan}
            initialVerifierLog={assets.verifierLog}
            onBackToStoryboard={() => setStep("approve")}
          />
        )}
      </div>

      {/* In-Flow Footer */}
      {!isLanding && (
        <footer className="border-t border-[#2A2A2E] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#A3A3A3] font-mono-code gap-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-180.png?v=2"
              alt="막장톡"
              width={18}
              height={18}
              className="w-4.5 h-4.5 rounded-[3px] object-contain"
            />
            <span className="text-[#D4B26A] font-drama-serif font-extrabold">
              막장톡
            </span>
            <span>· MAKJANG TALK</span>
          </div>
          <span>
            GEMINI 4 ARGON · NANO BANANA 2.1 · OMNI 1.1 FLASH · 3.8 FLASH TTS · LYRIA 3
          </span>
        </footer>
      )}
    </main>
  );
}
