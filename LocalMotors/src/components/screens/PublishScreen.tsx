import React, { useState, useEffect, useRef } from 'react';
import type { ScreenType } from '../../types/vehicle';
import { noSqlInsertVehicle } from '../../services/noSqlVehicleService';
import type { VehicleDocument } from '../../services/noSqlVehicleService';
import {
  fetchFipeMarcas,
  fetchFipeModelos,
  fetchFipeAnos,
  fetchFipePreco,
  parseFipeValor,
  calcFipeDifference,
} from '../../services/fipeService';
import type { FipeMarca, FipeModelo, FipeAno, FipeTipoVeiculo } from '../../services/fipeService';
import { IconCar, IconMapPin, IconCheck } from '../icons/Icons';

interface PublishScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

type PublishStep = 1 | 2 | 3;

export const PublishScreen: React.FC<PublishScreenProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState<PublishStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ── Step 1: Dados do Veículo + FIPE ────────────────────────────────────
  const [vehicleType, setVehicleType] = useState<FipeTipoVeiculo>('carros');
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('Manual');
  const [fuel, setFuel] = useState('Flex');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  // ── Step 2: Localização e Vendedor ────────────────────────────────────
  const [city, setCity] = useState('Pau dos Ferros - RN');
  const [sellerName, setSellerName] = useState('');
  const [sellerType, setSellerType] = useState('Particular');
  const [sellerDescription, setSellerDescription] = useState('');

  // ── Step 3: Fotos ──────────────────────────────────────────────────────
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState('');

  // ── FIPE States ────────────────────────────────────────────────────────
  const [fipeMarcas, setFipeMarcas] = useState<FipeMarca[]>([]);
  const [fipeModelos, setFipeModelos] = useState<FipeModelo[]>([]);
  const [fipeAnos, setFipeAnos] = useState<FipeAno[]>([]);
  const [selectedFipeMarca, setSelectedFipeMarca] = useState('');
  const [selectedFipeModelo, setSelectedFipeModelo] = useState('');
  const [selectedFipeAno, setSelectedFipeAno] = useState('');
  const [fipePrice, setFipePrice] = useState<number | null>(null);
  const [fipeLabel, setFipeLabel] = useState('');
  const [loadingFipe, setLoadingFipe] = useState(false);

  // ── Carregar marcas FIPE ao montar ────────────────────────────────────
  useEffect(() => {
    const loadMarcas = async () => {
      try {
        const marcas = await fetchFipeMarcas(vehicleType);
        setFipeMarcas(marcas);
      } catch (err) {
        console.error('Erro ao carregar marcas FIPE:', err);
      }
    };
    loadMarcas();
    // Reset dependentes
    setFipeModelos([]);
    setFipeAnos([]);
    setSelectedFipeMarca('');
    setSelectedFipeModelo('');
    setSelectedFipeAno('');
    setFipePrice(null);
    setFipeLabel('');
  }, [vehicleType]);

  // ── Carregar modelos ao selecionar marca ──────────────────────────────
  useEffect(() => {
    if (!selectedFipeMarca) return;
    const loadModelos = async () => {
      try {
        const resp = await fetchFipeModelos(vehicleType, selectedFipeMarca);
        setFipeModelos(resp.modelos);
        setFipeAnos([]);
        setSelectedFipeModelo('');
        setSelectedFipeAno('');
        setFipePrice(null);
      } catch (err) {
        console.error('Erro ao carregar modelos FIPE:', err);
      }
    };
    loadModelos();
  }, [selectedFipeMarca, vehicleType]);

  // ── Carregar anos ao selecionar modelo ────────────────────────────────
  useEffect(() => {
    if (!selectedFipeMarca || !selectedFipeModelo) return;
    const loadAnos = async () => {
      try {
        const anos = await fetchFipeAnos(vehicleType, selectedFipeMarca, selectedFipeModelo);
        setFipeAnos(anos);
        setSelectedFipeAno('');
        setFipePrice(null);
      } catch (err) {
        console.error('Erro ao carregar anos FIPE:', err);
      }
    };
    loadAnos();
  }, [selectedFipeModelo, selectedFipeMarca, vehicleType]);

  // ── Buscar preço FIPE ao selecionar ano ───────────────────────────────
  useEffect(() => {
    if (!selectedFipeMarca || !selectedFipeModelo || !selectedFipeAno) return;
    const loadPreco = async () => {
      setLoadingFipe(true);
      try {
        const preco = await fetchFipePreco(
          vehicleType,
          selectedFipeMarca,
          selectedFipeModelo,
          selectedFipeAno
        );
        const fipeVal = parseFipeValor(preco.Valor);
        setFipePrice(fipeVal);

        const askingPrice = parseFloat(price.replace(/\D/g, '')) || 0;
        if (askingPrice > 0 && fipeVal > 0) {
          const diff = calcFipeDifference(askingPrice, fipeVal);
          setFipeLabel(diff.label);
        }
      } catch (err) {
        console.error('Erro ao buscar preço FIPE:', err);
      } finally {
        setLoadingFipe(false);
      }
    };
    loadPreco();
  }, [selectedFipeAno, selectedFipeMarca, selectedFipeModelo, vehicleType, price]);

  // ── Formatação de preço ───────────────────────────────────────────────
  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    return parseInt(numbers, 10).toLocaleString('pt-BR');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(formatPrice(e.target.value));
  };

  // ── Submit do formulário ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const numericPrice = parseInt(price.replace(/\D/g, ''), 10) || 0;
      const numericMileage = parseInt(mileage.replace(/\D/g, ''), 10) || 0;
      const initials = sellerName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const galleryArray = galleryUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);

      if (mainImageUrl && !galleryArray.includes(mainImageUrl)) {
        galleryArray.unshift(mainImageUrl);
      }

      const vehicleTypeMap: Record<FipeTipoVeiculo, 'carro' | 'moto' | 'utilitario'> = {
        carros: 'carro',
        motos: 'moto',
        caminhoes: 'utilitario',
      };

      const newVehicleData: Omit<VehicleDocument, '_id' | 'createdAt' | 'updatedAt'> = {
        title,
        brand,
        model,
        year,
        mileage: numericMileage,
        mileageFormatted: `${numericMileage.toLocaleString('pt-BR')} km`,
        location: city,
        city: city.split(' - ')[0]?.trim() || city,
        state: city.split(' - ')[1]?.trim() || 'RN',
        price: numericPrice,
        fipePrice: fipePrice ?? 0,
        fipeBadge: fipeLabel || null,
        badges: [],
        transmission,
        fuel,
        color,
        featured: false,
        mainImage: mainImageUrl || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        gallery: galleryArray.length > 0 ? galleryArray : [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        ],
        seller: {
          name: sellerName,
          type: sellerType === 'pj' ? 'Revendedora Verificada' : 'Particular',
          initials,
          description: sellerDescription,
          verified: sellerType === 'pj',
        },
        description,
        vehicleType: vehicleTypeMap[vehicleType],
      };

      const doc = await noSqlInsertVehicle(newVehicleData);
      console.log('[PublishScreen] Veículo publicado com sucesso:', JSON.stringify(doc, null, 2));

      setIsSuccess(true);
    } catch (err) {
      console.error('Erro ao publicar veículo:', err);
      alert('Erro ao publicar anúncio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoToStep2 = title && brand && model && year && price;
  const canGoToStep3 = sellerName && city;

  // ── STEP INDICATOR ────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              currentStep === step
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : currentStep > step
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {currentStep > step ? <IconCheck size={18} /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 sm:w-24 h-1 rounded-full transition-all ${
                currentStep > step ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Tela de sucesso ───────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center px-4 font-sans">
        <div className="bg-white rounded-3xl p-10 sm:p-14 max-w-lg w-full text-center border border-slate-200/80 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <IconCheck size={40} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
            Anúncio Publicado!
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Seu veículo foi cadastrado com sucesso na plataforma MotorLocal.
            Agora compradores de toda a região poderão encontrá-lo.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigate('search')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              Ver meus anúncios
            </button>
            <button
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
                setTitle('');
                setBrand('');
                setModel('');
                setYear('');
                setMileage('');
                setPrice('');
                setDescription('');
                setMainImageUrl('');
                setGalleryUrls('');
                setSellerName('');
                setSellerDescription('');
              }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
            >
              Publicar outro veículo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#0b1329] to-[#0f2a6b] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-medium text-blue-300 mb-4">
            <IconCar size={14} />
            Publicar Anúncio
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Anuncie seu veículo
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
            Preencha os dados e alcance compradores de toda a região do Alto Oeste Potiguar.
          </p>
        </div>
      </div>

      {/* FORM CONTAINER */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
          <StepIndicator />

          <form ref={formRef} onSubmit={handleSubmit}>
            {/* ════════════════════════════════════════════════════════════ */}
            {/* STEP 1: Dados do Veículo */}
            {/* ════════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <IconCar size={22} className="text-blue-600" />
                  Dados do Veículo
                </h2>

                {/* Tipo de veículo */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Tipo de Veículo
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'carros', label: 'Carro / Picape' },
                      { value: 'motos', label: 'Moto' },
                      { value: 'caminhoes', label: 'Utilitário' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVehicleType(opt.value)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                          vehicleType === opt.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Título do Anúncio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Toyota Corolla XEi 2.0 Flex"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Marca e Modelo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Marca *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Toyota"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Corolla XEi 2.0"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Ano e KM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Ano *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2021 / 2021"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Quilometragem
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 58000"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Câmbio, Combustível, Cor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Câmbio</label>
                    <select
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Automático">Automático</option>
                      <option value="Automático (CVT)">Automático (CVT)</option>
                      <option value="Semi-automático">Semi-automático</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Combustível
                    </label>
                    <select
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Elétrico">Elétrico</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Cor</label>
                    <input
                      type="text"
                      placeholder="Ex: Prata"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Preço */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 89.900"
                    value={price}
                    onChange={handlePriceChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* ── Consulta FIPE (Esqueleto) ──────────────────────── */}
                <div className="bg-emerald-50/70 rounded-xl border border-emerald-200/70 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Consulta Tabela FIPE
                  </h3>
                  <p className="text-xs text-emerald-700/80">
                    Compare o preço do seu veículo com a tabela FIPE oficial. Selecione marca, modelo e ano abaixo:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-800 block mb-1">
                        Marca FIPE
                      </label>
                      <select
                        value={selectedFipeMarca}
                        onChange={(e) => setSelectedFipeMarca(e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer focus:border-emerald-500"
                      >
                        <option value="">Selecione...</option>
                        {fipeMarcas.map((m) => (
                          <option key={m.codigo} value={m.codigo}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-emerald-800 block mb-1">
                        Modelo FIPE
                      </label>
                      <select
                        value={selectedFipeModelo}
                        onChange={(e) => setSelectedFipeModelo(e.target.value)}
                        disabled={fipeModelos.length === 0}
                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer focus:border-emerald-500 disabled:opacity-50"
                      >
                        <option value="">Selecione...</option>
                        {fipeModelos.map((m) => (
                          <option key={m.codigo} value={String(m.codigo)}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-emerald-800 block mb-1">
                        Ano FIPE
                      </label>
                      <select
                        value={selectedFipeAno}
                        onChange={(e) => setSelectedFipeAno(e.target.value)}
                        disabled={fipeAnos.length === 0}
                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer focus:border-emerald-500 disabled:opacity-50"
                      >
                        <option value="">Selecione...</option>
                        {fipeAnos.map((a) => (
                          <option key={a.codigo} value={a.codigo}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resultado FIPE */}
                  {loadingFipe && (
                    <div className="text-xs text-emerald-600 font-medium animate-pulse">
                      Consultando tabela FIPE...
                    </div>
                  )}
                  {fipePrice !== null && fipePrice > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-emerald-200">
                      <div>
                        <span className="text-[11px] text-emerald-600 font-medium block">
                          Preço FIPE
                        </span>
                        <span className="text-lg font-extrabold text-emerald-700">
                          R$ {fipePrice.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {fipeLabel && (
                        <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full">
                          {fipeLabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Descrição do Veículo
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Descreva as condições, opcionais, histórico de revisões..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={!canGoToStep2}
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  Próximo: Dados do Vendedor →
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* STEP 2: Localização e Vendedor */}
            {/* ════════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <IconMapPin size={22} className="text-blue-600" />
                  Localização e Vendedor
                </h2>

                {/* Cidade */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Cidade *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="Pau dos Ferros - RN">Pau dos Ferros - RN</option>
                    <option value="Alexandria - RN">Alexandria - RN</option>
                    <option value="São Miguel - RN">São Miguel - RN</option>
                    <option value="Apodi - RN">Apodi - RN</option>
                    <option value="Portalegre - RN">Portalegre - RN</option>
                  </select>
                </div>

                {/* Nome do vendedor */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Nome do Vendedor / Loja *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Motors ou João Silva"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Tipo de vendedor */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Tipo de Vendedor
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSellerType('pf')}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        sellerType === 'pf'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      Particular (PF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerType('pj')}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        sellerType === 'pj'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      Revendedora (PJ)
                    </button>
                  </div>
                </div>

                {/* Descrição do vendedor */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Sobre o vendedor
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Breve descrição sobre você ou sua loja..."
                    value={sellerDescription}
                    onChange={(e) => setSellerDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!canGoToStep3}
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
                  >
                    Próximo: Fotos →
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* STEP 3: Fotos e Publicação */}
            {/* ════════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  📷 Fotos do Veículo
                </h2>

                {/* Imagem principal */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    URL da Foto Principal
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto-principal.jpg"
                    value={mainImageUrl}
                    onChange={(e) => setMainImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                {/* Preview */}
                {mainImageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100">
                    <img
                      src={mainImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                  </div>
                )}

                {/* Galeria */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    URLs das fotos adicionais (uma por linha)
                  </label>
                  <textarea
                    rows={4}
                    placeholder={"https://exemplo.com/foto2.jpg\nhttps://exemplo.com/foto3.jpg"}
                    value={galleryUrls}
                    onChange={(e) => setGalleryUrls(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                {/* Resumo */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Resumo do Anúncio</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-slate-500">Título:</span>
                    <span className="font-semibold text-slate-800">{title}</span>
                    <span className="text-slate-500">Marca / Modelo:</span>
                    <span className="font-semibold text-slate-800">{brand} {model}</span>
                    <span className="text-slate-500">Ano:</span>
                    <span className="font-semibold text-slate-800">{year}</span>
                    <span className="text-slate-500">Preço:</span>
                    <span className="font-extrabold text-blue-600">R$ {price}</span>
                    <span className="text-slate-500">Cidade:</span>
                    <span className="font-semibold text-slate-800">{city}</span>
                    <span className="text-slate-500">Vendedor:</span>
                    <span className="font-semibold text-slate-800">{sellerName}</span>
                    {fipePrice !== null && fipePrice > 0 && (
                      <>
                        <span className="text-slate-500">FIPE:</span>
                        <span className="font-bold text-emerald-600">
                          R$ {fipePrice.toLocaleString('pt-BR')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? 'Publicando...' : '🚀 Publicar Anúncio'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
