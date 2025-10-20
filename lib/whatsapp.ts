import { Client, LocalAuth, NoAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

let waClient: Client | null = null;

export async function initWhatsApp() {
  if (waClient?.info?.wid) return waClient;

  waClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: ".wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      executablePath:
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-extensions",
      ],
    },
  });

  // Event handlers...
  waClient.on("qr", (qr) => {
    console.log("📱 Scan QR Code:");
    qrcode.generate(qr, { small: true });
  });

  waClient.on("authenticated", () => {
    console.log("🔒 Authenticated!");
  });

  waClient.on("ready", () => {
    console.log("✅ WhatsApp ready!");
  });

  waClient.on("auth_failure", (err) => {
    console.error("❌ Auth failed:", err);
    waClient = null;
  });

  waClient.on("disconnected", (reason) => {
    console.log("❌ Disconnected:", reason);
    waClient = null;
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
