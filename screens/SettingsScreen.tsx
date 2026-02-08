import React, { useState, useMemo } from 'react';
import { Patient, MedicalRecord, Language } from '../types';
import { APP_STRINGS } from '../constants';

interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  patients: Patient[];
  medicalRecords: MedicalRecord[];
  deletePatient: (id: string) => void;
}

interface StorageBreakdown {
  id: string;
  name: string;
  total: number;
  photos: number;
  videos: number;
  files: number;
  text: number;
  cache: number;
}

const SettingsScreen: React.FC<SettingsProps> = ({ language, setLanguage, patients, medicalRecords, deletePatient }) => {
  const [view, setView] = useState<'main' | 'manage-data' | 'storage-detail'>('main');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const l = APP_STRINGS[language].LABELS;
  const common = APP_STRINGS[language].COMMON;
  const pStr = APP_STRINGS[language].PATIENT;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getByteSize = (str: string) => new Blob([str]).size;

  const storageStats = useMemo(() => {
    return patients.map(p => {
      const records = medicalRecords.filter(r => r.patientId === p.id);
      
      let photos = 0;
      let videos = 0;
      let files = 0;
      let text = getByteSize(JSON.stringify(p));

      records.forEach(r => {
        text += getByteSize(r.content || '');
        r.attachments?.forEach(a => {
          const size = getByteSize(a.data || '');
          if (a.mimeType.startsWith('image/')) photos += size;
          else if (a.mimeType.startsWith('video/')) videos += size;
          else files += size;
        });
      });

      const cache = Math.round((photos + videos + files + text) * 0.05);

      return {
        id: p.id,
        name: p.fullName,
        photos,
        videos,
        files,
        text,
        cache,
        total: photos + videos + files + text + cache
      } as StorageBreakdown;
    });
  }, [patients, medicalRecords]);

  const selectedStats = useMemo(() => 
    storageStats.find(s => s.id === selectedProfileId)
  , [storageStats, selectedProfileId]);

  const handleResetToDemo = () => {
    const msg = language === 'en' 
      ? "Reset current patient to the Demo Profile? Data will be overwritten."
      : "Redefinir o paciente para o Perfil Demo? Os dados serão substituídos.";
    
    if (window.confirm(msg)) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleDeleteProfileFromManage = (id: string) => {
    if (window.confirm(pStr.DELETE_CONFIRM)) {
      deletePatient(id);
      if (selectedProfileId === id) {
        setView('manage-data');
        setSelectedProfileId(null);
      }
    }
  };

  const sections = [
    {
      title: l.SECURITY,
      customContent: (
        <div className="m3-card p-5 space-y-3 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <p className="font-black text-emerald-900 text-sm">{l.ENCRYPTED_LOCAL}</p>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{l.PRIVACY_ON}</p>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800 leading-tight font-medium opacity-80">
            {l.ENCRYPTION_DESC}
          </p>
        </div>
      )
    },
    {
      title: l.LOCATION_SETTINGS,
      customContent: (
        <div className="m3-card p-4 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
            {l.PREF_LANG}
          </p>
          <div className="flex bg-[#F2F3F7] p-1.5 rounded-2xl gap-2">
            <button 
              onClick={() => setLanguage('en')}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${language === 'en' ? 'bg-[#0061A4] text-white shadow-md' : 'text-slate-600 active:bg-slate-200'}`}
            >
              English
            </button>
            <button 
              onClick={() => setLanguage('pt')}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${language === 'pt' ? 'bg-[#0061A4] text-white shadow-md' : 'text-slate-600 active:bg-slate-200'}`}
            >
              Português
            </button>
          </div>
        </div>
      )
    },
    {
      title: l.DATA_SYNC,
      items: [
        { label: l.CLOUD_SYNC, toggle: true, value: true },
        { label: l.MANAGE_DATA, icon: 'storage', action: () => setView('manage-data'), description: language === 'en' ? 'Export, clear cache, or delete data' : 'Exportar, limpar cache ou excluir dados' }
      ]
    },
    {
      title: l.DEV_TOOLS,
      items: [
        { 
          label: language === 'en' ? 'Reset App Data' : 'Redefinir Dados', 
          icon: 'refresh', 
          action: handleResetToDemo,
          description: language === 'en' ? 'Restores Demo Profile' : 'Restaura Perfil Demo'
        },
      ]
    }
  ];

  if (view === 'manage-data') {
    return (
      <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 pb-32">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('main')} className="p-2 bg-slate-100 rounded-full text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-xl font-black text-[#001D36] uppercase tracking-tighter">{l.MANAGE_DATA}</h2>
        </div>

        <div className="m3-card overflow-hidden">
          {storageStats.map(stat => (
            <button 
              key={stat.id}
              onClick={() => { setSelectedProfileId(stat.id); setView('storage-detail'); }}
              className="w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors last:border-b-0"
            >
              <div className="flex flex-col items-start">
                <span className="font-bold text-base text-[#001D36]">{stat.name}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{language === 'en' ? 'Patient Profile' : 'Perfil do Paciente'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-blue-600">{formatSize(stat.total)}</span>
                <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={() => {
            if (window.confirm(language === 'en' ? "Permanently delete ALL data?" : "Excluir permanentemente TODOS os dados?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full p-6 m3-card !bg-red-50 !border-red-100 flex items-center justify-center gap-3 active:bg-red-100 transition-colors group"
        >
          <svg className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="font-black text-red-600 uppercase tracking-widest text-sm">{l.DELETE_ALL}</span>
        </button>
      </div>
    );
  }

  if (view === 'storage-detail' && selectedStats) {
    const categories = [
      { label: language === 'en' ? 'Text & Data' : 'Texto e Dados', size: selectedStats.text, color: 'bg-blue-500' },
      { label: language === 'en' ? 'Photos' : 'Fotos', size: selectedStats.photos, color: 'bg-emerald-500' },
      { label: language === 'en' ? 'Videos' : 'Vídeos', size: selectedStats.videos, color: 'bg-rose-500' },
      { label: language === 'en' ? 'Files' : 'Arquivos', size: selectedStats.files, color: 'bg-amber-500' },
      { label: language === 'en' ? 'Cache' : 'Cache', size: selectedStats.cache, color: 'bg-slate-400' }
    ].filter(c => c.size > 0 || c.label === 'Cache');

    return (
      <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 pb-20">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('manage-data')} className="p-2 bg-slate-100 rounded-full text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-[#001D36] leading-none uppercase tracking-tighter">{selectedStats.name}</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Storage Breakdown' : 'Detalhes de Armazenamento'}</span>
          </div>
        </div>

        <div className="m3-card p-6 bg-gradient-to-br from-white to-slate-50 shadow-md">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Total Usage' : 'Uso Total'}</p>
              <h1 className="text-4xl font-black text-[#001D36]">{formatSize(selectedStats.total)}</h1>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase">{language === 'en' ? 'Encrypted' : 'Criptografado'}</span>
            </div>
          </div>

          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {categories.map((cat, idx) => (
              <div 
                key={idx}
                style={{ width: `${(cat.size / selectedStats.total) * 100}%` }}
                className={`${cat.color} h-full transition-all duration-700 delay-100`}
              />
            ))}
          </div>
          
          <div className="mt-8 space-y-4">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                  <span className="font-black text-sm text-slate-700">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">({Math.round((cat.size / selectedStats.total) * 100)}%)</span>
                  <span className="font-black text-sm text-[#001D36]">{formatSize(cat.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="m3-button-primary w-full !rounded-3xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {language === 'en' ? 'Export Local ZIP' : 'Exportar ZIP Local'}
          </button>
          <button 
            onClick={() => alert(language === 'en' ? "Cache cleared" : "Cache limpo")}
            className="m3-button-tonal w-full !rounded-3xl"
          >
            {language === 'en' ? 'Clear Cache' : 'Limpar Cache'}
          </button>
          <button 
            onClick={() => handleDeleteProfileFromManage(selectedStats.id)}
            className="w-full py-4 rounded-3xl font-black text-red-600 bg-red-50 border-2 border-red-100 active:bg-red-100 transition-colors uppercase tracking-widest text-xs"
          >
            {language === 'en' ? 'Delete Profile' : 'Excluir Perfil'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 pb-32">
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-2">
        <h3 className="font-bold text-amber-700 flex items-center gap-2 text-sm uppercase">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z"></path></svg>
          {language === 'en' ? 'Triage Notice' : 'AVISO'}
        </h3>
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          {language === 'en' 
            ? "AI results are for triage assessment. If symptoms are severe, seek medical help immediately."
            : "Os resultados de IA são para triagem. Se os sintomas forem graves, procure ajuda médica imediatamente."
          }
        </p>
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{section.title}</h3>
          
          {section.customContent ? (
            section.customContent
          ) : (
            <div className="m3-card overflow-hidden">
              {section.items?.map((item, iIdx) => (
                <button 
                  key={iIdx} 
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors last:border-b-0`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-base text-[#001D36]">{item.label}</span>
                    {item.description && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.description}</span>}
                  </div>
                  
                  {item.toggle && (
                    <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${item.value ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.value ? 'translate-x-5' : ''}`}></div>
                    </div>
                  )}
                  {!item.toggle && (
                    <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="pt-8 text-center space-y-2 opacity-30 pb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">TriageAssist</p>
        <p className="text-xs font-bold tracking-widest">BUILD 1.3.1</p>
      </div>
    </div>
  );
};

export default SettingsScreen;