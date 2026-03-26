
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trip, User, Expense, TripRole } from '../types';
import { Users, Receipt, Map as MapIcon, Calendar, ArrowUpRight, ArrowDownLeft, Wallet, UserPlus, Copy, Check, X, Loader2, Files, Crown, Shield, Eye, Trash2, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ViewType } from '../App';

interface TripDashboardProps {
  tripId: string;
  onNavigate: (view: ViewType) => void;
  currentUser: User | null;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Crown size={12} />, color: 'text-amber-600 bg-amber-50' },
  editor: { label: 'Editor', icon: <Shield size={12} />, color: 'text-indigo-600 bg-indigo-50' },
  viewer: { label: 'Visor', icon: <Eye size={12} />, color: 'text-slate-500 bg-slate-100' },
};

const TripDashboard: React.FC<TripDashboardProps> = ({ tripId, onNavigate, currentUser }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [manageMember, setManageMember] = useState<any | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const currentUserRole = members.find(m => m.id === currentUser?.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    async function load() {
      const [currentTrip, tripMembers, tripExpenses] = await Promise.all([
        api.getTripById(tripId),
        api.getTripMembers(tripId),
        api.getExpenses(tripId),
      ]);
      setTrip(currentTrip || null);
      setMembers(tripMembers);
      setExpenses(tripExpenses);
    }
    load();
  }, [tripId]);

  if (!trip) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Cargando...</div>;

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  let userPaid = 0;
  let userOwes = 0;
  expenses.forEach(exp => {
    if (exp.payer_id === currentUser?.id) userPaid += exp.amount;
    if (exp.participants.includes(currentUser?.id || '')) userOwes += exp.amount / exp.participants.length;
  });
  const netBalance = userPaid - userOwes;

  const categories = expenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const chartData = Object.entries(categories).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleShowInvite = async () => {
    setShowAddMember(true);
    try {
      const code = await api.getInviteCode(tripId);
      setInviteCode(code);
    } catch {
      setInviteCode(tripId);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    setRoleLoading(true);
    try {
      await api.updateMemberRole(tripId, memberId, newRole);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      setManageMember((prev: any) => prev ? { ...prev, role: newRole } : null);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar rol');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Eliminar este compañero del viaje?')) return;
    try {
      await api.removeTripMember(tripId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setManageMember(null);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar miembro');
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[36px] p-7 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <h2 className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Gasto del Grupo</h2>
        <div className="flex items-end justify-between">
          <span className="text-4xl font-black tracking-tighter">${totalSpent.toLocaleString('es-AR')}</span>
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border border-white/20">ARS</div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border ${netBalance >= 0 ? 'border-emerald-500/30' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1 rounded-lg ${netBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'}`}><ArrowUpRight size={14} /></div>
              <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">{netBalance >= 0 ? 'A favor' : 'Balance'}</span>
            </div>
            <span className={`text-xl font-black tracking-tight ${netBalance >= 0 ? 'text-emerald-300' : 'text-white'}`}>${Math.abs(netBalance).toLocaleString('es-AR')}</span>
          </div>
          <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border ${netBalance < 0 ? 'border-rose-500/30' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1 rounded-lg ${netBalance < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/20 text-white'}`}><ArrowDownLeft size={14} /></div>
              <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">{netBalance < 0 ? 'Debes' : 'Tu Gasto'}</span>
            </div>
            <span className={`text-xl font-black tracking-tight ${netBalance < 0 ? 'text-rose-300' : 'text-white'}`}>${(netBalance < 0 ? Math.abs(netBalance) : userOwes).toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 px-1">
        {[
          { icon: <Receipt size={22} />, label: 'Gastos', color: 'bg-emerald-50 text-emerald-600', view: 'expenses' as ViewType },
          { icon: <MapIcon size={22} />, label: 'Mapa', color: 'bg-blue-50 text-blue-600', view: 'maps' as ViewType },
          { icon: <Calendar size={22} />, label: 'Itinerario', color: 'bg-amber-50 text-amber-600', view: 'activities' as ViewType },
          { icon: <Files size={22} />, label: 'Archivos', color: 'bg-violet-50 text-violet-600', view: 'documents' as ViewType },
        ].map((action, i) => (
          <button key={i} onClick={() => onNavigate(action.view)} className="flex flex-col items-center gap-2 active:scale-90 transition-transform group">
            <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>{action.icon}</div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-wide">
            <Users size={16} className="text-indigo-500" />
            Compañeros del Viaje
          </h3>
          {isAdmin && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1"><Crown size={10} /> Admin</span>}
        </div>
        <div className="flex flex-wrap gap-5">
          {members.map(member => {
            const roleConfig = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
            const isSelf = member.id === currentUser?.id;
            return (
              <button
                key={member.id}
                onClick={() => isAdmin && !isSelf ? setManageMember(member) : undefined}
                className={`flex flex-col items-center gap-2 animate-in zoom-in duration-300 ${isAdmin && !isSelf ? 'active:scale-90 transition-transform' : 'cursor-default'}`}
              >
                <div className="relative h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center font-black text-slate-500 text-lg overflow-hidden">
                  {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt={member.name} /> : member.name.charAt(0)}
                  {isSelf && <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[10px] font-black text-slate-700 truncate w-14 text-center">{isSelf ? 'Tú' : member.name.split(' ')[0]}</p>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${roleConfig.color}`}>
                    {roleConfig.icon} {roleConfig.label}
                  </span>
                </div>
              </button>
            );
          })}
          <button onClick={handleShowInvite} className="flex flex-col items-center gap-2 active:scale-95 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-white border-2 border-dashed border-indigo-200 flex items-center justify-center text-indigo-400">
              <UserPlus size={24} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Sumar</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Wallet size={16} className="text-indigo-500" />
          Distribución de Gastos
        </h3>
        {chartData.length > 0 ? (
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
              <span className="text-lg font-black text-slate-800">${totalSpent.toLocaleString('es-AR')}</span>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-300 text-xs font-bold italic text-center px-6">
            Registra tu primer gasto para ver el gráfico.
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Sumar Amigos</h3>
              <button onClick={() => setShowAddMember(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Comparte este código con tus amigos para que se unan al viaje.</p>
            <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 border-dashed flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Código compartido</p>
                <p className="text-2xl font-black text-indigo-600 tracking-widest leading-none mt-1">{inviteCode || '...'}</p>
              </div>
              <button onClick={copyInviteCode} disabled={!inviteCode} className={`p-4 rounded-2xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-indigo-600 shadow-sm active:scale-90'} disabled:opacity-50`}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageMember && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-500 text-lg overflow-hidden">
                  {manageMember.avatar_url ? <img src={manageMember.avatar_url} className="w-full h-full object-cover" /> : manageMember.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{manageMember.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{manageMember.email}</p>
                </div>
              </div>
              <button onClick={() => setManageMember(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cambiar rol</p>
              {(['admin', 'editor', 'viewer'] as const).map(role => {
                const cfg = ROLE_LABELS[role];
                const isCurrentRole = manageMember.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(manageMember.id, role)}
                    disabled={roleLoading || isCurrentRole}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isCurrentRole ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50'} disabled:opacity-60`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl ${cfg.color}`}>{cfg.icon}</span>
                      <span className="text-sm font-black text-slate-700">{cfg.label}</span>
                    </div>
                    {isCurrentRole && <Check size={16} className="text-indigo-600" />}
                    {roleLoading && !isCurrentRole && <Loader2 size={16} className="animate-spin text-slate-400" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleRemoveMember(manageMember.id)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-600 font-black text-sm border border-rose-100 active:scale-95 transition-all"
            >
              <Trash2 size={16} />
              Eliminar del viaje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDashboard;
