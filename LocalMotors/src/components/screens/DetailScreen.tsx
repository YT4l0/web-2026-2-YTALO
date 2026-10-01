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
  IconUser,
  IconCar,
} from '../icons/Icons';

interface DetailScreenProps {
  vehicle?: Vehicle;
  favoriteIds?: string[];
  onToggleFavorite?: (vehicleId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onViewSeller?: (sellerName: string) => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  vehicle = MOCK_VEHICLES[0],
  favoriteIds = [],
  onToggleFavorite,
  onNavigate,
  onViewSeller,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Preço suspeito ou abusivo');
  const [reportDetails, setReportDetails] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const isFavorited = favoriteIds.includes(vehicle.id);
  const images = vehicle.gallery && vehicle.gallery.length > 0 ? vehicle.gallery : [vehicle.mainImage];

  const handleToggleFav = () => {
    onToggleFavorite?.(vehicle.id);
    triggerToast(!isFavorited ? 'Adicionado aos favoritos!' : 'Removido dos favoritos');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReportModal(false);
    triggerToast('Denúncia enviada com sucesso para moderação.');
  };

  const handleOpenSeller = () => {
    if (onViewSeller) {
      onViewSeller(vehicle.seller.name);
    } else {
      onNavigate('seller');
    }
  };

  return (
    <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] pb-16 font-sans">
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
          <span className="font-semibold text-slate-900 truncate max-w-xs">{vehicle.title}</span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: GALLERY & DETAILS */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Image Viewer */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative group">
              <div className="relative h-[360px] sm:h-[480px] bg-slate-100 overflow-hidden">
                <img
                  src={images[activeImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {/* Badges Top Left */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-xl shadow-sm">
                    Ativo
                  </span>
                  {vehicle.fipeBadge && (
                    <span className="bg-[#006c4a] text-white text-xs font-bold px-3 py-1 rounded-xl shadow-sm">
                      {vehicle.fipeBadge}
                    </span>
                  )}
                </div>

                {/* Heart Button Top Right */}
                <button
                  onClick={handleToggleFav}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all z-10 ${
                    isFavorited
                      ? 'bg-white text-red-500 scale-105'
                      : 'bg-white/90 text-slate-700 hover:text-red-500 hover:bg-white'
                  }`}
                  title={isFavorited ? 'Remover dos favoritos' : 'Favoritar'}
                >
                  <IconHeart size={20} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                </button>

                {/* Local pill bottom left */}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                  <IconMapPin size={13} className="text-blue-400" />
                  <span>{vehicle.location}</span>
                </div>
              </div>

              {/* Thumbnails row */}
              <div className="p-4 bg-[#f2f3ff] border-t border-slate-100 grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-20 sm:h-24 rounded-xl overflow-hidden border-2 transition-all relative ${
                      activeImageIndex === idx
                        ? 'border-blue-600 shadow-md scale-[1.02] ring-2 ring-blue-500/20'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* ESPECIFICAÇÕES TÉCNICAS */}
            <div className="bg-[#f2f3ff] rounded-2xl p-6 border border-blue-100/80 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-blue-200/60 pb-3 flex items-center gap-2">
                <IconCar size={20} className="text-blue-600" />
                Especificações Técnicas
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Ano Fabricação/Modelo</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.year}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Quilometragem</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.mileage}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Cidade Regional</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.location}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Câmbio</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.transmission}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Combustível</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.fuel}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Cor Predominante</span>
                  <span className="text-sm font-bold text-slate-900">{vehicle.color}</span>
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO DO ANUNCIANTE */}
            <div className="bg-[#f2f3ff] rounded-2xl p-6 border border-blue-100/80 shadow-sm space-y-3">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-blue-200/60 pb-3">
                Descrição do Anunciante
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed pt-1">
                {vehicle.description}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            {/* PRICING & ACTION CARD */}
            <div className="bg-[#f2f3ff] rounded-2xl p-6 border border-blue-100 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  {vehicle.brand}
                </span>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">
                  {vehicle.title}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <IconMapPin size={14} className="text-blue-600" />
                  <span>{vehicle.location}</span>
                </div>
              </div>

              {/* Price comparison box */}
              <div className="bg-white rounded-xl p-4 border border-blue-200/80 flex items-baseline justify-between shadow-xs">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Preço MotorLocal</span>
                  <span className="text-2xl font-black text-blue-600">
                    R$ {vehicle.price.toLocaleString('pt-BR')}
                  </span>
                </div>
                {vehicle.fipePrice && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-medium">Preço FIPE</span>
                    <span className="text-sm font-bold text-emerald-700">
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
                  onClick={handleToggleFav}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isFavorited
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <IconHeart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                  {isFavorited ? 'Favoritado' : 'Favoritar'}
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50/60 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <IconFlag size={16} />
                  Denunciar
                </button>
              </div>
            </div>

            {/* SELLER CARD */}
            <div className="bg-[#f2f3ff] rounded-2xl p-6 border border-blue-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div
                  onClick={handleOpenSeller}
                  className="w-13 h-13 rounded-2xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0 cursor-pointer hover:bg-blue-500 transition-colors"
                  title="Ver perfil do vendedor"
                >
                  {vehicle.seller.initials}
                </div>
                <div className="flex-1 cursor-pointer" onClick={handleOpenSeller}>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                      {vehicle.seller.name}
                    </h3>
                    {vehicle.seller.verified && (
                      <span className="text-blue-600" title="Revendedor Verificado">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 block">
                    {vehicle.seller.type}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {vehicle.seller.description}
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleOpenSeller}
                  className="w-full py-2.5 px-4 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <IconUser size={15} />
                  Ver Perfil e Estoque do Vendedor
                </button>

                <button
                  onClick={() => setShowInterestModal(true)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <IconMessageSquare size={15} />
                  Conversar com anunciante
                </button>
              </div>
            </div>

            {/* SAFETY TIPS CARD */}
            <div className="bg-[#f2f3ff] rounded-2xl p-6 border border-blue-100 space-y-3">
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
                className="text-slate-400 hover:text-slate-600 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
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
                setShowInterestModal(false);
                triggerToast(`Mensagem enviada com sucesso para ${vehicle.seller.name}!`);
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp ou Telefone</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
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

      {/* REPORT MODAL (From Stitch) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Denunciar Anúncio</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Informe o motivo da denúncia para que a equipe MotorLocal analise este anúncio.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="space-y-2.5">
                {[
                  'Preço suspeito ou abusivo',
                  'Veículo já vendido',
                  'Fotos ou informações falsas',
                  'Outro motivo',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-blue-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Detalhes adicionais (opcional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Explique o problema observado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md transition-colors"
                >
                  Enviar denúncia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <IconCheck size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
