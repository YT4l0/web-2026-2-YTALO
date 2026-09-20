import React, { useState } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { MOCK_VEHICLES } from '../../data/mockVehicles';
import {
  IconMapPin,
  IconHeart,
  IconChevronLeft,
  IconChevronRight,
  IconBellRadar,
  IconSliders,
} from '../icons/Icons';

interface SearchScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onNavigate,
  onSelectVehicle,
}) => {
  const [selectedSort, setSelectedSort] = useState('Mais relevantes');
  const [selectedCities, setSelectedCities] = useState<string[]>(['Pau dos Ferros - RN']);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(['Chevrolet']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Todos']);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [alertContact, setAlertContact] = useState('');
  const [isAlertCreated, setIsAlertCreated] = useState(false);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedCities([]);
    setSelectedBrands([]);
    setSelectedTypes(['Todos']);
    setMinPrice('');
    setMaxPrice('');
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertContact) {
      setIsAlertCreated(true);
      setTimeout(() => setIsAlertCreated(false), 4000);
      setAlertContact('');
    }
  };

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
              124 veículos encontrados
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Carros, motos e utilitários seminovos e novos na região de Pau dos Ferros - RN.
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <IconSliders size={14} className="text-slate-400" />
            <span className="text-slate-500">Ordenar por:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="Mais relevantes">Mais relevantes</option>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('Todos')}
                    onChange={() => setSelectedTypes(['Todos'])}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Todos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('Carros')}
                    onChange={() => setSelectedTypes(['Carros'])}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Carros e Picapes (98)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('Motos')}
                    onChange={() => setSelectedTypes(['Motos'])}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Motos (26)</span>
                </label>
              </div>
            </div>

            {/* Section 2: Cidade */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Cidade</label>
              <div className="space-y-1.5 text-xs text-slate-600">
                {[
                  { name: 'Pau dos Ferros - RN', count: 72 },
                  { name: 'Alexandria - RN', count: 21 },
                  { name: 'São Miguel - RN', count: 18 },
                  { name: 'Apodi - RN', count: 13 },
                ].map((c) => (
                  <label key={c.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCities.includes(c.name)}
                      onChange={() => toggleCity(c.name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>
                      {c.name} ({c.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Marca */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Marca</label>
              <div className="space-y-1.5 text-xs text-slate-600 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { name: 'Chevrolet', count: 32 },
                  { name: 'Fiat', count: 28 },
                  { name: 'Toyota', count: 19 },
                  { name: 'Honda', count: 15 },
                  { name: 'Volkswagen', count: 12 },
                  { name: 'Yamaha', count: 10 },
                ].map((b) => (
                  <label key={b.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b.name)}
                      onChange={() => toggleBrand(b.name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>
                      {b.name} ({b.count})
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
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Máx R$"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Section 5: Ano */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Ano</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="De"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Até"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Section 6: Quilometragem */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Quilometragem máxima</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer">
                <option value="">Qualquer quilometragem</option>
                <option value="20000">Até 20.000 km</option>
                <option value="50000">Até 50.000 km</option>
                <option value="100000">Até 100.000 km</option>
              </select>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              Aplicar Filtros
            </button>
          </div>

          {/* RIGHT COLUMN: RESULTS GRID & ALERT */}
          <div className="lg:col-span-9 space-y-8">
            {/* 3x2 Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_VEHICLES.slice(0, 6).map((vehicle) => (
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
                        alert(`Veículo ${vehicle.title} adicionado aos favoritos!`);
                      }}
                      className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm"
                    >
                      <IconHeart size={16} />
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

            {/* PAGINATION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500 gap-4">
              <span>Mostrando <strong>1-6</strong> de <strong>124</strong> veículos</span>

              <div className="flex items-center gap-1.5">
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                  <IconChevronLeft size={16} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
                  1
                </button>
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold flex items-center justify-center">
                  2
                </button>
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold flex items-center justify-center">
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold flex items-center justify-center">
                  21
                </button>
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>

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
