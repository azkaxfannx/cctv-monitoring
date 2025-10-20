export interface Camera {
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
