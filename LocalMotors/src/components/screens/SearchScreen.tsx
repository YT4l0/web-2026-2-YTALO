import React, { useState, useEffect, useCallback } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import {
  noSqlFindVehicles,
  documentToVehicle,
} from '../../services/noSqlVehicleService';
import type { VehicleQueryFilter } from '../../services/noSqlVehicleService';
import {
  IconMapPin,
  IconHeart,
  IconChevronLeft,
  IconChevronRight,
  IconBellRadar,
  IconSliders,
} from '../icons/Icons';

interface SearchScreenProps {
  favoriteIds?: string[];
  onToggleFavorite?: (vehicleId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

const ITEMS_PER_PAGE = 6;

export const SearchScreen: React.FC<SearchScreenProps> = ({
  favoriteIds = [],
  onToggleFavorite,
  onNavigate,
  onSelectVehicle,
}) => {
  // ── Estados de filtro ────────────────────────────────────────────────
  const [selectedSort, setSelectedSort] = useState<string>('relevant');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Todos']);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [maxMileage, setMaxMileage] = useState('');

  // ── Estados de resultado ─────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // ── Alerta de busca ──────────────────────────────────────────────────
  const [alertContact, setAlertContact] = useState('');
  const [isAlertCreated, setIsAlertCreated] = useState(false);

  // ── Buscar veículos quando filtros mudam ──────────────────────────────
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);

    // Mapeamento do tipo selecionado para o tipo do documento
    const typeMapping: Record<string, string> = {
      Carros: 'carro',
      Motos: 'moto',
      Utilitários: 'utilitario',
    };

    const vehicleTypeFilter = selectedTypes.includes('Todos')
      ? []
      : selectedTypes.map((t) => typeMapping[t]).filter(Boolean);

    // Mapeamento da ordenação
    const sortMapping: Record<string, VehicleQueryFilter['sort']> = {
      relevant: 'relevant',
      'Menor preço': 'price_asc',
      'Maior preço': 'price_desc',
      'Mais recentes': 'newest',
    };

    const query: VehicleQueryFilter = {
      vehicleType: vehicleTypeFilter.length > 0 ? vehicleTypeFilter : undefined,
      city: selectedCities.length > 0 ? selectedCities : undefined,
      brand: selectedBrands.length > 0 ? selectedBrands : undefined,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      minYear: minYear ? parseInt(minYear, 10) : undefined,
      maxYear: maxYear ? parseInt(maxYear, 10) : undefined,
      maxMileage: maxMileage ? parseInt(maxMileage, 10) : undefined,
      sort: sortMapping[selectedSort] || 'relevant',
    };

    try {
      const docs = await noSqlFindVehicles(query);
      const allVehicles = docs.map(documentToVehicle);
      setTotalResults(allVehicles.length);

      // Paginação
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const paged = allVehicles.slice(start, start + ITEMS_PER_PAGE);
      setVehicles(paged);
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
      setVehicles([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSort, selectedCities, selectedBrands, selectedTypes, minPrice, maxPrice, minYear, maxYear, maxMileage, currentPage]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // ── Contagem dinâmica por filtro ─────────────────────────────────────
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Buscar todos os veículos para contar
    const loadCounts = async () => {
      try {
        const allDocs = await noSqlFindVehicles({});
        const cities: Record<string, number> = {};
        const brands: Record<string, number> = {};
        allDocs.forEach((doc) => {
          cities[doc.location] = (cities[doc.location] || 0) + 1;
          brands[doc.brand] = (brands[doc.brand] || 0) + 1;
        });
        setCityCounts(cities);
        setBrandCounts(brands);
      } catch (err) {
        console.error('Erro ao carregar contagens:', err);
      }
    };
    loadCounts();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────
  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
    setCurrentPage(1);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
  };

  const toggleType = (type: string) => {
    if (type === 'Todos') {
      setSelectedTypes(['Todos']);
    } else {
      setSelectedTypes((prev) => {
        const withoutTodos = prev.filter((t) => t !== 'Todos');
        if (withoutTodos.includes(type)) {
          const next = withoutTodos.filter((t) => t !== type);
          return next.length === 0 ? ['Todos'] : next;
        }
        return [...withoutTodos, type];
      });
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedCities([]);
    setSelectedBrands([]);
    setSelectedTypes(['Todos']);
    setMinPrice('');
    setMaxPrice('');
    setMinYear('');
    setMaxYear('');
    setMaxMileage('');
    setCurrentPage(1);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertContact) {
      setIsAlertCreated(true);
      setTimeout(() => setIsAlertCreated(false), 4000);
      setAlertContact('');
    }
  };

  // ── Paginação ────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalResults);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ── Listas de opções ─────────────────────────────────────────────────
  const cityOptions = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
  const brandOptions = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);

  const activeFilterCount = [
    selectedCities.length > 0,
    selectedBrands.length > 0,
    !selectedTypes.includes('Todos'),
    !!minPrice,
    !!maxPrice,
    !!minYear,
    !!maxYear,
    !!maxMileage,
  ].filter(Boolean).length;

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* HEADER BAR INFO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
            Início
          </button>
          <span>/</span>
          <span className="hover:text-blue-600 cursor-pointer">Comprar Veículo</span>
          <span>/</span>
          <span className="font-semibold text-slate-800">Alto Oeste Potiguar</span>
        </div>

        {/* Title and Sort dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? '...' : totalResults} veículo{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Carros, motos e utilitários seminovos e novos na região de Pau dos Ferros - RN.
              {activeFilterCount > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">
                  ({activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <IconSliders size={14} className="text-slate-400" />
            <span className="text-slate-500">Ordenar por:</span>
            <select
              value={selectedSort}
              onChange={(e) => { setSelectedSort(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="relevant">Mais relevantes</option>
              <option value="Menor preço">Menor preço</option>
              <option value="Maior preço">Maior preço</option>
              <option value="Mais recentes">Mais recentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + RESULTS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDEBAR: FILTERS */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Filtros
              </h2>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Limpar tudo
              </button>
            </div>

            {/* Section 1: Tipo de Veículo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Tipo de Veículo</label>
              <div className="space-y-1.5 text-xs text-slate-600">
                {['Todos', 'Carros', 'Motos', 'Utilitários'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 2: Cidade */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Cidade</label>
              <div className="space-y-1.5 text-xs text-slate-600">
                {cityOptions.map(([name, count]) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCities.includes(name)}
                      onChange={() => toggleCity(name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>
                      {name} ({count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Marca */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Marca</label>
              <div className="space-y-1.5 text-xs text-slate-600 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {brandOptions.map(([name, count]) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(name)}
                      onChange={() => toggleBrand(name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>
                      {name} ({count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 4: Faixa de Preço */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Faixa de Preço</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min R$"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Máx R$"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Section 5: Ano */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Ano</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="De"
                  value={minYear}
                  onChange={(e) => { setMinYear(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Até"
                  value={maxYear}
                  onChange={(e) => { setMaxYear(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Section 6: Quilometragem */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Quilometragem máxima</label>
              <select
                value={maxMileage}
                onChange={(e) => { setMaxMileage(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Qualquer quilometragem</option>
                <option value="10000">Até 10.000 km</option>
                <option value="20000">Até 20.000 km</option>
                <option value="30000">Até 30.000 km</option>
                <option value="50000">Até 50.000 km</option>
                <option value="70000">Até 70.000 km</option>
                <option value="100000">Até 100.000 km</option>
              </select>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {selectedCities.map((c) => (
                  <span
                    key={c}
                    onClick={() => toggleCity(c)}
                    className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100 flex items-center gap-1"
                  >
                    {c.split(' - ')[0]} ×
                  </span>
                ))}
                {selectedBrands.map((b) => (
                  <span
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100 flex items-center gap-1"
                  >
                    {b} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RESULTS GRID & ALERT */}
          <div className="lg:col-span-9 space-y-8">
            {/* Loading state */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm animate-pulse">
                    <div className="h-44 bg-slate-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-5 bg-slate-200 rounded w-1/3 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              /* Empty state */
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Nenhum veículo encontrado
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  Tente ajustar os filtros ou limpar a busca para ver mais resultados.
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-colors"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              /* 3x2 Grid of Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => onSelectVehicle(vehicle)}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                  >
                    {/* Image header */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={vehicle.mainImage}
                        alt={vehicle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Location Badge top right */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                        <IconMapPin size={11} className="text-blue-600" />
                        <span>{vehicle.location.split(' - ')[0]}</span>
                      </div>

                      {/* FIPE Badge bottom left */}
                      {vehicle.fipeBadge && (
                        <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          {vehicle.fipeBadge}
                        </div>
                      )}

                      {/* Heart icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(vehicle.id);
                        }}
                        className={`absolute top-3 left-3 w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-all ${
                          favoriteIds.includes(vehicle.id)
                            ? 'bg-white text-red-500 scale-105'
                            : 'bg-white/80 hover:bg-white text-slate-600 hover:text-red-500'
                        }`}
                        title={favoriteIds.includes(vehicle.id) ? 'Remover dos favoritos' : 'Favoritar'}
                      >
                        <IconHeart
                          size={16}
                          className={favoriteIds.includes(vehicle.id) ? 'fill-red-500 text-red-500' : ''}
                        />
                      </button>
                    </div>

                    {/* Body content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1">
                          {vehicle.year} • {vehicle.mileage}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {vehicle.title}
                        </h3>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {vehicle.transmission} • {vehicle.fuel} • {vehicle.color}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">À vista</span>
                          <span className="text-base font-extrabold text-blue-600">
                            R$ {vehicle.price.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION BAR */}
            {totalResults > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500 gap-4">
                <span>
                  Mostrando <strong>{startItem}-{endItem}</strong> de <strong>{totalResults}</strong> veículos
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-semibold disabled:opacity-40"
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span key={`dots-${idx}`} className="px-1 text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg font-semibold flex items-center justify-center ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-semibold disabled:opacity-40"
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* SEARCH ALERT BANNER */}
            <div className="bg-indigo-50/70 rounded-3xl p-6 sm:p-8 border border-indigo-100 text-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex items-start gap-4 z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                  <IconBellRadar size={24} />
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-900">
                    Procurando por algo mais específico?
                  </h3>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    Não encontrou o veículo exato na sua cidade? Crie um alerta de busca e avisaremos assim que novos anúncios forem cadastrados na região de Pau dos Ferros.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateAlert} className="w-full md:w-auto flex flex-col sm:flex-row gap-2 z-10">
                <input
                  type="text"
                  required
                  placeholder="Seu e-mail ou WhatsApp"
                  value={alertContact}
                  onChange={(e) => setAlertContact(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-64"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-colors whitespace-nowrap"
                >
                  Criar Alerta
                </button>
              </form>

              {isAlertCreated && (
                <div className="absolute inset-0 bg-emerald-600 text-white flex items-center justify-center font-bold text-sm z-20 animate-in fade-in">
                  ✓ Alerta de busca cadastrado com sucesso!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
