import { NextRequest, NextResponse } from "next/server";
import { emitRunEvent, getRun, saveMedia } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ runId: string; member: string }> }
) {
  const { runId, member } = await context.params;
  const decodedMember = decodeURIComponent(member);
  const run = getRun(runId);

  if (!run) {
    return NextResponse.json(
      { error: "오디션 세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const memberCfg = run.members.find((m) => m.name === decodedMember);
  if (!memberCfg) {
    return NextResponse.json(
      { error: "해당 출연자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    runId: run.id,
    roomTitle: run.roomTitle,
    member: memberCfg,
    selfieUrl: memberCfg.selfieId ? `/api/media/${memberCfg.selfieId}` : null,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ runId: string; member: string }> }
) {
  try {
    const { runId, member } = await context.params;
    const decodedMember = decodeURIComponent(member);
    const run = getRun(runId);

    if (!run) {
      return NextResponse.json(
        { error: "오디션 세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const memberCfg = run.members.find((m) => m.name === decodedMember);
    if (!memberCfg) {
      return NextResponse.json(
        { error: "해당 출연자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType, alias } = body as {
      imageBase64: string;
      mimeType?: string;
      alias?: string;
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: "셀카 이미지 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const cleanedB64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(cleanedB64, "base64");
    const mediaId = saveMedia(buf, mimeType || "image/jpeg");

    memberCfg.selfieId = mediaId;
    memberCfg.included = true;
    if (alias && alias.trim()) {
      memberCfg.alias = alias.trim();
    }

    // Clear any cached character sheet so it regenerates with the new selfie
    delete run.characterSheets[decodedMember];

    const selfieUrl = `/api/media/${mediaId}`;
    emitRunEvent(run, {
      type: "audition_selfie",
      member: decodedMember,
      selfieUrl,
    });

    return NextResponse.json({
      ok: true,
      member: decodedMember,
      selfieId: mediaId,
      selfieUrl,
    });
  } catch (err: any) {
    console.error("Audition selfie upload error:", err);
    return NextResponse.json(
      { error: err?.message || "셀카 업로드 실패" },
      { status: 500 }
    );
  }
}
