
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trip, TripStatus } from '../types';
import { Calendar, MapPin, ChevronRight, PlusCircle, X, Map, Edit2, Image as ImageIcon, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';

interface HomeProps {
  onSelectTrip: (id: string) => void;
}

const HomeView: React.FC<HomeProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    image_url: ''
  });

  useEffect(() => {
    async function load() {
      const data = await api.getTrips();
      setTrips(data);
    }
    load();
  }, []);

  const loadTrips = async () => {
    const data = await api.getTrips();
    setTrips(data);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinError('');
    setIsJoining(true);

    try {
      const joinedTrip = await api.joinTripByCode(joinCode);
      setIsJoining(false);

      if (joinedTrip) {
        setJoinSuccess(true);
        await loadTrips();
        setTimeout(() => {
          setJoinSuccess(false);
          setShowJoin(false);
          setJoinCode('');
          onSelectTrip(joinedTrip.id);
        }, 1000);
      } else {
        setJoinError('Código inválido o viaje no encontrado.');
      }
    } catch {
      setIsJoining(false);
      setJoinError('Código inválido o viaje no encontrado.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.destination) return;
    
    if (editingTripId) {
      await api.updateTrip(editingTripId, formData);
      await loadTrips();
      setShowCreate(false);
    } else {
      const created = await api.createTrip(formData);
      await loadTrips();
      setShowCreate(false);
      onSelectTrip(created.id);
    }
  };

  const openEdit = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setFormData({
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      image_url: trip.image_url || ''
    });
    setShowCreate(true);
  };

  const activeTrips = trips.filter(t => t.status === TripStatus.ACTIVE);

  return (
    <div className="p-4 space-y-6">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Mis Aventuras</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowJoin(true); setJoinError(''); setJoinSuccess(false); }}
              className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-100 active:scale-95 transition-all"
            >
              <UserPlus size={14} /> Súmate
            </button>
            <button 
              onClick={() => { setEditingTripId(null); setFormData({name: '', destination:'', start_date:'', end_date:'', image_url:''}); setShowCreate(true); }}
              className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-indigo-600 px-3 py-2 rounded-full shadow-lg active:scale-95 transition-all"
            >
              <PlusCircle size={14} /> Nuevo
            </button>
          </div>
        </div>
        
        {activeTrips.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[32px] p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200"><Map size={32} /></div>
            <p className="text-slate-400 text-sm font-bold px-4 leading-relaxed">¿Listo para viajar? Únete a un viaje con el código de un amigo o crea el tuyo propio.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTrips.map(trip => (
              <div key={trip.id} onClick={() => onSelectTrip(trip.id)} className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer group relative">
                <button onClick={(e) => openEdit(e, trip)} className="absolute top-4 right-4 z-10 p-2 bg-white/40 backdrop-blur-md rounded-full text-white hover:bg-white/60 transition-colors">
                  <Edit2 size={16} />
                </button>
                <div className="h-44 w-full relative">
                  <img src={trip.image_url} alt={trip.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white font-black text-2xl tracking-tight leading-none mb-2">{trip.name}</h3>
                    <div className="flex items-center text-indigo-100 text-[10px] font-black uppercase tracking-widest gap-4 mt-1">
                      <div className="flex items-center gap-1.5"><MapPin size={12} className="text-white" /><span>{trip.destination}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar size={12} className="text-white" /><span>{new Date(trip.start_date).toLocaleDateString('es-ES', {month: 'short', year: 'numeric'})}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showJoin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300">
            {joinSuccess ? (
              <div className="text-center py-8 animate-in zoom-in">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-6"><CheckCircle2 size={48} /></div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Bienvenido al grupo!</h3>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800">Súmate a un Viaje</h3>
                  <button onClick={() => setShowJoin(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleJoinByCode} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Ingresa el código</label>
                    <input 
                      placeholder="ABC123" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-center text-3xl uppercase tracking-widest text-slate-900 focus:border-indigo-500 transition-all" 
                      value={joinCode} 
                      onChange={e => setJoinCode(e.target.value)} 
                      disabled={isJoining} 
                      autoFocus 
                    />
                  </div>
                  {joinError && <p className="text-rose-500 text-[11px] font-bold text-center animate-shake">{joinError}</p>}
                  <button disabled={!joinCode.trim() || isJoining} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50">
                    {isJoining ? <Loader2 size={18} className="animate-spin" /> : 'Unirme ahora'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingTripId ? 'Editar Detalles' : 'Nuevo Viaje'}</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">¿Cómo se llama el viaje?</label>
                  <input 
                    placeholder="Ej: Europa 2025" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Destino Principal</label>
                  <input 
                    placeholder="¿A dónde van?" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner" 
                    value={formData.destination} 
                    onChange={e => setFormData({...formData, destination: e.target.value})} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fecha Inicio</label>
                    <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fecha Fin</label>
                    <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">URL de Imagen (Opcional)</label>
                  <input placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 outline-none" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
                </div>
              </div>
              <button className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all">
                {editingTripId ? 'Guardar Cambios' : 'Empezar Aventura'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
