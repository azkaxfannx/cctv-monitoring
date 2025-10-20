// lib/whatsapp-helper.ts
// Helper untuk Next.js berkomunikasi dengan WhatsApp Worker

const WA_WORKER_URL = process.env.WA_WORKER_URL || "http://localhost:3001";

/**
 * Send message via WhatsApp Worker
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    console.log(`📤 Sending WhatsApp message to ${to}`);

    const response = await fetch(`${WA_WORKER_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send WhatsApp message");
    }

    const result = await response.json();
    console.log(`✅ WhatsApp message sent successfully`);
    return result;
  } catch (error: any) {
    console.error("❌ WhatsApp send error:", error.message);
    throw error;
  }
}

/**
 * Check WhatsApp Worker health
 */
export async function checkWhatsAppStatus() {
  try {
    const response = await fetch(`${WA_WORKER_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ WhatsApp health check failed:", error);
    return { status: "error", hasClient: false };
  }
}

/**
 * Send alert to WhatsApp group
 */
export async function whatsappAlert(
  camera: any,
  status: string,
  cameraDate?: string
) {
  try {
    const groupId = process.env.WHATSAPP_GROUP_ID;
    if (!groupId) {
      console.warn("⚠️ WHATSAPP_GROUP_ID not configured");
      return;
    }

    let message = "";

    if (status === "offline") {
      message = `🚨 CCTV Alert\n🔴 ${camera.name} (${
        camera.ip
      })\nStatus: OFFLINE\nTerakhir aktif: ${
        camera.lastOnline?.toLocaleTimeString("id-ID") || "-"
      }`;
    } else if (status === "date_error") {
      const today = new Date().toISOString().split("T")[0];
      message = `🚨 CCTV Alert\n🟡 ${camera.name} (${camera.ip})\nTanggal di kamera: ${cameraDate}\nSeharusnya: ${today}`;
    }

    if (message) {
      await sendWhatsAppMessage(groupId, message);
    }
  } catch (error) {
    console.error("❌ WhatsApp alert error:", error);
  }
}
