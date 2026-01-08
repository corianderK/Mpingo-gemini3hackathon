
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, OperatorRole, MedicalRecord } from '../types';
import { APP_STRINGS } from '../constants';

interface RecordProps {
  currentPatient: Patient | null;
  operatorRole: OperatorRole;
  setOperatorRole: (r: OperatorRole) => void;
  medicalRecords: MedicalRecord[];
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
}

const RecordScreen: React.FC<RecordProps> = ({ 
  currentPatient, 
  operatorRole, 
  setOperatorRole,
  medicalRecords,
  setMedicalRecords
}) => {
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  // 只显示属于当前患者的记录
  const filteredHistory = useMemo(() => {
    if (!currentPatient) return [];
    return medicalRecords.filter(r => r.patientId === currentPatient.id);
  }, [medicalRecords, currentPatient]);

  const handleTemplateClick = (template: string) => {
    const prompt = `\n[${template}]: Onset: , Severity: , Duration: `;
    setContent(prev => prev + prompt);
  };

  const handleSave = () => {
    if (!content || !currentPatient) return;
    
    const newRecord: MedicalRecord = {
      id: Date.now().toString(),
      patientId: currentPatient.id,
      operatorRole: operatorRole,
      timestamp: Date.now(),
      content: content,
      attachments: []
    };

    setMedicalRecords(prev => [newRecord, ...prev]);
    setContent('');
  };

  const handleSendToAssist = () => {
    navigate('/assist', { state: { draft: content } });
  };

  if (!currentPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-6">
        <h2 className="text-xl font-black text-[#1B1B1F]">Please select or create a patient first.</h2>
        <button onClick={() => navigate('/patient')} className="m3-button-primary w-full">Go to Patient</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header Info */}
      <div className="m3-card p-4 flex justify-between items-center bg-[#D1E4FF]/30 border-none">
        <div>
          <h3 className="font-black text-xl text-[#001D36]">{currentPatient.fullName}</h3>
          <p className="text-sm font-bold text-slate-700">
            {currentPatient.age}y, {currentPatient.sex}
            {currentPatient.bloodType && `, ${currentPatient.bloodType}`}
          </p>
        </div>
        <button onClick={() => navigate('/patient')} className="m3-button-tonal py-1.5 px-4 text-xs font-black">Change</button>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <p className="text-sm font-black text-[#44474E] ml-2 uppercase tracking-tighter">Reporting as:</p>
        <div className="flex gap-2">
          {Object.values(OperatorRole).map(role => (
            <button
              key={role}
              onClick={() => setOperatorRole(role)}
              className={`flex-1 py-3 rounded-2xl border transition-all font-black text-sm ${operatorRole === role ? 'bg-[#0061A4] border-[#0061A4] text-[#EAF1FF]' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Log Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-2">
           <p className="text-sm font-black text-[#44474E] uppercase">Observation Notes</p>
           <button onClick={() => navigate('/archive')} className="text-[#0061A4] text-sm font-black flex items-center gap-1">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
             Attach File
           </button>
        </div>
        <div className="relative">
          <textarea
            className="m3-input h-48 resize-none text-lg font-bold"
            placeholder={APP_STRINGS.RECORD.PLACEHOLDER}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="absolute bottom-2 right-4 text-xs font-black text-slate-500">
            {content.length}/2000
          </div>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {APP_STRINGS.RECORD.TEMPLATES.map(t => (
          <button
            key={t}
            onClick={() => handleTemplateClick(t)}
            className="m3-button-tonal py-2 px-5 shrink-0 text-sm font-black"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button onClick={handleSave} className="m3-button-primary h-16">
          {APP_STRINGS.COMMON.SAVE}
        </button>
        <button onClick={handleSendToAssist} className="m3-button-secondary h-16">
          Run AI Triage
        </button>
      </div>

      {/* History List */}
      <div className="pt-6 space-y-4">
        <h3 className="font-black text-lg border-b-4 border-[#D1E4FF] pb-2 text-[#001D36]">Recent Records</h3>
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center px-6">
            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <p className="font-bold">{APP_STRINGS.RECORD.EMPTY}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(h => (
              <div key={h.id} className="m3-card p-4 space-y-2 border-l-8 border-l-[#0061A4] animate-in slide-in-from-left-2 duration-300">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                   <span className="text-blue-700">{h.operatorRole}</span>
                   <span>{new Date(h.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-base font-bold text-[#1B1B1F] whitespace-pre-wrap">{h.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordScreen;
