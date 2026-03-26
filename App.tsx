
import React, { useState, useEffect } from 'react';
import { Home, Plus, Briefcase, DollarSign, FileText, Calendar, Map, User, Bot, LogOut, ChevronLeft, Plane, Loader2 } from 'lucide-react';
import { api } from './services/api';
import { Trip, TripStatus, User as UserType } from './types';

import HomeView from './views/Home';
import TripDashboard from './views/TripDashboard';
import ExpensesView from './views/ExpensesView';
import ActivitiesView from './views/ActivitiesView';
import DocumentsView from './views/DocumentsView';
import MapsView from './views/MapsView';
import AIView from './views/AIView';
import ProfileView from './views/ProfileView';

export type ViewType = 'home' | 'trip-dashboard' | 'expenses' | 'activities' | 'documents' | 'maps' | 'ai' | 'profile';

const App: React.FC = () => {
  const [history, setHistory] = useState<ViewType[]>(['home']);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  const currentView = history[history.length - 1];

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    checkAuth();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    api.logout();
  };

  const navigateTo = (view: ViewType) => {
    setHistory(prev => [...prev, view]);
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const navigateToTrip = (id: string) => {
    setSelectedTripId(id);
    navigateTo('trip-dashboard');
  };

  const handleProfileUpdate = async () => {
    const updatedUser = await api.getCurrentUser();
    if (updatedUser) setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mx-auto rotate-3">
              <Plane size={40} className="-rotate-12" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">WanderGroup</h1>
            <p className="text-slate-400 text-sm font-medium px-4">Organiza viajes en grupo de forma inteligente</p>
          </div>
          <button
            onClick={() => api.login()}
            className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (currentView === 'home') return <HomeView onSelectTrip={navigateToTrip} />;
    if (currentView === 'profile') return <ProfileView onUpdate={handleProfileUpdate} onLogout={handleLogout} />;
    
    if (!selectedTripId) return <HomeView onSelectTrip={navigateToTrip} />;

    switch (currentView) {
      case 'trip-dashboard': return <TripDashboard tripId={selectedTripId} onNavigate={navigateTo} currentUser={user} />;
      case 'expenses': return <div className="bg-emerald-50/40 min-h-full"><ExpensesView tripId={selectedTripId} /></div>;
      case 'activities': return <div className="bg-amber-50/40 min-h-full"><ActivitiesView tripId={selectedTripId} /></div>;
      case 'documents': return <div className="bg-slate-50 min-h-full"><DocumentsView tripId={selectedTripId} currentUser={user} /></div>;
      case 'maps': return <div className="bg-blue-50/40 min-h-full h-full"><MapsView tripId={selectedTripId} /></div>;
      case 'ai': return <div className="bg-violet-50/40 min-h-full"><AIView tripId={selectedTripId} /></div>;
      default: return <HomeView onSelectTrip={navigateToTrip} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white relative shadow-2xl overflow-hidden font-sans">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest animate-pulse z-50">
          Modo Offline Activado - Sincronización pendiente
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {history.length > 1 && (
            <button onClick={goBack} className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
          )}
          <h1 className="font-bold text-xl tracking-tight text-indigo-600 cursor-pointer" onClick={() => setHistory(['home'])}>WanderGroup</h1>
        </div>
        <button 
          onClick={() => navigateTo('profile')}
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm overflow-hidden active:scale-95 transition-transform"
        >
          {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="Profile" /> : (user?.name.charAt(0) || 'U')}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        {renderView()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t px-4 py-3 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setHistory(['home'])}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <Home size={22} strokeWidth={currentView === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Inicio</span>
        </button>

        {selectedTripId && (
          <>
            <button 
              onClick={() => navigateTo('expenses')}
              className={`flex flex-col items-center gap-1 transition-all ${currentView === 'expenses' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}
            >
              <DollarSign size={22} strokeWidth={currentView === 'expenses' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Gastos</span>
            </button>
            <button 
              onClick={() => navigateTo('activities')}
              className={`flex flex-col items-center gap-1 transition-all ${currentView === 'activities' ? 'text-amber-600 scale-110' : 'text-slate-400'}`}
            >
              <Calendar size={22} strokeWidth={currentView === 'activities' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Plan</span>
            </button>
            <button 
              onClick={() => navigateTo('ai')}
              className={`flex flex-col items-center gap-1 transition-all ${currentView === 'ai' ? 'text-violet-600 scale-110' : 'text-slate-400'}`}
            >
              <Bot size={22} strokeWidth={currentView === 'ai' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">IA</span>
            </button>
            <button 
              onClick={() => navigateTo('trip-dashboard')}
              className={`flex flex-col items-center gap-1 transition-all ${currentView === 'trip-dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
            >
              <Briefcase size={22} strokeWidth={currentView === 'trip-dashboard' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Trip</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default App;
