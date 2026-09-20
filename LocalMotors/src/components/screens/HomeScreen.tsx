import React, { useState } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { MOCK_VEHICLES } from '../../data/mockVehicles';
import {
  IconMapPin,
  IconCar,
  IconSearch,
  IconHeart,
  IconShieldCheck,
  IconTruck,
  IconHeadset,
  IconArrowRight,
} from '../icons/Icons';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onSelectVehicle }) => {
  const [selectedCity, setSelectedCity] = useState('Pau dos Ferros - RN');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchModel, setSearchModel] = useState('');

  const featuredVehicles = MOCK_VEHICLES.filter((v) => v.featured).slice(0, 5);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('search');
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#0b1329] via-[#0d1838] to-[#0f1d47] text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-6">
              {/* Region Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Pau dos Ferros e região – RN
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
                Encontre seu próximo <br className="hidden sm:inline" />
                veículo <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">perto de você.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
                Carros, motos e outros veículos anunciados por pessoas e revendedoras da sua região.
              </p>

              {/* Stats Row */}
              <div className="pt-4 grid grid-cols-3 gap-6 border-t border-slate-800/80 max-w-lg">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">124</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">anúncios ativos</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">847</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">usuários</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">12</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">revendedoras</div>
                </div>
              </div>
            </div>

            {/* Hero Right Images Collage */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-44 sm:h-52 rounded-2xl overflow-hidden shadow-xl border border-slate-700/40 transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80"
                    alt="BMW Gray Car"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-44 sm:h-52 rounded-2xl overflow-hidden shadow-xl border border-slate-700/40 transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80"
                    alt="Porsche Sports Car"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-44 sm:h-52 rounded-2xl overflow-hidden shadow-xl border border-slate-700/40 transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src="https://blog.autocompara.com.br/wp-content/uploads/2024/06/carros-esportivos.jpeg"
                    alt="Mechanic Service"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-xl border border-slate-700/40 transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=800&q=80"
                    alt="Dealership Verification"
                    className="w-full h-full object-cover"
                  />
                  {/* Verified badge */}
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl text-slate-900 flex items-center gap-2 shadow-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <IconShieldCheck size={12} />
                    </div>
                    <div className="text-[11px] leading-tight font-semibold">
                      Anúncio verificado
                      <span className="block text-[10px] text-slate-500 font-normal">Vendedor confirmado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Quick Search Bar Container */}
        <div className="max-w-7xl mx-auto mt-12 relative z-20">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200/80 text-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center"
          >
            {/* Field 1: Local */}
            <div className="lg:col-span-3 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                <IconMapPin size={14} className="text-blue-600" />
                Local
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none cursor-pointer focus:text-blue-600"
              >
                <option value="Pau dos Ferros - RN">Pau dos Ferros - RN</option>
                <option value="Alexandria - RN">Alexandria - RN</option>
                <option value="São Miguel - RN">São Miguel - RN</option>
                <option value="Apodi - RN">Apodi - RN</option>
                <option value="Portalegre - RN">Portalegre - RN</option>
              </select>
            </div>

            {/* Field 2: Categoria */}
            <div className="lg:col-span-3 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                <IconCar size={14} className="text-blue-600" />
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none cursor-pointer focus:text-blue-600"
              >
                <option value="">Tipo de veículo</option>
                <option value="carro">Carros e Picapes</option>
                <option value="moto">Motos</option>
                <option value="utilitario">Utilitários</option>
              </select>
            </div>

            {/* Field 3: Veículo (Marca ou modelo) */}
            <div className="lg:col-span-3 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                <IconSearch size={14} className="text-blue-600" />
                Veículo
              </label>
              <input
                type="text"
                placeholder="Marca ou modelo"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent outline-none"
              />
            </div>

            {/* Button: Buscar veículos */}
            <div className="lg:col-span-3">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                <IconSearch size={18} />
                Buscar veículos
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* SECTION: OPORTUNIDADES NA REGIÃO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 block">
              Oportunidades na região
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Veículos em destaque
            </h2>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors group"
          >
            Ver todos os anúncios
            <IconArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Vehicle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Card Image Header */}
              <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
                <img
                  src={vehicle.mainImage}
                  alt={vehicle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badges top left */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  {vehicle.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm ${
                        badge === 'Destaque'
                          ? 'bg-blue-600 text-white'
                          : badge === 'Revendedora'
                          ? 'bg-sky-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Favorite heart icon top right */}
                <button
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-slate-700 hover:text-red-500 flex items-center justify-center shadow-md transition-colors z-10"
                  title="Favoritar"
                >
                  <IconHeart size={18} />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{vehicle.year}</span>
                    <span className="font-medium">{vehicle.mileage}</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {vehicle.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <IconMapPin size={13} className="text-slate-400 shrink-0" />
                    <span>{vehicle.location}</span>
                  </div>
                </div>

                {/* Price Block */}
                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Preço à vista</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      R$ {vehicle.price.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {vehicle.fipePrice && (
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">Tabela FIPE</span>
                      <span className="text-xs font-bold text-emerald-600">
                        R$ {vehicle.fipePrice.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <button
                  onClick={() => onSelectVehicle(vehicle)}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors text-center"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}

          {/* CARD 6: SPECIAL PROMO BANNER */}
          <div className="bg-gradient-to-br from-[#0c1b40] to-[#0f2a6b] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-blue-900/40 shadow-lg relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center mb-6">
              <IconCar size={24} />
            </div>

            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold leading-tight">
                Quer vender seu veículo mais rápido?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Anuncie para milhares de compradores em Pau dos Ferros e em toda a região do Alto Oeste Potiguar.
              </p>
            </div>

            <div className="pt-6 z-10">
              <button
                onClick={() => onNavigate('search')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-blue-950 text-xs font-bold rounded-xl shadow-md transition-colors text-center"
              >
                Anunciar Grátis
              </button>
            </div>

            {/* Background design circle */}
            <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* SECTION: FEATURES / DIFFERENTIALS (3 Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <IconShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-2">Preços comparados à FIPE</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Todos os anúncios exibem uma comparação direta com a tabela FIPE oficial, garantindo total transparência no negócio.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <IconTruck size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-2">Negócios Locais e Seguros</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Conectamos você diretamente a vendedores particulares e revendedoras confiáveis em Pau dos Ferros e cidades vizinhas.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <IconHeadset size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-2">Suporte Regional</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Equipe de atendimento baseada no RN pronta para tirar suas dúvidas e auxiliar na divulgação do seu veículo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
