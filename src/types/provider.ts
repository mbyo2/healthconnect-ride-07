export interface Provider {
  id: string;
  name: string;
  specialty: string;
  location: {
    latitude: number;
    longitude: number;
  };
}