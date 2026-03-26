
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { api } from '../services/api';
import { Trip } from '../types';
import { Sparkles, Send, Bot, Loader2, Plus, User as UserIcon, X } from 'lucide-react';

interface AIViewProps {
  tripId: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIView: React.FC<AIViewProps> = ({ tripId }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const currentTrip = await api.getTripById(tripId);
      setTrip(currentTrip || null);
      if (currentTrip) {
        setMessages([{ 
          role: 'model', 
          text: `¡Hola! Soy WanderBot. Estoy listo para ayudarte con tu viaje a ${currentTrip.destination}. ¿Quieres sugerencias de restaurantes, consejos de equipaje o un itinerario para mañana?` 
        }]);
      }
    }
    load();
  }, [tripId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: `Eres WanderBot, un asistente de viajes experto, amigable y servicial. Ayuda al usuario con su viaje "${trip?.name}" a "${trip?.destination}". Responde siempre de forma concisa y útil.`,
        }
      });
      
      const modelText = response.text || "Lo siento, tuve un pequeño problema técnico al procesar tu respuesta.";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Gemini AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, ha ocurrido un error al conectar con mis servidores. Por favor, inténtalo de nuevo en unos momentos." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-100">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">WanderBot</h2>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En línea</span>
            </div>
          </div>
        </div>
        <button onClick={() => setMessages([messages[0]])} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Limpiar chat</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-[24px] text-sm font-medium leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-4 rounded-[24px] rounded-tl-none shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-violet-600 rounded-full animate-bounce delay-150"></div>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      <div className="p-4 bg-white border-t rounded-t-[32px] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <form onSubmit={sendMessage} className="relative">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pregúntame lo que quieras..."
            className="w-full py-4 pl-6 pr-14 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-violet-500 font-bold transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-90"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIView;
