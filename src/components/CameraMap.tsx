"use client";

import dynamic from "next/dynamic";
import { Camera } from "@/types/camera";

interface CameraMapProps {
  cameras: Camera[];
  selectedCamera?: Camera | null;
  onCameraClick?: (camera: Camera) => void;
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
  selectedCamera = null,
  onCameraClick,
  placingMode = false,
  onPlaceCamera,
}: CameraMapProps) {
  return (
    <MapComponent
      cameras={cameras}
      selectedCamera={selectedCamera}
      onCameraClick={onCameraClick}
      placingMode={placingMode}
      onPlaceCamera={onPlaceCamera}
    />
  );
}
