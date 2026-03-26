
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Document, User } from '../types';
import {
  Files, Plus, Search, Download, FileCheck, Shield, ReceiptText, X, File, UploadCloud,
  Eye, Lock, Users, ChevronDown, Check, Trash2, Settings, Loader2
} from 'lucide-react';

interface DocumentsViewProps {
  tripId: string;
  currentUser: User | null;
}

const docTypes = {
  ticket: { icon: <ReceiptText size={20} />, label: 'Tickets / Vuelos', color: 'bg-blue-50 text-blue-600' },
  reservation: { icon: <FileCheck size={20} />, label: 'Reservas', color: 'bg-emerald-50 text-emerald-600' },
  insurance: { icon: <Shield size={20} />, label: 'Seguros', color: 'bg-orange-50 text-orange-600' },
  other: { icon: <Files size={20} />, label: 'Otros', color: 'bg-slate-50 text-slate-600' },
};

const DocumentsView: React.FC<DocumentsViewProps> = ({ tripId, currentUser }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editAccessDoc, setEditAccessDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<'all' | 'specific'>('all');
  const [pendingAllowed, setPendingAllowed] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const [data, mems] = await Promise.all([
        api.getDocuments(tripId),
        api.getTripMembers(tripId),
      ]);
      setDocs(data);
      setMembers(mems);
    }
    load();
  }, [tripId]);

  const handleTriggerUpload = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    let type: Document['type'] = 'other';
    const fn = file.name.toLowerCase();
    if (fn.includes('ticket') || fn.includes('vuelo') || fn.includes('pass')) type = 'ticket';
    if (fn.includes('reserva') || fn.includes('hotel') || fn.includes('booking')) type = 'reservation';
    if (fn.includes('seguro') || fn.includes('insurance')) type = 'insurance';

    try {
      const fileData = await readFileAsBase64(file);
      const newDoc: Omit<Document, 'id'> = {
        trip_id: tripId,
        name: file.name,
        type,
        url: '#',
        file_data: fileData,
        mime_type: file.type,
        visibility: 'all',
        allowed_users: [],
        date: new Date().toLocaleDateString('es-ES'),
      };
      const savedDoc = await api.addDocument(newDoc);
      setDocs(prev => [savedDoc, ...prev]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDownload = (doc: Document) => {
    if (!doc.file_data) return;
    const a = document.createElement('a');
    a.href = doc.file_data;
    a.download = doc.name;
    a.click();
  };

  const handleOpenPreview = (doc: Document) => setPreviewDoc(doc);

  const handleOpenAccessEdit = (doc: Document) => {
    setEditAccessDoc(doc);
    setPendingVisibility((doc.visibility as 'all' | 'specific') || 'all');
    setPendingAllowed(doc.allowed_users || []);
  };

  const handleSaveAccess = async () => {
    if (!editAccessDoc) return;
    setSavingAccess(true);
    try {
      const updated = await api.updateDocument(editAccessDoc.id, {
        visibility: pendingVisibility,
        allowed_users: pendingAllowed,
      });
      setDocs(prev => prev.map(d => d.id === editAccessDoc.id ? { ...d, ...updated } : d));
      setEditAccessDoc(null);
    } catch (err: any) {
      alert(err.message || 'Error al guardar acceso');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.deleteDocument(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const isOwner = (doc: Document) => doc.uploaded_by === currentUser?.id;

  const renderPreview = (doc: Document) => {
    if (!doc.file_data) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-bold">Sin vista previa disponible</div>;
    const mime = doc.mime_type || '';
    if (mime.startsWith('image/')) return <img src={doc.file_data} alt={doc.name} className="max-w-full max-h-[70vh] rounded-2xl object-contain mx-auto" />;
    if (mime === 'application/pdf') return <iframe src={doc.file_data} title={doc.name} className="w-full h-[70vh] rounded-2xl border border-slate-100" />;
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-4 text-slate-400">
        <File size={48} className="text-slate-200" />
        <p className="text-sm font-bold">Vista previa no disponible para este tipo de archivo</p>
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" />

      <div className="flex justify-between items-center mb-8 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Documentos</h2>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Archivos del Viaje</p>
        </div>
        <button
          onClick={handleTriggerUpload}
          disabled={uploading}
          className="bg-indigo-600 text-white w-12 h-12 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
        >
          {uploading ? <Loader2 size={22} className="animate-spin" /> : <Plus size={28} />}
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm px-4 py-1 flex items-center gap-3 mb-8 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
        <Search size={18} className="text-slate-400" />
        <input
          placeholder="Buscar tickets, reservas..."
          className="flex-1 bg-transparent border-none outline-none text-sm py-3 font-bold text-slate-700"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-300"><X size={16} /></button>}
      </div>

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto text-indigo-200 mb-6 shadow-inner">
              <Files size={48} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">No hay documentos</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">Sube tus pases de abordar, reservas de hotel o seguros para tenerlos a mano.</p>
            <button
              onClick={handleTriggerUpload}
              className="inline-flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest bg-indigo-50 px-6 py-4 rounded-2xl border border-indigo-100 active:scale-95 transition-all shadow-sm"
            >
              <UploadCloud size={16} />
              Subir primer documento
            </button>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const config = docTypes[doc.type as keyof typeof docTypes] || docTypes.other;
            const owner = isOwner(doc);
            const visLabel = doc.visibility === 'specific' ? 'Restringido' : 'Todos';
            return (
              <div key={doc.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${config.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm leading-tight max-w-[140px] truncate">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{config.label} • {doc.date}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {doc.visibility === 'specific' ? <Lock size={10} className="text-amber-500" /> : <Users size={10} className="text-emerald-500" />}
                        <span className="text-[9px] font-black text-slate-400 uppercase">{visLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenPreview(doc)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Ver">
                      <Eye size={18} />
                    </button>
                    {doc.file_data && (
                      <button onClick={() => handleDownload(doc)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Descargar">
                        <Download size={18} />
                      </button>
                    )}
                    {owner && (
                      <>
                        <button onClick={() => handleOpenAccessEdit(doc)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Acceso">
                          <Settings size={18} />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm">
            <div>
              <p className="font-black text-white text-sm truncate max-w-[200px]">{previewDoc.name}</p>
              <p className="text-[10px] text-white/60 font-bold uppercase">{previewDoc.date}</p>
            </div>
            <div className="flex items-center gap-2">
              {previewDoc.file_data && (
                <button onClick={() => handleDownload(previewDoc)} className="p-2.5 bg-white/20 text-white rounded-xl">
                  <Download size={18} />
                </button>
              )}
              <button onClick={() => setPreviewDoc(null)} className="p-2.5 bg-white/20 text-white rounded-xl">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {renderPreview(previewDoc)}
          </div>
        </div>
      )}

      {editAccessDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Control de Acceso</h3>
              <button onClick={() => setEditAccessDoc(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-5 truncate">{editAccessDoc.name}</p>

            <div className="space-y-3 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Quién puede verlo?</p>
              {([
                { value: 'all', label: 'Todos los participantes', icon: <Users size={16} />, color: 'text-emerald-600 bg-emerald-50' },
                { value: 'specific', label: 'Solo algunos miembros', icon: <Lock size={16} />, color: 'text-amber-600 bg-amber-50' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPendingVisibility(opt.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${pendingVisibility === opt.value ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-xl ${opt.color}`}>{opt.icon}</span>
                    <span className="text-sm font-black text-slate-700">{opt.label}</span>
                  </div>
                  {pendingVisibility === opt.value && <Check size={16} className="text-indigo-600" />}
                </button>
              ))}
            </div>

            {pendingVisibility === 'specific' && (
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar miembros</p>
                {members.filter(m => m.id !== currentUser?.id).map(m => {
                  const checked = pendingAllowed.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPendingAllowed(prev => checked ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${checked ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm overflow-hidden">
                          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : m.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{m.name.split(' ')[0]}</span>
                      </div>
                      {checked && <Check size={14} className="text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSaveAccess}
              disabled={savingAccess}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {savingAccess ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Guardar acceso
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;
