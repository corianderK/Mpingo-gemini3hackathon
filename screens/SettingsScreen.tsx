
import React from 'react';

const SettingsScreen: React.FC = () => {
  const sections = [
    {
      title: 'Safety & Legal',
      items: [
        { label: 'Disclaimer', icon: 'gavel' },
        { label: 'Privacy Policy', icon: 'shield' },
        { label: 'Consent History', icon: 'history' }
      ]
    },
    {
      title: 'Data & Sync',
      items: [
        { label: 'Cloud Sync', toggle: true, value: true },
        { label: 'Export My Data', icon: 'download' },
        { label: 'Delete My Data', icon: 'delete', destructive: true }
      ]
    },
    {
      title: 'Permissions',
      items: [
        { label: 'Location Services', status: 'Granted' },
        { label: 'Camera & Files', status: 'Granted' }
      ]
    }
  ];

  return (
    <div className="p-4 space-y-8 pb-32">
      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl space-y-2">
        <h3 className="font-bold text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z"></path></svg>
          Medical Emergency Notice
        </h3>
        <p className="text-sm text-red-800 leading-snug">
          This app is not a diagnosis tool. It is for health risk triage only. If you are experiencing chest pain, severe bleeding, or loss of consciousness, seek help immediately.
        </p>
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">{section.title}</h3>
          <div className="m3-card overflow-hidden">
            {section.items.map((item, iIdx) => (
              <button 
                key={iIdx} 
                className={`w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors last:border-b-0 ${item.destructive ? 'text-red-500' : ''}`}
              >
                <span className="font-medium text-lg">{item.label}</span>
                {item.toggle && (
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${item.value ? 'bg-[#0061A4]' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.value ? 'translate-x-6' : ''}`}></div>
                  </div>
                )}
                {item.status && <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">{item.status}</span>}
                {!item.toggle && !item.status && (
                  <svg className="w-5 h-5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-8 text-center space-y-2 opacity-40 pb-10">
        <p className="text-xs font-bold uppercase tracking-widest">TriageAssist MVP</p>
        <p className="text-sm">Version 0.4.2 (Beta)</p>
        <p className="text-xs">Build: October 2024</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
