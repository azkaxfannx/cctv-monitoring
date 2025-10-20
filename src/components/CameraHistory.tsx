"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch(`/api/logs/${cameraId}`)
      .then((r) => r.json())
      .then(setLogs);
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
        <h4 className="font-semibold mb-2 text-slate-300">
          📜 Riwayat Aktivitas
        </h4>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-sm text-slate-400 text-center p-4">
              Tidak ada riwayat aktivitas
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="text-sm bg-slate-700 p-2 rounded">
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
