"use client";

import dynamic from "next/dynamic";

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

interface CameraMapProps {
  cameras: Camera[];
  placingMode?: boolean;
  onPlaceCamera?: (lat: number, lng: number) => void;
}

// Dynamic import dengan SSR disabled
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 lg:h-screen bg-gray-200 rounded-lg flex items-center justify-center">
      Loading map...
    </div>
  ),
});

export function CameraMap({
  cameras,
  placingMode = false,
  onPlaceCamera,
}: CameraMapProps) {
  return (
    <MapComponent
      cameras={cameras}
      placingMode={placingMode}
      onPlaceCamera={onPlaceCamera}
    />
  );
}
