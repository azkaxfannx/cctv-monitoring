// lib/daily-report.ts
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage } from "./whatsapp-helper";

const prisma = new PrismaClient();

export async function sendDailyReport() {
  try {
    console.log("📊 Generating daily report...");

    // ✅ FIX: Paksa pakai WIB
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const nowWIB = new Date(now.getTime() + wibOffset);
    const today = nowWIB.toISOString().split("T")[0];

    // Ambil semua camera dengan status problematic
    const offlineCameras = await prisma.camera.findMany({
      where: { status: "offline" },
      orderBy: { name: "asc" },
    });

    const dateErrorCameras = await prisma.camera.findMany({
      where: { status: "date_error" },
      orderBy: { name: "asc" },
    });

    const totalCameras = await prisma.camera.count();
    const onlineCameras =
      totalCameras - offlineCameras.length - dateErrorCameras.length;

    // Format message untuk daily report
    let message = `📋 *LAPORAN HARIAN CCTV* \n`;
    message += `Tanggal: ${today}\n`;
    message += `Waktu: ${nowWIB.toLocaleTimeString("id-ID")}\n`;
    message += `\n📊 *STATISTIK:*\n`;
    message += `✅ Online: ${onlineCameras}\n`;
    message += `🔴 Offline: ${offlineCameras.length}\n`;
    message += `🟡 Tanggal Salah: ${dateErrorCameras.length}\n`;
    message += `📊 Total: ${totalCameras}\n`;

    message += `\n🔴 *LIST CCTV OFFLINE:*\n`;
    if (offlineCameras.length === 0) {
      message += `- (Tidak ada)\n`;
    } else {
      offlineCameras.forEach((cam, index) => {
        const lastOnline = cam.lastOnline
          ? new Date(cam.lastOnline).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            })
          : "Tidak pernah online";
        message += `${index + 1}. ${cam.name} (${
          cam.ip
        })\n   Terakhir: ${lastOnline}\n`;
      });
    }

    message += `\n🟡 *LIST CCTV TANGGAL SALAH:*\n`;
    if (dateErrorCameras.length === 0) {
      message += `- (Tidak ada)\n`;
    } else {
      dateErrorCameras.forEach((cam, index) => {
        message += `${index + 1}. ${cam.name} (${cam.ip})\n   Tanggal Kamera: ${
          cam.cameraDate
        }\n   Seharusnya: ${today}\n`;
      });
    }

    message += `\n⏰ *Update Terakhir:* ${nowWIB.toLocaleString("id-ID")}`;

    // Kirim via WhatsApp
    const groupId = process.env.WHATSAPP_GROUP_ID;
    if (groupId) {
      await sendWhatsAppMessage(groupId, message);
      console.log("📱 Daily report sent successfully");
    } else {
      console.log("❌ WhatsApp group ID not configured");
    }

    return {
      success: true,
      offlineCount: offlineCameras.length,
      dateErrorCount: dateErrorCameras.length,
      totalCount: totalCameras,
    };
  } catch (error) {
    console.error("❌ Error sending daily report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function manualDailyReport() {
  return await sendDailyReport();
}
