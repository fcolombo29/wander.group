
import React, { useState } from 'react';
import { db } from '../services/database';
import { User } from '../types';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, Sparkles, Plane } from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (mode === 'login') {
        const user = db.login(formData.email, formData.password);
        if (user) {
          onLogin(user);
        } else {
          setError('Email o contraseña incorrectos');
        }
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          setError('Todos los campos son obligatorios');
          setLoading(false);
          return;
        }
        // El registro ahora es persistente en db.register
        const user = db.register(formData);
        onLogin(user);
      }
    } catch (err) {
      setError('Hubo un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const user = await db.loginWithGoogle();
      onLogin(user);
    } catch (err) {
      setError('Error al conectar con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-violet-500/10 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mx-auto rotate-3">
             <Plane size={40} className="-rotate-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">WanderGroup</h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-none">Tu aventura comienza aquí.</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-50 relative">
          
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 mb-6"
          >
            {googleLoading ? (
              <Loader2 size={20} className="animate-spin text-indigo-500" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Acceder con Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px]"><span className="px-4 bg-white text-slate-300 font-black uppercase tracking-widest">o con email</span></div>
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setMode('register')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Registro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><UserIcon size={18} /></div>
                <input 
                  type="text" 
                  placeholder="Tu Nombre" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-900"
                />
              </div>
            )}

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><Mail size={18} /></div>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-900"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><Lock size={18} /></div>
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-900"
              />
            </div>

            {error && (
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                {error}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading || googleLoading}
              className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {mode === 'login' ? 'Iniciar Sesión' : 'Registrarme'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
