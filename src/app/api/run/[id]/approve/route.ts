import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/store";
import { startShootingPipeline } from "@/lib/pipeline";
import { ShotSpec } from "@/lib/types";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const run = getRun(id);
    if (!run || !run.script) {
      return NextResponse.json(
        { error: "진행 중인 대본 세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { shots, quality, keyframesOnly } = body as {
      shots?: ShotSpec[];
      quality?: "draft" | "final";
      keyframesOnly?: boolean;
    };

    if (Array.isArray(shots) && shots.length > 0) {
      run.script.shots = shots;
    }
    if (quality === "draft" || quality === "final") {
      run.quality = quality;
    }

    void startShootingPipeline(run.id, {
      keyframesOnly: Boolean(keyframesOnly),
    });

    return NextResponse.json({
      ok: true,
      runId: run.id,
      status: "shooting",
    });
  } catch (err: any) {
    console.error("Approve API error:", err);
    return NextResponse.json(
      { error: err?.message || "촬영 시작 실패" },
      { status: 500 }
    );
  }
}
