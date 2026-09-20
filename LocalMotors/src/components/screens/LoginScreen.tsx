import React, { useState } from 'react';
import type { ScreenType } from '../../types/vehicle';
import {
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconGoogle,
  IconApple,
} from '../icons/Icons';

interface LoginScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('home');
  };

  return (
    <div className="min-h-screen bg-[#070c19] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#0d1527] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: VISUAL IMAGE CARD */}
        <div className="lg:col-span-6 relative p-6 sm:p-8 flex flex-col justify-between overflow-hidden group min-h-[380px] lg:min-h-[640px]">
          {/* Background Image with Dark Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80"
              alt="Porsche Sunset Drive"
              className="w-full h-full object-cover brightness-75 scale-105 group-hover:scale-110 transition-transform duration-700"
            />
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

          {/* Bottom Content inside Left Card */}
          <div className="relative z-10 space-y-4">
            <span className="inline-block px-3 py-1 rounded-md bg-blue-950/70 border border-blue-600/30 text-[10px] font-bold tracking-widest text-blue-400 uppercase">
              Conexões Regionais
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
              Seu próximo veículo a poucos quilômetros de você.
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              O ecossistema inteligente de compra e venda de seminovos, carros novos e utilitários no Alto Oeste Potiguar.
            </p>

            {/* Carousel Indicators */}
            <div className="flex items-center gap-1.5 pt-2">
              <span className="w-5 h-1 bg-slate-600 rounded-full" />
              <span className="w-5 h-1 bg-slate-600 rounded-full" />
              <span className="w-10 h-1 bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-8 bg-[#0d1527]">
          {/* Header Security Badge */}
          <div className="flex justify-end">
            <span className="text-[11px] text-slate-400 font-medium">
              Ambiente Seguro SSL 256-bit
            </span>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Acesse sua conta
            </h1>
            <p className="text-xs text-slate-400">
              Novo no marketplace?{' '}
              <button
                type="button"
                onClick={() => onNavigate('search')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Cadastre-se gratuitamente
              </button>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* E-mail / Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                E-mail profissional ou Telefone
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="ex: voce@email.com ou (84) 99999-0000"
                className="w-full bg-[#141e36] border border-slate-700/80 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  className="w-full bg-[#141e36] border border-slate-700/80 focus:border-blue-500 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-colors"
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
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-[#141e36] border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-300 leading-tight cursor-pointer">
                Manter conectado e concordar com os{' '}
                <span className="text-blue-400 hover:underline">Termos de Uso</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.99]"
            >
              Entrar na conta
              <IconArrowRight size={18} />
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0d1527] px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              ou acesse com
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="bg-[#141e36] hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
            >
              <IconGoogle size={18} />
              Google
            </button>

            <button
              type="button"
              className="bg-[#141e36] hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
            >
              <IconApple size={18} />
              Apple ID
            </button>
          </div>

          {/* Footer Info */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
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
