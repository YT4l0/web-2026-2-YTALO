import { useState } from 'react';
import type { ScreenType, Vehicle } from './types/vehicle';
import { MOCK_VEHICLES } from './data/mockVehicles';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { DetailScreen } from './components/screens/DetailScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { RegisterScreen } from './components/screens/RegisterScreen';
import { FavoritesScreen } from './components/screens/FavoritesScreen';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['corolla-xei-2021', 'strada-freedom-2021']);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCurrentScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = (vehicleId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const isAuthScreen = currentScreen === 'login' || currentScreen === 'register';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Main Header (Rendered on Home, Search, Detail, Favorites) */}
      {!isAuthScreen && (
        <Header
          currentScreen={currentScreen}
          favoriteCount={favoriteIds.length}
          onNavigate={handleNavigate}
        />
      )}

      {/* Active Screen Container */}
      <main className="flex-1">
        {currentScreen === 'home' && (
          <HomeScreen
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
        {currentScreen === 'search' && (
          <SearchScreen
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
        {currentScreen === 'detail' && (
          <DetailScreen
            vehicle={selectedVehicle}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'favorites' && (
          <FavoritesScreen
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
        {currentScreen === 'login' && (
          <LoginScreen onNavigate={handleNavigate} />
        )}
        {currentScreen === 'register' && (
          <RegisterScreen onNavigate={handleNavigate} />
        )}
      </main>

      {/* Main Footer (Rendered on Home, Search, Detail, Favorites) */}
      {!isAuthScreen && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
