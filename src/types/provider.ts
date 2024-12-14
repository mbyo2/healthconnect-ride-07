export interface Provider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  location: [number, number];  // [latitude, longitude]
  availability?: string;
  expertise?: string[];
  image: string;  // Made required
}