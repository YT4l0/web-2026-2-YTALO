import React from 'react';
import type { ScreenType } from '../../types/vehicle';
import type { UserDocument } from '../../services/noSqlAuthService';
import type { AuthUser } from '../../services/auth/types';
import { IconUser, IconCheck } from '../icons/Icons';

interface HeaderProps {
  currentScreen: ScreenType;
  favoriteCount?: number;
  unreadConversationsCount?: number;
  currentUser?: AuthUser | UserDocument | null;
  onNavigate: (screen: ScreenType) => void;
  onLogout?: () => void;
  onViewSeller?: (sellerName: string) => void;
}

interface CustomProfileData {
  name?: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
}

const getSavedProfile = (userId?: string | null, email?: string | null): CustomProfileData | null => {
  try {
    if (userId) {
      const raw = localStorage.getItem(`motorlocal_profile_${userId}`);
      if (raw) return JSON.parse(raw);
    }
    if (email) {
      const rawEmail = localStorage.getItem(`motorlocal_profile_${email}`);
      if (rawEmail) return JSON.parse(rawEmail);
    }
    return null;
  } catch {
    return null;
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  favoriteCount = 0,
  unreadConversationsCount = 0,
  currentUser = null,
  onNavigate,
  onLogout,
  onViewSeller,
}) => {
  const safeUnreadCount = Math.max(0, unreadConversationsCount);
  const unreadBadgeText = safeUnreadCount >= 100 ? '99+' : String(safeUnreadCount);
  const conversationsAriaLabel =
    safeUnreadCount > 0
      ? `Conversas (${safeUnreadCount} mensagens não lidas)`
      : 'Conversas';
  const currentUserId = currentUser ? ('id' in currentUser ? currentUser.id : currentUser._id) : null;
  const currentUserEmail = currentUser?.email || null;

  const [customProfile, setCustomProfile] = React.useState<CustomProfileData | null>(() =>
    getSavedProfile(currentUserId, currentUserEmail)
  );

  React.useEffect(() => {
    const syncProfile = () => {
      setCustomProfile(getSavedProfile(currentUserId, currentUserEmail));
    };

    syncProfile();

    window.addEventListener('profileUpdated', syncProfile);
    window.addEventListener('storage', syncProfile);

    return () => {
      window.removeEventListener('profileUpdated', syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, [currentUserId, currentUserEmail]);

  const displayName = customProfile?.name || (currentUser ? currentUser.name : '');
  const displayPicture = customProfile?.photoUrl || (currentUser && 'picture' in currentUser ? currentUser.picture : undefined);
  const handleSellVehicleClick = () => {
    if (currentUser) {
      onNavigate('publish');
    } else {
      onNavigate('login');
    }
  };

  const handleFavoritesClick = () => {
    if (currentUser) {
      onNavigate('favorites');
    } else {
      onNavigate('login');
    }
  };

  const handleMyListingsClick = () => {
    if (currentUser) {
      onNavigate('myListings');
    } else {
      onNavigate('login');
    }
  };

  const handleSellerProfileClick = () => {
    if (currentUser && onViewSeller) {
      onViewSeller(displayName || currentUser.name);
    } else {
      onNavigate('seller');
    }
  };

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
              Comprar Veículo
            </button>
            <button
              onClick={handleSellVehicleClick}
              className={`transition-colors py-2 border-b-2 flex items-center gap-1.5 ${
                currentScreen === 'publish'
                  ? 'text-blue-400 border-blue-500 font-semibold'
                  : 'text-slate-300 border-transparent hover:text-white'
              }`}
            >
              Anunciar
            </button>
            <button
              onClick={handleFavoritesClick}
              className={`transition-colors py-2 border-b-2 flex items-center gap-1.5 ${
                currentScreen === 'favorites'
                  ? 'text-blue-400 border-blue-500'
                  : 'text-slate-300 border-transparent hover:text-white'
              }`}
            >
              Favoritos
              {favoriteCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                  {favoriteCount}
                </span>
              )}
            </button>
            {currentUser && (
              <button
                onClick={handleMyListingsClick}
                className={`transition-colors py-2 border-b-2 flex items-center gap-1.5 ${
                  currentScreen === 'myListings' || currentScreen === 'editListing'
                    ? 'text-blue-400 border-blue-500 font-semibold'
                    : 'text-slate-300 border-transparent hover:text-white'
                }`}
              >
                Meus anúncios
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => onNavigate('conversations')}
                aria-label={conversationsAriaLabel}
                className={`transition-colors py-2 border-b-2 flex items-center gap-1.5 ${
                  currentScreen === 'conversations'
                    ? 'text-blue-400 border-blue-500 font-semibold'
                    : 'text-slate-300 border-transparent hover:text-white'
                }`}
              >
                <span>Conversas</span>
                {safeUnreadCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] justify-center leading-none"
                    aria-hidden="true"
                  >
                    {unreadBadgeText}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={handleSellerProfileClick}
              className={`transition-colors py-2 border-b-2 ${
                currentScreen === 'seller'
                  ? 'text-blue-400 border-blue-500'
                  : 'text-slate-300 border-transparent hover:text-white'
              }`}
            >
              Perfil do Vendedor
            </button>
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onNavigate('conversations')}
                  className={`md:hidden relative p-2 rounded-xl border transition-colors ${
                    currentScreen === 'conversations'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                  title={conversationsAriaLabel}
                  aria-label={conversationsAriaLabel}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {safeUnreadCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-extrabold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center leading-none shadow-sm"
                      aria-hidden="true"
                    >
                      {unreadBadgeText}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleSellerProfileClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors text-left"
                  title="Ver meu perfil e anúncios"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                    {displayPicture ? (
                      <img
                        src={displayPicture}
                        alt={displayName || 'Foto de perfil'}
                        className="w-full h-full object-cover"
                      />
                    ) : displayName ? (
                      displayName[0].toUpperCase()
                    ) : currentUser.name ? (
                      currentUser.name[0].toUpperCase()
                    ) : (
                      'U'
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-semibold text-white leading-none">
                      {displayName || currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      {currentUser.isConfirmed ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                          <IconCheck size={10} /> Confirmado
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">Pendente</span>
                      )}
                    </span>
                  </div>
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-slate-700/60 hover:border-red-500/40 transition-colors"
                  title="Encerrar sessão"
                >
                  Sair
                </button>
              </div>
            ) : (
              <>
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
                  onClick={() => onNavigate('register')}
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
