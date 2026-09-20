import React from 'react';
import type { ScreenType } from '../../types/vehicle';

interface FooterProps {
  onNavigate?: (screen: ScreenType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#080d1a] text-slate-400 border-t border-slate-800 text-xs py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1 */}
          <div>
            <h3 className="text-slate-200 font-bold text-sm mb-3">MotorLocal Pau dos Ferros</h3>
            <p className="leading-relaxed text-slate-400">
              O maior marketplace de veículos da região do Alto Oeste Potiguar.
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-slate-200 font-bold text-sm mb-3">Principais Cidades</h3>
            <ul className="space-y-1.5">
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Pau dos Ferros - RN</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Apodi - RN</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">São Miguel - RN</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Assu - RN</button></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="text-slate-200 font-bold text-sm mb-3">Cidades Vizinhas</h3>
            <ul className="space-y-1.5">
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Catolé do Rocha - PB</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Uiraúna - PB</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Itaú - RN</button></li>
              <li><button onClick={() => onNavigate?.('search')} className="hover:text-blue-400 transition-colors">Encanto - RN</button></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-slate-200 font-bold text-sm mb-3">Contato</h3>
            <p className="hover:text-blue-400 transition-colors cursor-pointer mb-1">contato@motorlocal.com.br</p>
            <p>Pau dos Ferros, RN</p>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-6 text-center text-slate-500 text-[11px]">
          © 2024 MotorLocal. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
