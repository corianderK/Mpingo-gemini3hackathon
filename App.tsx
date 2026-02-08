import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { APP_STRINGS, DEMO_PATIENT } from './constants';
import { Patient, OperatorRole, MedicalRecord, Language } from './types';
import PatientScreen from './screens/PatientScreen';
import RecordScreen from './screens/RecordScreen';
import EpidemicScreen from './screens/EpidemicScreen';
import AssistScreen from './screens/AssistScreen';
import PharmacyScreen from './screens/PharmacyScreen';
import SettingsScreen from './screens/SettingsScreen';
import ArchiveScreen from './screens/ArchiveScreen';

const SecurityService = {
  encrypt: (data: any) => {
    const str = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(str)));
  },
  decrypt: (cipher: string) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(cipher))));
    } catch (e) {
      return null;
    }
  }
};

const TopBar = ({ title, language }: { title: string, language: Language }) => (
  <header className="h-16 flex items-center justify-between px-6 bg-[#f7f9fc] sticky top-0 z-30">
    <div className="flex flex-col">
      <h1 className="text-xl font-black text-[#1B1B1F] leading-tight">{title}</h1>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
          {language === 'en' ? 'Local Encrypted' : 'Encriptação local'}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div title="Cloud Sync" className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5C17.4 6.4 14.1 4 10.3 4 7.1 4 4.3 6.1 3.2 9.1 1.3 10 0 11.8 0 14c0 2.8 2.2 5 5 5h12.5z"/>
        </svg>
      </div>
    </div>
  </header>
);

const Icon = ({ name, filled }: { name: string; filled?: boolean }): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    person: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    description: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/></svg>,
    epidemic: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    auto_awesome: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.81 8.64 12 2l2.19 6.64L21 9.75l-6.81 1.11L12 17.5l-2.19-6.64L3 9.75l6.81-1.11Z"/><path d="m15.31 19.14 1.19-3.64 1.19 3.64L21 20l-3.31.86L16.5 24.5l-1.19-3.64L12 20l3.31-.86Z"/></svg>,
    local_pharmacy: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2l-.2.1a2 2 0 0 1-2.06 0l-.19-.1a2 2 0 0 0-2.83 0l-.31.31a2 2 0 0 0 0 2.83l.1.19a2 2 0 0 1 0 2.06l-.1.2a2 2 0 0 0 0 2.83l.31.31a2 2 0 0 0 2.83 0l.19-.1a2 2 0 0 1 2.06 0l.2.1a2 2 0 0 0 2.83 0l.31-.31a2 2 0 0 0 0-2.83l-.1-.19a2 2 0 0 1 0-2.06l.1-.2a2 2 0 0 0 0-2.83l-.31-.31a2 2 0 0 0-2.83 0l-.19.1a2 2 0 0 1-2.06 0l-.2-.1a2 2 0 0 0-2-2z"/></svg>,
    storage: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
  };
  return icons[name] || null;
};

const BottomNav = ({ language }: { language: Language }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const s = APP_STRINGS[language].NAV;

  const tabs = [
    { label: s.PATIENT, icon: 'person', path: '/patient' },
    { label: s.RECORD, icon: 'description', path: '/record' },
    { label: s.EPIDEMIC, icon: 'epidemic', path: '/epidemic' },
    { label: s.ASSIST, icon: 'auto_awesome', path: '/assist' },
    { label: s.PHARMACY, icon: 'local_pharmacy', path: '/pharmacy' },
    { label: s.SETTINGS, icon: 'settings', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#F2F3F7]/95 backdrop-blur-lg border-t border-slate-200 flex items-center justify-around px-2 z-50">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`m3-nav-item flex-1 ${isActive ? 'active' : ''}`}
          >
            <div className={`m3-nav-indicator ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
              <div className="text-[#001D36] flex items-center justify-center">
                <Icon name={tab.icon} filled={isActive} />
              </div>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-[#001D36]' : 'text-[#44474E]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const AppShell = () => {
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('pts_enc');
    const decoded = saved ? SecurityService.decrypt(saved) : null;
    return decoded || [DEMO_PATIENT];
  });

  const [currentPatientId, setCurrentPatientId] = useState<string>(() => {
    return localStorage.getItem('cp_id') || DEMO_PATIENT.id;
  });

  const currentPatient = useMemo(() => 
    patients.find(p => p.id === currentPatientId) || patients[0] || null
  , [patients, currentPatientId]);

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem('mr_enc');
    if (!saved) return [];
    return SecurityService.decrypt(saved) || [];
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  const [operatorRole, setOperatorRole] = useState<OperatorRole>(OperatorRole.PATIENT);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('mr_enc', SecurityService.encrypt(medicalRecords));
  }, [medicalRecords]);

  useEffect(() => {
    localStorage.setItem('pts_enc', SecurityService.encrypt(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('cp_id', currentPatientId);
  }, [currentPatientId]);

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  const upsertPatient = (p: Patient) => {
    setPatients(prev => {
      const exists = prev.find(item => item.id === p.id);
      if (exists) {
        return prev.map(item => item.id === p.id ? p : item);
      }
      return [...prev, p];
    });
    setCurrentPatientId(p.id);
  };

  const deletePatient = (id: string) => {
    setPatients(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (currentPatientId === id) {
        if (updated.length > 0) {
          setCurrentPatientId(updated[0].id);
        } else {
          setCurrentPatientId('');
        }
      }
      return updated;
    });
    setMedicalRecords(prev => prev.filter(r => r.patientId !== id));
  };

  const screenTitle = useMemo(() => {
    const s = APP_STRINGS[language].NAV;
    if (location.pathname.startsWith('/patient')) return s.PATIENT;
    if (location.pathname.startsWith('/record')) return s.RECORD;
    if (location.pathname.startsWith('/epidemic')) return s.EPIDEMIC;
    if (location.pathname.startsWith('/assist')) return s.ASSIST;
    if (location.pathname.startsWith('/pharmacy')) return s.PHARMACY;
    if (location.pathname.startsWith('/settings')) return s.SETTINGS;
    if (location.pathname.startsWith('/archive')) return s.ARCHIVE;
    return "TriageAssist";
  }, [location.pathname, language]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative bg-[#f7f9fc] shadow-2xl overflow-hidden border-x border-slate-200">
      <TopBar title={screenTitle} language={language} />
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <Routes>
          <Route path="/" element={<Navigate to="/patient" replace />} />
          <Route 
            path="/patient" 
            element={
              <PatientScreen 
                currentPatient={currentPatient} 
                patients={patients}
                switchPatient={setCurrentPatientId}
                deletePatient={deletePatient}
                setCurrentPatient={upsertPatient} 
                language={language} 
              />
            } 
          />
          <Route 
            path="/record" 
            element={
              <RecordScreen 
                currentPatient={currentPatient} 
                operatorRole={operatorRole} 
                setOperatorRole={setOperatorRole}
                medicalRecords={medicalRecords}
                setMedicalRecords={setMedicalRecords}
                language={language}
              />
            } 
          />
          <Route 
            path="/epidemic" 
            element={<EpidemicScreen currentPatient={currentPatient} language={language} setMedicalRecords={setMedicalRecords} />} 
          />
          <Route 
            path="/archive" 
            element={
              <ArchiveScreen 
                currentPatient={currentPatient} 
                medicalRecords={medicalRecords}
                setMedicalRecords={setMedicalRecords} 
                language={language}
              />
            } 
          />
          <Route 
            path="/assist" 
            element={<AssistScreen currentPatient={currentPatient} medicalRecords={medicalRecords} setMedicalRecords={setMedicalRecords} language={language} />} 
          />
          <Route 
            path="/pharmacy" 
            element={<PharmacyScreen language={language} />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsScreen language={language} setLanguage={setLanguage} patients={patients} medicalRecords={medicalRecords} deletePatient={deletePatient} />} 
          />
        </Routes>
      </main>
      <BottomNav language={language} />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}