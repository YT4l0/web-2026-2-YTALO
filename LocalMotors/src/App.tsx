import { useState, useEffect } from 'react';
import type { ScreenType, Vehicle } from './types/vehicle';
import { MOCK_VEHICLES } from './data/mockVehicles';
import { getActiveSession, setActiveSession } from './services/noSqlAuthService';
import type { UserDocument } from './services/noSqlAuthService';
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
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('Carlos Motors');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['corolla-xei-2021', 'strada-freedom-2021']);
  const [currentUser, setCurrentUser] = useState<UserDocument | null>(null);

  // Sincronizar sessão ativa ao iniciar
  useEffect(() => {
    const session = getActiveSession();
    setCurrentUser(session);
  }, []);

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
    // Se o usuário clicar em 'publish' sem estar logado, redireciona para login
    if (screen === 'publish' && !currentUser) {
      setCurrentScreen('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: UserDocument) => {
    setCurrentUser(user);
    // Se logou com sucesso, direciona para o marketplace ou para publicação se veio dessa intenção
    setCurrentScreen('publish');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setActiveSession(null);
    setCurrentUser(null);
    if (currentScreen === 'publish') {
      setCurrentScreen('home');
    }
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
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      {/* Main Header (Rendered on Home, Search, Detail, Favorites, Publish, Seller) */}
      {!isAuthScreen && (
        <Header
          currentScreen={currentScreen}
          favoriteCount={favoriteIds.length}
          currentUser={currentUser}
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
