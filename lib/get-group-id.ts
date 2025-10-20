// lib/get-group-id.ts
import { Client, LocalAuth } from "whatsapp-web.js";
import puppeteer from "puppeteer";

export async function getGroupIds() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true, // jalankan Chromium tanpa GUI
      executablePath: puppeteer.executablePath(), // pakai Chromium bawaan Puppeteer
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    },
  });

  client.on("qr", (qr) => {
    console.log("📱 Scan QR Code ini dengan WhatsApp:");
    console.log(qr);
  });

  client.on("ready", async () => {
    console.log("✅ WhatsApp Bot ready!");

    try {
      const chats = await client.getChats();
      const groupChats = chats.filter((chat) => chat.isGroup);

      console.log("\n📋 DAFTAR GROUP YANG DITEMUKAN:");
      console.log("=================================");

      for (let i = 0; i < groupChats.length; i++) {
        const group = groupChats[i];
        const groupDetail = await client.getChatById(group.id._serialized);

        console.log(`${i + 1}. ${group.name}`);
        console.log(`   ID: ${group.id._serialized}`);

        if ("participants" in groupDetail) {
          const participants = (groupDetail as any).participants || [];
          console.log(`   Participants: ${participants.length}`);
        } else {
          console.log(`   Participants: Info tidak tersedia`);
        }

        console.log("---------------------------------");
      }

      const groupData = await Promise.all(
        groupChats.map(async (group) => {
          const groupDetail = await client.getChatById(group.id._serialized);
          return {
            name: group.name,
            id: group.id._serialized,
            participants:
              "participants" in groupDetail
                ? (groupDetail as any).participants?.length || 0
                : 0,
          };
        })
      );

      const fs = require("fs");
      fs.writeFileSync(
        "whatsapp-groups.json",
        JSON.stringify(groupData, null, 2)
      );
      console.log("\n💾 Group list disimpan di: whatsapp-groups.json");
    } catch (error) {
      console.error("Error getting group details:", error);
    } finally {
      client.destroy();
    }
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Authentication failed:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("❌ Client disconnected:", reason);
  });

  await client.initialize();
}

getGroupIds().catch(console.error);
