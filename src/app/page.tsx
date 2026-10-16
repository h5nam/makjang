"use client";

import React, { useEffect, useState } from "react";
import { ParsedSessionData } from "@/components/LandingUpload";
import { MakjangLanding } from "@/components/landing/MakjangLanding";
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

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLanding = step === "upload";

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#0B0B0C] text-[#F5F5F5]">
      {/* Header (64px, transparent over hero on landing, solid --ink after scroll or inside flow) */}
      {!isLanding && (
      <header
        className={`w-full h-16 px-5 sm:px-8 flex items-center justify-between transition-colors duration-300 z-40 ${
          isLanding ? "fixed top-0 inset-x-0" : "sticky top-0"
        } ${
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
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-symbol.png"
            alt="막장톡"
            className="w-7 h-7 object-contain shrink-0"
          />
          <span className="font-drama-serif text-[20px] font-extrabold tracking-tight text-[#D4B26A] group-hover:opacity-90 transition-opacity">
            막장톡
          </span>
        </button>

        {isLanding ? (
          <a
            href="#how-its-built"
            className="text-[14px] text-[#A3A3A3] hover:text-[#D4B26A] transition-colors font-mono-code px-3 py-1.5 rounded-[4px] border border-transparent hover:border-[#2A2A2E]"
          >
            How it&apos;s built
          </a>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-code">
            <span className="text-[#A3A3A3] hidden sm:inline">1. UPLOAD</span>
            <span className="text-white/20 hidden sm:inline">→</span>
            <span
              className={`px-2 py-0.5 rounded-[4px] ${
                step === "consent"
                  ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                  : "text-[#A3A3A3]"
              }`}
            >
              2. CAST & CONSENT
            </span>
            <span className="text-white/20">→</span>
            <span
              className={`px-2 py-0.5 rounded-[4px] ${
                step === "writers_room"
                  ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                  : "text-[#A3A3A3]"
              }`}
            >
              3. WRITERS&apos; ROOM
            </span>
            <span className="text-white/20">→</span>
            <span
              className={`px-2 py-0.5 rounded-[4px] ${
                step === "approve"
                  ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                  : "text-[#A3A3A3]"
              }`}
            >
              4. STORYBOARD
            </span>
            <span className="text-white/20">→</span>
            <span
              className={`px-2 py-0.5 rounded-[4px] ${
                step === "premiere"
                  ? "bg-[#C8102E] text-white font-bold"
                  : "text-[#A3A3A3]"
              }`}
            >
              5. PREMIERE
            </span>
          </div>
        )}
      </header>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {step === "upload" && (
          <MakjangLanding
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

      {/* In-Flow Footer (Landing has its own S6 Judge & Brand Footer) */}
      {!isLanding && (
        <footer className="border-t border-[#2A2A2E] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#A3A3A3] font-mono-code gap-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-symbol.png"
              alt="막장톡"
              className="w-4 h-4 object-contain"
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
