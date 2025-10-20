// lib/continuous-monitoring.ts
import { PrismaClient } from "@prisma/client";
import { monitorCamera } from "./monitoring"; // IMPORT monitorCamera, bukan fungsi individual

const prisma = new PrismaClient();

interface MonitoringState {
  isRunning: boolean;
  lastRun: Date | null;
}

class ContinuousMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private state: MonitoringState = {
    isRunning: false,
    lastRun: null,
  };

  // Method untuk stop yang lebih aggressive
  stop() {
    console.log("[MONITOR] Stopping monitoring...");

    if (this.intervalId) {
      console.log("[MONITOR] Clearing interval ID");
      clearInterval(this.intervalId);
      this.intervalId = null;
    } else {
      console.log("[MONITOR] No interval ID found");
    }

    this.state.isRunning = false;
    console.log("[MONITOR] Stopped completely");
  }

  async start(intervalMs: number = 60000) {
    // Default 1 menit, bukan 1 detik
    // Stop dulu sebelum start baru
    this.stop();

    this.state.isRunning = true;
    console.log(
      `[MONITOR] Starting continuous monitoring every ${intervalMs}ms`
    );

    this.intervalId = setInterval(async () => {
      await this.monitorAllCameras();
    }, intervalMs);

    // Jalankan sekali langsung
    await this.monitorAllCameras();
  }

  // Force stop untuk kasus emergency
  forceStop() {
    console.log("[MONITOR] FORCE STOPPING");
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    this.state.lastRun = null;
    console.log("[MONITOR] Force stopped");
  }

  getState(): MonitoringState {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  private async monitorAllCameras() {
    try {
      const cameras = await prisma.camera.findMany();

      if (cameras.length === 0) {
        console.log("[MONITOR] No cameras found");
        return;
      }

      console.log(
        `[MONITOR] Checking ${
          cameras.length
        } cameras at ${new Date().toISOString()}`
      );

      const results = await Promise.allSettled(
        cameras.map(async (camera) => {
          try {
            const result = await monitorCamera(camera);

            // Kirim WebSocket update jika status berubah
            if (result.statusChanged && (global as any).io) {
              (global as any).io.emit("camera_status_change", {
                id: camera.id,
                name: camera.name,
                ip: camera.ip,
                status: result.newStatus,
                cameraDate: result.cameraDate,
                lastUpdate: new Date(),
              });
              console.log(
                `📡 WebSocket: ${camera.name} -> ${result.newStatus}`
              );
            }

            return {
              cameraId: camera.id,
              status: result.newStatus,
              isOnline: result.newStatus !== "offline",
              statusChanged: result.statusChanged,
              logged: result.shouldLog,
            };
          } catch (error) {
            console.error(`[MONITOR ERROR] Camera ${camera.name}:`, error);
            return {
              cameraId: camera.id,
              status: "error",
              isOnline: false,
              statusChanged: false,
              logged: false,
            };
          }
        })
      );

      this.state.lastRun = new Date();

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const errorCount = results.filter((r) => r.status === "rejected").length;
      const loggedCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.logged
      ).length;

      console.log(
        `[MONITOR] Completed: ${successCount} success, ${errorCount} errors, ${loggedCount} logged`
      );
    } catch (error) {
      console.error("[MONITOR ERROR]:", error);
    }
  }
}

// Global instance untuk mencegah multiple instances
const globalForMonitor = globalThis as unknown as {
  continuousMonitor: ContinuousMonitor | undefined;
};

export const continuousMonitor =
  globalForMonitor.continuousMonitor || new ContinuousMonitor();

if (process.env.NODE_ENV !== "production") {
  globalForMonitor.continuousMonitor = continuousMonitor;
}
