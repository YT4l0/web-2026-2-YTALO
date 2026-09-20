import React from 'react';
import type { ScreenType } from '../../types/vehicle';
import { IconUser } from '../icons/Icons';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, onNavigate }) => {
  // If we are on the login screen, we render a minimal custom header or the unified navy header
  return (
    <header className="bg-[#0b1329] text-white border-b border-slate-800/80 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              ML
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none tracking-tight">
                Motor<span className="text-blue-500">Local</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <button
              onClick={() => onNavigate('search')}
              className={`transition-colors py-2 border-b-2 ${
                currentScreen === 'search'
                  ? 'text-blue-400 border-blue-500'
                  : 'text-slate-300 border-transparent hover:text-white'
              }`}
            >
              Comprar veículo
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="text-slate-300 hover:text-white transition-colors py-2"
            >
              Vender veículo
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="text-slate-300 hover:text-white transition-colors py-2"
            >
              Favoritos
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="text-slate-300 hover:text-white transition-colors py-2"
            >
              Dashboard
            </button>
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className={`text-sm font-medium px-3 py-1.5 transition-colors ${
                currentScreen === 'login'
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-95"
            >
              Criar conta
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center hover:bg-blue-600/40 transition-colors"
              title="Perfil de Usuário"
            >
              <IconUser size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
