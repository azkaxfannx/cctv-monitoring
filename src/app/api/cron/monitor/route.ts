import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { monitorCameraWithSocket } from "../../../../../lib/monitoring";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting camera monitoring with WebSocket...");

    const cameras = await prisma.camera.findMany();

    if (cameras.length === 0) {
      console.log("[CRON] No cameras to monitor");
      return NextResponse.json({ message: "No cameras", count: 0 });
    }

    const results = await Promise.allSettled(
      cameras.map((camera) => monitorCameraWithSocket(camera))
    );

    let succeeded = 0;
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        succeeded++;
      } else {
        failed++;
        console.error(`[CRON] ✗ ${cameras[index].name} failed:`, result.reason);
      }
    });

    console.log(`[CRON] Completed: ${succeeded} success, ${failed} failed`);

    return NextResponse.json({
      message: "Monitoring completed",
      total: cameras.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return NextResponse.json({ error: "Monitoring failed" }, { status: 500 });
  }
}
