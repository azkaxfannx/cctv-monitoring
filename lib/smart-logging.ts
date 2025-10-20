// lib/smart-logging.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CameraStatusHistory {
  cameraId: string;
  lastStatus: string;
  lastLogId?: string;
  consecutiveCount: number;
  lastChange: Date;
}

// Simpan status history dalam memory (bisa di-extend ke Redis nanti)
const statusHistory = new Map<string, CameraStatusHistory>();

// Config: berapa kali consecutive ping dengan status sama baru dianggap perubahan permanen
const CONSECUTIVE_THRESHOLD = 3; // 3x ping berturut-turut dengan status sama
const MIN_LOG_INTERVAL = 5 * 60 * 1000; // 5 menit dalam ms

export async function smartStatusLogging(
  cameraId: string,
  currentStatus: string,
  details?: string
): Promise<{ shouldLog: boolean; eventType: string }> {
  const now = new Date();
  const history = statusHistory.get(cameraId);

  // Jika belum ada history, buat baru
  if (!history) {
    const newHistory: CameraStatusHistory = {
      cameraId,
      lastStatus: currentStatus,
      consecutiveCount: 1,
      lastChange: now,
    };
    statusHistory.set(cameraId, newHistory);

    // Selalu log status pertama
    return { shouldLog: true, eventType: getEventType(currentStatus) };
  }

  // Jika status berubah
  if (history.lastStatus !== currentStatus) {
    history.lastStatus = currentStatus;
    history.consecutiveCount = 1;
    history.lastChange = now;

    // Jika sudah melebihi threshold consecutive, log perubahan
    if (history.consecutiveCount >= CONSECUTIVE_THRESHOLD) {
      return { shouldLog: true, eventType: getEventType(currentStatus) };
    }

    return { shouldLog: false, eventType: getEventType(currentStatus) };
  }

  // Jika status sama, increment consecutive count
  history.consecutiveCount++;

  // Check jika sudah melewati minimum log interval
  const timeSinceLastLog = now.getTime() - history.lastChange.getTime();
  const shouldLogBasedOnTime = timeSinceLastLog > MIN_LOG_INTERVAL;

  // Log jika:
  // 1. Sudah mencapai threshold consecutive DAN
  // 2. Sudah melewati minimum log interval
  if (
    history.consecutiveCount >= CONSECUTIVE_THRESHOLD &&
    shouldLogBasedOnTime
  ) {
    history.lastChange = now;
    history.consecutiveCount = 0; // Reset setelah log

    return {
      shouldLog: true,
      eventType: `consecutive_${getEventType(currentStatus)}`,
    };
  }

  return { shouldLog: false, eventType: getEventType(currentStatus) };
}

function getEventType(status: string): string {
  switch (status) {
    case "online":
      return "online";
    case "offline":
      return "offline";
    case "date_error":
      return "date_error";
    case "error":
      return "monitor_error";
    default:
      return "status_change";
  }
}

export async function createStatusLog(
  cameraId: string,
  event: string,
  details?: string
) {
  return await prisma.cameraLog.create({
    data: {
      cameraId,
      event,
      details,
    },
  });
}

// Reset history untuk camera (misal setelah manual intervention)
export function resetCameraHistory(cameraId: string) {
  statusHistory.delete(cameraId);
}
