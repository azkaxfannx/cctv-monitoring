// whatsapp-worker.ts - JALANKAN TERPISAH dari Next.js
// Install dulu: pnpm add express @types/express
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import express from "express";

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
