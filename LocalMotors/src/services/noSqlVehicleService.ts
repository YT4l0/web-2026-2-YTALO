/**
 * NoSQL Vehicle Service
 * 
 * Simula operações de um banco de dados NoSQL (estilo MongoDB) para veículos.
 * Utiliza localStorage como armazenamento persistente local.
 * Todas as operações retornam/manipulam documentos JSON.
 * 
 * Coleção: motorlocal_nosql_vehicles_collection
 * 
 * Operações disponíveis:
 * - findAll()       → db.vehicles.find({})
 * - findById(_id)   → db.vehicles.findOne({ _id })
 * - findByQuery()   → db.vehicles.find({ ...filters })
 * - insertOne()     → db.vehicles.insertOne(doc)
 * - updateOne()     → db.vehicles.updateOne({ _id }, { $set: ... })
 * - deleteOne()     → db.vehicles.deleteOne({ _id })
 */

import type { Vehicle } from '../types/vehicle';
import vehiclesJson from '../data/vehicles.json';

// ─── Tipo do documento NoSQL ─────────────────────────────────────────────────
export interface VehicleDocument {
  _id: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  mileage: number;
  mileageFormatted: string;
  location: string;
  city: string;
  state: string;
  price: number;
  fipePrice: number;
  fipeBadge: string | null;
  badges: string[];
  transmission: string;
  fuel: string;
  color: string;
  featured: boolean;
  mainImage: string;
  gallery: string[];
  seller: {
    name: string;
    type: string;
    initials: string;
    description: string;
    verified: boolean;
  };
  description: string;
  vehicleType: 'carro' | 'moto' | 'utilitario';
  createdAt: string;
  updatedAt: string;
}

// ─── Filtros de busca ────────────────────────────────────────────────────────
export interface VehicleQueryFilter {
  vehicleType?: string[];
  city?: string[];
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  searchTerm?: string;
  featured?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'relevant';
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const NOSQL_VEHICLES_KEY = 'motorlocal_nosql_vehicles_collection';

// ─── Inicialização da coleção ────────────────────────────────────────────────
function getCollection(): VehicleDocument[] {
  try {
    const raw = localStorage.getItem(NOSQL_VEHICLES_KEY);
    if (!raw) {
      // Inicializa com os dados do JSON seed
      const initialDocs = vehiclesJson as VehicleDocument[];
      localStorage.setItem(NOSQL_VEHICLES_KEY, JSON.stringify(initialDocs));
      return initialDocs;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('[NoSQL] Erro ao ler coleção de veículos:', err);
    return vehiclesJson as VehicleDocument[];
  }
}

function saveCollection(docs: VehicleDocument[]): void {
  try {
    localStorage.setItem(NOSQL_VEHICLES_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error('[NoSQL] Erro ao salvar coleção de veículos:', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extrai o primeiro ano da string "2021 / 2021" */
function extractYear(yearStr: string): number {
  const match = yearStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Converte VehicleDocument → Vehicle (formato usado pelos componentes) */
export function documentToVehicle(doc: VehicleDocument): Vehicle {
  return {
    id: doc._id,
    title: doc.title,
    brand: doc.brand,
    model: doc.model,
    year: doc.year,
    mileage: doc.mileageFormatted,
    location: doc.location,
    city: doc.location,
    price: doc.price,
    fipePrice: doc.fipePrice,
    fipeBadge: doc.fipeBadge ?? undefined,
    badges: doc.badges,
    transmission: doc.transmission,
    fuel: doc.fuel,
    color: doc.color,
    featured: doc.featured,
    mainImage: doc.mainImage,
    gallery: doc.gallery,
    seller: doc.seller,
    description: doc.description,
  };
}

/** Converte Vehicle → VehicleDocument parcial (para inserção) */
export function vehicleToDocument(
  vehicle: Omit<Vehicle, 'id'> & { vehicleType?: 'carro' | 'moto' | 'utilitario' }
): Omit<VehicleDocument, '_id' | 'createdAt' | 'updatedAt'> {
  const locationParts = vehicle.location.split(' - ');
  const mileageNum = parseInt(vehicle.mileage.replace(/\D/g, ''), 10) || 0;

  return {
    title: vehicle.title,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileage: mileageNum,
    mileageFormatted: vehicle.mileage,
    location: vehicle.location,
    city: locationParts[0]?.trim() || vehicle.location,
    state: locationParts[1]?.trim() || 'RN',
    price: vehicle.price,
    fipePrice: vehicle.fipePrice,
    fipeBadge: vehicle.fipeBadge ?? null,
    badges: vehicle.badges,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    color: vehicle.color,
    featured: vehicle.featured ?? false,
    mainImage: vehicle.mainImage,
    gallery: vehicle.gallery,
    seller: vehicle.seller,
    description: vehicle.description,
    vehicleType: vehicle.vehicleType || 'carro',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERAÇÕES NOSQL (CRUD)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * db.vehicles.find({})
 * Retorna todos os documentos da coleção.
 */
export async function noSqlFindAllVehicles(): Promise<VehicleDocument[]> {
  await new Promise((r) => setTimeout(r, 300)); // Simula latência de rede
  return getCollection();
}

/**
 * db.vehicles.findOne({ _id })
 * Busca um documento pelo seu ID.
 */
export async function noSqlFindVehicleById(
  _id: string
): Promise<VehicleDocument | null> {
  await new Promise((r) => setTimeout(r, 200));
  const collection = getCollection();
  return collection.find((doc) => doc._id === _id) || null;
}

/**
 * db.vehicles.find({ ...query })
 * Busca documentos com filtros combinados (AND lógico).
 */
export async function noSqlFindVehicles(
  query: VehicleQueryFilter
): Promise<VehicleDocument[]> {
  await new Promise((r) => setTimeout(r, 400)); // Simula latência
  let results = getCollection();

  // Filtro: tipo de veículo
  if (query.vehicleType && query.vehicleType.length > 0 && !query.vehicleType.includes('Todos')) {
    const typesLower = query.vehicleType.map((t) => t.toLowerCase());
    results = results.filter((doc) => typesLower.includes(doc.vehicleType.toLowerCase()));
  }

  // Filtro: cidade
  if (query.city && query.city.length > 0) {
    results = results.filter((doc) =>
      query.city!.some((c) => doc.location.toLowerCase().includes(c.toLowerCase()))
    );
  }

  // Filtro: marca
  if (query.brand && query.brand.length > 0) {
    results = results.filter((doc) =>
      query.brand!.some((b) => doc.brand.toLowerCase() === b.toLowerCase())
    );
  }

  // Filtro: preço mínimo
  if (query.minPrice && query.minPrice > 0) {
    results = results.filter((doc) => doc.price >= query.minPrice!);
  }

  // Filtro: preço máximo
  if (query.maxPrice && query.maxPrice > 0) {
    results = results.filter((doc) => doc.price <= query.maxPrice!);
  }

  // Filtro: ano mínimo
  if (query.minYear && query.minYear > 0) {
    results = results.filter((doc) => extractYear(doc.year) >= query.minYear!);
  }

  // Filtro: ano máximo
  if (query.maxYear && query.maxYear > 0) {
    results = results.filter((doc) => extractYear(doc.year) <= query.maxYear!);
  }

  // Filtro: quilometragem máxima
  if (query.maxMileage && query.maxMileage > 0) {
    results = results.filter((doc) => doc.mileage <= query.maxMileage!);
  }

  // Filtro: termo de busca (título, marca, modelo)
  if (query.searchTerm && query.searchTerm.trim().length > 0) {
    const term = query.searchTerm.toLowerCase().trim();
    results = results.filter(
      (doc) =>
        doc.title.toLowerCase().includes(term) ||
        doc.brand.toLowerCase().includes(term) ||
        doc.model.toLowerCase().includes(term) ||
        doc.description.toLowerCase().includes(term)
    );
  }

  // Filtro: featured
  if (query.featured !== undefined) {
    results = results.filter((doc) => doc.featured === query.featured);
  }

  // Ordenação
  switch (query.sort) {
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'relevant':
    default:
      // Destaques primeiro, depois por data
      results.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;
  }

  return results;
}

/**
 * db.vehicles.insertOne(doc)
 * Insere um novo documento na coleção.
 */
export async function noSqlInsertVehicle(
  vehicleData: Omit<VehicleDocument, '_id' | 'createdAt' | 'updatedAt'>
): Promise<VehicleDocument> {
  await new Promise((r) => setTimeout(r, 500));
  const collection = getCollection();

  const newDoc: VehicleDocument = {
    ...vehicleData,
    _id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  collection.push(newDoc);
  saveCollection(collection);

  console.log('[NoSQL] insertOne → Documento inserido:', JSON.stringify(newDoc, null, 2));
  return newDoc;
}

/**
 * db.vehicles.updateOne({ _id }, { $set: updates })
 * Atualiza campos de um documento existente.
 */
export async function noSqlUpdateVehicle(
  _id: string,
  updates: Partial<VehicleDocument>
): Promise<VehicleDocument | null> {
  await new Promise((r) => setTimeout(r, 400));
  const collection = getCollection();
  const index = collection.findIndex((doc) => doc._id === _id);

  if (index === -1) {
    console.warn(`[NoSQL] updateOne → Documento ${_id} não encontrado.`);
    return null;
  }

  collection[index] = {
    ...collection[index],
    ...updates,
    _id: collection[index]._id, // Protege _id de ser sobrescrito
    createdAt: collection[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  saveCollection(collection);
  console.log('[NoSQL] updateOne → Documento atualizado:', JSON.stringify(collection[index], null, 2));
  return collection[index];
}

/**
 * db.vehicles.deleteOne({ _id })
 * Remove um documento da coleção.
 */
export async function noSqlDeleteVehicle(_id: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300));
  const collection = getCollection();
  const filtered = collection.filter((doc) => doc._id !== _id);

  if (filtered.length === collection.length) {
    console.warn(`[NoSQL] deleteOne → Documento ${_id} não encontrado.`);
    return false;
  }

  saveCollection(filtered);
  console.log(`[NoSQL] deleteOne → Documento ${_id} removido.`);
  return true;
}

/**
 * db.vehicles.countDocuments(query)
 * Conta documentos que atendem ao filtro.
 */
export async function noSqlCountVehicles(
  query?: VehicleQueryFilter
): Promise<number> {
  if (!query) {
    const collection = getCollection();
    return collection.length;
  }
  const results = await noSqlFindVehicles(query);
  return results.length;
}

/**
 * Retorna todos os veículos já convertidos para o formato Vehicle (componente-friendly).
 * Útil para uso direto nos componentes React existentes.
 */
export async function getAllVehiclesAsViewModel(): Promise<Vehicle[]> {
  const docs = await noSqlFindAllVehicles();
  return docs.map(documentToVehicle);
}

/**
 * Retorna veículos filtrados já convertidos para o formato Vehicle.
 */
export async function getFilteredVehiclesAsViewModel(
  query: VehicleQueryFilter
): Promise<Vehicle[]> {
  const docs = await noSqlFindVehicles(query);
  return docs.map(documentToVehicle);
}
