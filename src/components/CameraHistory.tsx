"use client";

import { useEffect, useState } from "react";

interface Log {
  id: string;
  event: string;
  details: string | null;
  createdAt: string;
}

export function CameraHistory({
  cameraId,
  cameraName,
}: {
  cameraId: string;
  cameraName: string;
}) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch(`/api/logs/${cameraId}`)
      .then((r) => r.json())
      .then(setLogs);
  }, [cameraId]);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-bold mb-3 text-lg">📋 Riwayat - {cameraName}</h3>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="text-sm bg-slate-700 p-2 rounded">
            <div className="font-semibold text-cyan-400">{log.event}</div>
            {log.details && (
              <div className="text-slate-300 text-xs">{log.details}</div>
            )}
            <div className="text-slate-500 text-xs">
              {new Date(log.createdAt).toLocaleString("id-ID")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
