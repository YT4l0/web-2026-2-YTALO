import React, { useState, useEffect } from 'react';
import type { ScreenType, Vehicle } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import {
  type VehicleDocument,
  documentToVehicle,
  noSqlFindVehiclesByOwner,
  noSqlDeleteVehicle,
} from '../../services/noSqlVehicleService';
import {
  IconMapPin,
  IconCar,
  IconArrowRight,
  IconCheck,
} from '../icons/Icons';

interface MyListingsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onEdit: (vehicleId: string) => void;
  onViewVehicle: (vehicle: Vehicle) => void;
  successMessage?: string | null;
  onClearSuccessMessage?: () => void;
}

export const MyListingsScreen: React.FC<MyListingsScreenProps> = ({
  onNavigate,
  onEdit,
  onViewVehicle,
  successMessage = null,
  onClearSuccessMessage,
}) => {
  const { user } = useAuth();
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOwnerVehicles = async () => {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const docs = await noSqlFindVehiclesByOwner(user.id);
        if (isMounted) {
          setVehicleDocs(docs);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar anúncios do proprietário:', err);
        if (isMounted) {
          setErrorMessage('Não foi possível carregar seus anúncios no momento. Tente novamente mais tarde.');
          setIsLoading(false);
        }
      }
    };

    loadOwnerVehicles();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleStartDelete = (doc: VehicleDocument) => {
    setDeleteError(null);
    setDocToDelete(doc);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDocToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete || !user?.id) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await noSqlDeleteVehicle(docToDelete._id, user.id);
      setVehicleDocs((prev) => prev.filter((d) => d._id !== docToDelete._id));
      setActionSuccessMessage('Anúncio excluído com sucesso.');
      setDocToDelete(null);
      if (onClearSuccessMessage) {
        onClearSuccessMessage();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir o anúncio.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeSuccessNotice = actionSuccessMessage || successMessage;

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 pb-16 font-sans">
      {/* BREADCRUMB & HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-blue-600 transition-colors"
          >
            Início
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">Meus anúncios</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Meus anúncios
              </h1>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {vehicleDocs.length} {vehicleDocs.length === 1 ? 'anúncio' : 'anúncios'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gerencie seus veículos anunciados, acompanhe a visibilidade e mantenha as informações atualizadas.
            </p>
          </div>

          <button
            onClick={() => onNavigate('publish')}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-[0.98]"
          >
            <IconCar size={16} />
            Publicar anúncio
          </button>
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        {activeSuccessNotice && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <IconCheck size={12} />
              </span>
              <p className="text-sm font-semibold">{activeSuccessNotice}</p>
            </div>
            <button
              onClick={() => {
                setActionSuccessMessage(null);
                if (onClearSuccessMessage) onClearSuccessMessage();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1"
              aria-label="Fechar mensagem de sucesso"
            >
              Fechar
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-3 shadow-sm"
          >
            <p className="text-sm font-semibold">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-red-700 hover:text-red-900 px-2 py-1"
              aria-label="Fechar mensagem de erro"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Carregando seus anúncios...</span>
          </div>
        ) : vehicleDocs.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
              <IconCar size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Você ainda não publicou nenhum anúncio.
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Anuncie seus carros, motos ou utilitários para compradores de Pau dos Ferros e de todo o Alto Oeste Potiguar com rapidez e segurança.
              </p>
            </div>

            <button
              onClick={() => onNavigate('publish')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              Publicar anúncio
              <IconArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* LISTINGS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicleDocs.map((doc) => {
              const formattedDate = doc.createdAt
                ? new Date(doc.createdAt).toLocaleDateString('pt-BR')
                : 'Recente';

              return (
                <div
                  key={doc._id}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image Header */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={doc.mainImage}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Badge top left */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded shadow-sm ${
                          doc.status === 'ativo'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-500 text-white'
                        }`}
                      >
                        {doc.status === 'ativo' ? 'Ativo' : 'Oculto'}
                      </span>
                    </div>

                    {/* Publication Date top right */}
                    <div className="absolute top-3 right-3 bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded shadow">
                      {formattedDate}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>{doc.year}</span>
                        <span className="font-medium">{doc.mileageFormatted}</span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 line-clamp-1" title={doc.title}>
                        {doc.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <IconMapPin size={13} className="text-slate-400 shrink-0" />
                        <span>{doc.city || doc.location}</span>
                      </div>

                      {doc.status === 'oculto' && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-2 py-1 mt-2 font-medium">
                          Este anúncio não aparece nas buscas.
                        </p>
                      )}
                    </div>

                    {/* Price Block */}
                    <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Preço</span>
                        <span className="text-lg font-extrabold text-blue-600">
                          R$ {doc.price.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {doc.fipePrice ? (
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">Tabela FIPE</span>
                          <span className="text-xs font-bold text-emerald-600">
                            R$ {doc.fipePrice.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => onViewVehicle(documentToVehicle(doc))}
                        className="py-2 px-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors text-center"
                        aria-label={`Ver anúncio ${doc.title}`}
                      >
                        Ver anúncio
                      </button>
                      <button
                        onClick={() => onEdit(doc._id)}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors text-center"
                        aria-label={`Editar anúncio ${doc.title}`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleStartDelete(doc)}
                        className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors text-center"
                        aria-label={`Excluir anúncio ${doc.title}`}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {docToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </div>
              <div>
                <h3 id="modal-delete-title" className="text-lg font-bold text-slate-900">
                  Excluir anúncio
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação é irreversível e removerá o anúncio da plataforma.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Tem certeza que deseja excluir o anúncio <strong className="font-semibold text-slate-900">{docToDelete.title}</strong>?
            </p>

            {deleteError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Excluindo...</span>
                  </>
                ) : (
                  'Excluir anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
