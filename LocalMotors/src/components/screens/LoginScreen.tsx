import React, { useState, useEffect } from 'react';
import type { ScreenType } from '../../types/vehicle';
import {
  noSqlFindOneUser,
  setActiveSession,
} from '../../services/noSqlAuthService';
import type { UserDocument } from '../../services/noSqlAuthService';
import { useAuth } from '../../context/AuthContext';
import {
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconGoogle,
  IconApple,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
} from '../icons/Icons';

interface LoginScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess?: (user: UserDocument) => void;
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

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate, onLoginSuccess }) => {
  const { signInWithGoogle, syncMockUserLogin, authMode, configError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Auth States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play carousel effect (changes slide every 4.5s)
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

  const handleQuickFill = () => {
    setEmailOrPhone('mock@example.com');
    setPassword('mock_password_dev');
    setAuthError('');
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Em modo 'cognito', o signInWithRedirect() redireciona o navegador para o
      // Cognito Hosted UI. A execução não continua aqui — a página inteira recarrega
      // após o retorno do OAuth. A navegação para a área autenticada é gerenciada
      // pelo App.tsx que observa isAuthenticated via AuthContext.
      //
      // Em modo 'mock', a promise resolve normalmente e podemos navegar.
      if (authMode === 'mock') {
        onNavigate('home');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar com o Google.';
      setAuthError(msg);
      setIsGoogleLoading(false);
    }
    // Não chamamos setIsGoogleLoading(false) em modo cognito aqui porque o redirect
    // descarrega a página. Em modo mock o finally abaixo cobre.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'cognito') {
      return;
    }

    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);

    try {
      // Execute NoSQL Database Query (findOne)
      const userDoc = await noSqlFindOneUser(emailOrPhone, password);

      if (userDoc) {
        setActiveSession(userDoc);
        syncMockUserLogin(userDoc);
        onLoginSuccess?.(userDoc);

        setTimeout(() => {
          setIsLoading(false);
          onNavigate('search');
        }, 1200);
      } else {
        setIsLoading(false);
        setAuthError('E-mail, telefone ou senha inválidos.');
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setAuthError('Erro ao consultar banco de dados NoSQL.');
    }
  };

  const activeSlideData = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#070c19] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#0d1527] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: VISUAL IMAGE CAROUSEL CARD */}
        <div className="lg:col-span-6 relative p-6 sm:p-8 flex flex-col justify-between overflow-hidden group min-h-[380px] lg:min-h-[640px]">
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

          {/* Bottom Content inside Left Card with Animated Phrases */}
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

            {/* Carousel Indicators (Clickable) */}
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

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-[#0d1527]">
          {/* Header Security Badge */}

          {/* Form Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Acesse sua conta
            </h1>
            <p className="text-xs text-slate-400">
              Novo no marketplace?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Cadastre-se gratuitamente
              </button>
            </p>
          </div>

          {/* Quick Credential Test Helper Pill (Mock mode only) */}
          {authMode === 'mock' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
              <span className="text-slate-400">Conta demo de teste (Mock):</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-900/80 transition-colors"
              >
                Preencher dados
              </button>
            </div>
          )}

          {/* Cognito Mode Indicator / Info */}
          {authMode === 'cognito' && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs text-blue-200">
              <span className="font-bold">Modo AWS Cognito:</span> O login por e-mail/senha local está desabilitado. Utilize o botão <strong>Continuar com Google</strong> abaixo.
            </div>
          )}

          {/* Config Error Banner */}
          {configError && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 text-xs text-amber-300 flex items-start gap-2 animate-in fade-in">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{configError}</span>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/50 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          {/* Success Banner */}
          {authSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <IconCheck size={16} className="text-emerald-400 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Form */}
          {/* TODO: Implementar autenticação direta por e-mail e senha via AWS Cognito SRP/User Pool em etapa futura. */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail / Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                E-mail profissional ou Telefone
              </label>
              <input
                type="text"
                required
                disabled={authMode === 'cognito' || isLoading}
                value={emailOrPhone}
                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
                  setAuthError('');
                }}
                placeholder="ex: voce@email.com ou (84) 99999-0000"
                className="w-full bg-[#141e36] border border-slate-700/80 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Sua senha
                </label>
                <button
                  type="button"
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={authMode === 'cognito' || isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Digite sua senha de acesso"
                  className="w-full bg-[#141e36] border border-slate-700/80 focus:border-blue-500 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                disabled={authMode === 'cognito'}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-[#141e36] border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="remember" className="text-xs text-slate-300 leading-tight cursor-pointer">
                Manter conectado e concordar com os{' '}
                <span className="text-blue-400 hover:underline">Termos de Uso</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authMode === 'cognito' || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Consultando NoSQL DB...</span>
                </>
              ) : (
                <>
                  <span>Entrar na conta</span>
                  <IconArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0d1527] px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              ou acesse com
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="bg-[#141e36] hover:bg-slate-800 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <IconGoogle size={16} />
              <span>{isGoogleLoading ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>

            <button
              type="button"
              disabled
              className="bg-[#141e36]/50 text-slate-500 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <IconApple size={16} />
              Apple ID
            </button>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>© 2025 MotorLocal Tecnologia Automotiva.</span>
            <div className="flex items-center gap-3">
              <span className="hover:text-slate-400 cursor-pointer">Privacidade</span>
              <span>•</span>
              <span className="hover:text-slate-400 cursor-pointer">Central de Ajuda</span>
              <span>•</span>
              <span className="hover:text-slate-400 cursor-pointer">Segurança</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
