// app/api/cron/daily-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendDailyReport } from "../../../../../lib/daily-report";

export async function GET(req: NextRequest) {
  try {
    // Verify this is from Vercel cron
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ CRON: Daily report job started at 8 AM");

    const result = await sendDailyReport();

    if (result.success) {
      console.log("✅ CRON: Daily report sent successfully");
      return NextResponse.json({
        message: "Daily report sent via cron",
        data: {
          offlineCount: result.offlineCount,
          dateErrorCount: result.dateErrorCount,
          totalCount: result.totalCount,
        },
      });
    } else {
      console.error("❌ CRON: Failed to send daily report");
      return NextResponse.json(
        { error: "Cron job failed", details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ CRON: Daily report error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
