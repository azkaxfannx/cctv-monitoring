import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { ip } = await req.json();

  try {
    // Linux/Mac: ping -c 1 (1 paket)
    // Windows: ping -n 1
    const command =
      process.platform === "win32"
        ? `ping -n 1 -w 2000 ${ip}`
        : `ping -c 1 -W 2000 ${ip}`;

    const { stdout, stderr } = await execAsync(command, { timeout: 5000 });

    const isAlive =
      !stderr &&
      (stdout.includes("bytes=") || stdout.includes("1 packets received"));

    return NextResponse.json({
      success: true,
      alive: isAlive,
      ip,
      message: isAlive ? "Kamera online ✓" : "Kamera offline",
    });
  } catch (error: any) {
    console.error("Ping error:", error.message);
    return NextResponse.json({
      success: true,
      alive: false,
      ip,
      message: "Tidak dapat terhubung ke IP",
    });
  }
}
