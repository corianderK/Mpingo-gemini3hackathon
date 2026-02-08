import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Patient, RiskLevel, TriageResult, MedicalRecord, OperatorRole, Language } from '../types';
import { APP_STRINGS } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

interface AssistProps {
  currentPatient: Patient | null;
  medicalRecords: MedicalRecord[];
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
  language: Language;
}

const AssistScreen: React.FC<AssistProps> = ({ currentPatient, medicalRecords, setMedicalRecords, language }) => {
  const s = APP_STRINGS[language].ASSIST;
  const common = APP_STRINGS[language].COMMON;
  const l = APP_STRINGS[language].LABELS;
  const u = APP_STRINGS[language].UNITS;

  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(location.state?.draft || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.draft) setDraft(location.state.draft);
  }, [location.state]);

  const handleRunTriage = async () => {
    if (!draft || !currentPatient) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    
    const historyContext = medicalRecords
      .filter(r => r.patientId === currentPatient.id)
      .sort((a, b) => (b.documentDate || b.timestamp) - (a.documentDate || a.timestamp))
      .slice(0, 15)
      .map(r => `[Date: ${new Date(r.documentDate || r.timestamp).toLocaleDateString()}] (${r.operatorRole}): ${r.content}${r.vitals ? ` (Vitals: ${JSON.stringify(r.vitals)})` : ''}`)
      .join('\n');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `FULL PATIENT COMPREHENSIVE PROFILE:
          - Identity: ${currentPatient.fullName}, Age ${currentPatient.age}, Sex ${currentPatient.sex}
          - Blood Type: ${currentPatient.bloodType || 'Unknown'}
          - Pregnancy Status: ${currentPatient.isPregnantOrBreastfeeding ? `YES - ${currentPatient.pregnancyWeeks || 'unknown'} weeks pregnant` : 'NO'}
          - Location Context: ${currentPatient.location?.cidade || 'Mozambique'}, ${currentPatient.location?.bairro || ''}
          - Allergies & Reactions: ${currentPatient.allergies || 'NONE KNOWN'}
          - Chronic Conditions: ${currentPatient.knownConditions.join(', ') || 'NONE RECORDED'}
          - Past Medical History (Family/Childhood/Surgeries): ${currentPatient.pastMedicalHistory || 'No past history provided'}
          - Chronic Diseases: ${currentPatient.chronicDiseases || 'NONE'}
          - Long-term/Chronic Medications: ${currentPatient.chronicMedications || 'NONE'}
          - Recently Prescribed Medications: ${currentPatient.currentMedications || 'NONE'}
          
          CHRONOLOGICAL CLINICAL VISIT HISTORY (Most Recent First):
          ${historyContext || 'No previous visit history.'}
          
          CURRENT PRESENTATION (Today's Data):
          ${draft}`,
        config: {
          systemInstruction: `You are a world-class diagnostic and triage AI assistant specialized in public health. 
            CORE LOGIC RULES:
            1. CHRONOLOGY MATTERS: Distinguish between acute events and chronic patterns.
            2. PREGNANCY SAFETY: If the patient is pregnant, prioritize safety for both mother and fetus. Check all suggested OTC options for pregnancy contraindications.
            3. BIOLOGICAL CONTEXT: Consider blood type, chronic history, and long-term meds when evaluating the current presentation.
            4. RED FLAGS: Prioritize Vitals assessment. BP >180/120, SpO2 < 92%, Temp >39.5°C or <35.0°C are automatic Critical/Emergency.
            5. RESPONSE: Be clinical, objective, and provide the result in the specific JSON schema.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING },
              reason: { type: Type.STRING },
              topQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleCauses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ["name", "rationale", "confidence"]
                }
              },
              nextActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    urgency: { type: Type.STRING },
                    details: { type: Type.STRING }
                  },
                  required: ["urgency", "details"]
                }
              },
              otcOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    warnings: { type: Type.STRING }
                  },
                  required: ["name", "purpose", "warnings"]
                }
              },
              whenToSeekCare: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["riskLevel", "reason", "topQuestions", "possibleCauses", "nextActions", "otcOptions", "whenToSeekCare"]
          }
        }
      });

      const triageResult = JSON.parse(response.text || '{}') as TriageResult;
      setResult(triageResult);
    } catch (error: any) {
      console.error("Triage analysis failed:", error);
      let msg = language === 'en' ? "Analysis failed. Please check connection." : "A análise falhou. Verifique a ligação.";
      if (error?.message?.includes('429')) msg = language === 'en' ? "AI busy. Try again in 1 minute." : "IA ocupada. Tente em 1 minuto.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToTimeline = () => {
    if (!result || !currentPatient) return;
    
    const differentialLabel = language === 'en' ? 'Differential Diagnoses' : 'Diagnósticos Diferenciais';
    const planLabel = language === 'en' ? 'Plan of Action' : 'Plano de Ação';
    const yesLabel = language === 'en' ? 'YES' : 'SIM';

    const summaryText = `[AI TRIAGE: ${result.riskLevel}]
Logic: ${result.reason}
Profile Data Included: ${yesLabel}
Chronological Context Applied: ${yesLabel}
    
${differentialLabel}:
${result.possibleCauses.map(c => `- ${c.name} (${Math.round(c.confidence * 100)}%)`).join('\n')}

${planLabel}:
${result.nextActions.map(a => `- [${a.urgency}] ${a.details}`).join('\n')}`;

    const newRecord: MedicalRecord = {
      id: `ai-${Date.now()}`,
      patientId: currentPatient.id,
      operatorRole: OperatorRole.CLINICIAN,
      timestamp: Date.now(),
      documentDate: Date.now(),
      content: summaryText,
      attachments: []
    };
    setMedicalRecords(prev => [newRecord, ...prev]);
    navigate('/record');
  };

  const getRiskColor = (level: RiskLevel | string) => {
    const l = level.toString().toUpperCase();
    if (l.includes('HIGH') || l.includes('EMERGENCY')) return 'bg-red-600 text-white';
    if (l.includes('MODERATE') || l.includes('YELLOW')) return 'bg-yellow-400 text-yellow-950';
    if (l.includes('LOW') || l.includes('GREEN')) return 'bg-emerald-500 text-white';
    return 'bg-slate-200';
  };

  if (!currentPatient) return <div className="p-10 text-center font-bold">{l.SELECT_PATIENT_FIRST}</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
      <div className="p-4 space-y-4">
        {/* Patient Summary Header */}
        <div className="m3-card p-6 space-y-4 shadow-sm bg-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 rounded-full border border-blue-200">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-blue-700 uppercase tracking-widest">
                {language === 'en' ? 'Context Linked' : 'Contexto Vinculado'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-[#1B1B1F] text-xl leading-tight">{currentPatient.fullName}</h3>
            <div className="flex flex-wrap gap-2">
               <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase">{l.AGE}: {currentPatient.age}</span>
               <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase">{l.BLOOD}: {currentPatient.bloodType === 'Unknown' ? l.UNKNOWN : currentPatient.bloodType}</span>
               {currentPatient.isPregnantOrBreastfeeding && (
                 <span className="text-[10px] font-black bg-pink-100 px-2 py-0.5 rounded text-pink-700 uppercase">{l.PREGNANT}</span>
               )}
            </div>
          </div>
          
          {/* Highlight Chronic Diseases in Assist screen profile */}
          <div className="flex flex-col gap-1 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
             <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">{APP_STRINGS[language].PATIENT.FIELDS.CHRONIC_DISEASES}</span>
             <p className="text-xs font-black text-indigo-900 leading-tight">{currentPatient.chronicDiseases || 'None reported'}</p>
          </div>
        </div>
      </div>

      {/* Full-width (Edge-to-edge) Input Section */}
      <div className="space-y-4">
        <div className="bg-white border-y border-slate-200 shadow-sm relative">
          <textarea
            className="w-full h-64 p-6 text-lg font-bold text-[#1B1B1F] bg-transparent outline-none resize-none placeholder-slate-300"
            placeholder={s.EMPTY_DESC}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="absolute bottom-2 right-4 pointer-events-none">
            <svg className="w-6 h-6 text-slate-200" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
          </div>
        </div>

        <div className="px-6">
          {errorMessage && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[10px] font-black uppercase text-center animate-in shake duration-300">
              {errorMessage}
            </div>
          )}

          <button 
            onClick={handleRunTriage}
            disabled={!draft || isLoading}
            className={`m3-button-primary w-full h-16 shadow-lg mb-12 ${(!draft || isLoading) ? 'opacity-50' : ''}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {s.ANALYZING}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                {s.RUN}
              </div>
            )}
          </button>
        </div>
      </div>

      {result && !isLoading && (
        <div className="px-4 pb-40 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`rounded-[32px] p-6 shadow-xl ${getRiskColor(result.riskLevel)}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{l.RISK_ASSESSMENT}</p>
            <h2 className="text-3xl font-black leading-tight">{result.riskLevel}</h2>
            <p className="mt-3 text-sm font-bold leading-snug italic opacity-90">"{result.reason}"</p>
          </div>

          <div className="m3-card p-6 space-y-6">
            <section className="space-y-3">
              <h4 className="font-black flex items-center gap-2 text-[#001D36] uppercase text-xs tracking-widest">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                {l.DIFFERENTIAL}
              </h4>
              <div className="space-y-2">
                {result.possibleCauses.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-sm text-slate-800">{c.name}</span>
                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{Math.round(c.confidence*100)}% {l.MATCH}</span>
                     </div>
                     <p className="text-xs font-bold text-slate-500 italic leading-tight">{c.rationale}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-black flex items-center gap-2 text-[#001D36] uppercase text-xs tracking-widest">
                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                {l.ACTIONS}
              </h4>
              <div className="space-y-2">
                {result.nextActions.map((action, i) => (
                  <div key={i} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 items-start">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter mt-0.5 ${action.urgency.toLowerCase().includes('immediate') ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{action.urgency}</span>
                    <p className="text-sm font-bold text-emerald-900 leading-tight">{action.details}</p>
                  </div>
                ))}
              </div>
            </section>

            {result.otcOptions.length > 0 && (
              <section className="space-y-3">
                <h4 className="font-black flex items-center gap-2 text-[#001D36] uppercase text-xs tracking-widest">
                  <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
                  {l.OTC}
                </h4>
                <div className="flex flex-col gap-2">
                  {result.otcOptions.map((opt, i) => (
                    <div key={i} className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="text-sm font-black text-amber-900">{opt.name}</p>
                      <p className="text-xs font-bold text-amber-700 leading-tight mb-1">{opt.purpose}</p>
                      <p className="text-[10px] font-black text-red-600 uppercase italic">{opt.warnings}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h4 className="font-black flex items-center gap-2 text-red-700 uppercase text-xs tracking-widest">
                <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                {l.DANGER_SIGNS}
              </h4>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <ul className="list-disc list-inside space-y-1 text-xs text-red-900 font-bold">
                  {result.whenToSeekCare.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 pt-4 pb-12">
             {(result.riskLevel.toUpperCase().includes('HIGH') || result.riskLevel.toUpperCase().includes('EMERGENCY')) && (
               <button onClick={() => setShowEmergency(true)} className="bg-red-600 text-white rounded-full py-6 text-xl font-black shadow-xl animate-pulse active:scale-95 transition-transform">
                 {s.EMERGENCY_CALL}
               </button>
             )}
             <button onClick={handleSaveToTimeline} className="m3-button-secondary h-16 shadow-inner">{common.SAVING_TIMELINE}</button>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="p-10 text-center opacity-40">
           <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
           <p className="text-sm font-bold text-slate-600 leading-tight">{s.EMPTY_DESC}</p>
        </div>
      )}

      {showEmergency && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 mx-auto rounded-full" />
            <h3 className="text-2xl font-black text-red-600 text-center uppercase tracking-tighter">{s.EMERGENCY_SCRIPT_TITLE}</h3>
            <div className="bg-red-50 p-6 rounded-[28px] border-4 border-red-100 text-lg font-bold italic leading-relaxed text-red-900">
              "{s.EMERGENCY_SCRIPT
                .replace('[NAME]', currentPatient.fullName)
                .replace('[AGE]', currentPatient.age.toString())
                .replace('[SYMPTOMS]', draft || 'severe medical distress')
                .replace('[LOCATION]', currentPatient.location ? `${currentPatient.location.street}, ${currentPatient.location.bairro}, ${currentPatient.location.cidade}` : 'the patient\'s current address')}"
            </div>
            <a href="tel:112" className="bg-red-600 text-white py-5 rounded-full text-2xl font-black text-center shadow-lg block">{s.EMERGENCY_BTN}</a>
            <button onClick={() => setShowEmergency(false)} className="w-full py-2 text-slate-400 font-black uppercase text-sm tracking-widest">{l.DISMISS}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistScreen;