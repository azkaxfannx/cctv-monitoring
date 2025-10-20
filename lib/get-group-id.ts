// lib/get-group-id.ts
import { Client, LocalAuth } from "whatsapp-web.js";

export async function getGroupIds() {
  const client = new Client({
    authStrategy: new LocalAuth(),
  });

  client.on("qr", (qr) => {
    console.log("📱 Scan QR Code ini dengan WhatsApp:");
    console.log(qr);
  });

  client.on("ready", async () => {
    console.log("✅ WhatsApp Bot ready!");

    try {
      // Get semua groups
      const chats = await client.getChats();
      const groupChats = chats.filter((chat) => chat.isGroup);

      console.log("\n📋 DAFTAR GROUP YANG DITEMUKAN:");
      console.log("=================================");

      // Process setiap group untuk mendapatkan detail lengkap
      for (let i = 0; i < groupChats.length; i++) {
        const group = groupChats[i];

        // Get detail group yang lebih lengkap
        const groupDetail = await client.getChatById(group.id._serialized);

        console.log(`${i + 1}. ${group.name}`);
        console.log(`   ID: ${group.id._serialized}`);

        // Cek jika participants ada
        if ("participants" in groupDetail) {
          const participants = (groupDetail as any).participants || [];
          console.log(`   Participants: ${participants.length}`);
        } else {
          console.log(`   Participants: Info tidak tersedia`);
        }

        console.log("---------------------------------");
      }

      // Save ke file untuk referensi
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

// Jalankan function ini
getGroupIds().catch(console.error);
