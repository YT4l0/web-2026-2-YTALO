import React, { useState, useEffect } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { noSqlInsertVehicle } from '../../services/noSqlVehicleService';
import type { VehicleDocument } from '../../services/noSqlVehicleService';
import { getActiveSession, toggleUserConfirmation } from '../../services/noSqlAuthService';
import type { UserDocument } from '../../services/noSqlAuthService';
import {
  fetchFipeMarcas,
  fetchFipeModelos,
  fetchFipeAnos,
  fetchFipePreco,
  parseFipeValor,
  calcFipeDifference,
} from '../../services/fipeService';
import type { FipeMarca, FipeModelo, FipeAno, FipeTipoVeiculo } from '../../services/fipeService';
import {
  IconCheck,
  IconShieldCheck,
  IconArrowRight,
  IconUser,
} from '../icons/Icons';

interface PublishScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

type PublishStep = 1 | 2 | 3 | 4;

interface PhotoItem {
  id: string;
  url: string;
  isCover: boolean;
}

const DEFAULT_SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: 'p1',
    url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80',
    isCover: true,
  },
  {
    id: 'p2',
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    isCover: false,
  },
  {
    id: 'p3',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    isCover: false,
  },
];

export const PublishScreen: React.FC<PublishScreenProps> = ({ onNavigate, onSelectVehicle }) => {
  const [currentUser, setCurrentUser] = useState<UserDocument | null>(null);
  const [currentStep, setCurrentStep] = useState<PublishStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [publishedVehicle, setPublishedVehicle] = useState<Vehicle | null>(null);

  // ── Step 1: Informações do Veículo ────────────────────────────────────
  const [vehicleType, setVehicleType] = useState<FipeTipoVeiculo>('carros');
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('Toyota');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState('2022 / 2023');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('Automático');
  const [fuel, setFuel] = useState('Flex');
  const [color, setColor] = useState('Prata');
  const [city, setCity] = useState('Pau dos Ferros - RN');
  const [description, setDescription] = useState('');

  // ── Step 2: Preço & FIPE ──────────────────────────────────────────────
  const [price, setPrice] = useState('');
  const [fipeMarcas, setFipeMarcas] = useState<FipeMarca[]>([]);
  const [fipeModelos, setFipeModelos] = useState<FipeModelo[]>([]);
  const [fipeAnos, setFipeAnos] = useState<FipeAno[]>([]);
  const [selectedFipeMarca, setSelectedFipeMarca] = useState('');
  const [selectedFipeModelo, setSelectedFipeModelo] = useState('');
  const [selectedFipeAno, setSelectedFipeAno] = useState('');
  const [fipePrice, setFipePrice] = useState<number | null>(null);
  const [fipeLabel, setFipeLabel] = useState('');
  const [loadingFipe, setLoadingFipe] = useState(false);

  // ── Step 3: Fotos ─────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<PhotoItem[]>(DEFAULT_SAMPLE_PHOTOS);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // ── Estados de Validação e Erros ──────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepErrorAlert, setStepErrorAlert] = useState<string | null>(null);

  // Carregar sessão
  useEffect(() => {
    const session = getActiveSession();
    setCurrentUser(session);
  }, []);

  // Carregar marcas FIPE ao montar ou trocar tipo
  useEffect(() => {
    const loadMarcas = async () => {
      try {
        const marcas = await fetchFipeMarcas(vehicleType);
        setFipeMarcas(marcas);
      } catch (err) {
        console.error('Erro ao buscar marcas FIPE:', err);
      }
    };
    loadMarcas();
  }, [vehicleType]);

  // Carregar modelos ao selecionar marca
  useEffect(() => {
    if (!selectedFipeMarca) return;
    const loadModelos = async () => {
      try {
        const resp = await fetchFipeModelos(vehicleType, selectedFipeMarca);
        setFipeModelos(resp.modelos);
      } catch (err) {
        console.error('Erro ao buscar modelos FIPE:', err);
      }
    };
    loadModelos();
  }, [selectedFipeMarca, vehicleType]);

  // Carregar anos ao selecionar modelo
  useEffect(() => {
    if (!selectedFipeMarca || !selectedFipeModelo) return;
    const loadAnos = async () => {
      try {
        const anos = await fetchFipeAnos(vehicleType, selectedFipeMarca, selectedFipeModelo);
        setFipeAnos(anos);
      } catch (err) {
        console.error('Erro ao buscar anos FIPE:', err);
      }
    };
    loadAnos();
  }, [selectedFipeModelo, selectedFipeMarca, vehicleType]);

  // Buscar preço FIPE oficial
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

  // Formatação de Preço em Real brasileiro
  const formatBrl = (value: string) => {
    const cleanNum = value.replace(/\D/g, '');
    if (!cleanNum) return '';
    const num = parseInt(cleanNum, 10);
    return num.toLocaleString('pt-BR');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(formatBrl(e.target.value));
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: '' }));
    }
  };

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    if (!clean) {
      setMileage('');
    } else {
      setMileage(parseInt(clean, 10).toLocaleString('pt-BR'));
    }
    if (errors.mileage) {
      setErrors((prev) => ({ ...prev, mileage: '' }));
    }
  };

  const handleApplyFipePrice = () => {
    if (fipePrice) {
      setPrice(fipePrice.toLocaleString('pt-BR'));
      setFipeLabel('Na Tabela FIPE');
      if (errors.price) {
        setErrors((prev) => ({ ...prev, price: '' }));
      }
    }
  };

  // Gerenciamento de Fotos
  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const newId = `photo_${Date.now()}`;
    const isFirst = photos.length === 0;
    setPhotos((prev) => [
      ...prev,
      { id: newId, url: newPhotoUrl.trim(), isCover: isFirst },
    ]);
    setNewPhotoUrl('');
    if (errors.photos) {
      setErrors((prev) => ({ ...prev, photos: '' }));
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length > 0 && !remaining.some((p) => p.isCover)) {
        remaining[0].isCover = true;
      }
      return remaining;
    });
  };

  const handleRestoreSamplePhotos = () => {
    setPhotos(DEFAULT_SAMPLE_PHOTOS);
    if (errors.photos) {
      setErrors((prev) => ({ ...prev, photos: '' }));
    }
  };

  const handleSetCover = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isCover: p.id === id,
      }))
    );
  };

  // Simulação de confirmação de conta para demonstração
  const handleSimulateConfirmation = () => {
    if (currentUser) {
      const updated = toggleUserConfirmation(currentUser._id);
      if (updated) {
        setCurrentUser({ ...updated });
      }
    }
  };

  // ── Validações Obrigatórias ───────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!brand.trim() || brand.trim().length < 2) {
      newErrors.brand = 'A marca do veículo é obrigatória (ex: Toyota, Fiat, Honda).';
    }

    if (!model.trim() || model.trim().length < 2) {
      newErrors.model = 'O modelo do veículo é obrigatório (ex: Corolla, Civic, Strada).';
    }

    if (!year.trim()) {
      newErrors.year = 'O ano de fabricação é obrigatório.';
    } else {
      const match = year.match(/\d{4}/);
      const currentYear = new Date().getFullYear();
      if (!match) {
        newErrors.year = 'Informe um ano válido com 4 dígitos (ex: 2022 ou 2022 / 2023).';
      } else {
        const yearNum = parseInt(match[0], 10);
        if (yearNum < 1960 || yearNum > currentYear + 1) {
          newErrors.year = `Informe um ano válido entre 1960 e ${currentYear + 1}.`;
        }
      }
    }

    const cleanMileage = mileage.replace(/\D/g, '');
    if (!mileage.trim() || cleanMileage === '') {
      newErrors.mileage = 'Informe a quilometragem atual do veículo (use 0 se for 0km).';
    }

    if (!color.trim() || color.trim().length < 2) {
      newErrors.color = 'Informe a cor predominante do veículo.';
    }

    if (!city.trim()) {
      newErrors.city = 'Selecione a cidade do veículo.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setStepErrorAlert('Preencha corretamente os campos obrigatórios destacados em vermelho antes de continuar.');
      return false;
    }

    setStepErrorAlert(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const numericPrice = parseInt(price.replace(/\D/g, ''), 10);

    if (!price.trim() || isNaN(numericPrice) || numericPrice < 1000) {
      newErrors.price = 'Informe um preço de venda válido (mínimo de R$ 1.000).';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setStepErrorAlert('Informe o preço de venda do veículo para avançar.');
      return false;
    }

    setStepErrorAlert(null);
    return true;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!photos || photos.length === 0) {
      newErrors.photos = 'Adicione pelo menos 1 foto do veículo antes de prosseguir para a revisão.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setStepErrorAlert('É obrigatório ter pelo menos 1 foto cadastrada no anúncio.');
      return false;
    }

    // Garante que exista capa definida
    if (!photos.some((p) => p.isCover)) {
      setPhotos((prev) =>
        prev.map((p, idx) => ({
          ...p,
          isCover: idx === 0,
        }))
      );
    }

    setStepErrorAlert(null);
    return true;
  };

  const handleNextStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setStepErrorAlert(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
      setStepErrorAlert(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep3 = () => {
    if (validateStep3()) {
      setCurrentStep(4);
      setStepErrorAlert(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (targetStep: PublishStep) => {
    if (targetStep === currentStep) return;

    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      setStepErrorAlert(null);
      return;
    }

    if (targetStep >= 2 && !validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (targetStep >= 3 && !validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (targetStep >= 4 && !validateStep3()) {
      setCurrentStep(3);
      return;
    }

    setCurrentStep(targetStep);
    setStepErrorAlert(null);
  };

  // Submissão do anúncio com validação integral
  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const numericPrice = parseInt(price.replace(/\D/g, ''), 10);
      const numericMileage = parseInt(mileage.replace(/\D/g, ''), 10);
      const coverPhoto =
        photos.find((p) => p.isCover)?.url ||
        photos[0]?.url ||
        'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80';
      const allPhotoUrls = photos.map((p) => p.url);

      const sellerDisplayName = currentUser ? currentUser.name : 'Particular';
      const sellerType = currentUser?.accountType === 'pj' ? 'Revendedora Verificada' : 'Particular';
      const sellerInitials = sellerDisplayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const fullTitle = title.trim() || `${brand.trim()} ${model.trim()} ${version.trim()}`.trim();

      const newVehicleDoc: Omit<VehicleDocument, '_id' | 'createdAt' | 'updatedAt'> = {
        title: fullTitle,
        brand,
        model,
        year,
        mileage: numericMileage,
        mileageFormatted: `${numericMileage.toLocaleString('pt-BR')} km`,
        location: city,
        city: city.split(' - ')[0]?.trim() || city,
        state: city.split(' - ')[1]?.trim() || 'RN',
        price: numericPrice,
        fipePrice: fipePrice ?? Math.round(numericPrice * 1.03),
        fipeBadge: fipeLabel || 'FIPE Checada',
        badges: ['Novo'],
        transmission,
        fuel,
        color,
        featured: false,
        mainImage: coverPhoto,
        gallery: allPhotoUrls.length > 0 ? allPhotoUrls : [coverPhoto],
        seller: {
          name: sellerDisplayName,
          type: sellerType,
          initials: sellerInitials,
          description: `Anunciante cadastrado na plataforma MotorLocal em ${city}.`,
          verified: currentUser?.isConfirmed ?? true,
        },
        description: description || 'Veículo em excelente estado de conservação, revisado e com documentação em dia.',
        vehicleType: vehicleType === 'motos' ? 'moto' : vehicleType === 'caminhoes' ? 'utilitario' : 'carro',
      };

      const doc = await noSqlInsertVehicle(newVehicleDoc);

      const createdVehicle: Vehicle = {
        id: doc._id,
        title: doc.title,
        brand: doc.brand,
        model: doc.model,
        year: doc.year,
        mileage: doc.mileageFormatted,
        location: doc.location,
        city: doc.city,
        price: doc.price,
        fipePrice: doc.fipePrice,
        fipeBadge: doc.fipeBadge || undefined,
        badges: doc.badges,
        transmission: doc.transmission,
        fuel: doc.fuel,
        color: doc.color,
        mainImage: doc.mainImage,
        gallery: doc.gallery,
        seller: doc.seller,
        description: doc.description,
      };

      setPublishedVehicle(createdVehicle);
      setIsSuccess(true);
    } catch (err) {
      console.error('Erro ao publicar veículo:', err);
      alert('Erro ao publicar o anúncio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 1. CENÁRIO: USUÁRIO NÃO LOGADO ────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-slate-200/90 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
            <IconUser size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Identifique-se para Anunciar
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Para publicar seu veículo no marketplace MotorLocal, é necessário estar conectado à sua conta de anunciante.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Acessar minha conta</span>
              <IconArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="w-full py-3 bg-[#f2f3ff] hover:bg-blue-50 text-blue-700 font-bold text-sm rounded-xl border border-blue-200 transition-colors"
            >
              Criar uma nova conta
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-400 hover:text-slate-600 pt-2 transition-colors"
            >
              ← Voltar ao portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. CENÁRIO: USUÁRIO LOGADO NÃO CONFIRMADO ─────────────────────────
  if (!currentUser.isConfirmed) {
    return (
      <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-amber-200/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            <IconShieldCheck size={36} />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Conta Pendente de Confirmação
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Confirmação Necessária
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Olá, <strong className="text-slate-800">{currentUser.name}</strong>! Para garantir a segurança dos compradores no Alto Oeste Potiguar, anúncios só podem ser publicados por contas verificadas e confirmadas.
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              Status da conta: <strong>Não Confirmada</strong>
            </p>
            <p className="text-amber-800/90 leading-relaxed">
              Por ser um protótipo frontend sem envio real de e-mails, você pode ativar a confirmação da sua conta de teste clicando no botão abaixo:
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleSimulateConfirmation}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <IconCheck size={18} />
              <span>Confirmar conta agora (Mock)</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-3 bg-[#f2f3ff] hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. CENÁRIO: TELA DE SUCESSO DO STITCH ─────────────────────────────
  if (isSuccess) {
    return (
      <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 sm:p-10 text-center shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <IconCheck size={40} />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Anúncio Publicado com Sucesso!
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Seu veículo já está visível para potenciais compradores em Pau dos Ferros e em toda a região.
            </p>
          </div>

          {publishedVehicle && (
            <div className="bg-[#f2f3ff] p-4 rounded-2xl border border-blue-100 flex items-center gap-3 text-left">
              <img
                src={publishedVehicle.mainImage}
                alt={publishedVehicle.title}
                className="w-16 h-14 object-cover rounded-xl shrink-0"
              />
              <div className="truncate">
                <span className="font-extrabold text-xs text-slate-900 block truncate">
                  {publishedVehicle.title}
                </span>
                <span className="text-xs font-black text-blue-600">
                  R$ {publishedVehicle.price.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (publishedVehicle && onSelectVehicle) {
                  onSelectVehicle(publishedVehicle);
                } else {
                  onNavigate('search');
                }
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Ver meu anúncio</span>
              <IconArrowRight size={16} />
            </button>

            <button
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
                setTitle('');
                setModel('');
                setVersion('');
                setPrice('');
                setMileage('');
                setDescription('');
              }}
              className="w-full py-3 bg-[#f2f3ff] hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-colors"
            >
              Publicar outro veículo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. CENÁRIO: FORMULÁRIO COMPLETO DO STITCH (USUÁRIO CONFIRMADO) ────
  return (
    <div className="bg-[#faf8ff] min-h-screen text-[#131b2e] pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
            <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
              Início
            </button>
            <span>/</span>
            <button onClick={() => onNavigate('seller')} className="hover:text-blue-600 transition-colors">
              Painel do Vendedor
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-900">Publicar Veículo</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Cadastrar Novo Veículo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preencha as informações abaixo para anunciar seu veículo em Pau dos Ferros e região com transparência FIPE.
          </p>
        </div>

        {/* Step Indicator (Stitch Design) */}
        <div className="w-full bg-[#f2f3ff] p-4 sm:p-6 rounded-2xl mb-8 border border-blue-100 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: 1, title: 'Informações' },
              { num: 2, title: 'Preço & FIPE' },
              { num: 3, title: 'Fotos' },
              { num: 4, title: 'Revisão' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div
                  key={step.num}
                  onClick={() => handleStepClick(step.num as PublishStep)}
                  className={`flex flex-col gap-1 cursor-pointer transition-opacity ${
                    isActive ? 'opacity-100' : isPast ? 'opacity-90' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isPast ? <IconCheck size={14} /> : step.num}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {isActive ? 'Atual' : isPast ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-1">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body Container */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-3xl mx-auto">
          {/* Banner de Erro Global da Etapa */}
          {stepErrorAlert && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-center gap-3 mb-6 animate-in fade-in duration-200 shadow-sm">
              <span className="text-base shrink-0">⚠️</span>
              <span className="font-semibold leading-relaxed">{stepErrorAlert}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ETAPA 1: Informações do Veículo */}
          {/* ════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-black text-slate-900">Informações do Veículo</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Informe os dados básicos para identificar o modelo corretamente no sistema.
                </p>
              </div>

              {/* Tipo de Veículo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tipo de Veículo
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'carros', label: 'Carro', icon: '🚗' },
                    { value: 'motos', label: 'Moto', icon: '🏍️' },
                    { value: 'caminhoes', label: 'Utilitário', icon: '🚚' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setVehicleType(t.value as FipeTipoVeiculo)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        vehicleType === t.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-[#faf8ff] text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título Customizado (opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título do Anúncio (Opcional - gerado automaticamente se vazio)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Toyota Corolla XEi 2.0 Dynamic Force"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Marca e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Toyota, Fiat, Honda..."
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      if (errors.brand) setErrors((prev) => ({ ...prev, brand: '' }));
                    }}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-colors ${
                      errors.brand
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {errors.brand && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.brand}</span>
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Corolla, Onix, Civic, Strada..."
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (errors.model) setErrors((prev) => ({ ...prev, model: '' }));
                    }}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-colors ${
                      errors.model
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {errors.model && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.model}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Versão e Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Versão / Motor</label>
                  <input
                    type="text"
                    placeholder="Ex: XEi 2.0, LTZ 1.0 Turbo..."
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Cor Predominante *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prata, Branco, Preto, Vermelho..."
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      if (errors.color) setErrors((prev) => ({ ...prev, color: '' }));
                    }}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-colors ${
                      errors.color
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {errors.color && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.color}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Ano, Quilometragem e Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Ano de Fabricação *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2022 / 2023"
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      if (errors.year) setErrors((prev) => ({ ...prev, year: '' }));
                    }}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-colors ${
                      errors.year
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {errors.year && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.year}</span>
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Quilometragem (km) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 35.000 ou 0"
                    value={mileage}
                    onChange={handleMileageChange}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-colors ${
                      errors.mileage
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {errors.mileage && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.mileage}</span>
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Cidade Regional *</label>
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                    className={`w-full bg-[#f8fafc] border rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer transition-colors ${
                      errors.city
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  >
                    <option value="Pau dos Ferros - RN">Pau dos Ferros - RN</option>
                    <option value="Alexandria - RN">Alexandria - RN</option>
                    <option value="São Miguel - RN">São Miguel - RN</option>
                    <option value="Apodi - RN">Apodi - RN</option>
                    <option value="Portalegre - RN">Portalegre - RN</option>
                  </select>
                  {errors.city && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      <span>{errors.city}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Câmbio e Combustível */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Câmbio</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automático">Automático</option>
                    <option value="Automático (CVT)">Automático (CVT)</option>
                    <option value="Semi-automático">Semi-automático</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Combustível</label>
                  <select
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Elétrico">Elétrico</option>
                  </select>
                </div>
              </div>

              {/* Descrição com Contador de Caracteres (Stitch) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Descrição do Veículo</label>
                  <span className="text-[11px] text-slate-400">{description.length} / 500 caracteres</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Destaque opcionais, estado dos pneus, revisões, laudo cautelar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  <span>Próximo: Preço & FIPE</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ETAPA 2: Preço & FIPE */}
          {/* ════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-black text-slate-900">Definição de Preço</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Compare com a Tabela FIPE atualizada para atrair compradores rapidamente na região.
                </p>
              </div>

              {/* Preço de Venda com formatação BRL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Preço de Venda (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 89.900"
                    value={price}
                    onChange={handlePriceChange}
                    className={`w-full bg-[#f8fafc] border rounded-xl pl-12 pr-4 py-3 text-lg font-black text-blue-600 outline-none transition-colors ${
                      errors.price
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20 ring-1 ring-red-400/40'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>
                {errors.price && (
                  <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1.5">
                    <span>⚠️</span>
                    <span>{errors.price}</span>
                  </span>
                )}
              </div>

              {/* Box de Integração FIPE (Design do Stitch com borda secundária) */}
              <div className="bg-[#f2f3ff] p-5 rounded-2xl border-l-4 border-emerald-600 border border-blue-100 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <IconCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Sugestão Automática Tabela FIPE</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Selecione a versão correspondente na tabela FIPE oficial para habilitar o selo comparativo:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Marca FIPE</label>
                    <select
                      value={selectedFipeMarca}
                      onChange={(e) => setSelectedFipeMarca(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer focus:border-blue-500"
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
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Modelo FIPE</label>
                    <select
                      value={selectedFipeModelo}
                      onChange={(e) => setSelectedFipeModelo(e.target.value)}
                      disabled={fipeModelos.length === 0}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer focus:border-blue-500 disabled:opacity-50"
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
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Ano Modelo</label>
                    <select
                      value={selectedFipeAno}
                      onChange={(e) => setSelectedFipeAno(e.target.value)}
                      disabled={fipeAnos.length === 0}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer focus:border-blue-500 disabled:opacity-50"
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

                {loadingFipe && (
                  <p className="text-xs text-blue-600 font-semibold animate-pulse">
                    Consultando tabela FIPE oficial...
                  </p>
                )}

                {fipePrice !== null && fipePrice > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">
                        Valor de Referência FIPE
                      </span>
                      <span className="text-lg font-black text-emerald-700">
                        R$ {fipePrice.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyFipePrice}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Usar preço FIPE
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setStepErrorAlert(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  <span>Próximo: Fotos</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ETAPA 3: Fotos do Veículo */}
          {/* ════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-black text-slate-900">Fotos do Veículo</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Adicione fotos nítidas da frente, traseira, lateral e interior. Escolha a foto principal que será exibida como capa nos resultados.
                </p>
              </div>

              {/* Erro de fotos caso não haja fotos cadastradas */}
              {errors.photos && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-red-700">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-semibold">{errors.photos}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreSamplePhotos}
                    className="text-xs font-bold text-blue-600 underline hover:text-blue-800 text-left"
                  >
                    Restaurar fotos de demonstração
                  </button>
                </div>
              )}

              {/* Input para adicionar nova imagem */}
              <div className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Adicionar foto por URL (ou usar amostras abaixo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto-do-carro.jpg"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Galeria de Previews */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative rounded-xl overflow-hidden aspect-video bg-slate-100 border-2 transition-all group ${
                      photo.isCover ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200'
                    }`}
                  >
                    <img src={photo.url} alt="Veículo preview" className="w-full h-full object-cover" />

                    {/* Tag de Capa */}
                    {photo.isCover && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        Capa Principal
                      </div>
                    )}

                    {/* Overlay de Ações */}
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!photo.isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(photo.id)}
                          className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg shadow-sm"
                        >
                          Definir Capa
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
                        title="Remover foto"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(2);
                    setStepErrorAlert(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNextStep3}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  <span>Próximo: Revisão</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ETAPA 4: Revisão Final (Stitch Design) */}
          {/* ════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-black text-slate-900">Revisão Final</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Confira os dados cadastrados antes de publicar o anúncio no MotorLocal.
                </p>
              </div>

              <div className="bg-[#f8fafc] rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Veículo Anunciado:</span>
                  <span className="font-extrabold text-slate-900">
                    {title || `${brand} ${model} ${version}`.trim() || 'Toyota Corolla'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Ano:</span>
                  <span className="font-bold text-slate-900">{year}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Quilometragem:</span>
                  <span className="font-bold text-slate-900">{mileage || '0'} km</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Localização Regional:</span>
                  <span className="font-bold text-slate-900">{city}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Preço Anunciado:</span>
                  <span className="text-base font-black text-blue-600">
                    R$ {price || '45.000'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500">Vendedor Responsável:</span>
                  <span className="font-bold text-slate-900">{currentUser.name} (Confirmado)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Fotos cadastradas:</span>
                  <span className="font-bold text-slate-900">{photos.length} fotos</span>
                </div>
              </div>

              <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex items-center gap-3 text-xs text-blue-900">
                <IconShieldCheck size={24} className="text-blue-600 shrink-0" />
                <p>
                  Ao clicar em publicar, seu anúncio ficará disponível instantaneamente para consulta e comparação de preço com a Tabela FIPE.
                </p>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Publicando anúncio...</span>
                  ) : (
                    <>
                      <span>Publicar anúncio</span>
                      <IconCheck size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
