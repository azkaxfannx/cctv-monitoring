import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

let waClient: Client | null = null;

export async function initWhatsApp() {
  if (waClient?.info?.wid) return waClient;

  waClient = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
      type: "none", // 👈 ini yang penting
    },
    puppeteer: {
      headless: true,
      executablePath:
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", // sesuaikan path Chrome-mu
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  waClient.on("qr", (qr) => {
    console.log("📱 Scan QR Code di bawah ini untuk login WhatsApp:");
    qrcode.generate(qr, { small: true });
  });
  waClient.on("authenticated", () => {
    console.log("🔐 WhatsApp Authenticated!");
  });

  waClient.on("ready", () => {
    console.log("✅ WhatsApp Bot ready!");
  });

  waClient.on("auth_failure", (err) => {
    console.error("❌ WhatsApp Authentication failed:", err);
  });

  waClient.on("disconnected", (reason) => {
    console.log("❌ WhatsApp disconnected:", reason);
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
