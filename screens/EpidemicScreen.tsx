import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, Language, MedicalRecord, OperatorRole } from '../types';
import { APP_STRINGS } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface EpidemicProps {
  currentPatient: Patient | null;
  language: Language;
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
}

enum Phase {
  PRIMARY = 1,
  FEVER_SYMPTOMS = 2,
  DANGER_SIGNS = 3,
  RESULTS = 4
}

interface ScreeningData {
  travel: boolean;
  travelWhere: string;
  exposure: boolean;
  closeContact: boolean;
  chills: boolean;
  
  feverNow: boolean;
  feverTemp: string;
  feverDays: string;
  feverType: 'continuous' | 'intermittent' | 'none';

  headache: boolean;
  muscleAches: boolean;
  fatigue: boolean;
  vomiting: boolean;
  diarrhea: boolean;
  abdominalPain: boolean;

  eatNormal: boolean;
  drinkNormal: boolean;
  confusion: boolean;
  breathing: boolean;
  darkUrine: boolean;
  jaundice: boolean;
  cantStand: boolean;
  seizures: boolean;
  severeAbdominalPain: boolean;
}

const initialData: ScreeningData = {
  travel: false,
  travelWhere: '',
  exposure: false,
  closeContact: false,
  chills: false,
  feverNow: false,
  feverTemp: '',
  feverDays: '',
  feverType: 'none',
  headache: false,
  muscleAches: false,
  fatigue: false,
  vomiting: false,
  diarrhea: false,
  abdominalPain: false,
  eatNormal: true,
  drinkNormal: true,
  confusion: false,
  breathing: false,
  darkUrine: false,
  jaundice: false,
  cantStand: false,
  seizures: false,
  severeAbdominalPain: false
};

const YesNoToggle = ({ label, value, onToggle, ifYes, yesText, noText }: { 
  label: string, 
  value: boolean, 
  onToggle: (v: boolean) => void, 
  ifYes?: React.ReactNode,
  yesText: string,
  noText: string
}) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-slate-100">
      <p className="text-sm font-black text-[#001D36] flex-1 pr-4">{label}</p>
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
        <button onClick={() => onToggle(true)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${value ? 'bg-[#0061A4] text-white shadow-md' : 'text-slate-400'}`}>{yesText}</button>
        <button onClick={() => onToggle(false)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${!value ? 'bg-[#0061A4] text-white shadow-md' : 'text-slate-400'}`}>{noText}</button>
      </div>
    </div>
    {value && ifYes}
  </div>
);

const SimpleToggle = ({ label, value, onToggle, danger }: { label: string, value: boolean, onToggle: (v: boolean) => void, danger?: boolean }) => (
  <button 
    onClick={() => onToggle(!value)} 
    className={`w-full flex justify-between items-center p-4 rounded-3xl border-2 transition-all ${
      value 
        ? (danger ? 'bg-rose-600 border-rose-600 text-white' : 'bg-[#0061A4] border-[#0061A4] text-white') 
        : 'bg-white border-slate-100 text-[#001D36]'
    }`}
  >
    <span className="text-sm font-black">{label}</span>
    {value ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    ) : (
      <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
    )}
  </button>
);

const EpidemicScreen: React.FC<EpidemicProps> = ({ currentPatient, language, setMedicalRecords }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(Phase.PRIMARY);
  const [data, setData] = useState<ScreeningData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const s = APP_STRINGS[language].EPIDEMIC;
  const common = APP_STRINGS[language].COMMON;

  const runFinalAnalysis = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        CLINICAL QUESTIONNAIRE DATA (Malaria/Endemic Screening Protocol):
        1. Epidemiological: Travel=${data.travel} (${data.travelWhere}), Exposure=${data.exposure}, Contact=${data.closeContact}, Chills=${data.chills}
        2. Fever: Current=${data.feverNow}, Temp=${data.feverTemp}, Duration=${data.feverDays}, Type=${data.feverType}
        3. Symptoms: Headache=${data.headache}, Muscle=${data.muscleAches}, Fatigue=${data.fatigue}, Vomiting=${data.vomiting}, Diarrhea=${data.diarrhea}, Pain=${data.abdominalPain}
        4. Danger Signs: Confusion=${data.confusion}, Respiratory=${data.breathing}, Dark Urine=${data.darkUrine}, Jaundice=${data.jaundice}, Prostration=${data.cantStand}, Seizures=${data.seizures}, Severe Pain=${data.severeAbdominalPain}, Oral Intake=${data.eatNormal ? 'Normal' : 'Impaired'}/${data.drinkNormal ? 'Normal' : 'Impaired'}
        
        Patient Info: Age ${currentPatient?.age}, Sex ${currentPatient?.sex}
        
        Task:
        1. Categorize risk: Severe Endemic Disease Suspected, Non-severe disease Suspected, Respiratory, Diarrheal, or Other.
        2. Danger signs override: If any danger sign is TRUE, risk must be CRITICAL/EMERGENCY.
        3. Recommendation: Referral to Hospital, Lab Test, or Managed Self-medication.
        
        Return JSON { "riskLevel": string, "recommendation": string, "summary": string }.
        Respond in ${language === 'en' ? 'English' : 'Portuguese'}.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      setAnalysisResult(JSON.parse(response.text || '{}'));
      setPhase(Phase.RESULTS);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToTimeline = () => {
    if (!currentPatient || !analysisResult) return;
    const newRecord: MedicalRecord = {
      id: `epi-${Date.now()}`,
      patientId: currentPatient.id,
      operatorRole: OperatorRole.CLINICIAN,
      timestamp: Date.now(),
      documentDate: Date.now(),
      content: `[ENDEMIC TRIAGE REPORT]
Risk: ${analysisResult.riskLevel}
Recommendation: ${analysisResult.recommendation}
Clinical Summary: ${analysisResult.summary}

Questionnaire Data:
- Fever: ${data.feverNow ? `${data.feverTemp}°C, ${data.feverDays}d` : 'No'}
- Danger Signs: ${[data.confusion, data.breathing, data.jaundice, data.seizures].some(x => x) ? 'PRESENT' : 'NONE'}`,
      attachments: []
    };
    setMedicalRecords(prev => [newRecord, ...prev]);
    navigate('/record');
  };

  if (!currentPatient) return <div className="p-10 text-center opacity-40"><p className="font-black">Select a patient first.</p></div>;

  return (
    <div className="p-4 space-y-6 pb-40">
      <div className="space-y-2 px-2">
        <h2 className="text-3xl font-black text-[#001D36] tracking-tight">{s.TITLE}</h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className={`h-2 flex-1 rounded-full transition-all duration-500 ${phase >= step ? 'bg-[#0061A4]' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      {phase === Phase.PRIMARY && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xs font-black uppercase text-blue-800 tracking-widest px-2">{s.PHASE1_TITLE}</h3>
          <YesNoToggle 
            label={s.QUESTIONS.TRAVEL} 
            value={data.travel} 
            yesText={s.YES}
            noText={s.NO}
            onToggle={v => setData({...data, travel: v})} 
            ifYes={
              <div className="pl-6 border-l-4 border-blue-100 space-y-2">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{s.IF_YES} {s.QUESTIONS.WHERE}</p>
                <input 
                  type="text" 
                  className="m3-input font-bold" 
                  value={data.travelWhere} 
                  onChange={e => setData({...data, travelWhere: e.target.value})} 
                />
              </div>
            }
          />
          <YesNoToggle label={s.QUESTIONS.EXPOSURE} value={data.exposure} yesText={s.YES} noText={s.NO} onToggle={v => setData({...data, exposure: v})} />
          <YesNoToggle label={s.QUESTIONS.CLOSE_CONTACT} value={data.closeContact} yesText={s.YES} noText={s.NO} onToggle={v => setData({...data, closeContact: v})} />
          <YesNoToggle label={s.QUESTIONS.CHILLS} value={data.chills} yesText={s.YES} noText={s.NO} onToggle={v => setData({...data, chills: v})} />
          
          <button onClick={() => setPhase(Phase.FEVER_SYMPTOMS)} className="m3-button-primary w-full h-16 shadow-lg">{common.NEXT}</button>
        </div>
      )}

      {phase === Phase.FEVER_SYMPTOMS && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xs font-black uppercase text-blue-800 tracking-widest px-2">{s.PHASE2_TITLE}</h3>
          <div className="m3-card p-5 space-y-6">
            <YesNoToggle 
              label={s.QUESTIONS.FEVER_NOW} 
              value={data.feverNow} 
              yesText={s.YES}
              noText={s.NO}
              onToggle={v => setData({...data, feverNow: v, feverType: v ? 'continuous' : 'none'})} 
              ifYes={
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.QUESTIONS.TEMP}</label>
                      <input type="number" step="0.1" className="m3-input font-black text-xl" value={data.feverTemp} onChange={e => setData({...data, feverTemp: e.target.value})} placeholder="38.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Days' : 'Dias'}</label>
                      <input type="number" className="m3-input font-black text-xl" value={data.feverDays} onChange={e => setData({...data, feverDays: e.target.value})} placeholder="3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.QUESTIONS.FEVER_TYPE}</label>
                    <div className="flex gap-2">
                      <button onClick={() => setData({...data, feverType: 'continuous'})} className={`flex-1 py-3 rounded-2xl text-xs font-black border-2 transition-all ${data.feverType === 'continuous' ? 'bg-[#001D36] border-[#001D36] text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{s.QUESTIONS.CONTINUOUS}</button>
                      <button onClick={() => setData({...data, feverType: 'intermittent'})} className={`flex-1 py-3 rounded-2xl text-xs font-black border-2 transition-all ${data.feverType === 'intermittent' ? 'bg-[#001D36] border-[#001D36] text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{s.QUESTIONS.INTERMITTENT}</button>
                    </div>
                  </div>
                </div>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <SimpleToggle label={s.QUESTIONS.HEADACHE} value={data.headache} onToggle={v => setData({...data, headache: v})} />
            <SimpleToggle label={s.QUESTIONS.MUSCLE_ACHE} value={data.muscleAches} onToggle={v => setData({...data, muscleAches: v})} />
            <SimpleToggle label={s.QUESTIONS.FATIGUE} value={data.fatigue} onToggle={v => setData({...data, fatigue: v})} />
            <SimpleToggle label={s.QUESTIONS.VOMITING} value={data.vomiting} onToggle={v => setData({...data, vomiting: v})} />
            <SimpleToggle label={s.QUESTIONS.DIARRHEA} value={data.diarrhea} onToggle={v => setData({...data, diarrhea: v})} />
            <SimpleToggle label={s.QUESTIONS.ABDOMINAL_PAIN} value={data.abdominalPain} onToggle={v => setData({...data, abdominalPain: v})} />
          </div>

          <div className="flex gap-3 pt-4">
             <button onClick={() => setPhase(Phase.PRIMARY)} className="m3-button-tonal flex-1 h-16">{common.BACK}</button>
             <button onClick={() => setPhase(Phase.DANGER_SIGNS)} className="m3-button-primary flex-[2] h-16">{common.NEXT}</button>
          </div>
        </div>
      )}

      {phase === Phase.DANGER_SIGNS && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xs font-black uppercase text-rose-600 tracking-widest px-2">{s.PHASE3_TITLE}</h3>
          
          <div className="m3-card p-5 space-y-4 bg-rose-50 border-rose-100">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-slate-100">
              <span className="text-sm font-black text-[#001D36]">{s.QUESTIONS.EAT_NORMAL}</span>
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
                <button onClick={() => setData({...data, eatNormal: true})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${data.eatNormal ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>{s.YES}</button>
                <button onClick={() => setData({...data, eatNormal: false})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${!data.eatNormal ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400'}`}>{s.NO}</button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-slate-100">
              <span className="text-sm font-black text-[#001D36]">{s.QUESTIONS.DRINK_NORMAL}</span>
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
                <button onClick={() => setData({...data, drinkNormal: true})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${data.drinkNormal ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>{s.YES}</button>
                <button onClick={() => setData({...data, drinkNormal: false})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${!data.drinkNormal ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400'}`}>{s.NO}</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <SimpleToggle label={s.QUESTIONS.CONFUSION} value={data.confusion} onToggle={v => setData({...data, confusion: v})} danger />
            <SimpleToggle label={s.QUESTIONS.BREATHING} value={data.breathing} onToggle={v => setData({...data, breathing: v})} danger />
            <SimpleToggle label={s.QUESTIONS.DARK_URINE} value={data.darkUrine} onToggle={v => setData({...data, darkUrine: v})} danger />
            <SimpleToggle label={s.QUESTIONS.JAUNDICE} value={data.jaundice} onToggle={v => setData({...data, jaundice: v})} danger />
            <SimpleToggle label={s.QUESTIONS.CANT_STAND} value={data.cantStand} onToggle={v => setData({...data, cantStand: v})} danger />
            <SimpleToggle label={s.QUESTIONS.SEIZURES} value={data.seizures} onToggle={v => setData({...data, seizures: v})} danger />
            <SimpleToggle label={s.QUESTIONS.SEVERE_PAIN} value={data.severeAbdominalPain} onToggle={v => setData({...data, severeAbdominalPain: v})} danger />
          </div>

          <div className="flex gap-3 pt-4">
             <button onClick={() => setPhase(Phase.FEVER_SYMPTOMS)} className="m3-button-tonal flex-1 h-16">{common.BACK}</button>
             <button onClick={runFinalAnalysis} className="m3-button-primary flex-[2] h-16 shadow-xl">{s.ANALYZE}</button>
          </div>
        </div>
      )}

      {phase === Phase.RESULTS && analysisResult && (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <div className={`rounded-[32px] p-8 shadow-xl ${
            analysisResult.riskLevel.includes('Critical') || analysisResult.riskLevel.includes('High') || analysisResult.riskLevel.includes('Severe') ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Categorization</p>
             <h2 className="text-3xl font-black leading-tight">{analysisResult.riskLevel}</h2>
             <div className="mt-6 p-5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
               <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Recommended Action</p>
               <p className="text-xl font-black">{analysisResult.recommendation}</p>
             </div>
          </div>

          <div className="m3-card p-6 space-y-4">
             <h3 className="font-black text-xs uppercase text-blue-800 tracking-widest">Clinical Logic</h3>
             <p className="text-base font-bold text-slate-700 leading-relaxed italic">{analysisResult.summary}</p>
          </div>

          <div className="flex flex-col gap-3">
             <button onClick={saveToTimeline} className="m3-button-primary h-20 shadow-xl !rounded-3xl">{common.SAVING_TIMELINE}</button>
             <button onClick={() => { setPhase(Phase.PRIMARY); setAnalysisResult(null); setData(initialData); }} className="m3-button-tonal h-16 !rounded-3xl">{common.DISCARD}</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="w-20 h-20 border-8 border-blue-50 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-t-8 border-blue-600 rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-black uppercase text-sm tracking-widest text-blue-900">Expert Review...</p>
              <p className="text-xs font-bold text-slate-400">Comparing with clinical protocols</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpidemicScreen;