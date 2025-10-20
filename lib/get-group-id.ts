import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";

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

client.on("qr", (qr) => {
  console.log("📱 Scan QR Code ini:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp Bot ready!");

  const chats = await client.getChats();
  const groups = chats.filter((chat) => chat.isGroup);

  console.log("📜 List grup yang terdeteksi:");
  groups.forEach((group) => {
    console.log(`🆔 ${group.name} => ${group.id._serialized}`);
  });

  // Contoh: kalau kamu tahu nama grupnya, bisa langsung ambil ID-nya:
  const targetGroup = groups.find((g) => g.name === "Nama Grup Kamu");
  if (targetGroup) {
    console.log(`✅ ID Grup: ${targetGroup.id._serialized}`);
  } else {
    console.log("❌ Grup dengan nama itu tidak ditemukan.");
  }
});

client.initialize();
