import { useState } from 'react';
import type { ScreenType, Vehicle } from './types/vehicle';
import { MOCK_VEHICLES } from './data/mockVehicles';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { DetailScreen } from './components/screens/DetailScreen';
import { LoginScreen } from './components/screens/LoginScreen';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCurrentScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Interactive Screen Switcher Bar for Quick Testing */}
      <div className="bg-slate-900 text-slate-300 border-b border-slate-800 text-xs py-2 px-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white tracking-wide">MotorLocal Prototype</span>
          <span className="hidden sm:inline text-slate-400">| Seletor de Telas:</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleNavigate('home')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              currentScreen === 'home'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            1. Home / Landing
          </button>
          <button
            onClick={() => handleNavigate('search')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              currentScreen === 'search'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            2. Busca / Listagem
          </button>
          <button
            onClick={() => handleNavigate('detail')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              currentScreen === 'detail'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3. Detalhes
          </button>
          <button
            onClick={() => handleNavigate('login')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              currentScreen === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            4. Login
          </button>
        </div>
      </div>

      {/* Main Header (Rendered on Home, Search, Detail) */}
      {currentScreen !== 'login' && (
        <Header currentScreen={currentScreen} onNavigate={handleNavigate} />
      )}

      {/* Active Screen Container */}
      <main className="flex-1">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
        {currentScreen === 'search' && (
          <SearchScreen
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
        {currentScreen === 'detail' && (
          <DetailScreen
            vehicle={selectedVehicle}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'login' && (
          <LoginScreen onNavigate={handleNavigate} />
        )}
      </main>

      {/* Main Footer (Rendered on Home, Search, Detail) */}
      {currentScreen !== 'login' && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
