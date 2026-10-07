import { useState, useEffect } from 'react';
import type { ScreenType, Vehicle } from './types/vehicle';
import { MOCK_VEHICLES } from './data/mockVehicles';
import { useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { DetailScreen } from './components/screens/DetailScreen';
import { PublishScreen } from './components/screens/PublishScreen';
import { SellerProfileScreen } from './components/screens/SellerProfileScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { RegisterScreen } from './components/screens/RegisterScreen';
import { FavoritesScreen } from './components/screens/FavoritesScreen';

export function App() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('Carlos Motors');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Ao concluir redirect do Cognito Hosted UI, navega para 'home'
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const timer = setTimeout(() => {
        setCurrentScreen('home');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCurrentScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewSeller = (sellerName: string) => {
    setSelectedSellerName(sellerName);
    setCurrentScreen('seller');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: ScreenType) => {
    // Rotas protegidas (publicar anúncio, favoritos persistentes) exigem isAuthenticated
    if ((screen === 'publish' || screen === 'favorites') && !isAuthenticated) {
      setCurrentScreen('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await signOut();
    if (currentScreen === 'publish' || currentScreen === 'favorites') {
      setCurrentScreen('home');
    }
  };

  const handleToggleFavorite = (vehicleId: string) => {
    if (!isAuthenticated) {
      setCurrentScreen('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFavoriteIds((prev) =>
      prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const isAuthScreen = currentScreen === 'login' || currentScreen === 'register';

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      {/* Main Header (Rendered on Home, Search, Detail, Favorites, Publish, Seller) */}
      {!isAuthScreen && (
        <Header
          currentScreen={currentScreen}
          favoriteCount={favoriteIds.length}
          currentUser={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onViewSeller={handleViewSeller}
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
            onViewSeller={handleViewSeller}
          />
        )}

        {currentScreen === 'publish' && (
          <PublishScreen
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
          />
        )}

        {currentScreen === 'seller' && (
          <SellerProfileScreen
            sellerName={selectedSellerName}
            onNavigate={handleNavigate}
            onSelectVehicle={handleSelectVehicle}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
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
          <LoginScreen
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterScreen onNavigate={handleNavigate} />
        )}
      </main>

      {/* Main Footer (Rendered on Home, Search, Detail, Favorites, Publish, Seller) */}
      {!isAuthScreen && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
