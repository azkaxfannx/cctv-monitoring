"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Camera {
  id: string;
  name: string;
  ip: string;
  status: string;
  latitude: number;
  longitude: number;
  cameraDate: string | null;
  lastOnline: string | null;
}

interface MapComponentProps {
  cameras: Camera[];
  onLocationReady?: (lat: number, lng: number) => void;
  placingMode?: boolean;
  onPlaceCamera?: (lat: number, lng: number) => void;
}

export default function MapComponent({
  cameras,
  onLocationReady,
  placingMode = false,
  onPlaceCamera,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [placingMarker, setPlacingMarker] = useState<L.CircleMarker | null>(
    null
  );
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map & geolocation - hanya sekali
  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    // Check if map sudah ada
    if ((mapElement as any)._leaflet_id) {
      mapRef.current = (mapElement as any)._leaflet;
      setIsMapReady(true);
      return;
    }

    try {
      const map = L.map("map", { preferCanvas: true }).setView(
        [-6.8, 108.0],
        13
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setIsMapReady(true);

      // Get user location dengan timeout
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setUserLocation({ lat, lng });

            // Pastikan map ready sebelum setView
            if (mapRef.current) {
              mapRef.current.setView([lat, lng], 13);

              L.circleMarker([lat, lng], {
                radius: 6,
                fillColor: "#3b82f6",
                color: "#1e40af",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7,
              })
                .bindPopup("📍 Lokasi Anda")
                .addTo(mapRef.current);

              if (onLocationReady) onLocationReady(lat, lng);
            }
          },
          (error) => {
            console.log("Geolocation error:", error);
            // Default ke Pekalongan
            if (mapRef.current) {
              mapRef.current.setView([-6.8, 108.0], 13);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // Cache lokasi 5 menit
          }
        );
      }
    } catch (error) {
      console.error("Map initialization error:", error);
    }

    return () => {
      // Jangan destroy, biarkan persist
    };
  }, [onLocationReady]);

  // Handle map click untuk placing camera
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    if (placingMode) {
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        if (placingMarker) {
          mapRef.current?.removeLayer(placingMarker);
        }

        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: "#f59e0b",
          color: "#d97706",
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
          dashArray: "5, 5",
        })
          .bindPopup(`📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`)
          .addTo(mapRef.current!)
          .openPopup();

        setPlacingMarker(marker);

        if (onPlaceCamera) onPlaceCamera(lat, lng);
      };

      mapRef.current.on("click", handleMapClick);

      return () => {
        mapRef.current?.off("click", handleMapClick);
      };
    }
  }, [placingMode, placingMarker, onPlaceCamera, isMapReady]);

  // Update camera markers
  useEffect(() => {
    if (!mapRef.current || !isMapReady || placingMode) return;

    // Hapus SEMUA marker lama dulu
    markersRef.current.forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current.clear();

    // Tambah marker baru
    cameras.forEach((camera) => {
      const color =
        camera.status === "online"
          ? "#10b981"
          : camera.status === "date_error"
          ? "#eab308"
          : "#ef4444";

      const marker = L.circleMarker([camera.latitude, camera.longitude], {
        radius: 10,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(
          `
          <div class="font-semibold text-gray-800">${camera.name}</div>
          <div class="text-sm text-gray-600">IP: ${camera.ip}</div>
          <div class="text-sm">
            Status: <strong>${
              camera.status === "online"
                ? "🟢"
                : camera.status === "date_error"
                ? "🟡"
                : "🔴"
            } ${camera.status.toUpperCase()}</strong>
          </div>
          <div class="text-sm text-gray-600">Tanggal: ${
            camera.cameraDate || "-"
          }</div>
          <div class="text-xs text-gray-500">Terakhir: ${
            camera.lastOnline
              ? new Date(camera.lastOnline).toLocaleTimeString("id-ID")
              : "-"
          }</div>
        `
        )
        .addTo(mapRef.current!);

      markersRef.current.set(camera.id, marker);
    });
  }, [cameras, placingMode, isMapReady]);

  return <div id="map" className="w-full h-96 lg:h-screen rounded-lg" />;
}
