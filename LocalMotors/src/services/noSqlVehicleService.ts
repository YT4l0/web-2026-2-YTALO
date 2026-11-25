import type { Vehicle } from '../types/vehicle';
import { getAccessToken } from './auth/getAccessToken';

export type VehicleStatus = 'ativo' | 'oculto';

export interface VehicleDocument {
  _id: string; ownerId: string | null; status: VehicleStatus; title: string;
  brand: string; model: string; version?: string; year: string; mileage: number;
  mileageFormatted: string; location: string; city: string; state: string; price: number;
  fipePrice: number | null; fipeBadge: string | null; badges: string[];
  transmission: string; fuel: string; color: string; featured: boolean;
  mainImage: string; gallery: string[]; photoKeys?: string[]; seller: Vehicle['seller'];
  description: string; vehicleType: 'carro' | 'moto' | 'utilitario';
  createdAt: string; updatedAt: string;
}

export interface VehicleQueryFilter {
  vehicleType?: string[]; city?: string[]; brand?: string[]; minPrice?: number;
  maxPrice?: number; minYear?: number; maxYear?: number; maxMileage?: number;
  searchTerm?: string; featured?: boolean; ownerId?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'relevant';
}

interface ApiListResponse { items: VehicleDocument[]; count: number }
interface UploadTarget { key: string; uploadUrl: string; headers: Record<string, string> }
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function requireApiUrl(): string {
  if (!API_URL) throw new Error('VITE_API_URL não está configurada.');
  return API_URL;
}

async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = await getAccessToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${requireApiUrl()}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message || `Falha na API (${response.status}).`);
  return body as T;
}

function queryString(query: VehicleQueryFilter): string {
  const params = new URLSearchParams();
  query.vehicleType?.forEach((value) => params.append('vehicleType', value));
  query.city?.forEach((value) => params.append('city', value));
  query.brand?.forEach((value) => params.append('brand', value));
  for (const key of ['minPrice', 'maxPrice', 'minYear', 'maxYear', 'maxMileage'] as const) {
    if (query[key] !== undefined) params.set(key, String(query[key]));
  }
  if (query.searchTerm) params.set('searchTerm', query.searchTerm);
  if (query.featured !== undefined) params.set('featured', String(query.featured));
  if (query.ownerId) params.set('ownerId', query.ownerId);
  if (query.sort) params.set('sort', query.sort);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function documentToVehicle(doc: VehicleDocument): Vehicle {
  return {
    id: doc._id, ownerId: doc.ownerId, status: doc.status, title: doc.title, brand: doc.brand, model: doc.model, year: doc.year,
    mileage: doc.mileageFormatted || `${doc.mileage.toLocaleString('pt-BR')} km`,
    location: doc.location, city: doc.city, price: doc.price, fipePrice: doc.fipePrice,
    fipeBadge: doc.fipeBadge || undefined, badges: doc.badges || [],
    transmission: doc.transmission, fuel: doc.fuel, color: doc.color,
    featured: doc.featured, mainImage: doc.mainImage, gallery: doc.gallery || [],
    seller: doc.seller, description: doc.description,
  };
}

export async function noSqlFindAllVehicles(): Promise<VehicleDocument[]> {
  return (await apiRequest<ApiListResponse>('/vehicles')).items;
}
export async function noSqlFindVehicleById(id: string): Promise<VehicleDocument | null> {
  try { return await apiRequest<VehicleDocument>(`/vehicles/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof Error && /não encontr|404/i.test(error.message)) return null; throw error; }
}
export async function noSqlFindVehicles(query: VehicleQueryFilter): Promise<VehicleDocument[]> {
  return (await apiRequest<ApiListResponse>(`/vehicles${queryString(query)}`)).items;
}
export async function noSqlInsertVehicle(
  vehicleData: Omit<VehicleDocument, '_id' | 'ownerId' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<VehicleDocument> {
  return apiRequest<VehicleDocument>('/vehicles', { method: 'POST', body: JSON.stringify(vehicleData) }, true);
}
export async function noSqlFindVehiclesByOwner(_ownerId?: string): Promise<VehicleDocument[]> {
  void _ownerId;
  return (await apiRequest<ApiListResponse>('/me/vehicles', {}, true)).items;
}
export async function noSqlUpdateVehicle(id: string, updates: Partial<VehicleDocument>, _requesterId?: string): Promise<VehicleDocument> {
  void _requesterId;
  return apiRequest<VehicleDocument>(`/vehicles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) }, true);
}
export async function noSqlDeleteVehicle(id: string, _requesterId?: string): Promise<boolean> {
  void _requesterId;
  await apiRequest<void>(`/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
  return true;
}
export async function uploadVehiclePhotos(vehicleId: string, files: File[]): Promise<VehicleDocument> {
  const { uploads } = await apiRequest<{ uploads: UploadTarget[] }>(
    `/vehicles/${encodeURIComponent(vehicleId)}/photo-uploads`,
    { method: 'POST', body: JSON.stringify({ files: files.map((file) => ({ fileName: file.name, contentType: file.type, size: file.size })) }) }, true,
  );
  if (uploads.length !== files.length) throw new Error('A API não preparou todos os uploads.');
  await Promise.all(uploads.map(async (target, index) => {
    const response = await fetch(target.uploadUrl, { method: 'PUT', headers: target.headers, body: files[index] });
    if (!response.ok) throw new Error(`Falha ao enviar a foto ${index + 1}.`);
  }));
  return noSqlUpdateVehicle(vehicleId, { photoKeys: uploads.map((upload) => upload.key) });
}
export async function noSqlCountVehicles(query: VehicleQueryFilter = {}): Promise<number> {
  return (await apiRequest<ApiListResponse>(`/vehicles${queryString(query)}`)).count;
}
export async function getAllVehiclesAsViewModel(): Promise<Vehicle[]> { return (await noSqlFindAllVehicles()).map(documentToVehicle); }
export async function getFilteredVehiclesAsViewModel(query: VehicleQueryFilter): Promise<Vehicle[]> { return (await noSqlFindVehicles(query)).map(documentToVehicle); }
