
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { APP_STRINGS } from './constants';
import { Patient, OperatorRole, MedicalRecord } from './types';
import PatientScreen from './screens/PatientScreen';
import RecordScreen from './screens/RecordScreen';
import AssistScreen from './screens/AssistScreen';
import PharmacyScreen from './screens/PharmacyScreen';
import SettingsScreen from './screens/SettingsScreen';
import ArchiveScreen from './screens/ArchiveScreen';

// --- Shared Components ---

const TopBar = ({ title }: { title: string }) => (
  <header className="h-16 flex items-center justify-between px-6 bg-[#f7f9fc] sticky top-0 z-30">
    <h1 className="text-2xl font-bold text-[#1B1B1F]">{title}</h1>
    <div className="flex items-center gap-4">
      <div title="Cloud Sync Status" className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><path d="M12 13v8"/><path d="m8 17 4 4 4-4"/><path d="M2 12c0-4.4 3.6-8 8-8"/><path d="M22 12c0 4.4-3.6 8-8 8"/></svg>
      </div>
    </div>
  </header>
);

const Icon = ({ name, filled }: { name: string; filled?: boolean }): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    person: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    description: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
    auto_awesome: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.81 8.64 12 2l2.19 6.64L21 9.75l-6.81 1.11L12 17.5l-2.19-6.64L3 9.75l6.81-1.11Z"/><path d="m15.31 19.14 1.19-3.64 1.19 3.64L21 20l-3.31.86L16.5 24.5l-1.19-3.64L12 20l3.31-.86Z"/></svg>,
    local_pharmacy: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2l-.2.1a2 2 0 0 1-2.06 0l-.19-.1a2 2 0 0 0-2.83 0l-.31.31a2 2 0 0 0 0 2.83l.1.19a2 2 0 0 1 0 2.06l-.1.2a2 2 0 0 0 0 2.83l.31.31a2 2 0 0 0 2.83 0l.19-.1a2 2 0 0 1 2.06 0l.2.1a2 2 0 0 0 2.83 0l.31-.31a2 2 0 0 0 0-2.83l-.1-.19a2 2 0 0 1 0-2.06l.1-.2a2 2 0 0 0 0-2.83l-.31-.31a2 2 0 0 0-2.83 0l-.19.1a2 2 0 0 1-2.06 0l-.2-.1a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  };
  return icons[name] || <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: APP_STRINGS.NAV.PATIENT, icon: 'person', path: '/patient' },
    { label: APP_STRINGS.NAV.RECORD, icon: 'description', path: '/record' },
    { label: APP_STRINGS.NAV.ASSIST, icon: 'auto_awesome', path: '/assist' },
    { label: APP_STRINGS.NAV.PHARMACY, icon: 'local_pharmacy', path: '/pharmacy' },
    { label: APP_STRINGS.NAV.SETTINGS, icon: 'settings', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#F2F3F7] border-t border-slate-200 flex items-center justify-around px-2 z-50">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`m3-nav-item flex-1 ${isActive ? 'active' : ''}`}
          >
            <div className={`m3-nav-indicator ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-[#001D36] flex items-center justify-center">
                <Icon name={tab.icon} filled={isActive} />
              </div>
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'text-[#001D36]' : 'text-[#44474E]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const AppShell = () => {
  // 患者基本信息状态
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(() => {
    const saved = localStorage.getItem('currentPatient');
    return saved ? JSON.parse(saved) : null;
  });

  // 医疗记录状态（提升到此层级）
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem('medicalRecords');
    return saved ? JSON.parse(saved) : [];
  });

  const [operatorRole, setOperatorRole] = useState<OperatorRole>(OperatorRole.PATIENT);
  const location = useLocation();

  // 数据持久化
  useEffect(() => {
    localStorage.setItem('medicalRecords', JSON.stringify(medicalRecords));
  }, [medicalRecords]);

  useEffect(() => {
    localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
  }, [currentPatient]);

  const screenTitle = useMemo(() => {
    if (location.pathname.startsWith('/patient')) return APP_STRINGS.NAV.PATIENT;
    if (location.pathname.startsWith('/record')) return APP_STRINGS.NAV.RECORD;
    if (location.pathname.startsWith('/assist')) return APP_STRINGS.NAV.ASSIST;
    if (location.pathname.startsWith('/pharmacy')) return APP_STRINGS.NAV.PHARMACY;
    if (location.pathname.startsWith('/settings')) return APP_STRINGS.NAV.SETTINGS;
    if (location.pathname.startsWith('/archive')) return "Medical Archive";
    return "Triage Assist";
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative bg-[#f7f9fc] shadow-2xl overflow-hidden border-x border-slate-200">
      <TopBar title={screenTitle} />
      <main className="flex-1 overflow-y-auto pb-32">
        <Routes>
          <Route path="/" element={<Navigate to="/patient" replace />} />
          <Route 
            path="/patient" 
            element={<PatientScreen currentPatient={currentPatient} setCurrentPatient={setCurrentPatient} />} 
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
              />
            } 
          />
          <Route 
            path="/archive" 
            element={<ArchiveScreen />} 
          />
          <Route 
            path="/assist" 
            element={<AssistScreen currentPatient={currentPatient} />} 
          />
          <Route 
            path="/pharmacy" 
            element={<PharmacyScreen />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsScreen />} 
          />
        </Routes>
      </main>
      <BottomNav />
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
