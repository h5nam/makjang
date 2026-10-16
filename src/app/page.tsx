export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#0B0B0C] text-[#F5F5F5] px-6 py-8 md:px-14 md:py-12 relative overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#2A2A2E] pb-4 z-10">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-[#C8102E]" />
          <span className="font-mono-receipt text-xs uppercase tracking-widest text-[#8C7647]">
            MAKJANG STUDIO · EPISODE 1 PREMIERE ENGINE
          </span>
        </div>
        <span className="font-mono-receipt text-xs text-[#A3A3A3]">
          GEMINI 4 ARGON × OMNI 1.1 FLASH
        </span>
      </header>

      <section className="my-auto max-w-4xl z-10 py-12">
        <p className="font-impact text-sm md:text-base tracking-widest text-[#C8102E] mb-4 uppercase">
          제1화 예고편 제작소 · YOUR GROUP CHAT, REMADE AS A K-DRAMA
        </p>
        <h1
          className="font-drama font-extrabold text-[#D4B26A] leading-[1.08] mb-6"
          style={{ fontSize: "clamp(2.75rem, 6vw, 5.25rem)" }}
        >
          당신의 단톡방은
          <br />
          이미 막장드라마다.
        </h1>
        <p className="text-[#A3A3A3] text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          사라진 모임통장 삼만 원, 강남역 목격담, 아무도 기억 못 한 생일. 카카오톡 대화 내보내기 파일을 올리면
          Gemini 4 Argon 쇼러너가 대화 전체를 읽고 실제 메시지 영수증(Receipt)이 박힌 K-막장 예고편을 연출합니다.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="px-6 py-3.5 rounded-[4px] bg-[#FEE500] text-[#191919] font-semibold text-base tracking-tight hover:brightness-95 transition cursor-pointer"
          >
            단톡방 올리기 (.csv / .txt)
          </button>
          <span className="font-mono-receipt text-xs text-[#8C7647]">
            3단계 검수 루프 (근거 · 비전 일관성 · 대사 CER) 실시간 작동
          </span>
        </div>
      </section>

      <footer className="border-t border-[#2A2A2E] pt-4 flex flex-wrap items-center justify-between text-xs font-mono-receipt text-[#8C7647] z-10">
        <span>ALL EVIDENCE GROUNDED IN REAL CHAT LINES (L1..Ln)</span>
        <span>NO CHAT PERSISTED · SYNTHID WATERMARKED</span>
      </footer>
    </main>
  );
}
