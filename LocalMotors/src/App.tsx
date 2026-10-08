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
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('Carlos Motors');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Navega para 'home' somente apÃ³s a sessÃ£o Cognito ser confirmada pelo AuthContext.
  // NUNCA baseie a navegaÃ§Ã£o na presenÃ§a de '?code=' na URL â€” isso sÃ³ indica que o
  // OAuth retornou, nÃ£o que a sessÃ£o foi validada com sucesso pelo Cognito.
  useEffect(() => {
    if (isAuthenticated && currentScreen === 'login') {
      setCurrentScreen('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isAuthenticated, currentScreen]);

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
    // Rotas protegidas (publicar anÃºncio, favoritos persistentes) exigem isAuthenticated
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

  // Aguarda a verificaÃ§Ã£o inicial da sessÃ£o (getCurrentUser) antes de renderizar
  // qualquer tela. Isso evita flash de conteÃºdo nÃ£o autenticado e garante que o
  // retorno do OAuth seja processado pelo Amplify antes de qualquer decisÃ£o de rota.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070c19]">
        <div className="flex flex-col items-center gap-4 text-white">
          <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-400">Verificando sessÃ£o...</span>
        </div>
      </div>
    );
  }

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

