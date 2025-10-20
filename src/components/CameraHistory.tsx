"use client";

import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";

interface Log {
  id: string;
  event: string;
  details: string | null;
  createdAt: string;
}

interface CameraHistoryProps {
  cameraId: string;
  cameraName: string;
  cameraStatus: string;
  cameraDate: string | null;
}

export function CameraHistory({
  cameraId,
  cameraName,
  cameraStatus,
  cameraDate,
}: CameraHistoryProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial logs
  useEffect(() => {
    setLogs([]);
    setLoading(true);

    console.log(`📋 Fetching logs for camera: ${cameraId}`);

    fetch(`/api/logs/${cameraId}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching logs:", err);
        setLogs([]);
        setLoading(false);
      });
  }, [cameraId]);

  // Setup WebSocket for real-time log updates
  useEffect(() => {
    console.log(`🔌 Setting up WebSocket for camera history: ${cameraId}`);

    // Inisialisasi socket jika belum ada
    if (!socketRef.current) {
      socketRef.current = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
      });
    }

    const socket = socketRef.current;

    // Join room untuk camera ini
    socket.emit("join_camera_updates", cameraId);
    console.log(`📡 Joined camera updates room: ${cameraId}`);

    // Listen untuk new log events
    const handleNewLog = (data: { cameraId: string; log: Log }) => {
      console.log(`📨 New log received for ${data.cameraId}:`, data.log);

      // Hanya tambahkan log jika untuk camera yang sedang aktif
      if (data.cameraId === cameraId) {
        setLogs((prevLogs) => [data.log, ...prevLogs].slice(0, 50)); // Keep max 50 logs
      }
    };

    socket.on("new_camera_log", handleNewLog);

    // Cleanup
    return () => {
      console.log(`🧹 Cleaning up WebSocket for camera: ${cameraId}`);
      socket.emit("leave_camera_updates", cameraId);
      socket.off("new_camera_log", handleNewLog);
    };
  }, [cameraId]);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-400";
      case "date_error":
        return "text-yellow-400";
      case "offline":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return "🟢";
      case "date_error":
        return "🟡";
      case "offline":
        return "🔴";
      default:
        return "⚫";
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-bold mb-3 text-lg">
        📋 Detail Kamera - {cameraName}
      </h3>

      {/* Real-time Status Information */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Status Saat Ini:</span>
          <span className={`font-semibold ${getStatusColor(cameraStatus)}`}>
            {getStatusIcon(cameraStatus)} {cameraStatus.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Tanggal Kamera:</span>
          <span className="font-semibold text-sm">
            {cameraDate ? (
              new Date(cameraDate).toLocaleString("id-ID")
            ) : (
              <span className="text-red-400">Tidak tersedia</span>
            )}
          </span>
        </div>

        <div className="border-t border-slate-700 pt-2">
          <span className="text-xs text-slate-500">
            Terakhir update: {new Date().toLocaleTimeString("id-ID")}
          </span>
        </div>
      </div>

      {/* History Logs */}
      <div>
        <h4 className="font-semibold mb-2 text-slate-300 flex items-center gap-2">
          📜 Riwayat Aktivitas
          <span className="text-xs text-green-400">● Live</span>
        </h4>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-sm text-slate-400 text-center p-4">
              🔄 Memuat riwayat...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-slate-400 text-center p-4">
              Tidak ada riwayat aktivitas
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="text-sm bg-slate-700 p-2 rounded animate-fadeIn"
              >
                <div className="font-semibold text-cyan-400">{log.event}</div>
                {log.details && (
                  <div className="text-slate-300 text-xs">{log.details}</div>
                )}
                <div className="text-slate-500 text-xs">
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
