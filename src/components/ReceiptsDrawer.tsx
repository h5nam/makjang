"use client";

import React, { useMemo } from "react";
import {
  ChatLine,
  ShowrunnerJSON,
  VerifierResult,
} from "@/lib/types";
import { ReceiptCard } from "./ReceiptCard";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Film,
} from "lucide-react";

interface ReceiptsDrawerProps {
  script: ShowrunnerJSON;
  lines: ChatLine[];
  verifierLog: VerifierResult[];
  activeShotIndex: number | null;
  onSelectShot: (shotIdx: number) => void;
}

export function ReceiptsDrawer({
  script,
  lines,
  verifierLog,
  activeShotIndex,
  onSelectShot,
}: ReceiptsDrawerProps) {
  const lineMap = useMemo(() => {
    const map = new Map<number, ChatLine>();
    for (const l of lines) map.set(l.id, l);
    return map;
  }, [lines]);

  const v1Count = verifierLog.filter((v) => v.stage.startsWith("v1_")).length;
  const v2Count = verifierLog.filter((v) => v.stage === "v2_vision").length;
  const v3Count = verifierLog.filter((v) => v.stage === "v3_audio").length;
  const v4Count = verifierLog.filter((v) => v.stage === "v4_edit").length;

  return (
    <div className="rounded-sm bg-[#141417] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#191919] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#D4B26A]" />
          <h2 className="font-drama-serif text-base font-bold text-[#F5F2EB]">
            단톡방 원본 영수증 & 4단계 검증·편집 감사 기록 (Chat Receipts & Verifier Audit)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-code">
          <span className="px-2 py-0.5 rounded-xs bg-[#2E9B68]/20 text-[#2E9B68] font-bold">
            V1 대본검증 ({v1Count})
          </span>
          <span className="px-2 py-0.5 rounded-xs bg-[#2E9B68]/20 text-[#2E9B68] font-bold">
            V2 비전검증 ({v2Count})
          </span>
          <span className="px-2 py-0.5 rounded-xs bg-[#2E9B68]/20 text-[#2E9B68] font-bold">
            V3 음성검증 ({v3Count})
          </span>
          {v4Count > 0 && (
            <span className="px-2 py-0.5 rounded-xs bg-[#D4B26A]/25 text-[#D4B26A] font-bold">
              V4 Argon 컷편집 ({v4Count})
            </span>
          )}
        </div>
      </div>

      {/* 5-Shot Receipts Grid */}
      <div className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {(script.shots || []).map((shot, idx) => {
            const isSelected = activeShotIndex === idx;
            const receiptMap = new Map<number, string>();
            for (const r of shot.receipts || []) {
              receiptMap.set(r.line_id, r.text_en);
            }

            return (
              <div
                key={shot.n}
                onClick={() => onSelectShot(idx)}
                className={`p-3.5 rounded-sm border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-[#0B0B0C] border-[#D4B26A] ring-1 ring-[#D4B26A]"
                    : "bg-[#0B0B0C]/80 border-white/10 hover:border-white/25"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono-code">
                    <span className="text-[#D4B26A] font-bold flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      SHOT #{shot.n} · {shot.trope_id}
                    </span>
                    <span className="text-[#9A968E]">{shot.speaker}</span>
                  </div>

                  <p className="font-drama-serif text-xs font-bold text-[#F5F2EB] leading-snug">
                    “{shot.line_ko}”
                  </p>
                  {shot.line_en && (
                    <p className="text-[11px] text-[#D4B26A]/90 italic leading-snug">
                      “{shot.line_en}”
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {(shot.evidence || []).map((lineId) => (
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
            );
          })}
        </div>

        {/* Full Verifier Log */}
        {verifierLog.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono-code text-[#D4B26A]">
              <ShieldCheck className="w-4 h-4" />
              <span>AUTONOMOUS SELF-CORRECTION LOG (VERIFIERS #1, #2, #3)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono-code text-xs">
              {verifierLog.map((item) => {
                const isResolved = item.detail.includes("⚠ → ✅");
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xs border ${
                      isResolved
                        ? "bg-[#2E9B68]/15 border-[#2E9B68]"
                        : "bg-[#0B0B0C] border-white/10"
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
                          ⚠ WARN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#F5F2EB]/85 leading-snug">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
