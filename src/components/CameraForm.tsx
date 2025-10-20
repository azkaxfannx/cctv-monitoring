"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

interface FormData {
  name: string;
  ip: string;
  username: string;
  password: string;
  latitude: number;
  longitude: number;
}

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      Loading map...
    </div>
  ),
});

export function CameraForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"location" | "details">("location");
  const [loading, setLoading] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    name: "",
    ip: "",
    username: "",
    password: "",
    latitude: -6.8,
    longitude: 108.0,
  });

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingResult("Testing...");

    try {
      const res = await fetch("/api/test-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: form.ip }),
      });
      const data = await res.json();
      setPingResult(data.message);
    } catch (err) {
      setPingResult("Error testing ping");
    } finally {
      setTestingPing(false);
    }
  };

  const handleLocationReady = (lat: number, lng: number) => {
    setForm({ ...form, latitude: lat, longitude: lng });
  };

  const handlePlaceCamera = (lat: number, lng: number) => {
    setForm({ ...form, latitude: lat, longitude: lng });
  };

  const handleNextStep = () => {
    if (!form.name || !form.ip) {
      alert("Nama dan IP harus diisi!");
      return;
    }
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert("✓ Kamera berhasil ditambahkan!");
        onSuccess();
      } else {
        alert("Error: " + (await res.text()));
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error menambahkan kamera");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg space-y-4 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-bold">
        {step === "location"
          ? "📍 Step 1: Pilih Lokasi Kamera"
          : "⚙️ Step 2: Detail Kamera"}
      </h3>

      {step === "location" ? (
        <div className="space-y-4">
          {/* Map untuk memilih lokasi */}
          <div className="rounded-lg overflow-hidden border-2 border-slate-600">
            <MapComponent
              cameras={[]}
              onLocationReady={handleLocationReady}
              placingMode={true}
              onPlaceCamera={handlePlaceCamera}
            />
          </div>

          <div className="bg-slate-700 p-3 rounded text-sm">
            <p className="text-yellow-300">
              💡 Klik di map untuk menempatkan kamera
            </p>
            <p className="text-slate-300 mt-2">
              📍 Lokasi: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nama Kamera (cth: Lobby Utama)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-700 p-2 rounded text-white"
              required
            />
            <input
              type="text"
              placeholder="IP Address (cth: 192.168.1.20)"
              value={form.ip}
              onChange={(e) => setForm({ ...form, ip: e.target.value })}
              className="w-full bg-slate-700 p-2 rounded text-white"
              required
            />
          </div>

          <button
            onClick={handleNextStep}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition"
          >
            Lanjut ke Step 2 →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-slate-700 p-3 rounded text-sm">
            <p className="font-semibold">{form.name}</p>
            <p className="text-slate-400">{form.ip}</p>
            <p className="text-slate-400 text-xs mt-1">
              📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestPing}
            disabled={testingPing || !form.ip}
            className="w-full bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded font-semibold transition disabled:opacity-50"
          >
            {testingPing ? "🔄 Testing..." : "🔍 Test Koneksi"}
          </button>

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

          <input
            type="text"
            placeholder="Username (opsional)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-slate-700 p-2 rounded text-white"
          />
          <input
            type="password"
            placeholder="Password (opsional)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-slate-700 p-2 rounded text-white"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("location");
                setPingResult("");
              }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded font-semibold transition"
            >
              ← Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition disabled:opacity-50"
            >
              {loading ? "💾 Menyimpan..." : "✓ Simpan Kamera"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
