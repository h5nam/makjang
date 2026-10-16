"use client";

import React, { useState } from "react";
import { LandingUpload, ParsedSessionData } from "@/components/LandingUpload";
import { CastConsent } from "@/components/CastConsent";
import { WritersRoom } from "@/components/WritersRoom";

type Step = "upload" | "consent" | "writers_room";

export default function HomePage() {
  const [step, setStep] = useState<Step>("upload");
  const [session, setSession] = useState<ParsedSessionData | null>(null);

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#0B0B0C] text-[#F5F2EB]">
      {/* Top Broadcast Header */}
      <header className="w-full border-b border-white/10 px-6 py-3.5 flex items-center justify-between bg-[#0B0B0C]/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep("upload")}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C8102E] animate-pulse" />
            <span className="font-drama-serif text-lg font-extrabold tracking-tight text-[#F5F2EB]">
              막장 <span className="text-[#D4B26A]">MAKJANG</span>
            </span>
          </button>
          <span className="hidden sm:inline-block text-xs font-mono-code text-[#9A968E] border-l border-white/15 pl-3">
            YOUR GROUP CHAT, REMADE AS A K-DRAMA
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-code">
          <span
            className={`px-2 py-0.5 rounded-xs ${
              step === "upload"
                ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                : "text-[#9A968E]"
            }`}
          >
            1. UPLOAD
          </span>
          <span className="text-white/20">→</span>
          <span
            className={`px-2 py-0.5 rounded-xs ${
              step === "consent"
                ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                : "text-[#9A968E]"
            }`}
          >
            2. CAST & CONSENT
          </span>
          <span className="text-white/20">→</span>
          <span
            className={`px-2 py-0.5 rounded-xs ${
              step === "writers_room"
                ? "bg-[#D4B26A] text-[#0B0B0C] font-bold"
                : "text-[#9A968E]"
            }`}
          >
            3. WRITERS&apos; ROOM
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {step === "upload" && (
          <LandingUpload
            onParsed={(data) => {
              setSession(data);
              setStep("consent");
            }}
          />
        )}

        {step === "consent" && session && (
          <CastConsent
            session={session}
            onBack={() => setStep("upload")}
            onStarted={() => {
              setStep("writers_room");
            }}
          />
        )}

        {step === "writers_room" && session && (
          <WritersRoom
            session={session}
            onProceedToApproveOrPremiere={() => {
              // Milestone 3 will transition to ScriptApprove / Premiere
            }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9A968E] font-mono-code gap-2">
        <span>
          MAKJANG · K-DRAMA TRAILER GENERATOR WITH CHAT RECEIPTS
        </span>
        <span>
          GEMINI 4 ARGON · NANO BANANA 2.1 · OMNI 1.1 FLASH · FLASH 3.8 TTS · LYRIA 3
        </span>
      </footer>
    </main>
  );
}
