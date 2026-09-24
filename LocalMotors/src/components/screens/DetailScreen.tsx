import React, { useState } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { MOCK_VEHICLES } from '../../data/mockVehicles';
import {
  IconMapPin,
  IconHeart,
  IconMessageSquare,
  IconFlag,
  IconShieldCheck,
  IconCheck,
} from '../icons/Icons';

interface DetailScreenProps {
  vehicle?: Vehicle;
  favoriteIds?: string[];
  onToggleFavorite?: (vehicleId: string) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  vehicle = MOCK_VEHICLES[0],
  favoriteIds = [],
  onToggleFavorite,
  onNavigate,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInterestModal, setShowInterestModal] = useState(false);

  const isFavorited = favoriteIds.includes(vehicle.id);

  const images = vehicle.gallery && vehicle.gallery.length > 0 ? vehicle.gallery : [vehicle.mainImage];

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
            Início
          </button>
          <span>/</span>
          <button onClick={() => onNavigate('search')} className="hover:text-blue-600 transition-colors">
            Comprar veículo
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate max-w-xs">{vehicle.title}</span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: GALLERY & DETAILS */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Image Viewer */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative">
              <div className="relative h-[360px] sm:h-[450px] bg-slate-100">
                <img
                  src={images[activeImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />

                {/* Badges Top Left */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-md shadow-sm">
                    Ativo
                  </span>
                  {vehicle.fipeBadge && (
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-md shadow-sm">
                      {vehicle.fipeBadge}
                    </span>
                  )}
                </div>

                {/* Heart Button Top Right */}
                <button
                  onClick={() => onToggleFavorite?.(vehicle.id)}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all z-10 ${
                    isFavorited ? 'bg-white text-red-500 scale-105' : 'bg-white/90 text-slate-700 hover:text-red-500'
                  }`}
                  title={isFavorited ? 'Remover dos favoritos' : 'Favoritar'}
                >
                  <IconHeart size={20} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                </button>
              </div>

              {/* Thumbnails row */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-20 sm:h-24 rounded-xl overflow-hidden border-2 transition-all relative ${
                      activeImageIndex === idx
                        ? 'border-blue-600 shadow-md scale-[1.02]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* ESPECIFICAÇÕES TÉCNICAS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Especificações Técnicas
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Ano</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.year}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Quilometragem</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.mileage}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Cidade</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.location}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Câmbio</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.transmission}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Combustível</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.fuel}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Cor</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.color}</span>
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO DO ANUNCIANTE */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Descrição do Anunciante
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                {vehicle.description}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            {/* PRICING & ACTION CARD */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {vehicle.brand}
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {vehicle.title}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <IconMapPin size={14} className="text-blue-600" />
                  <span>{vehicle.location}</span>
                </div>
              </div>

              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Preço MotorLocal</span>
                  <span className="text-2xl font-extrabold text-blue-600">
                    R$ {vehicle.price.toLocaleString('pt-BR')}
                  </span>
                </div>
                {vehicle.fipePrice && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-medium">Preço FIPE</span>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {vehicle.fipePrice.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Primary action */}
              <button
                onClick={() => setShowInterestModal(true)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                <IconMessageSquare size={18} />
                Tenho interesse
              </button>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => onToggleFavorite?.(vehicle.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isFavorited
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <IconHeart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                  {isFavorited ? 'Salvo nos favoritos' : 'Favoritar'}
                </button>

                <button
                  onClick={() => alert('Anúncio denunciado para análise da equipe MotorLocal.')}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <IconFlag size={16} />
                  Denunciar
                </button>
              </div>
            </div>

            {/* SELLER CARD */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center border border-blue-200 shrink-0">
                  {vehicle.seller.initials}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{vehicle.seller.name}</h3>
                  <span className="text-[11px] font-semibold text-blue-600 block">
                    {vehicle.seller.type}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {vehicle.seller.description}
              </p>

              <button
                onClick={() => setShowInterestModal(true)}
                className="w-full py-3 px-4 bg-slate-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <IconMessageSquare size={16} />
                Conversar com anunciante
              </button>
            </div>

            {/* SAFETY TIPS CARD */}
            <div className="bg-blue-50/40 rounded-2xl p-6 border border-blue-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Dicas de Segurança
              </h3>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <IconShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Prefira negociar em locais públicos e movimentados.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Não faça nenhum pagamento antecipado antes de ver o veículo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Verifique a documentação e laudo cautelar.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* INTEREST MODAL */}
      {showInterestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Contato com o Anunciante</h3>
              <button
                onClick={() => setShowInterestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Você está interessado em <strong className="text-slate-800">{vehicle.title}</strong> com o vendedor{' '}
              <strong className="text-slate-800">{vehicle.seller.name}</strong>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Mensagem enviada com sucesso ao anunciante!');
                setShowInterestModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp ou E-mail</label>
                <input
                  type="text"
                  required
                  placeholder="(84) 99999-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mensagem</label>
                <textarea
                  rows={3}
                  defaultValue={`Olá, vi o anúncio do ${vehicle.title} no MotorLocal e gostaria de mais informações.`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <IconCheck size={16} />
                Enviar Mensagem
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
