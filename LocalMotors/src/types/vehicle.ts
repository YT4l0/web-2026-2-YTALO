export type ScreenType = 'home' | 'search' | 'detail' | 'login' | 'register' | 'favorites' | 'publish' | 'seller';

export interface Vehicle {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  mileage: string;
  location: string;
  city: string;
  price: number;
  fipePrice: number;
  fipeBadge?: string;
  badges: string[]; // e.g. ['Destaque', 'Revendedora'], ['Novo']
  transmission: string;
  fuel: string;
  color: string;
  mainImage: string;
  gallery: string[];
  seller: {
    name: string;
    type: string; // e.g. 'Revendedora Verificada', 'Particular'
    initials: string;
    description: string;
    verified: boolean;
    avatar?: string;
    rating?: number;
    phone?: string;
    totalVehicles?: number;
    address?: string;
    timeOnPlatform?: string;
  };
  description: string;
  featured?: boolean;
}

export interface FilterState {
  vehicleType: string[];
  city: string[];
  brand: string[];
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  maxMileage: string;
}
