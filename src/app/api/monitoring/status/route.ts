// app/api/monitoring/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { continuousMonitor } from "../../../../../lib/continuous-monitoring";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      state: continuousMonitor.getState(),
    });
  } catch (error) {
    console.error("[STATUS MONITOR ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
