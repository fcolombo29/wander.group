
import React, { useState, useEffect } from 'react';
import { MapPin as PinIcon, Download, Search, Navigation, Info, X, Map as MapIcon, Layers, Plus, Trash2, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { MapPin as MapPinType } from '../types';

interface MapsViewProps {
  tripId: string;
}

const MapsView: React.FC<MapsViewProps> = ({ tripId }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLocation, setActiveLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [pins, setPins] = useState<MapPinType[]>([]);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      const [trip, tripPins] = await Promise.all([
        api.getTripById(tripId),
        api.getPins(tripId),
      ]);
      if (trip) {
        setDestination(trip.destination);
        setActiveLocation(trip.destination);
      }
      setPins(tripPins);
    }
    load();
  }, [tripId]);

  const simulateDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setIsOfflineReady(true);
    }, 3000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveLocation(searchQuery);
      setShowPinConfirm(true);
    }
  };

  const savePin = async () => {
    if (!searchQuery.trim()) return;
    const newPin = await api.addPin({
      trip_id: tripId,
      name: searchQuery,
      address: searchQuery,
      category: 'Favorito'
    });
    setPins([...pins, newPin]);
    setShowPinConfirm(false);
    setSearchQuery('');
  };

  const deletePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.deletePin(id);
    setPins(pins.filter(p => p.id !== id));
  };

  const goToPin = (pin: MapPinType) => {
    setActiveLocation(pin.address);
    setSearchQuery(pin.name);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-20 space-y-3">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <Search size={18} className="text-slate-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar y marcar lugares..." 
            className="flex-1 bg-transparent border-none outline-none text-sm py-1 font-bold" 
          />
          {searchQuery && (
            <button type="button" onClick={() => {setSearchQuery(''); setShowPinConfirm(false);}} className="text-slate-300">
              <X size={16}/>
            </button>
          )}
          <div className="w-px h-6 bg-slate-100"></div>
          <button type="submit">
            <Navigation size={18} className="text-indigo-600" />
          </button>
        </form>

        {showPinConfirm && (
          <button 
            onClick={savePin}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest animate-in zoom-in duration-200"
          >
            <Plus size={16} /> Marcar este punto
          </button>
        )}
      </div>

      <div className="flex-1 relative bg-slate-200">
        <iframe
          title="Google Map"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${encodeURIComponent(activeLocation)}&output=embed`}
        ></iframe>

        <div className="absolute right-4 bottom-48 flex flex-col gap-3">
          <button className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 active:scale-90 transition-transform">
            <Layers size={20} />
          </button>
          <button 
            onClick={() => setActiveLocation(destination)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-3xl shadow-2xl shadow-indigo-200 flex items-center justify-center active:scale-90 transition-transform"
          >
            <MapIcon size={24} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-t-[40px] p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t border-slate-50 z-10 max-h-[45vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{destination}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mis Puntos de Interés</p>
          </div>
          {isOfflineReady ? (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              MAPA OFFLINE
            </div>
          ) : (
            <button 
              onClick={simulateDownload}
              disabled={isDownloading}
              className={`bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isDownloading ? 'animate-pulse opacity-70' : ''}`}
            >
              {isDownloading ? 'Descargando...' : <Download size={14} />}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {pins.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl p-6 text-center border-2 border-dashed border-slate-100">
               <PinIcon className="mx-auto text-slate-200 mb-2" size={32} />
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No has guardado ningún punto aún</p>
            </div>
          ) : (
            pins.map(pin => (
              <div 
                key={pin.id} 
                onClick={() => goToPin(pin)}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 active:bg-indigo-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                    <PinIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-none">{pin.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 truncate max-w-[150px]">{pin.category}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => deletePin(e, pin.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 bg-indigo-50/50 rounded-3xl p-5 flex gap-4 border border-indigo-100/50">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
            <Info size={20} />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Busca cualquier lugar arriba y presiona "Marcar este punto" para guardarlo en tu lista personalizada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapsView;
