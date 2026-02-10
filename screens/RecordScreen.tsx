import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, OperatorRole, MedicalRecord, Vitals, RecordAttachment, Language } from '../types';
import { APP_STRINGS } from '../constants';

interface RecordProps {
  currentPatient: Patient | null;
  operatorRole: OperatorRole;
  setOperatorRole: (r: OperatorRole) => void;
  medicalRecords: MedicalRecord[];
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
  language: Language;
}

const RecordScreen: React.FC<RecordProps> = ({ 
  currentPatient, 
  operatorRole, 
  setOperatorRole,
  medicalRecords,
  setMedicalRecords,
  language
}) => {
  const s = APP_STRINGS[language].RECORD;
  const common = APP_STRINGS[language].COMMON;
  const l = APP_STRINGS[language].LABELS;
  const u = APP_STRINGS[language].UNITS;
  const roles = APP_STRINGS[language].ROLES;

  const [content, setContent] = useState('');
  const [vitals, setVitals] = useState<Vitals>({
    systolic: undefined,
    diastolic: undefined,
    heartRate: undefined,
    oxygenSaturation: undefined,
    temperature: undefined
  });
  const [viewingAttachment, setViewingAttachment] = useState<RecordAttachment | null>(null);
  const navigate = useNavigate();

  const filteredHistory = useMemo(() => {
    if (!currentPatient) return [];
    return medicalRecords
      .filter(r => r.patientId === currentPatient.id)
      .sort((a, b) => (b.documentDate || b.timestamp) - (a.documentDate || a.timestamp));
  }, [medicalRecords, currentPatient]);

  const handleTemplateClick = (template: string) => {
    const prompt = `\n[${template}]: Onset: , Severity: , Duration: `;
    setContent(prev => prev + prompt);
  };

  const handleSave = () => {
    if (!content && !vitals.systolic && !vitals.diastolic && !vitals.heartRate && !vitals.oxygenSaturation && !vitals.temperature || !currentPatient) return;
    
    const now = Date.now();
    const newRecord: MedicalRecord = {
      id: now.toString(),
      patientId: currentPatient.id,
      operatorRole: operatorRole,
      timestamp: now,
      documentDate: now, 
      content: content,
      vitals: (vitals.systolic || vitals.diastolic || vitals.heartRate || vitals.oxygenSaturation || vitals.temperature) ? { ...vitals } : undefined,
      attachments: []
    };

    setMedicalRecords(prev => [newRecord, ...prev]);
    setContent('');
    setVitals({ systolic: undefined, diastolic: undefined, heartRate: undefined, oxygenSaturation: undefined, temperature: undefined });
  };

  const handleSendToAssist = () => {
    let vitalsStr = '';
    if (vitals.systolic || vitals.diastolic) vitalsStr += `BP: ${vitals.systolic || '?'}/${vitals.diastolic || '?'} ${u.BP}. `;
    if (vitals.heartRate) vitalsStr += `HR: ${vitals.heartRate} ${u.HR}. `;
    if (vitals.oxygenSaturation) vitalsStr += `SpO2: ${vitals.oxygenSaturation}${u.SPO2}. `;
    if (vitals.temperature) vitalsStr += `Temp: ${vitals.temperature}${u.TEMP}. `;
    navigate('/assist', { state: { draft: `${vitalsStr}${content}` } });
  };

  const openAttachment = (att: RecordAttachment) => {
    const mime = att.mimeType.toLowerCase();
    const isImage = mime.startsWith('image/');
    const isAudio = mime.startsWith('audio/');
    const isVideo = mime.startsWith('video/');
    
    // For Word, Excel, CSV, JSON, and PDF: we trigger a download or open in a new window
    const isDoc = mime.includes('pdf') || 
                  mime.includes('msword') || 
                  mime.includes('wordprocessingml') || 
                  mime.includes('excel') || 
                  mime.includes('spreadsheetml') ||
                  mime.includes('csv') ||
                  mime.includes('json');

    if (isDoc) {
      // Logic for documents: PDF can try iframe preview, others download
      if (mime.includes('pdf')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`<iframe width='100%' height='100%' src='${att.data}'></iframe>`);
          return;
        }
      }
      
      // Fallback: Trigger Download for Word/Excel/CSV
      const link = document.createElement('a');
      link.href = att.data;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (isImage || isAudio || isVideo) {
      // These types are supported in our in-app modal
      setViewingAttachment(att);
    } else {
      // Unknown type
      setViewingAttachment(att);
    }
  };

  const getAttachmentTag = (mime: string) => {
    if (mime.startsWith('image/')) return { label: 'IMG', color: 'bg-blue-100 text-blue-600' };
    if (mime.startsWith('audio/')) return { label: 'AUDIO', color: 'bg-purple-100 text-purple-600' };
    if (mime.startsWith('video/')) return { label: 'VIDEO', color: 'bg-red-100 text-red-600' };
    if (mime.includes('pdf')) return { label: 'PDF', color: 'bg-amber-100 text-amber-600' };
    if (mime.includes('msword') || mime.includes('wordprocessingml')) return { label: 'DOC', color: 'bg-indigo-100 text-indigo-600' };
    if (mime.includes('excel') || mime.includes('spreadsheetml')) return { label: 'XLS', color: 'bg-emerald-100 text-emerald-600' };
    return { label: 'FILE', color: 'bg-slate-100 text-slate-600' };
  };

  const getRoleLabel = (role: OperatorRole) => {
    if (role === OperatorRole.PATIENT) return roles.PATIENT;
    if (role === OperatorRole.CAREGIVER) return roles.CAREGIVER;
    if (role === OperatorRole.CLINICIAN) return roles.CLINICIAN;
    return role;
  };

  if (!currentPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-6">
        <h2 className="text-xl font-black text-[#1B1B1F]">{l.SELECT_PATIENT_FIRST}</h2>
        <button onClick={() => navigate('/patient')} className="m3-button-primary w-full">{l.GOTO_PATIENT}</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="m3-card p-4 flex justify-between items-center bg-[#D1E4FF]/30 border-none shadow-none">
        <div>
          <h3 className="font-black text-xl text-[#001D36]">{currentPatient.fullName}</h3>
          <p className="text-sm font-bold text-slate-700">
            {currentPatient.age}{u.YEARS.charAt(0)}, {language === 'en' ? currentPatient.sex : (currentPatient.sex === 'Female' ? 'Feminino' : 'Masculino')}
            {currentPatient.bloodType && `, ${currentPatient.bloodType === 'Unknown' ? l.UNKNOWN : currentPatient.bloodType}`}
          </p>
        </div>
        <button onClick={() => navigate('/patient')} className="m3-button-tonal py-1.5 px-4 text-xs font-black">{l.CHANGE}</button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black text-[#44474E] ml-2 uppercase tracking-tighter">{l.REPORTING_AS}</p>
        <div className="flex gap-2">
          {Object.values(OperatorRole).map(role => (
            <button
              key={role}
              onClick={() => setOperatorRole(role)}
              className={`flex-1 py-3 rounded-2xl border transition-all font-black text-sm ${operatorRole === role ? 'bg-[#0061A4] border-[#0061A4] text-[#EAF1FF]' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {getRoleLabel(role)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black text-[#44474E] ml-2 uppercase tracking-tighter">{s.VITALS_TITLE}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="m3-card p-3 border-2 border-slate-200">
            <label className="text-[10px] font-black text-[#0061A4] uppercase block mb-1">{language === 'en' ? 'Blood Pressure' : 'Pressão Arterial'}</label>
            <div className="flex items-center gap-1">
              <input type="number" placeholder={l.SYS} className="w-1/2 bg-transparent text-lg font-bold outline-none border-b border-slate-200 focus:border-[#0061A4]" value={vitals.systolic || ''} onChange={e => setVitals({...vitals, systolic: parseInt(e.target.value) || undefined})} />
              <span className="text-slate-400 font-bold">/</span>
              <input type="number" placeholder={l.DIA} className="w-1/2 bg-transparent text-lg font-bold outline-none border-b border-slate-200 focus:border-[#0061A4]" value={vitals.diastolic || ''} onChange={e => setVitals({...vitals, diastolic: parseInt(e.target.value) || undefined})} />
            </div>
          </div>
          <div className="m3-card p-3 border-2 border-slate-200">
            <label className="text-[10px] font-black text-[#0061A4] uppercase block mb-1">{l.HR} ({u.HR})</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="---" className="w-full bg-transparent text-lg font-bold outline-none border-b border-slate-200 focus:border-[#0061A4]" value={vitals.heartRate || ''} onChange={e => setVitals({...vitals, heartRate: parseInt(e.target.value) || undefined})} />
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
          </div>
          <div className="m3-card p-3 border-2 border-slate-200">
            <label className="text-[10px] font-black text-blue-700 uppercase block mb-1">{l.SPO2}</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="95-100" className="w-full bg-transparent text-lg font-bold outline-none border-b border-slate-200 focus:border-blue-700" value={vitals.oxygenSaturation || ''} onChange={e => setVitals({...vitals, oxygenSaturation: parseInt(e.target.value) || undefined})} />
            </div>
          </div>
          <div className="m3-card p-3 border-2 border-slate-200">
            <label className="text-[10px] font-black text-amber-700 uppercase block mb-1">{l.TEMP} ({u.TEMP})</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" placeholder="37.0" className="w-full bg-transparent text-lg font-bold outline-none border-b border-slate-200 focus:border-amber-700" value={vitals.temperature || ''} onChange={e => setVitals({...vitals, temperature: parseFloat(e.target.value) || undefined})} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center ml-2">
           <p className="text-xs font-black text-[#44474E] uppercase tracking-tighter">{s.OBS_NOTES}</p>
           <button onClick={() => navigate('/archive')} className="text-[#0061A4] text-xs font-black flex items-center gap-1 uppercase">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
             {s.ATTACH_DOC}
           </button>
        </div>
        
        <div className="-mx-4 bg-white border-y border-slate-200 shadow-sm relative overflow-hidden">
          <textarea
            className="w-full h-48 p-6 text-lg font-bold text-[#1B1B1F] bg-transparent outline-none resize-none placeholder-slate-300"
            placeholder={s.PLACEHOLDER}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {s.TEMPLATES.map(t => (
          <button key={t} onClick={() => handleTemplateClick(t)} className="m3-button-tonal py-2 px-5 shrink-0 text-sm font-black">{t}</button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button onClick={handleSave} className="m3-button-primary h-16 shadow-lg">{common.SAVE}</button>
        <button onClick={handleSendToAssist} className="m3-button-secondary h-16">{l.ANALYZE_SYMPTOMS}</button>
      </div>

      <div className="pt-6 space-y-4">
        <h3 className="font-black text-lg border-b-4 border-[#D1E4FF] pb-2 text-[#001D36]">{s.HISTORY_TITLE}</h3>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <p className="font-bold">{s.EMPTY}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map(h => (
              <div key={h.id} className="m3-card p-4 space-y-3 border-l-8 border-l-[#0061A4] animate-in slide-in-from-left-2 overflow-hidden">
                <div className="flex justify-between items-start">
                   <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-black uppercase">{getRoleLabel(h.operatorRole)}</span>
                   <div className="text-right">
                      <span className="text-xs font-black text-[#001D36] block">{new Date(h.documentDate || h.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] opacity-40 font-bold uppercase">{new Date(h.documentDate || h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>
                {h.vitals && (
                  <div className="flex flex-wrap gap-2">
                    {h.vitals.temperature && <span className="bg-amber-50 text-amber-900 px-3 py-1 rounded-full text-xs font-black">{h.vitals.temperature}{u.TEMP}</span>}
                    {h.vitals.oxygenSaturation && <span className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full text-xs font-black">{l.SPO2} {h.vitals.oxygenSaturation}{u.SPO2}</span>}
                  </div>
                )}
                <div className="text-base font-bold text-[#1B1B1F] whitespace-pre-wrap leading-tight">{h.content}</div>
                {h.attachments && h.attachments.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {h.attachments.map(att => {
                      const tag = getAttachmentTag(att.mimeType);
                      return (
                        <button key={att.id} onClick={() => openAttachment(att)} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl active:bg-slate-100 transition-all">
                          {att.mimeType.startsWith('image/') ? (
                            <img src={att.data} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="Thumb" />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${tag.color}`}>{tag.label}</div>
                          )}
                          <div className="flex flex-col items-start overflow-hidden pr-2">
                            <span className="text-[10px] font-black text-[#001D36] truncate max-w-[100px]">{att.name}</span>
                            <span className="text-[8px] font-black uppercase text-slate-400">{l.VIEW_MEDIA}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingAttachment && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4">
           <button onClick={() => setViewingAttachment(null)} className="absolute top-6 right-6 p-3 bg-white/20 text-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
           <div className="w-full h-full flex items-center justify-center">
             {viewingAttachment.mimeType.startsWith('image/') ? (
               <img src={viewingAttachment.data} className="max-w-full max-h-full rounded-2xl object-contain" alt="Preview" />
             ) : viewingAttachment.mimeType.startsWith('video/') ? (
               <video src={viewingAttachment.data} controls className="max-w-full max-h-full rounded-2xl" />
             ) : viewingAttachment.mimeType.startsWith('audio/') ? (
               <div className="bg-white p-10 rounded-3xl w-full max-w-xs flex flex-col items-center gap-6">
                 <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg></div>
                 <audio src={viewingAttachment.data} controls className="w-full" autoPlay />
                 <p className="font-black text-[#001D36] uppercase text-xs tracking-widest">{viewingAttachment.name}</p>
               </div>
             ) : (
               <div className="text-white font-black text-center p-6 space-y-4">
                 <p className="text-xl">Document view not supported here.</p>
                 <button 
                   onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingAttachment.data;
                      link.download = viewingAttachment.name;
                      link.click();
                      setViewingAttachment(null);
                   }}
                   className="m3-button-primary"
                 >
                   Download to View
                 </button>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default RecordScreen;