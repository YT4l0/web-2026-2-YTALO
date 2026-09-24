import React from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { MOCK_VEHICLES } from '../../data/mockVehicles';
import {
  IconHeart,
  IconMapPin,
  IconArrowRight,
  IconCar,
} from '../icons/Icons';

interface FavoritesScreenProps {
  favoriteIds: string[];
  onToggleFavorite: (vehicleId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  favoriteIds,
  onToggleFavorite,
  onNavigate,
  onSelectVehicle,
}) => {
  const favoritedVehicles = MOCK_VEHICLES.filter((v) => favoriteIds.includes(v.id));

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* BREADCRUMB & HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
            Início
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">Favoritos</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Meus Veículos Favoritos
              </h1>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {favoritedVehicles.length} {favoritedVehicles.length === 1 ? 'salvo' : 'salvos'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gerencie seus anúncios salvos para comparar preços e negociar na região quando quiser.
            </p>
          </div>

          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <IconCar size={16} />
            Explorar catálogo
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {favoritedVehicles.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-sm">
              <IconHeart size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Sua lista de favoritos está vazia
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Você ainda não salvou nenhum veículo nos favoritos. Navegue pelo catálogo de carros, motos e utilitários e clique no ícone de coração para salvar seus anúncios preferidos.
              </p>
            </div>

            <button
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              Explorar veículos na região
              <IconArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* FAVORITES GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritedVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                {/* Image Header */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
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
                        className={`text-[10px] font-bold px-2.5 py-1 rounded shadow-sm ${
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

                  {/* Remove from favorites heart button top right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(vehicle.id);
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-red-500 fill-red-500 hover:scale-110 transition-transform z-10"
                    title="Remover dos favoritos"
                  >
                    <IconHeart size={18} fill="currentColor" className="fill-red-500 text-red-500" />
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

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectVehicle(vehicle)}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(vehicle.id);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors text-center"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
