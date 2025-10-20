// lib/get-group-id.ts
import { Client, LocalAuth } from "whatsapp-web.js";
import { executablePath } from "puppeteer-core";

export async function getGroupIds() {
  const client = new Client({
    authStrategy: new LocalAuth(),
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
        "--disable-features=site-per-process",
        "--disable-web-security",
        "--ignore-certificate-errors",
        "--start-maximized",
      ],
    },
  });

  client.on("qr", (qr) => console.log("📱 Scan QR Code ini:\n", qr));
  client.on("ready", () => console.log("✅ WhatsApp Bot ready!"));
  client.initialize();
}

getGroupIds().catch(console.error);
