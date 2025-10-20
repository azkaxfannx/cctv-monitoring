// app/api/daily-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendDailyReport } from "../../../../lib/daily-report";

export async function POST(req: NextRequest) {
  try {
    // Authorization check
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Manual daily report triggered");

    const result = await sendDailyReport();

    if (result.success) {
      return NextResponse.json({
        message: "Daily report sent successfully",
        data: {
          offlineCount: result.offlineCount,
          dateErrorCount: result.dateErrorCount,
          totalCount: result.totalCount,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send daily report", details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Daily report API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET untuk test manual
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🧪 Testing daily report manually");

    const result = await sendDailyReport();

    if (result.success) {
      return NextResponse.json({
        message: "Test daily report sent successfully",
        data: {
          offlineCount: result.offlineCount,
          dateErrorCount: result.dateErrorCount,
          totalCount: result.totalCount,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Test failed", details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Daily report test error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
