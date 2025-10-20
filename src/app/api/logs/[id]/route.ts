import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } // ← Ubah dari cameraId ke id
) {
  try {
    const cameraId = params.id; // ← Ambil dari params.id

    console.log(`🔍 [API LOGS] Fetching logs for cameraId: "${cameraId}"`);
    console.log(`🔍 [API LOGS] Request URL: ${req.url}`);

    // Validasi cameraId
    if (!cameraId || cameraId === "undefined" || cameraId === "null") {
      console.error(`❌ [API LOGS] Invalid cameraId: "${cameraId}"`);
      return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
    }

    // Query dengan explicit filter
    const logs = await prisma.cameraLog.findMany({
      where: {
        cameraId: cameraId, // Gunakan variable yang sudah di-extract
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log(`📋 [API LOGS] Found ${logs.length} logs`);

    if (logs.length > 0) {
      const uniqueCameraIds = [...new Set(logs.map((l) => l.cameraId))];
      console.log(`📋 [API LOGS] Unique cameraIds in result:`, uniqueCameraIds);

      // WARNING: Jika ada lebih dari 1 unique cameraId, berarti ada masalah!
      if (uniqueCameraIds.length > 1) {
        console.error(
          `⚠️ [API LOGS] PROBLEM: Found logs from multiple cameras!`
        );
        console.error(`⚠️ [API LOGS] Expected: ["${cameraId}"]`);
        console.error(`⚠️ [API LOGS] Got: ${JSON.stringify(uniqueCameraIds)}`);
      }
    }

    return NextResponse.json(logs, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[API LOGS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
