import React, { useState, useEffect } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { MOCK_VEHICLES } from '../../data/mockVehicles';
import { noSqlFindAllVehicles, documentToVehicle } from '../../services/noSqlVehicleService';
import { getActiveSession } from '../../services/noSqlAuthService';
import type { UserDocument } from '../../services/noSqlAuthService';
import {
  IconMapPin,
  IconShieldCheck,
  IconCheck,
  IconCar,
  IconHeart,
  IconArrowRight,
  IconEye,
  IconUser,
} from '../icons/Icons';

interface SellerProfileScreenProps {
  sellerName?: string;
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (vehicleId: string) => void;
}

export const SellerProfileScreen: React.FC<SellerProfileScreenProps> = ({
  sellerName,
  onNavigate,
  onSelectVehicle,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const [currentUser, setCurrentUser] = useState<UserDocument | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'profile' | 'listings'>('profile');
  const listingsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getActiveSession();
    setCurrentUser(session);

    const loadVehicles = async () => {
      try {
        const docs = await noSqlFindAllVehicles();
        if (docs && docs.length > 0) {
          setVehicles(docs.map(documentToVehicle));
        }
      } catch (err) {
        console.error('Erro ao carregar veículos do vendedor:', err);
      }
    };
    loadVehicles();
  }, []);

  // Determinar vendedor ativo: se passou sellerName, usa ele; senão se usuário logado usa ele; senão padrão 'Carlos Motors'
  const activeSellerName = sellerName || (currentUser ? currentUser.name : 'Carlos Motors');
  const isOwnProfile = !!(
    currentUser &&
    currentUser.name.toLowerCase().trim() === activeSellerName.toLowerCase().trim()
  );

  // Filtrar veículos associados EXCLUSIVAMENTE a este vendedor
  const sellerVehicles = vehicles.filter((v) => {
    if (!v.seller?.name) return false;
    const vSeller = v.seller.name.toLowerCase().trim();
    const target = activeSellerName.toLowerCase().trim();
    return vSeller === target || vSeller.includes(target) || target.includes(vSeller);
  });

  // Exibe estritamente os veículos deste vendedor
  const displayVehicles = sellerVehicles;

  // Amostra de metadados do vendedor a partir do primeiro veículo ou dados do currentUser ou defaults
  const sampleVehicle = sellerVehicles[0];
  const sellerInfo = {
    name: sampleVehicle?.seller?.name || activeSellerName,
    type:
      sampleVehicle?.seller?.type ||
      (currentUser?.accountType === 'pj' ? 'Revendedora Verificada' : 'Vendedor Particular'),
    initials:
      sampleVehicle?.seller?.initials ||
      activeSellerName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ||
      'VD',
    description:
      sampleVehicle?.seller?.description ||
      (currentUser
        ? `Vendedor cadastrado na plataforma MotorLocal em ${currentUser.city || 'Pau dos Ferros - RN'}.`
        : 'Referência no comércio automotivo de seminovos inspecionados no Alto Oeste Potiguar com garantia e transparência.'),
    verified: sampleVehicle?.seller?.verified ?? (currentUser?.isConfirmed ?? true),
    location: sampleVehicle?.location || currentUser?.city || 'Pau dos Ferros - RN',
    rating: 4.9,
    yearsOnPlatform: sampleVehicle ? '3 anos (Desde 2022)' : 'Membro Recente',
    whatsapp: currentUser?.phone || '(84) 99876-5432',
    address: 'Av. Independência, 1040 - Centro',
  };

  const handleShowActiveListings = () => {
    setActiveTab('listings');
    setTimeout(() => {
      if (listingsRef.current) {
        listingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Filtragem por categoria
  const filteredVehicles = displayVehicles.filter((v) => {
    if (selectedCategory === 'Todos') return true;
    if (selectedCategory === 'Sedans') {
      return (
        v.title.toLowerCase().includes('corolla') ||
        v.title.toLowerCase().includes('civic') ||
        v.title.toLowerCase().includes('plus')
      );
    }
    if (selectedCategory === 'Picapes') {
      return (
        v.title.toLowerCase().includes('strada') ||
        v.title.toLowerCase().includes('hilux') ||
        v.title.toLowerCase().includes('toro')
      );
    }
    if (selectedCategory === 'SUVs') {
      return (
        v.title.toLowerCase().includes('compass') ||
        v.title.toLowerCase().includes('tracker') ||
        v.title.toLowerCase().includes('kicks')
      );
    }
    if (selectedCategory === 'Hatch') {
      return (
        v.title.toLowerCase().includes('gol') ||
        v.title.toLowerCase().includes('onix') ||
        v.title.toLowerCase().includes('hb20')
      );
    }
    return true;
  });

  // Ordenação
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortBy === 'lowest') return a.price - b.price;
    if (sortBy === 'highest') return b.price - a.price;
    return 0;
  });

  return (
    <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] font-sans pb-16">
      {/* Outer Dashboard Frame resembling Stitch design */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 overflow-hidden border border-slate-200/80 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT SIDEBAR (Col span 3) */}
            <aside className="lg:col-span-3 flex flex-col justify-between space-y-6">
              <div className="flex flex-col space-y-6">
                {/* Seller Profile Header Card with dotted avatar border */}
                <div className="bg-[#f2f3ff] rounded-2xl p-5 text-center relative overflow-hidden border border-blue-100">
                  <div className="relative inline-block mx-auto mb-3">
                    <div className="w-20 h-20 rounded-full p-1 border-2 border-dashed border-blue-600 flex items-center justify-center bg-white shadow-sm">
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-inner">
                        {sellerInfo.initials}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-slate-800 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-slate-200">
                      <span className="text-blue-600">{sellerInfo.rating}</span>
                      <span className="text-amber-500">★</span>
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {sellerInfo.name}
                  </h2>
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    {sellerInfo.type}
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-100/70 text-blue-800">
                    <IconMapPin size={12} className="text-blue-600" />
                    {sellerInfo.location}
                  </div>
                </div>

                {/* Navigation Links with Active Indicator */}
                <nav aria-label="Menu do Vendedor" className="flex flex-col space-y-1.5 text-sm">
                  <button
                    onClick={() => onNavigate('home')}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-[#f2f3ff] hover:text-blue-600 transition-colors text-left"
                  >
                    <IconCar size={18} />
                    <span>Início do Portal</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-left ${
                      activeTab === 'profile'
                        ? 'font-bold text-blue-600 bg-[#eaedff]'
                        : 'font-medium text-slate-600 hover:bg-[#f2f3ff] hover:text-blue-600'
                    }`}
                  >
                    {activeTab === 'profile' && (
                      <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-600 rounded-r-full" />
                    )}
                    <IconUser size={18} />
                    <span>Perfil & Loja</span>
                  </button>
                  <button
                    onClick={handleShowActiveListings}
                    className={`relative flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors text-left ${
                      activeTab === 'listings'
                        ? 'font-bold text-blue-600 bg-[#eaedff]'
                        : 'font-medium text-slate-600 hover:bg-[#f2f3ff] hover:text-blue-600'
                    }`}
                  >
                    {activeTab === 'listings' && (
                      <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-600 rounded-r-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <IconCar size={18} />
                      <span>Anúncios Ativos</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        activeTab === 'listings'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {displayVehicles.length}
                    </span>
                  </button>
                  <button
                    onClick={() => onNavigate('publish')}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left border border-emerald-200"
                  >
                    <IconCheck size={18} className="text-emerald-600" />
                    <span>Publicar Novo Veículo</span>
                  </button>
                </nav>

                {/* Contato Rápido Comercial */}
                <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                    <IconShieldCheck size={16} />
                    <span>Showroom Regional</span>
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{sellerInfo.address}</p>
                    <p>{sellerInfo.location}</p>
                    <p className="text-blue-600 font-semibold pt-1">
                      WhatsApp: {sellerInfo.whatsapp}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    <p className="font-medium text-slate-700">Horário de Atendimento:</p>
                    <p>Segunda a Sexta: 08h às 18h</p>
                    <p>Sábado: 08h às 12h</p>
                  </div>
                </div>
              </div>

              {/* Destaque de Garantia */}
              <div className="bg-gradient-to-br from-blue-900 to-[#0b1329] text-white p-4 rounded-2xl space-y-2 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  Garantia MotorLocal
                </span>
                <p className="text-xs font-semibold leading-relaxed">
                  Todos os veículos desta revenda contam com histórico transparente e checagem de procedência.
                </p>
              </div>
            </aside>

            {/* MAIN CONTENT AREA (Col span 9) */}
            <div className="lg:col-span-9 flex flex-col space-y-6">
              {/* Top Bar: Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <nav aria-label="Breadcrumbs" className="flex items-center text-xs text-slate-500 space-x-1.5">
                  <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
                    Início
                  </button>
                  <span>/</span>
                  <button onClick={() => onNavigate('search')} className="hover:text-blue-600 transition-colors">
                    Vendedores Verificados
                  </button>
                  <span>/</span>
                  <span className="font-semibold text-slate-800">{sellerInfo.name}</span>
                </nav>
              </div>

              {/* SELLER MASTER DETAILS CARD */}
              <div className="bg-[#f2f3ff] rounded-2xl p-6 sm:p-7 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Seller Avatar Column */}
                  <div className="md:col-span-4 flex flex-col items-start sm:items-center md:items-start text-left">
                    <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3">
                      {sellerInfo.initials}
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {sellerInfo.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sellerInfo.type}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => onNavigate('publish')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                      >
                        <span>Vender Veículo</span>
                        <IconArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Seller Metadata Grid */}
                  <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Segmento</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {sellerInfo.type}
                      </p>
                    </div>

                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Tempo na Plataforma</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {sellerInfo.yearsOnPlatform}
                      </p>
                    </div>

                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Reputação Local</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-bold text-emerald-600">A+ Confiável</span>
                        <IconShieldCheck size={14} className="text-emerald-600" />
                      </div>
                    </div>

                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Polo Regional</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {sellerInfo.location}
                      </p>
                    </div>

                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Endereço Comercial</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                        {sellerInfo.address}
                      </p>
                    </div>

                    <div className="bg-white/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 block">Certificação</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 mt-0.5">
                        100% Laudo FIPE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descrição do Vendedor */}
                <div className="mt-4 pt-4 border-t border-blue-200/60 text-xs text-slate-600 leading-relaxed">
                  {sellerInfo.description}
                </div>
              </div>

              {/* SECTION: METRICS / PERFORMANCE */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Métricas de Performance da Loja
                  </h3>
                  <span className="text-xs text-slate-500">Últimos 30 dias na região</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-[#f2f3ff] rounded-2xl p-4 border border-blue-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs font-medium">Visualizações</span>
                      <IconEye size={18} className="text-blue-600" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-extrabold text-slate-900">4.820</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      ● +18% no Alto Oeste
                    </span>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-[#f2f3ff] rounded-2xl p-4 border border-blue-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs font-medium">Contatos & Leads</span>
                      <span className="text-blue-600 font-bold">💬</span>
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-extrabold text-slate-900">142</span>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      ● Alta conversão
                    </span>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-[#f2f3ff] rounded-2xl p-4 border border-blue-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs font-medium">Veículos no Pátio</span>
                      <IconCar size={18} className="text-slate-600" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-extrabold text-slate-900">{displayVehicles.length}</span>
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                      ● 100% Laudo Cautelar
                    </span>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-[#f2f3ff] rounded-2xl p-4 border border-blue-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-xs font-medium">Alinhamento FIPE</span>
                      <span className="text-emerald-600 font-bold">✓</span>
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-extrabold text-slate-900">98.4%</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      ● Preços Competitivos
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner contextual quando visualizando Anúncios Ativos */}
              {activeTab === 'listings' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Exibindo anúncios ativos de <span className="text-blue-600">{sellerInfo.name}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {displayVehicles.length} {displayVehicles.length === 1 ? 'veículo ativo publicado' : 'veículos ativos publicados'} nesta conta
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-center"
                  >
                    Ver Visão Geral da Loja →
                  </button>
                </div>
              )}

              {/* SECTION: VEHICLE LISTINGS */}
              <div ref={listingsRef} id="anuncios-ativos" className="flex flex-col space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f2f3ff] p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                      <IconCar size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {activeTab === 'listings'
                          ? `Anúncios Ativos de ${sellerInfo.name}`
                          : 'Veículos em Estoque'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {sortedVehicles.length} {sortedVehicles.length === 1 ? 'seminovo disponível' : 'seminovos disponíveis'} para negociação
                      </p>
                    </div>
                  </div>

                  {displayVehicles.length > 0 && (
                    <div className="flex items-center gap-3">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 py-2 px-3 rounded-xl outline-none cursor-pointer shadow-sm"
                      >
                        <option value="recent">Mais Recentes</option>
                        <option value="lowest">Menor Preço</option>
                        <option value="highest">Maior Preço</option>
                      </select>

                      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                            viewMode === 'grid' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Visualização em Grade"
                        >
                          ▦
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                            viewMode === 'list' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Visualização em Lista"
                        >
                          ☰
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filtro por Categoria (quando houver veículos) */}
                {displayVehicles.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['Todos', 'Sedans', 'Picapes', 'SUVs', 'Hatch'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-[#f2f3ff] text-slate-600 hover:bg-blue-50 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grade de Veículos ou Estado Vazio */}
                {sortedVehicles.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                      <IconCar size={32} />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-base font-bold text-slate-900">
                        {displayVehicles.length === 0
                          ? 'Nenhum anúncio ativo cadastrado'
                          : 'Nenhum veículo encontrado nesta categoria'}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {displayVehicles.length === 0
                          ? isOwnProfile
                            ? 'Você ainda não cadastrou nenhum veículo para venda na plataforma. Comece agora mesmo com cotação automática da Tabela FIPE.'
                            : `O vendedor ${sellerInfo.name} não possui veículos ativos disponíveis para negociação no momento.`
                          : 'Tente selecionar outra categoria de veículo para visualizar os anúncios disponíveis.'}
                      </p>
                    </div>
                    {isOwnProfile && displayVehicles.length === 0 && (
                      <button
                        onClick={() => onNavigate('publish')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                      >
                        <span>Publicar Meu Primeiro Veículo</span>
                        <IconArrowRight size={14} />
                      </button>
                    )}
                    {!isOwnProfile && displayVehicles.length === 0 && (
                      <button
                        onClick={() => onNavigate('search')}
                        className="px-5 py-2.5 bg-[#f2f3ff] hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
                      >
                        Explorar Veículos no Portal
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                        : 'grid grid-cols-1 gap-4'
                    }
                  >
                  {sortedVehicles.map((vehicle) => {
                    const isFavorited = favoriteIds.includes(vehicle.id);

                    return (
                      <div
                        key={vehicle.id}
                        className={`bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex ${
                          viewMode === 'grid' ? 'flex-col justify-between' : 'flex-col sm:flex-row items-stretch'
                        }`}
                      >
                        {/* Imagem do veículo */}
                        <div className={`relative ${viewMode === 'grid' ? 'h-48 w-full' : 'sm:w-60 h-48 sm:h-auto'}`}>
                          <img
                            src={vehicle.mainImage}
                            alt={vehicle.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                            {vehicle.fipeBadge && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                                {vehicle.fipeBadge}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 backdrop-blur-sm text-white">
                              Laudo Aprovado
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(vehicle.id);
                            }}
                            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                              isFavorited ? 'bg-white text-red-500' : 'bg-white/90 text-slate-600 hover:text-red-500'
                            }`}
                            title={isFavorited ? 'Remover dos favoritos' : 'Favoritar'}
                          >
                            <IconHeart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                          </button>

                          <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                            <IconMapPin size={11} />
                            {vehicle.location}
                          </div>
                        </div>

                        {/* Detalhes do Veículo */}
                        <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              {vehicle.brand} • {vehicle.year}
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                              {vehicle.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              <span>{vehicle.mileage}</span>
                              <span>•</span>
                              <span>{vehicle.transmission}</span>
                              <span>•</span>
                              <span>{vehicle.fuel}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-baseline justify-between mb-3">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-medium block">
                                  Preço à vista
                                </span>
                                <span className="text-lg font-extrabold text-blue-600">
                                  R$ {vehicle.price.toLocaleString('pt-BR')}
                                </span>
                              </div>
                              {vehicle.fipePrice && (
                                <span className="text-right">
                                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                                    FIPE
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600">
                                    R$ {vehicle.fipePrice.toLocaleString('pt-BR')}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Botão Ver Detalhes (reutiliza a página de detalhes existente) */}
                            <button
                              onClick={() => onSelectVehicle(vehicle)}
                              className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold border border-blue-200 hover:border-transparent transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                            >
                              <IconEye size={15} />
                              Ver Detalhes do Veículo
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

                {/* BOTTOM ACTION STRIP */}
                <div className="bg-gradient-to-r from-blue-900 to-[#0b1329] text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg mt-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center flex-shrink-0">
                      <IconCar size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Quer cadastrar um novo veículo neste estoque?</p>
                      <p className="text-xs text-slate-300">
                        Seus dados da tabela FIPE e fotos serão configurados de forma simplificada.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('publish')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                  >
                    <span>Publicar Anúncio</span>
                    <IconArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
