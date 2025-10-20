import { Client, LocalAuth } from "whatsapp-web.js";

let waClient: Client | null = null;

export async function initWhatsApp() {
  if (waClient?.info?.wid) return waClient;

  waClient = new Client({
    authStrategy: new LocalAuth(),
  });

  waClient.on("qr", (qr) => {
    console.log("Scan QR Code:", qr);
  });

  waClient.on("ready", () => {
    console.log("WhatsApp Bot ready!");
  });

  await waClient.initialize();
  return waClient;
}

export async function whatsappAlert(
  camera: any,
  status: string,
  cameraDate?: string
) {
  try {
    const client = await initWhatsApp();
    const groupId = process.env.WHATSAPP_GROUP_ID;

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

    if (message && groupId) {
      await client?.sendMessage(groupId, message);
    }
  } catch (err) {
    console.error("WhatsApp error:", err);
  }
}
