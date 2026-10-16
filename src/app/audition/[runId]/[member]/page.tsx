"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, CheckCircle2, Sparkles, Upload } from "lucide-react";

export default function AuditionPage() {
  const params = useParams<{ runId: string; member: string }>();
  const runId = params?.runId || "";
  const memberName = decodeURIComponent(params?.member || "");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [roomTitle, setRoomTitle] = useState<string>("단톡방 막장드라마");
  const [alias, setAlias] = useState<string>(memberName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !memberName) return;
    fetch(`/api/audition/${runId}/${encodeURIComponent(memberName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.roomTitle) setRoomTitle(data.roomTitle);
        if (data.member?.alias) setAlias(data.member.alias);
        if (data.selfieUrl) setPreviewUrl(data.selfieUrl);
      })
      .catch(() => {
        // ignore
      });
  }, [runId, memberName]);

  async function compressAndUpload(file: File) {
    setError(null);
    setUploading(true);
    setUploaded(false);
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1024;
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(bitmap, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setPreviewUrl(dataUrl);

      const res = await fetch(
        `/api/audition/${runId}/${encodeURIComponent(memberName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType: "image/jpeg",
            alias,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setUploaded(true);
    } catch (err: any) {
      setError(err?.message || "셀카 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F5F2EB] flex flex-col justify-between p-6 max-w-md mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E] animate-pulse" />
            <span className="font-drama-serif font-extrabold text-base text-[#F5F2EB]">
              막장 <span className="text-[#D4B26A]">CAST AUDITION</span>
            </span>
          </div>
          <span className="text-xs font-mono-code text-[#9A968E]">
            #{runId}
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="px-2 py-0.5 rounded-xs bg-[#FEE500] text-[#191919] font-mono-code text-[11px] font-bold">
            {roomTitle}
          </span>
          <h1 className="font-drama-serif text-2xl font-extrabold text-[#F5F2EB] pt-1">
            <span className="text-[#D4B26A]">{memberName}</span> 님의 주연 배우 오디션
          </h1>
          <p className="text-xs text-[#9A968E] leading-relaxed">
            셀카 1장을 찍거나 올리면 <strong className="text-[#F5F2EB]">Nano Banana 2.1</strong>이 본인과 닮은 K-드라마 주연 캐릭터 시트로 즉시 변신시킵니다.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono-code text-[#D4B26A]">
            극중 배역 가명 (Role Alias)
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="w-full px-3 py-2.5 rounded-sm bg-[#141417] border border-white/15 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4B26A]"
          />
        </div>

        {/* Selfie Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-sm bg-[#141417] border-2 border-dashed border-[#D4B26A]/50 hover:border-[#D4B26A] p-6 text-center space-y-3 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) compressAndUpload(f);
            }}
          />

          {previewUrl ? (
            <div className="w-40 h-52 mx-auto rounded-sm overflow-hidden border border-[#D4B26A] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={memberName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#D4B26A]/15 border border-[#D4B26A]/40 flex items-center justify-center mx-auto text-[#D4B26A]">
              <Camera className="w-8 h-8" />
            </div>
          )}

          <div>
            <div className="font-drama-serif text-base font-bold text-[#F5F2EB]">
              {uploading
                ? "셀카 전송 중..."
                : previewUrl
                ? "다른 셀카로 다시 찍기"
                : "카메라로 셀카 촬영 / 사진 선택"}
            </div>
            <p className="text-xs font-mono-code text-[#9A968E] mt-1">
              촬영 즉시 메인 스크린의 캐스팅 보드에 반영됩니다
            </p>
          </div>
        </div>

        {uploaded && (
          <div className="p-4 rounded-sm bg-[#2E9B68]/20 border border-[#2E9B68] text-xs text-[#F5F2EB] flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#2E9B68] shrink-0" />
            <div>
              <div className="font-bold">오디션 셀카 등록 완료!</div>
              <div className="text-[#9A968E]">
                메인 화면에서 내 캐릭터 시트가 생성되는 모습을 확인하세요.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-sm bg-[#C8102E]/20 border border-[#C8102E] text-xs text-[#F5F2EB]">
            {error}
          </div>
        )}
      </div>

      <footer className="pt-8 text-center text-[11px] font-mono-code text-[#9A968E] flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#D4B26A]" />
        <span>MAKJANG MOBILE AUDITION · ZERO DB RETENTION</span>
      </footer>
    </main>
  );
}
