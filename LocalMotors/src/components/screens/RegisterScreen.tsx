import React, { useState, useEffect } from 'react';
import type { ScreenType } from '../../types/vehicle';
import { noSqlInsertUser, setActiveSession } from '../../services/noSqlAuthService';
import {
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconUser,
  IconCar,
} from '../icons/Icons';

interface RegisterScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const CAROUSEL_SLIDES = [
  {
    id: 1,
    tag: 'Conexões Regionais',
    title: 'Seu próximo veículo a poucos quilômetros de você.',
    subtitle: 'O ecossistema inteligente de compra e venda de seminovos, carros novos e utilitários no Alto Oeste Potiguar.',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
    alt: 'Porsche Sunset Drive',
  },
  {
    id: 2,
    tag: 'Transparência FIPE',
    title: 'Preços comparados com a Tabela FIPE em tempo real.',
    subtitle: 'Consulte os valores oficiais do mercado antes de fechar qualquer negócio na região com segurança e clareza.',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
    alt: 'BMW Luxury Front View',
  },
  {
    id: 3,
    tag: 'Negócios Seguros',
    title: 'Anúncios verificados e vendedores de confiança.',
    subtitle: 'Conectamos você diretamente a revendedoras credenciadas e particulares em Pau dos Ferros e cidades vizinhas.',
    image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1000&q=80',
    alt: 'Dealership Verified Interactions',
  },
];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  // Account Type
  const [accountType, setAccountType] = useState<'pf' | 'pj'>('pf');

  // Form Fields - Common & Specific
  const [fullName, setFullName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [dealershipName, setDealershipName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('RN');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  // Live Password Validation Requirements
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (accountType === 'pf') {
      if (!fullName.trim()) newErrors.fullName = 'Informe seu nome completo.';
    } else {
      if (!responsibleName.trim()) newErrors.responsibleName = 'Informe o nome do responsável.';
      if (!dealershipName.trim()) newErrors.dealershipName = 'Informe o nome da revendedora.';
      if (!cnpj.trim() || cnpj.replace(/\D/g, '').length < 14) newErrors.cnpj = 'Informe um CNPJ válido.';
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Digite um e-mail válido.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Informe seu telefone.';
    }

    if (!city.trim()) {
      newErrors.city = 'Informe sua cidade.';
    }

    if (!password) {
      newErrors.password = 'Crie uma senha.';
    } else if (!hasMinLength || !hasLetter || !hasNumber) {
      newErrors.password = 'A senha não atende aos requisitos mínimos.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      responsibleName: true,
      dealershipName: true,
      cnpj: true,
      email: true,
      phone: true,
      city: true,
      password: true,
      confirmPassword: true,
    });

    if (validate()) {
      setIsLoading(true);
      try {
        const userName = accountType === 'pf' ? fullName : dealershipName;
        const newDoc = await noSqlInsertUser({
          name: userName,
          email,
          phone,
          passwordHash: password,
          accountType,
        });

        setActiveSession(newDoc);
        setIsLoading(false);
        alert(`Conta do usuário "${newDoc.name}" registrada com sucesso na coleção NoSQL!`);
        onNavigate('search');
      } catch (err) {
        console.error(err);
        setIsLoading(false);
        alert('Erro ao registrar documento no banco NoSQL.');
      }
    }
  };

  const activeSlideData = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#070c19] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#0d1527] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: VISUAL IMAGE CAROUSEL CARD (identical to login) */}
        <div className="lg:col-span-5 relative p-6 sm:p-8 flex flex-col justify-between overflow-hidden group min-h-[340px] lg:min-h-[640px]">
          {/* Background Images Layer with Fade Transitions */}
          <div className="absolute inset-0 z-0">
            {CAROUSEL_SLIDES.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-cover brightness-75 scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1527] via-[#0d1527]/50 to-transparent" />
          </div>

          {/* Top Bar inside Left Card */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                ML
              </div>
              <span className="font-bold text-sm text-white">Motor<span className="text-blue-400">Local</span></span>
            </div>

            <button
              onClick={() => onNavigate('home')}
              className="bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md text-xs font-semibold px-3.5 py-2 rounded-full border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            >
              Voltar ao portal
              <IconArrowRight size={14} />
            </button>
          </div>

          {/* Navigation Arrows (Visible on hover) */}
          <div className="absolute inset-y-0 left-3 right-3 z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              type="button"
              onClick={prevSlide}
              className="pointer-events-auto w-9 h-9 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white flex items-center justify-center backdrop-blur-md border border-slate-700/60 transition-colors shadow-lg"
              title="Anterior"
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="pointer-events-auto w-9 h-9 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white flex items-center justify-center backdrop-blur-md border border-slate-700/60 transition-colors shadow-lg"
              title="Próximo"
            >
              <IconChevronRight size={18} />
            </button>
          </div>

          {/* Bottom Content inside Left Card */}
          <div className="relative z-10 space-y-4">
            <div className="transition-all duration-500 transform">
              <span className="inline-block px-3 py-1 rounded-md bg-blue-950/80 border border-blue-600/30 text-[10px] font-bold tracking-widest text-blue-400 uppercase">
                {activeSlideData.tag}
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight mt-3">
                {activeSlideData.title}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed max-w-md mt-2">
                {activeSlideData.subtitle}
              </p>
            </div>

            {/* Carousel Indicators */}
            <div className="flex items-center gap-2 pt-3">
              {CAROUSEL_SLIDES.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    index === currentSlide
                      ? 'w-10 bg-blue-500'
                      : 'w-4 bg-slate-600/80 hover:bg-slate-400'
                  }`}
                  title={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REGISTER FORM */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-[#0d1527]">
          {/* Header Security Badge */}
          <div className="flex justify-end">
            <span className="text-[11px] text-slate-400 font-medium">
              Ambiente Seguro SSL 256-bit
            </span>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Criar sua conta
            </h1>
            <p className="text-xs text-slate-400">
              Cadastre-se para encontrar, anunciar e negociar veículos na sua região.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ACCOUNT TYPE SELECTION (Pessoa Física vs Revendedora) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Tipo de conta
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Pessoa Física */}
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('pf');
                    setErrors({});
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    accountType === 'pf'
                      ? 'bg-[#141e36] border-blue-500 shadow-md shadow-blue-600/10'
                      : 'bg-[#141e36]/50 border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <IconUser size={15} className={accountType === 'pf' ? 'text-blue-400' : 'text-slate-400'} />
                      Pessoa Física
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      accountType === 'pf' ? 'border-blue-500 bg-blue-600' : 'border-slate-600'
                    }`}>
                      {accountType === 'pf' && <IconCheck size={10} className="text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Para anunciar ou comprar veículos como pessoa física.
                  </p>
                </button>

                {/* Option 2: Revendedora */}
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('pj');
                    setErrors({});
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    accountType === 'pj'
                      ? 'bg-[#141e36] border-blue-500 shadow-md shadow-blue-600/10'
                      : 'bg-[#141e36]/50 border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <IconCar size={15} className={accountType === 'pj' ? 'text-blue-400' : 'text-slate-400'} />
                      Revendedora
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      accountType === 'pj' ? 'border-blue-500 bg-blue-600' : 'border-slate-600'
                    }`}>
                      {accountType === 'pj' && <IconCheck size={10} className="text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Para lojas e revendedoras de veículos.
                  </p>
                </button>
              </div>
            </div>

            {/* DYNAMIC FIELDS ANIMATED CONTAINER */}
            <div className="space-y-4 transition-all duration-300">
              {/* PESSOA FÍSICA FIELDS */}
              {accountType === 'pf' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-300">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Digite seu nome completo"
                    className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                      touched.fullName && errors.fullName
                        ? 'border-red-500/80 bg-red-950/10'
                        : 'border-slate-700/80 focus:border-blue-500'
                    }`}
                  />
                  {touched.fullName && errors.fullName && (
                    <span className="text-[11px] text-red-400 font-medium block">
                      {errors.fullName}
                    </span>
                  )}
                </div>
              )}

              {/* REVENDEDORA SPECIFIC FIELDS */}
              {accountType === 'pj' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Nome do responsável
                      </label>
                      <input
                        type="text"
                        value={responsibleName}
                        onChange={(e) => {
                          setResponsibleName(e.target.value);
                          if (errors.responsibleName) setErrors({ ...errors, responsibleName: '' });
                        }}
                        placeholder="Digite o nome do responsável"
                        className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                          touched.responsibleName && errors.responsibleName
                            ? 'border-red-500/80 bg-red-950/10'
                            : 'border-slate-700/80 focus:border-blue-500'
                        }`}
                      />
                      {touched.responsibleName && errors.responsibleName && (
                        <span className="text-[11px] text-red-400 font-medium block">
                          {errors.responsibleName}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Nome da revendedora
                      </label>
                      <input
                        type="text"
                        value={dealershipName}
                        onChange={(e) => {
                          setDealershipName(e.target.value);
                          if (errors.dealershipName) setErrors({ ...errors, dealershipName: '' });
                        }}
                        placeholder="Digite o nome da revendedora"
                        className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                          touched.dealershipName && errors.dealershipName
                            ? 'border-red-500/80 bg-red-950/10'
                            : 'border-slate-700/80 focus:border-blue-500'
                        }`}
                      />
                      {touched.dealershipName && errors.dealershipName && (
                        <span className="text-[11px] text-red-400 font-medium block">
                          {errors.dealershipName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => {
                        setCnpj(e.target.value);
                        if (errors.cnpj) setErrors({ ...errors, cnpj: '' });
                      }}
                      placeholder="00.000.000/0000-00"
                      className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                        touched.cnpj && errors.cnpj
                          ? 'border-red-500/80 bg-red-950/10'
                          : 'border-slate-700/80 focus:border-blue-500'
                      }`}
                    />
                    {touched.cnpj && errors.cnpj && (
                      <span className="text-[11px] text-red-400 font-medium block">
                        {errors.cnpj}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* COMMON FIELDS: E-mail & Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    placeholder="Digite seu e-mail"
                    className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                      touched.email && errors.email
                        ? 'border-red-500/80 bg-red-950/10'
                        : 'border-slate-700/80 focus:border-blue-500'
                    }`}
                  />
                  {touched.email && errors.email && (
                    <span className="text-[11px] text-red-400 font-medium block">
                      {errors.email}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: '' });
                    }}
                    placeholder="(00) 00000-0000"
                    className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                      touched.phone && errors.phone
                        ? 'border-red-500/80 bg-red-950/10'
                        : 'border-slate-700/80 focus:border-blue-500'
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <span className="text-[11px] text-red-400 font-medium block">
                      {errors.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* COMMON FIELDS: Cidade & Estado */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors({ ...errors, city: '' });
                    }}
                    placeholder="Digite sua cidade"
                    className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                      touched.city && errors.city
                        ? 'border-red-500/80 bg-red-950/10'
                        : 'border-slate-700/80 focus:border-blue-500'
                    }`}
                  />
                  {touched.city && errors.city && (
                    <span className="text-[11px] text-red-400 font-medium block">
                      {errors.city}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Estado
                  </label>
                  <select
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="w-full bg-[#141e36] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3 py-3 text-sm text-white outline-none cursor-pointer"
                  >
                    {ESTADOS_BR.map((e) => (
                      <option key={e} value={e} className="bg-[#0d1527] text-white">
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PASSWORDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: '' });
                      }}
                      placeholder="Crie uma senha"
                      className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                        touched.password && errors.password
                          ? 'border-red-500/80 bg-red-950/10'
                          : 'border-slate-700/80 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                      }}
                      placeholder="Confirme sua senha"
                      className={`w-full bg-[#141e36] border rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                        touched.confirmPassword && errors.confirmPassword
                          ? 'border-red-500/80 bg-red-950/10'
                          : 'border-slate-700/80 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* PASSWORD REQUIREMENTS INDICATOR */}
              <div className="bg-[#141e36]/60 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Requisitos da senha:
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    Mínimo 6 caracteres
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    Pelo menos 1 letra
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    Pelo menos 1 número
                  </span>
                </div>
              </div>

              {/* ERROR MESSAGES LIST */}
              {Object.keys(errors).length > 0 && touched.password && (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/40 text-[11px] text-red-300 space-y-1">
                  {Object.values(errors).map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <span>Criar conta</span>
                  <IconArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* FOOTER LINK FOR LOGIN */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
              >
                Entrar
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="hover:text-slate-400 cursor-pointer">Privacidade</span>
              <span>•</span>
              <span className="hover:text-slate-400 cursor-pointer">Termos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
