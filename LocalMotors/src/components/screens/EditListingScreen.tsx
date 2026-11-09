import React, { useState, useEffect } from 'react';
import type { ScreenType } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import {
  type VehicleDocument,
  noSqlFindVehicleById,
  noSqlUpdateVehicle,
} from '../../services/noSqlVehicleService';

interface EditListingScreenProps {
  vehicleId: string | null;
  onNavigate: (screen: ScreenType) => void;
  onSuccess?: (message?: string) => void;
}

export const EditListingScreen: React.FC<EditListingScreenProps> = ({
  vehicleId,
  onNavigate,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unauthorizedOrNotFound, setUnauthorizedOrNotFound] = useState<boolean>(false);
  const [doc, setDoc] = useState<VehicleDocument | null>(null);

  // Campos editáveis
  const [title, setTitle] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [transmission, setTransmission] = useState<string>('Automático');
  const [fuel, setFuel] = useState<string>('Flex');
  const [color, setColor] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Fotos
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Estados de envio e validação
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadVehicle = async () => {
      if (!vehicleId || !user?.id) {
        if (isMounted) {
          setUnauthorizedOrNotFound(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const found = await noSqlFindVehicleById(vehicleId);
        if (!isMounted) return;

        if (!found || found.ownerId !== user.id) {
          setUnauthorizedOrNotFound(true);
          setIsLoading(false);
          return;
        }

        setDoc(found);
        setTitle(found.title);
        setPrice(String(found.price));
        setMileage(String(found.mileage));
        setTransmission(found.transmission || 'Automático');
        setFuel(found.fuel || 'Flex');
        setColor(found.color || '');
        setCity(found.city || found.location);
        setDescription(found.description || '');

        const rawList = [found.mainImage, ...(found.gallery || [])].filter(Boolean);
        const uniqueList = Array.from(new Set(rawList));
        setPhotos(uniqueList.length > 0 ? uniqueList : [found.mainImage]);
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao buscar veículo para edição:', err);
        if (isMounted) {
          setUnauthorizedOrNotFound(true);
          setIsLoading(false);
        }
      }
    };

    loadVehicle();

    return () => {
      isMounted = false;
    };
  }, [vehicleId, user?.id]);

  const handleAddPhoto = () => {
    const trimmed = newPhotoUrl.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('https://')) {
      setPhotoError('A URL da foto deve começar com https://');
      return;
    }

    setPhotoError(null);
    setPhotos((prev) => [...prev, trimmed]);
    setNewPhotoUrl('');
    if (errors.photos) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photos;
        return next;
      });
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (photos.length <= 1) {
      setPhotoError('O anúncio deve possuir pelo menos 1 foto.');
      return;
    }

    setPhotoError(null);
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 5) {
      nextErrors.title = 'O título deve ter no mínimo 5 caracteres.';
    }

    const numPrice = Number(price);
    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      nextErrors.price = 'Informe um preço válido maior que zero.';
    }

    const numMileage = Number(mileage);
    if (mileage.trim() === '' || isNaN(numMileage) || numMileage < 0) {
      nextErrors.mileage = 'Informe uma quilometragem válida (maior ou igual a 0).';
    }

    if (!city.trim()) {
      nextErrors.city = 'A cidade é obrigatória.';
    }

    if (!description.trim() || description.trim().length < 20) {
      nextErrors.description = 'A descrição deve ter no mínimo 20 caracteres.';
    }

    if (photos.length === 0) {
      nextErrors.photos = 'Adicione pelo menos 1 foto ao anúncio.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (!vehicleId || !user?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const numPrice = Number(price);
      const numMileage = Number(mileage);
      const trimmedCity = city.trim();
      const cityParts = trimmedCity.split(' - ');
      const cityName = cityParts[0]?.trim() || trimmedCity;
      const stateName = cityParts[1]?.trim() || (doc?.state || 'RN');
      const locationString = cityParts.length > 1 ? trimmedCity : `${cityName} - ${stateName}`;

      const updates: Partial<VehicleDocument> = {
        title: title.trim(),
        price: numPrice,
        mileage: numMileage,
        mileageFormatted: `${numMileage.toLocaleString('pt-BR')} km`,
        location: locationString,
        city: cityName,
        state: stateName,
        transmission: transmission.trim(),
        fuel: fuel.trim(),
        color: color.trim(),
        description: description.trim(),
        mainImage: photos[0],
        gallery: photos,
      };

      await noSqlUpdateVehicle(vehicleId, updates, user.id);

      if (onSuccess) {
        onSuccess('Anúncio atualizado.');
      } else {
        onNavigate('myListings');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar o anúncio.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center py-20 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium">Carregando dados do anúncio...</span>
        </div>
      </div>
    );
  }

  if (unauthorizedOrNotFound || !doc) {
    return (
      <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Anúncio não encontrado ou sem permissão para editar.
            </h1>
            <p className="text-sm text-slate-500">
              O anúncio solicitado não existe ou você não possui permissão para editá-lo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('myListings')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
          >
            Voltar para Meus anúncios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* HEADER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-blue-600 transition-colors"
          >
            Início
          </button>
          <span>/</span>
          <button
            onClick={() => onNavigate('myListings')}
            className="hover:text-blue-600 transition-colors"
          >
            Meus anúncios
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">Editar anúncio</span>
        </div>

        <div className="border-b border-slate-200/80 pb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Editar anúncio
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atualize as informações comerciais, valor e fotos do seu veículo anunciado.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ERRO DE ENVIO */}
        {submitError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-3 shadow-sm"
          >
            <p className="text-sm font-semibold">{submitError}</p>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-xs font-bold text-red-700 hover:text-red-900 px-2 py-1"
              aria-label="Fechar erro"
            >
              Fechar
            </button>
          </div>
        )}

        {/* DADOS SOMENTE LEITURA */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Dados cadastrais do veículo (somente leitura)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Marca</span>
              <span className="text-sm font-bold text-slate-800">{doc.brand}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Modelo</span>
              <span className="text-sm font-bold text-slate-800">{doc.model}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Ano</span>
              <span className="text-sm font-bold text-slate-800">{doc.year}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Tipo</span>
              <span className="text-sm font-bold text-slate-800 capitalize">{doc.vehicleType}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block font-medium">Referência FIPE</span>
              <span className="text-sm font-bold text-emerald-600">
                {doc.fipePrice ? `R$ ${doc.fipePrice.toLocaleString('pt-BR')}` : '-'}
              </span>
              {doc.fipeBadge && (
                <span className="text-[10px] text-slate-500 block truncate" title={doc.fipeBadge}>
                  {doc.fipeBadge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE EDIÇÃO */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Informações Editáveis
          </h2>

          {/* TÍTULO */}
          <div>
            <label htmlFor="field-title" className="block text-xs font-bold text-slate-700 mb-1">
              Título do anúncio *
            </label>
            <input
              id="field-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.title
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
              placeholder="Ex: Toyota Corolla XEi 2.0 Automático Único Dono"
              aria-describedby={errors.title ? 'error-title' : undefined}
            />
            {errors.title && (
              <p id="error-title" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                {errors.title}
              </p>
            )}
          </div>

          {/* PREÇO E QUILOMETRAGEM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-price" className="block text-xs font-bold text-slate-700 mb-1">
                Preço (R$) *
              </label>
              <input
                id="field-price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.price
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
                placeholder="Ex: 89900"
                aria-describedby={errors.price ? 'error-price' : undefined}
              />
              {errors.price && (
                <p id="error-price" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="field-mileage" className="block text-xs font-bold text-slate-700 mb-1">
                Quilometragem (km) *
              </label>
              <input
                id="field-mileage"
                type="number"
                min="0"
                step="1"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.mileage
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
                placeholder="Ex: 45000"
                aria-describedby={errors.mileage ? 'error-mileage' : undefined}
              />
              {errors.mileage && (
                <p id="error-mileage" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                  {errors.mileage}
                </p>
              )}
            </div>
          </div>

          {/* CÂMBIO, COMBUSTÍVEL E COR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-transmission" className="block text-xs font-bold text-slate-700 mb-1">
                Câmbio *
              </label>
              <select
                id="field-transmission"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="Automático">Automático</option>
                <option value="Manual">Manual</option>
                <option value="Automático (CVT)">Automático (CVT)</option>
                <option value="Automatizado">Automatizado</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-fuel" className="block text-xs font-bold text-slate-700 mb-1">
                Combustível *
              </label>
              <select
                id="field-fuel"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="Flex">Flex</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Elétrico">Elétrico</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-color" className="block text-xs font-bold text-slate-700 mb-1">
                Cor *
              </label>
              <input
                id="field-color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Ex: Prata, Branco, Preto"
              />
            </div>
          </div>

          {/* CIDADE */}
          <div>
            <label htmlFor="field-city" className="block text-xs font-bold text-slate-700 mb-1">
              Cidade / Localização *
            </label>
            <input
              id="field-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.city
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
              placeholder="Ex: Pau dos Ferros - RN"
              aria-describedby={errors.city ? 'error-city' : undefined}
            />
            {errors.city && (
              <p id="error-city" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                {errors.city}
              </p>
            )}
          </div>

          {/* DESCRIÇÃO */}
          <div>
            <label htmlFor="field-description" className="block text-xs font-bold text-slate-700 mb-1">
              Descrição do anúncio * (mínimo de 20 caracteres)
            </label>
            <textarea
              id="field-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 transition-all resize-y ${
                errors.description
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
              placeholder="Descreva opcionais, estado de conservação, revisões feitas, documentação e detalhes que valorizem o seu veículo..."
              aria-describedby={errors.description ? 'error-description' : undefined}
            />
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              {errors.description ? (
                <p id="error-description" role="alert" className="text-xs text-red-600 font-medium">
                  {errors.description}
                </p>
              ) : (
                <span>Mínimo 20 caracteres</span>
              )}
              <span>{description.trim().length} caracteres</span>
            </div>
          </div>

          {/* FOTOS */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Fotos do anúncio
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                A primeira foto da lista é a foto principal exibida nas buscas e cartões. Mínimo de 1 foto.
              </p>
            </div>

            {/* Adicionar nova foto */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://exemplo.com/foto-do-veiculo.jpg"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-label="URL da nova foto"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
              >
                Adicionar foto
              </button>
            </div>

            {photoError && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {photoError}
              </p>
            )}
            {errors.photos && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {errors.photos}
              </p>
            )}

            {/* Grid de miniaturas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {photos.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      Principal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow hover:scale-105 transition-all"
                    aria-label={`Remover foto ${idx + 1}`}
                    title="Remover foto"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('myListings')}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Salvando alterações...</span>
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
