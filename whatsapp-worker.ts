import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import express from "express";
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

let waClient: Client | null = null;
let isReady = false;

// ==================== WHATSAPP INITIALIZATION ====================
async function initWhatsApp() {
  if (waClient && isReady) {
    console.log("✅ WhatsApp already connected");
    return waClient;
  }

  console.log("🔄 Initializing WhatsApp...");

  waClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: "./.wwebjs_auth",
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

  waClient.on("qr", (qr) => {
    console.log("\n📱 ============ SCAN QR CODE ============");
    qrcode.generate(qr, { small: true });
    console.log("========================================\n");
  });

  waClient.on("authenticated", () => {
    console.log("🔒 WhatsApp Authenticated!");
  });

  waClient.on("ready", () => {
    console.log("✅ WhatsApp Bot is READY!");
    isReady = true;
  });

  waClient.on("auth_failure", (err) => {
    console.error("❌ Authentication failed:", err);
    isReady = false;
    waClient = null;
  });

  waClient.on("disconnected", (reason) => {
    console.log("❌ WhatsApp disconnected:", reason);
    isReady = false;
    waClient = null;

    // Auto-reconnect after 5 seconds
    setTimeout(() => {
      console.log("🔄 Attempting to reconnect...");
      initWhatsApp();
    }, 5000);
  });

  try {
    await waClient.initialize();
    return waClient;
  } catch (error) {
    console.error("❌ Failed to initialize WhatsApp:", error);
    waClient = null;
    isReady = false;
    throw error;
  }
}

// ==================== HTTP SERVER (Internal API) ====================
const app = express();
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: isReady ? "ready" : "not_ready",
    hasClient: waClient !== null,
    timestamp: new Date().toISOString(),
  });
});

// Send message endpoint
app.post("/send", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: "Missing 'to' or 'message' in request body",
      });
    }

    if (!isReady || !waClient) {
      return res.status(503).json({
        error: "WhatsApp is not ready. Please wait or check logs.",
      });
    }

    console.log(`📤 Sending message to ${to}`);
    await waClient.sendMessage(to, message);

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({
      error: error.message || "Failed to send message",
    });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.WA_WORKER_PORT || 3001;

async function start() {
  try {
    console.log("🚀 Starting WhatsApp Worker...");

    // Initialize WhatsApp first
    await initWhatsApp();

    scheduleDailyReport();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n✅ WhatsApp Worker running on http://localhost:${PORT}`);
      console.log(`📡 Ready to receive messages via POST /send`);
      console.log(`🏥 Health check: GET /health\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start WhatsApp Worker:", error);
    process.exit(1);
  }
}

async function scheduleDailyReport() {
  cron.schedule(
    "48 1 * * *",
    async () => {
      console.log("⏰ [CRON] Running daily report at 8:00 AM WIB");

      try {
        const prisma = new PrismaClient();

        // ✅ FIX: Paksa pakai WIB
        const now = new Date();
        const wibOffset = 7 * 60 * 60 * 1000;
        const nowWIB = new Date(now.getTime() + wibOffset);
        const today = nowWIB.toISOString().split("T")[0]; // Tanggal WIB
        const currentTime = now.toLocaleTimeString("id-ID"); // Jam lokal (udah WIB otomatis)

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

        let message = `📋 *LAPORAN HARIAN CCTV* \n`;
        message += `Tanggal: ${today}\n`;
        message += `Waktu: ${currentTime}\n`;
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
            message += `${index + 1}. ${cam.name} (${
              cam.ip
            })\n   Tanggal Kamera: ${
              cam.cameraDate
            }\n   Seharusnya: ${today}\n`;
          });
        }

        message += `\n⏰ *Update Terakhir:* ${nowWIB.toLocaleString("id-ID")}`;

        const groupId = process.env.WHATSAPP_GROUP_ID;
        if (groupId && waClient && isReady) {
          await waClient.sendMessage(groupId, message);
          console.log("✅ [CRON] Daily report sent successfully");
        }

        await prisma.$disconnect();
      } catch (error) {
        console.error("❌ [CRON] Daily report error:", error);
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log("📅 Daily report scheduled at 8:00 AM WIB");
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  if (waClient) {
    await waClient.destroy();
  }
  process.exit(0);
});

// Start the worker
start();
