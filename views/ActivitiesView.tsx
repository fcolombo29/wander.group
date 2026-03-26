
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';
import { Activity, ActivityStatus, User, JournalEntry, Trip } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Plus, CheckCircle, Circle, Clock, X, Users, MapPin, Edit3, BookOpen, Calendar as CalendarIcon, Mic, MicOff, Sparkles, Loader2, Save, ChevronRight, PenLine, History, Wand2 } from 'lucide-react';

interface ActivitiesViewProps {
  tripId: string;
}

const ActivitiesView: React.FC<ActivitiesViewProps> = ({ tripId }) => {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'journal'>('itinerary');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [editingAct, setEditingAct] = useState<Activity | null>(null);
  const [newAct, setNewAct] = useState({ 
    title: '', date: '', time: '', description: '', participants: [] as string[] 
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [editingEntryDate, setEditingEntryDate] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    async function load() {
      const [currentTrip, tripMembers, user] = await Promise.all([
        api.getTripById(tripId),
        api.getTripMembers(tripId),
        api.getCurrentUser(),
      ]);
      if (currentTrip) {
        setTrip(currentTrip);
        setEditingEntryDate(new Date().toISOString().split('T')[0]);
      }
      setMembers(tripMembers);
      if (user) setCurrentUserId(user.id);
      await refreshData();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.lang = 'es-ES';
        recognitionRef.current.onresult = (event: any) => {
          const text = event.results[event.results.length - 1][0].transcript;
          setJournalContent(prev => prev + ' ' + text);
        };
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
    load();
  }, [tripId]);

  const refreshData = async () => {
    const [acts, entries] = await Promise.all([
      api.getActivities(tripId),
      api.getJournalEntries(tripId),
    ]);
    setActivities(acts.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00')).getTime();
      const dateB = new Date(b.date + ' ' + (b.time || '00:00')).getTime();
      return dateA - dateB;
    }));
    setJournalEntries(entries);
  };

  const handleAISuggestions = async () => {
    if (!trip || isSuggesting) return;
    setIsSuggesting(true);
    const suggestions = await geminiService.suggestActivities(trip.destination, `${trip.start_date} a ${trip.end_date}`);
    
    for (const s of suggestions) {
      await api.addActivity({
        trip_id: tripId,
        title: s.title,
        description: s.description,
        date: trip.start_date,
        time: "10:00",
        status: ActivityStatus.PENDING,
        participants: members.map(m => m.id)
      });
    }
    
    await refreshData();
    setIsSuggesting(false);
  };

  const refineWithAi = async () => {
    if (!journalContent.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Mejora y corrige el siguiente diario de viaje. Haz que suene emocionante y profesional, manteniendo los detalles clave. Notas: "${journalContent}"`
      });
      if (response.text) setJournalContent(response.text.trim());
    } catch (error) {
      console.error("Gemini Error:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleItinerarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAct.title || !newAct.date) return;
    if (editingAct) {
      await api.updateActivity(editingAct.id, newAct);
    } else {
      await api.addActivity({
        trip_id: tripId,
        title: newAct.title,
        description: newAct.description,
        date: newAct.date,
        time: newAct.time,
        status: ActivityStatus.PENDING,
        participants: newAct.participants
      });
    }
    await refreshData();
    setShowItineraryModal(false);
  };

  const toggleStatus = async (id: string) => {
    const act = activities.find(a => a.id === id);
    if (!act) return;
    await api.updateActivity(id, { status: act.status === ActivityStatus.DONE ? ActivityStatus.PENDING : ActivityStatus.DONE });
    await refreshData();
  };

  const getTripDays = () => {
    if (!trip) return [];
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = [];
    let curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr).toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  };

  const itineraryGrouped = activities.reduce((acc: any, act) => {
    if (!acc[act.date]) acc[act.date] = [];
    acc[act.date].push(act);
    return acc;
  }, {});

  const handleSaveJournal = async () => {
    await api.saveJournalEntry({ trip_id: tripId, user_id: currentUserId, date: editingEntryDate, content: journalContent, is_shared: isShared });
    await refreshData();
    setShowJournalEditor(false);
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plan de Viaje</h2>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => setActiveTab('itinerary')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${activeTab === 'itinerary' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}>
              <CalendarIcon size={12} /> Itinerario
            </button>
            <button onClick={() => setActiveTab('journal')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${activeTab === 'journal' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}>
              <BookOpen size={12} /> Diario
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'itinerary' && (
            <>
              <button 
                onClick={handleAISuggestions}
                disabled={isSuggesting}
                className="bg-violet-600 text-white w-12 h-12 rounded-2xl shadow-xl shadow-violet-100 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
              >
                {isSuggesting ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
              </button>
              <button onClick={() => { setEditingAct(null); setShowItineraryModal(true); }} className="bg-amber-500 text-white w-12 h-12 rounded-2xl shadow-xl shadow-amber-100 flex items-center justify-center active:scale-90 transition-transform">
                <Plus size={28} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'itinerary' ? (
          <div className="space-y-10">
            {Object.keys(itineraryGrouped).length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100 p-8">
                <Sparkles className="mx-auto text-amber-200 mb-4" size={48} />
                <p className="text-slate-500 font-bold text-sm mb-6">Tu itinerario está vacío. ¿Quieres que la IA sugiera algo?</p>
                <button 
                  onClick={handleAISuggestions}
                  className="bg-violet-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 mx-auto"
                >
                  <Wand2 size={14} /> Sugerir Actividades
                </button>
              </div>
            ) : (
              Object.entries(itineraryGrouped).map(([date, items]: [string, any]) => (
                <div key={date}>
                  <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </h3>
                  <div className="space-y-3 ml-2 pl-4 border-l-2 border-slate-50">
                    {items.map((act: Activity) => (
                      <div key={act.id} className={`p-4 rounded-[24px] border transition-all ${act.status === ActivityStatus.DONE ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleStatus(act.id)} className="mt-1">
                            {act.status === ActivityStatus.DONE ? <CheckCircle size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-200" />}
                          </button>
                          <div className="flex-1">
                            <h4 className={`text-sm font-black ${act.status === ActivityStatus.DONE ? 'line-through text-slate-400' : 'text-slate-800'}`}>{act.title}</h4>
                            {act.time && <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase">{act.time}</p>}
                            {act.description && <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{act.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {getTripDays().map((day, idx) => {
              const entry = journalEntries.find(e => e.date === day);
              return (
                <button key={day} onClick={() => {
                  setEditingEntryDate(day);
                  setJournalContent(entry?.content || '');
                  setIsShared(entry?.is_shared || false);
                  setShowJournalEditor(true);
                }} className="w-full text-left bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:border-amber-200 transition-all group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Día {idx+1} • {new Date(day).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span>
                    {entry?.is_shared && <div className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Compartido</div>}
                  </div>
                  {entry ? <p className="text-sm text-slate-600 font-medium line-clamp-3 leading-relaxed">{entry.content}</p> : <p className="text-xs text-slate-300 italic font-bold">Sin registros aún...</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showJournalEditor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">Mi Diario</h3>
              <button onClick={() => setShowJournalEditor(false)} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex gap-2 justify-end">
                <button onClick={refineWithAi} disabled={isAiProcessing || !journalContent.trim()} className="flex items-center gap-2 bg-violet-50 text-violet-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50">
                  {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Mejorar IA
                </button>
                <button onClick={() => {
                  if(isListening) { recognitionRef.current.stop(); setIsListening(false); }
                  else { recognitionRef.current.start(); setIsListening(true); }
                }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                  {isListening ? <MicOff size={14}/> : <Mic size={14}/>} {isListening ? 'Parar' : 'Dictar'}
                </button>
              </div>
              
              <textarea 
                value={journalContent} 
                onChange={e => setJournalContent(e.target.value)}
                placeholder="Hoy fue un día increíble..."
                className="w-full h-64 p-6 bg-amber-50/20 border border-amber-100 rounded-[32px] outline-none font-medium text-slate-700 leading-relaxed resize-none"
              />
              
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase">Compartir con amigos</span>
                <button onClick={() => setIsShared(!isShared)} className={`w-12 h-6 rounded-full transition-all relative ${isShared ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isShared ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              <button onClick={handleSaveJournal} className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-100">
                Guardar Vivencia
              </button>
            </div>
          </div>
        </div>
      )}

      {showItineraryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingAct ? 'Editar Actividad' : 'Nuevo Plan'}</h3>
              <button onClick={() => setShowItineraryModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleItinerarySubmit} className="space-y-6">
              <div className="space-y-4">
                <input value={newAct.title} onChange={e => setNewAct({...newAct, title: e.target.value})} placeholder="Ej: Visita al Museo" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-amber-500" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={newAct.date} onChange={e => setNewAct({...newAct, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" required />
                  <input type="time" value={newAct.time} onChange={e => setNewAct({...newAct, time: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                </div>
                <textarea value={newAct.description} onChange={e => setNewAct({...newAct, description: e.target.value})} placeholder="Detalles extra..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm h-24" />
              </div>
              <button className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest">Añadir al Mapa</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesView;
