
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { LogOut, Camera, Mail, User as UserIcon, Bell, BellOff, ChevronRight, Save, Loader2, Check, X } from 'lucide-react';
import { User, NotificationSettings } from '../types';

interface ProfileViewProps {
  onUpdate: () => void;
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onUpdate, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    enabled: false, invitations: true, expenses: true, activities: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ name: '', email: '', avatar_url: '' });

  useEffect(() => {
    async function load() {
      const [currentUser, notifs] = await Promise.all([
        api.getCurrentUser(),
        api.getNotificationSettings(),
      ]);
      setUser(currentUser);
      if (currentUser) {
        setFormData({ name: currentUser.name, email: currentUser.email, avatar_url: currentUser.avatar_url || '' });
      }
      setNotifSettings(notifs);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateCurrentUser(formData);
      setUser(updated);
      setIsEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, avatar_url: base64String }));
      const updated = await api.updateCurrentUser({ avatar_url: base64String });
      setUser(updated);
      onUpdate();
    };
    reader.readAsDataURL(file);
  };

  const handleNotifToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notifSettings, [key]: value };

    if (key === 'enabled' && value) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          updated.enabled = false;
        }
      }
    }

    setNotifSettings(updated);
    setNotifSaving(true);
    try {
      await api.updateNotificationSettings(updated);
    } finally {
      setNotifSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Cargando perfil...</div>;

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      <div className="pt-4 text-center space-y-4">
        <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
          <div className="w-28 h-28 rounded-[36px] bg-gradient-to-tr from-indigo-500 to-violet-500 border-4 border-white shadow-2xl shadow-indigo-100 flex items-center justify-center text-white text-4xl font-black overflow-hidden relative transition-transform active:scale-95">
            {formData.avatar_url
              ? <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Profile" />
              : user.name.charAt(0)}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <button className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 text-indigo-600 active:scale-90 transition-transform">
            <Camera size={20} />
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{user.name}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{user.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Personal</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-tighter active:scale-95">Editar</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5 rounded-full uppercase tracking-tighter">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1 uppercase tracking-tighter active:scale-95 disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <UserIcon size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Nombre Completo</p>
              {isEditing ? (
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border-b-2 border-indigo-100 outline-none text-sm font-bold py-1 focus:border-indigo-600 transition-colors text-slate-900" />
              ) : (
                <p className="text-sm font-black text-slate-700">{user.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Correo Electrónico</p>
              <p className="text-sm font-black text-slate-700">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notificaciones</h3>
          {notifSaving && <Loader2 size={14} className="animate-spin text-indigo-400" />}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notifSettings.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
              {notifSettings.enabled ? <Bell size={20} /> : <BellOff size={20} />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">Activar notificaciones</p>
              <p className="text-[10px] text-slate-400 font-medium">El navegador solicitará permiso</p>
            </div>
          </div>
          <button
            onClick={() => handleNotifToggle('enabled', !notifSettings.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${notifSettings.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${notifSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {notifSettings.enabled && (
          <div className="space-y-3 border-t border-slate-50 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipos de aviso</p>
            {([
              { key: 'invitations' as const, label: 'Invitaciones al viaje' },
              { key: 'expenses' as const, label: 'Nuevos gastos' },
              { key: 'activities' as const, label: 'Cambios en el itinerario' },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm font-bold text-slate-600">{label}</span>
                <button
                  onClick={() => handleNotifToggle(key, !notifSettings[key])}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${notifSettings[key] ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${notifSettings[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[32px] p-2 border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
              <LogOut size={18} />
            </div>
            <span className="text-sm font-black text-rose-600 uppercase tracking-tight">Cerrar Sesión</span>
          </div>
        </button>
      </div>

      <div className="text-center pb-4 opacity-40">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">WanderGroup • v2.0.0 Stable</p>
      </div>
    </div>
  );
};

export default ProfileView;
