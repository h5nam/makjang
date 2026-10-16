"use client";

import React from "react";
import { ChatLine } from "@/lib/types";

interface ReceiptCardProps {
  line?: ChatLine;
  lineId: number;
  textEn?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function ReceiptCard({
  line,
  lineId,
  textEn,
  compact = false,
  onClick,
}: ReceiptCardProps) {
  return (
    <div
      onClick={onClick}
      className={`torn-receipt rounded-b-sm transition-transform ${
        onClick ? "cursor-pointer hover:-translate-y-0.5" : ""
      } ${compact ? "px-3 py-2 text-xs" : "px-3.5 py-2.5 text-xs"}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-black/15 pb-1 mb-1.5 font-mono-code text-[11px] text-neutral-700">
        <span className="font-semibold text-[#8A1022]">
          RECEIPT #{String(lineId).padStart(3, "0")}
        </span>
        {line?.date && <span className="opacity-75">{line.date}</span>}
      </div>

      {line ? (
        <div className="space-y-1">
          <p className="text-neutral-900 font-medium leading-snug">
            <span className="font-bold text-black mr-1.5">{line.user}:</span>
            <span>“{line.text}”</span>
          </p>
          {textEn && (
            <p className="text-[11px] text-neutral-600 italic leading-snug border-t border-dashed border-black/10 pt-1">
              “{textEn}”
            </p>
          )}
        </div>
      ) : (
        <p className="text-neutral-700 font-mono-code">Line #{lineId}</p>
      )}
    </div>
  );
}
