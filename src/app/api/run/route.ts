import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/store";
import { startWritersRoomPipeline } from "@/lib/pipeline";
import { MemberConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      runId,
      passcode,
      members,
      style,
      genre,
      excludedTopics,
      autoApprove,
      quality,
    } = body as {
      runId: string;
      passcode: string;
      members?: MemberConfig[];
      style?: "live" | "webtoon";
      genre?: "modern" | "rofan";
      excludedTopics?: string[];
      autoApprove?: boolean;
      quality?: "draft" | "final";
    };

    const expectedPasscode = process.env.DEMO_PASSCODE || "makjang";
    if (!passcode || passcode.trim() !== expectedPasscode) {
      return NextResponse.json(
        { error: "데모 패스코드가 올바르지 않습니다." },
        { status: 403 }
      );
    }

    const run = getRun(runId);
    if (!run) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다. 다시 대화를 불러와 주세요." },
        { status: 404 }
      );
    }

    if (Array.isArray(members) && members.length > 0) {
      // Preserve any selfieId uploaded via mobile audition if not explicitly detached
      run.members = members.map((incoming) => {
        const existing = run.members.find((m) => m.name === incoming.name);
        return {
          ...incoming,
          selfieId:
            incoming.selfieId === undefined ? existing?.selfieId : incoming.selfieId || undefined,
        };
      });
    }

    if (style === "live" || style === "webtoon") {
      run.style = style;
    }
    if (genre === "modern" || genre === "rofan") {
      run.genre = genre;
    }
    if (Array.isArray(excludedTopics)) {
      run.excludedTopics = excludedTopics;
    }
    if (typeof autoApprove === "boolean") {
      run.autoApprove = autoApprove;
    }
    if (quality === "draft" || quality === "final") {
      run.quality = quality;
    }

    // Fire Writers' Room pipeline asynchronously
    void startWritersRoomPipeline(run.id);

    return NextResponse.json({
      ok: true,
      runId: run.id,
      status: "writers_room",
      genre: run.genre || "modern",
    });
  } catch (err: any) {
    console.error("Run API error:", err);
    return NextResponse.json(
      { error: err?.message || "드라마 제작 시작 실패" },
      { status: 500 }
    );
  }
}
