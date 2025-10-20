// wa-worker.ts
import { initWhatsApp } from "./lib/whatsapp";

(async () => {
  console.log("🚀 Starting WhatsApp worker...");
  await initWhatsApp();
})();
