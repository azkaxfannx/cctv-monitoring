// app/api/monitoring/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { continuousMonitor } from "../../../../../lib/continuous-monitoring";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interval = 1000 } = await req.json();

    await continuousMonitor.start(interval);

    return NextResponse.json({
      message: "Continuous monitoring started",
      interval,
      state: continuousMonitor.getState(),
    });
  } catch (error) {
    console.error("[START MONITOR ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to start monitoring" },
      { status: 500 }
    );
  }
}
