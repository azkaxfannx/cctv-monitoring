"use client";

import { useEffect, useState, useRef } from "react";
import { CameraMap } from "@/components/CameraMap";
import { CameraHistory } from "@/components/CameraHistory";
import io, { Socket } from "socket.io-client";

interface Camera {
  id: string;
  name: string;
  ip: string;
  status: string;
  latitude: number;
  longitude: number;
  cameraDate: string | null;
  lastUpdate: string;
  lastOnline: string | null;
}

export default function Dashboard() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [placingData, setPlacingData] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [cameraName, setCameraName] = useState("");
  const [cameraIp, setCameraIp] = useState("");
  const [cameraUsername, setCameraUsername] = useState("");
  const [cameraPassword, setCameraPassword] = useState("");
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState("");

  // Gunakan useRef untuk socket agar tidak recreate
  const socketRef = useRef<Socket | null>(null);
  const selectedCameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    console.log("🔄 Setting up WebSocket...");

    const newSocket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ WebSocket Connected:", newSocket.id);

      // Join camera room jika ada selected camera
      if (selectedCamera) {
        newSocket.emit("join_camera_updates", selectedCamera.id);
        console.log(`📡 Joined camera room: ${selectedCamera.id}`);
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ WebSocket Disconnected:", reason);
    });

    newSocket.on("connect_error", (error) => {
      console.log("❌ WebSocket Connection Error:", error);
    });

    newSocket.on("camera_status_change", (updatedCamera) => {
      console.log(
        "📡 WebSocket update received for camera:",
        updatedCamera.id,
        updatedCamera.status
      );

      // Pastikan update hanya untuk camera yang benar
      setCameras((prev) =>
        prev.map((cam) =>
          cam.id === updatedCamera.id ? { ...cam, ...updatedCamera } : cam
        )
      );

      // Update selected camera hanya jika ID-nya match
      if (selectedCameraRef.current?.id === updatedCamera.id) {
        console.log(
          `📡 Updating selected camera: ${updatedCamera.name} -> ${updatedCamera.status}`
        );
        setSelectedCamera((prev) =>
          prev ? { ...prev, ...updatedCamera } : null
        );
      }
    });

    return () => {
      console.log("🧹 Cleaning up WebSocket");
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency - HANYA SEKALAI

  // Handle selected camera changes untuk join/leave room
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    if (selectedCamera) {
      // Join room untuk camera yang dipilih
      socket.emit("join_camera_updates", selectedCamera.id);
      console.log(`📡 Joined camera room: ${selectedCamera.id}`);

      // Leave other rooms? atau biarkan multiple rooms?
    } else {
      // Leave semua camera rooms ketika tidak ada selected camera
      // Atau biarkan saja, tidak perlu leave
      console.log("📡 No camera selected");
    }
  }, [selectedCamera]);

  // Fetch cameras - terpisah dari WebSocket
  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const res = await fetch("/api/cameras");
      const data = await res.json();
      setCameras(data);
    } catch (error) {
      console.error("Error fetching cameras:", error);
    }
  };

  const handleCameraClick = (camera: Camera) => {
    // Jika camera yang sama diklik, toggle selection
    if (selectedCamera?.id === camera.id) {
      setSelectedCamera(null);
    } else {
      setSelectedCamera(camera);
    }
  };

  const handleAddCamera = () => {
    setPlacingMode(true);
    setPlacingData(null);
    setCameraName("");
    setCameraIp("");
    setCameraUsername("");
    setCameraPassword("");
    setPingResult("");
  };

  const handlePlaceCamera = (lat: number, lng: number) => {
    setPlacingData({ lat, lng });
  };

  const handleTestPing = async () => {
    if (!cameraIp) {
      alert("Masukkan IP address terlebih dahulu!");
      return;
    }

    setTestingPing(true);
    setPingResult("Testing...");

    try {
      const res = await fetch("/api/test-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: cameraIp }),
      });
      const data = await res.json();
      setPingResult(data.message);
    } catch (err) {
      setPingResult("Error testing ping");
    } finally {
      setTestingPing(false);
    }
  };

  const handleSaveCamera = async () => {
    if (!placingData || !cameraName || !cameraIp) {
      alert("Isi semua data yang diperlukan!");
      return;
    }

    try {
      const res = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cameraName,
          ip: cameraIp,
          username: cameraUsername,
          password: cameraPassword,
          latitude: placingData.lat,
          longitude: placingData.lng,
        }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Gagal menambah kamera: " + (await res.text()));
      }
    } catch (error) {
      console.error("Error adding camera:", error);
      alert("Gagal menambah kamera");
    }
  };

  const handleDeleteCamera = async (id: string) => {
    if (!confirm("Hapus kamera ini?")) return;

    try {
      const res = await fetch(`/api/cameras/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting camera:", error);
      alert("Gagal menghapus kamera");
    }
  };

  const handleCancelPlacing = () => {
    setPlacingMode(false);
    setPlacingData(null);
    setCameraName("");
    setCameraIp("");
    setCameraUsername("");
    setCameraPassword("");
    setPingResult("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            📹 CCTV Monitoring Dashboard
          </h1>
          <p className="text-slate-300">
            Real-time monitoring dengan status online/offline & sinkronisasi
            tanggal
          </p>
          {placingMode && (
            <div className="mt-3 p-3 bg-blue-600/20 border border-blue-400 rounded-lg text-blue-300">
              📍 Klik di map untuk menempatkan kamera baru
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <CameraMap
              cameras={cameras}
              placingMode={placingMode}
              onPlaceCamera={handlePlaceCamera}
            />
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {!placingMode ? (
              <>
                {/* Add Camera Button */}
                <button
                  onClick={handleAddCamera}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition"
                >
                  ➕ Tambah Kamera
                </button>

                {/* Camera List */}
                <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-bold mb-3 text-lg">
                    Daftar Kamera ({cameras.length})
                  </h3>
                  {cameras.length === 0 ? (
                    <p className="text-slate-400 text-sm">
                      Belum ada kamera, tambah sekarang
                    </p>
                  ) : (
                    cameras.map((cam) => (
                      <div
                        key={cam.id}
                        className={`mb-3 p-3 rounded-lg cursor-pointer transition ${
                          selectedCamera?.id === cam.id
                            ? "bg-blue-600 border-2 border-blue-400"
                            : "bg-slate-700 hover:bg-slate-600 border-2 border-transparent"
                        }`}
                        onClick={() => handleCameraClick(cam)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{cam.name}</p>
                            <p className="text-xs text-slate-400 truncate">
                              {cam.ip}
                            </p>
                            <div className="flex gap-1 mt-2">
                              <span
                                className={`px-2 py-1 text-xs rounded font-semibold ${
                                  cam.status === "online"
                                    ? "bg-green-600"
                                    : cam.status === "date_error"
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                                }`}
                              >
                                {cam.status === "online"
                                  ? "🟢"
                                  : cam.status === "date_error"
                                  ? "🟡"
                                  : "🔴"}{" "}
                                {cam.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCamera(cam.id);
                            }}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* History Panel */}
                {selectedCamera && (
                  <CameraHistory
                    cameraId={selectedCamera.id}
                    cameraName={selectedCamera.name}
                  />
                )}
              </>
            ) : (
              /* Placing Mode Panel */
              <div className="bg-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-lg">Tambah Kamera Baru</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nama Kamera
                  </label>
                  <input
                    type="text"
                    value={cameraName}
                    onChange={(e) => setCameraName(e.target.value)}
                    placeholder="Contoh: Pintu Depan"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    IP Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cameraIp}
                      onChange={(e) => setCameraIp(e.target.value)}
                      placeholder="Contoh: 192.168.1.100"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestPing}
                      disabled={testingPing || !cameraIp}
                      className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {testingPing ? "🔄" : "🔍"}
                    </button>
                  </div>
                </div>

                {pingResult && (
                  <div
                    className={`p-2 rounded text-sm ${
                      pingResult.includes("online")
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {pingResult}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Username (opsional)
                  </label>
                  <input
                    type="text"
                    value={cameraUsername}
                    onChange={(e) => setCameraUsername(e.target.value)}
                    placeholder="Username untuk akses kamera"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password (opsional)
                  </label>
                  <input
                    type="password"
                    value={cameraPassword}
                    onChange={(e) => setCameraPassword(e.target.value)}
                    placeholder="Password untuk akses kamera"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>

                {placingData && (
                  <div className="bg-blue-600/20 border border-blue-400 rounded-lg p-3 text-sm">
                    <p className="font-semibold mb-1">✓ Lokasi dipilih</p>
                    <p className="text-slate-300">
                      Lat: {placingData.lat.toFixed(6)}
                    </p>
                    <p className="text-slate-300">
                      Lng: {placingData.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSaveCamera}
                  disabled={!placingData || !cameraName || !cameraIp}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition"
                >
                  💾 Simpan Kamera
                </button>

                <button
                  onClick={handleCancelPlacing}
                  className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition"
                >
                  ✕ Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
