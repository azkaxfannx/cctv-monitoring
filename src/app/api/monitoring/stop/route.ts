import { NextRequest, NextResponse } from "next/server";
import { continuousMonitor } from "../../../../../lib/continuous-monitoring";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    continuousMonitor.forceStop();

    return NextResponse.json({
      message: "Monitoring force stopped",
      state: continuousMonitor.getState(),
    });
  } catch (error) {
    console.error("[FORCE STOP ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to force stop" },
      { status: 500 }
    );
  }
}
