import React, { useState, useRef, useEffect } from 'react';
import { Patient, Sex, BloodType, PatientLocation, EmergencyContact, HospitalRecord, Language } from '../types';
import { APP_STRINGS, DEMO_PATIENT } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

interface PatientProps {
  currentPatient: Patient | null;
  patients: Patient[];
  switchPatient: (id: string) => void;
  deletePatient: (id: string) => void;
  setCurrentPatient: (p: Patient) => void;
  language: Language;
}

enum OnboardingStep {
  IDENTITY = 1,
  EMERGENCY = 2,
  PHYSICALS = 3,
  CLINICAL_CONTEXT = 4,
  BACKGROUND = 5,
  ADMIN = 6,
  LOCATION = 7,
  REVIEW = 8
}

const PatientScreen: React.FC<PatientProps> = ({ currentPatient, patients, switchPatient, deletePatient, setCurrentPatient, language }) => {
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.IDENTITY);
  const [isFlowActive, setIsFlowActive] = useState(!currentPatient);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [bmiInsight, setBmiInsight] = useState<{ classification: string, tip: string } | null>(null);
  const [isBmiLoading, setIsBmiLoading] = useState(false);

  const s = APP_STRINGS[language].PATIENT;
  const common = APP_STRINGS[language].COMMON;
  const l = APP_STRINGS[language].LABELS;
  const u = APP_STRINGS[language].UNITS;

  const getSexLabel = (val: Sex) => {
    if (language === 'en') return val;
    return val === Sex.FEMALE ? 'Feminino' : 'Masculino';
  };

  const [formData, setFormData] = useState<Partial<Patient>>({
    fullName: '',
    phoneNumber: '',
    age: 0,
    sex: Sex.FEMALE,
    bloodType: 'Unknown',
    height: undefined,
    weight: undefined,
    knownConditions: [],
    allergies: '',
    chronicDiseases: '',
    pastMedicalHistory: '',
    chronicMedications: '',
    currentMedications: '',
    isPregnantOrBreastfeeding: false,
    pregnancyWeeks: undefined,
    emergencyContact: { name: '', relationship: '', phone: '' },
    hospitalRecords: [{ hospitalName: '', registrationNumber: '' }],
    location: { street: '', houseNumber: '', bairro: '', cidade: '', provincia: '', country: 'Moçambique', distrito: '' }
  });

  useEffect(() => {
    if (currentPatient && currentPatient.height && currentPatient.weight) {
      fetchBmiInsight(currentPatient);
    }
  }, [currentPatient?.id, currentPatient?.weight, currentPatient?.height, currentPatient?.isPregnantOrBreastfeeding, currentPatient?.pregnancyWeeks, language]);

  const fetchBmiInsight = async (p: Patient) => {
    setIsBmiLoading(true);
    try {
      const bmi = (p.weight! / ((p.height! / 100) * (p.height! / 100))).toFixed(1);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contextPrompt = p.isPregnantOrBreastfeeding 
        ? `Patient is currently PREGNANT (${p.pregnancyWeeks || 'unknown'} weeks). Classify weight status and provide a health tip taking pregnancy weight gain guidelines into account.`
        : `Patient is NOT pregnant. Classify BMI status according to standard adult health guidelines (Underweight, Normal, Overweight, Obese).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Patient Info: Age ${p.age}, Sex ${p.sex}, Height ${p.height}cm, Weight ${p.weight}kg, BMI ${bmi}. 
        ${contextPrompt}
        Return JSON { "classification": string, "tip": string }.
        Respond in ${language === 'en' ? 'English' : 'Portuguese'}.`,
        config: { responseMimeType: "application/json" }
      });
      setBmiInsight(JSON.parse(response.text || '{}'));
    } catch (e) {
      console.error(e);
    } finally {
      setIsBmiLoading(false);
    }
  };

  const handleNext = () => {
    if (step === OnboardingStep.PHYSICALS && formData.sex === Sex.MALE) {
      setStep(OnboardingStep.BACKGROUND);
    } else if (step < OnboardingStep.REVIEW) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === OnboardingStep.BACKGROUND && formData.sex === Sex.MALE) {
      setStep(OnboardingStep.PHYSICALS);
    } else if (step > OnboardingStep.IDENTITY) {
      setStep(step - 1);
    }
  };

  const handleFinalSave = () => {
    const newPatient = { ...formData, id: formData.id || Date.now().toString() } as Patient;
    setCurrentPatient(newPatient);
    setIsFlowActive(false);
  };

  const startEditFlow = () => {
    setFormData(currentPatient || formData);
    setStep(OnboardingStep.IDENTITY);
    setIsFlowActive(true);
  };

  const startCreateFlow = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      age: 0,
      sex: Sex.FEMALE,
      bloodType: 'Unknown',
      knownConditions: [],
      emergencyContact: { name: '', relationship: '', phone: '' },
      hospitalRecords: [{ hospitalName: '', registrationNumber: '' }],
      location: { street: '', houseNumber: '', bairro: '', cidade: '', provincia: '', country: 'Moçambique', distrito: '' }
    });
    setStep(OnboardingStep.IDENTITY);
    setIsFlowActive(true);
    setIsSwitcherOpen(false);
  };

  const handleDeleteProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(s.DELETE_CONFIRM)) {
      deletePatient(id);
    }
  };

  const addHospitalRecord = () => {
    const records = [...(formData.hospitalRecords || [])];
    records.push({ hospitalName: '', registrationNumber: '' });
    setFormData({ ...formData, hospitalRecords: records });
  };

  const updateHospitalRecord = (index: number, field: keyof HospitalRecord, value: string) => {
    const records = [...(formData.hospitalRecords || [])];
    records[index] = { ...records[index], [field]: value };
    setFormData({ ...formData, hospitalRecords: records });
  };

  const removeHospitalRecord = (index: number) => {
    const records = (formData.hospitalRecords || []).filter((_, i) => i !== index);
    setFormData({ ...formData, hospitalRecords: records });
  };

  const EditBtn = ({ target }: { target: OnboardingStep }) => (
    <button 
      onClick={() => setStep(target)}
      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </button>
  );

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

  if (!isFlowActive && currentPatient) {
    return (
      <div className="p-4 space-y-6 pb-40 animate-in fade-in duration-500 relative">
        <div className="flex justify-end pr-2 pt-2">
          <button 
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 active:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#D1E4FF] text-[#001D36] flex items-center justify-center font-black text-xs uppercase">
              {currentPatient.fullName.charAt(0)}
            </div>
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{s.SWITCH}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        {isSwitcherOpen && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-xl text-[#001D36] uppercase tracking-tighter">{s.SELECT_PROFILE}</h3>
                <button onClick={() => setIsSwitcherOpen(false)} className="text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                {patients.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => { switchPatient(p.id); setIsSwitcherOpen(false); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${currentPatient.id === p.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white border-2 border-transparent active:bg-slate-50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#D1E4FF] text-[#001D36] flex items-center justify-center font-black text-sm uppercase">
                      {p.fullName.charAt(0)}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-black text-[#001D36] leading-none">{p.fullName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{p.age}{u.YEARS} • {getSexLabel(p.sex)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {currentPatient.id === p.id && (
                        <svg className="text-blue-600" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      <button 
                        onClick={(e) => handleDeleteProfile(e, p.id)}
                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-50">
                <button 
                  onClick={startCreateFlow}
                  className="w-full m3-button-primary py-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {s.ADD_NEW}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="m3-card p-6 space-y-4 shadow-md bg-gradient-to-br from-white to-[#f0f4f8]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#1B1B1F] tracking-tight">{currentPatient.fullName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#D1E4FF] text-[#001D36] px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">{getSexLabel(currentPatient.sex)}</span>
                {currentPatient.isPregnantOrBreastfeeding && (
                   <span className="bg-[#FFD9E2] text-[#3E001D] px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                     {currentPatient.pregnancyWeeks ? `${currentPatient.pregnancyWeeks}${u.WEEKS}` : ''} {l.PREGNANT}
                   </span>
                )}
                <span className="bg-[#E2E1EC] text-[#1B1B1F] px-3 py-0.5 rounded-full text-xs font-bold tracking-wider">{currentPatient.bloodType === 'Unknown' ? l.UNKNOWN : currentPatient.bloodType}</span>
                <span className="text-slate-600 font-bold">{currentPatient.age}{u.YEARS} • {currentPatient.height || '?'}cm / {currentPatient.weight || '?'}kg</span>
              </div>
            </div>
            <button onClick={startEditFlow} className="m3-button-tonal py-2 px-5 text-sm font-bold">{common.EDIT}</button>
          </div>

          {currentPatient.height && currentPatient.weight && (
             <div className="m3-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 border-2 relative">
               <div className="flex justify-between items-start">
                 <div>
                   <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest">{s.BMI_INDEX}</span>
                   <div className="text-3xl font-black text-[#001D36]">{(currentPatient.weight / ((currentPatient.height/100)**2)).toFixed(1)}</div>
                 </div>
                 {isBmiLoading ? <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" /> : bmiInsight && (
                    <div className="px-4 py-1.5 rounded-2xl font-black text-[10px] uppercase bg-emerald-100 text-emerald-800 border-2 border-emerald-200">{bmiInsight.classification}</div>
                 )}
               </div>
               {bmiInsight?.tip && <p className="mt-2 text-xs font-bold text-slate-700 italic border-t border-blue-100 pt-2">AI TIP: {bmiInsight.tip}</p>}
             </div>
          )}

          <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
             {/* Emergency Contact */}
             <div className="flex flex-col gap-1 p-3 bg-red-50 rounded-2xl border border-red-100">
                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">{s.EMERGENCY_CONTACT}</span>
                <p className="text-sm font-black text-red-900">{currentPatient.emergencyContact?.name || l.UNKNOWN} ({currentPatient.emergencyContact?.phone || '?'})</p>
             </div>
             
             {/* Chronic Diseases - Highlighting in a unified Material 3 style */}
             <div className="flex flex-col gap-1 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{s.FIELDS.CHRONIC_DISEASES}</span>
                <p className="text-sm font-black text-indigo-900">{currentPatient.chronicDiseases || 'None reported'}</p>
             </div>

             {/* Allergies */}
             <div className="flex flex-col gap-1 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{s.ALLERGIES_LABEL}</span>
                <p className="text-sm font-bold text-amber-900">{currentPatient.allergies || 'None reported'}</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="sticky top-0 z-40 bg-slate-50 p-4 space-y-4 border-b border-slate-100">
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-[#0061A4] h-full transition-all duration-500" style={{ width: `${(step / 8) * 100}%` }} />
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-[#0061A4] uppercase tracking-widest">{l.STEP} {step} / 8</span>
          <button onClick={() => { setIsFlowActive(false); setStep(OnboardingStep.IDENTITY); }} className="text-slate-400 font-bold text-xs uppercase">{common.EXIT}</button>
        </div>
      </div>

      <div className={`flex-1 ${step === OnboardingStep.BACKGROUND ? 'px-0' : 'px-4'} pb-64 overflow-y-auto scrollbar-hide animate-in slide-in-from-right-4 duration-300`}>
        {step === OnboardingStep.IDENTITY && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.IDENTITY}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.NAME}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.AGE}</label>
                <input type="number" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>
        )}

        {step === OnboardingStep.EMERGENCY && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.EMERGENCY}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.NAME}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.emergencyContact?.name || ''} onChange={e => setFormData({...formData, emergencyContact: { ...formData.emergencyContact!, name: e.target.value }})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.PHONE}</label>
                <input type="tel" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.emergencyContact?.phone || ''} onChange={e => setFormData({...formData, emergencyContact: { ...formData.emergencyContact!, phone: e.target.value }})} />
              </div>
            </div>
          </div>
        )}

        {step === OnboardingStep.PHYSICALS && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.PHYSICALS}</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.HEIGHT}</label>
                <input type="number" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.WEIGHT}</label>
                <input type="number" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 0})} />
              </div>
              
              <div className="pt-2">
                <label className="text-xs font-bold text-[#0061A4] px-1 uppercase tracking-widest block mb-4">{s.FIELDS.BLOOD_TYPE}</label>
                <div className="grid grid-cols-3 gap-2">
                  {bloodTypes.map(bt => (
                    <button
                      key={bt}
                      onClick={() => setFormData({...formData, bloodType: bt})}
                      className={`py-3 rounded-2xl font-black border-2 transition-all text-sm ${formData.bloodType === bt ? 'bg-[#001D36] border-[#001D36] text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      {bt === 'Unknown' ? l.UNKNOWN : bt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-[#0061A4] px-1 uppercase tracking-widest block mb-4">{s.FIELDS.SEX}</label>
                <div className="flex gap-2">
                  {[Sex.FEMALE, Sex.MALE].map(opt => (
                    <button key={opt} onClick={() => setFormData({...formData, sex: opt})} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${formData.sex === opt ? 'bg-[#001D36] border-[#001D36] text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>{getSexLabel(opt)}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === OnboardingStep.CLINICAL_CONTEXT && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.MATERNITY}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-4 p-5 bg-white rounded-3xl border-2 border-slate-100">
                <input type="checkbox" className="w-6 h-6" checked={formData.isPregnantOrBreastfeeding} onChange={e => setFormData({...formData, isPregnantOrBreastfeeding: e.target.checked})} />
                <span className="font-bold text-[#001D36]">{s.FIELDS.PREGNANCY}</span>
              </label>
              {formData.isPregnantOrBreastfeeding && (
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest">{s.FIELDS.WEEKS}</label>
                  <input type="number" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.pregnancyWeeks || ''} onChange={e => setFormData({...formData, pregnancyWeeks: parseInt(e.target.value) || 0})} />
                </div>
              )}
            </div>
          </div>
        )}

        {step === OnboardingStep.BACKGROUND && (
          <div className="space-y-0 pt-4 animate-in fade-in duration-300">
            <h3 className="text-3xl font-black text-[#001D36] px-6 mb-6 tracking-tight leading-none">{s.STEPS.HISTORY}</h3>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#0061A4] px-6 uppercase tracking-[0.2em] opacity-70">{s.FIELDS.ALLERGIES}</label>
                <div className="w-full relative">
                  <textarea 
                    className="w-full h-80 bg-white border-y-2 border-slate-200 p-6 text-lg font-bold text-[#1B1B1F] outline-none focus:border-[#0061A4] transition-all resize-none shadow-inner" 
                    value={formData.allergies} 
                    onChange={e => setFormData({...formData, allergies: e.target.value})} 
                  />
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                     <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#0061A4] px-6 uppercase tracking-[0.2em] opacity-70">{s.FIELDS.CHRONIC_DISEASES}</label>
                <div className="w-full relative">
                  <textarea 
                    className="w-full h-80 bg-white border-y-2 border-slate-200 p-6 text-lg font-bold text-[#1B1B1F] outline-none focus:border-[#0061A4] transition-all resize-none shadow-inner" 
                    value={formData.chronicDiseases} 
                    onChange={e => setFormData({...formData, chronicDiseases: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#0061A4] px-6 uppercase tracking-[0.2em] opacity-70">{s.FIELDS.HISTORY}</label>
                <div className="w-full relative">
                  <textarea 
                    className="w-full h-80 bg-white border-y-2 border-slate-200 p-6 text-lg font-bold text-[#1B1B1F] outline-none focus:border-[#0061A4] transition-all resize-none shadow-inner" 
                    value={formData.pastMedicalHistory} 
                    onChange={e => setFormData({...formData, pastMedicalHistory: e.target.value})} 
                  />
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                     <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === OnboardingStep.ADMIN && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.ADMIN}</h3>
            <div className="space-y-4">
              {(formData.hospitalRecords || []).map((record, idx) => (
                <div key={idx} className="m3-card p-5 border-2 border-slate-100 space-y-4 relative">
                  <button 
                    onClick={() => removeHospitalRecord(idx)}
                    className="absolute top-4 right-4 text-red-400 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                  <div className="flex items-center gap-4">
                    <label className="text-[10px] font-black text-slate-400 w-32 uppercase tracking-widest">{l.HOSPITAL}</label>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-1 focus:border-blue-600 outline-none"
                      value={record.hospitalName} 
                      onChange={e => updateHospitalRecord(idx, 'hospitalName', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-[10px] font-black text-slate-400 w-32 uppercase tracking-widest">{s.FIELDS.HOSPITAL_RECORDS}</label>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-1 focus:border-blue-600 outline-none"
                      value={record.registrationNumber} 
                      onChange={e => updateHospitalRecord(idx, 'registrationNumber', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addHospitalRecord}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 font-black uppercase text-xs flex items-center justify-center gap-2 active:bg-slate-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                {l.ADD_ANOTHER}
              </button>
            </div>
          </div>
        )}

        {step === OnboardingStep.LOCATION && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#001D36]">{s.STEPS.LOCATION}</h3>
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest shrink-0">{s.FIELDS.STREET}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.location?.street} onChange={e => setFormData({...formData, location: { ...formData.location!, street: e.target.value }})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest shrink-0">{s.FIELDS.HOUSE_NUMBER}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.location?.houseNumber} onChange={e => setFormData({...formData, location: { ...formData.location!, houseNumber: e.target.value }})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest shrink-0">{s.FIELDS.BAIRRO}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.location?.bairro} onChange={e => setFormData({...formData, location: { ...formData.location!, bairro: e.target.value }})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest shrink-0">{s.FIELDS.DISTRICT}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.location?.distrito} onChange={e => setFormData({...formData, location: { ...formData.location!, distrito: e.target.value }})} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-[#0061A4] w-32 uppercase tracking-widest shrink-0">{s.FIELDS.CIDADE}</label>
                <input type="text" className="flex-1 bg-transparent border-b-2 border-slate-200 font-bold p-2 focus:border-blue-600 outline-none" value={formData.location?.cidade} onChange={e => setFormData({...formData, location: { ...formData.location!, cidade: e.target.value }})} />
              </div>
            </div>
          </div>
        )}

        {step === OnboardingStep.REVIEW && (
          <div className="space-y-6 pt-4">
             <h3 className="text-3xl font-black text-[#001D36]">{s.STEPS.REVIEW}</h3>
             
             <div className="m3-card bg-white shadow-xl overflow-hidden mb-40">
                <div className="divide-y divide-slate-100">
                  <div className="p-6 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.FIELDS.NAME}</p>
                      <p className="text-2xl font-black text-[#1B1B1F] leading-tight">{formData.fullName}</p>
                      <p className="text-sm font-bold text-slate-500">{formData.age}{u.YEARS}, {getSexLabel(formData.sex || Sex.FEMALE)} | {l.BLOOD}: {formData.bloodType === 'Unknown' ? l.UNKNOWN : formData.bloodType}</p>
                    </div>
                    <EditBtn target={OnboardingStep.IDENTITY} />
                  </div>

                  <div className="p-6 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Data</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formData.height}cm / {formData.weight}kg 
                        <span className="ml-2 text-blue-600 font-black">BMI: {(formData.weight && formData.height) ? (formData.weight / ((formData.height/100)**2)).toFixed(1) : '?'}</span>
                      </p>
                      {formData.isPregnantOrBreastfeeding && (
                        <p className="text-sm font-black text-emerald-600 uppercase pt-1">
                          {l.PREGNANT} {formData.pregnancyWeeks ? `(${formData.pregnancyWeeks}${u.WEEKS})` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <EditBtn target={OnboardingStep.PHYSICALS} />
                      <EditBtn target={OnboardingStep.CLINICAL_CONTEXT} />
                    </div>
                  </div>

                  <div className="p-6 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.EMERGENCY_CONTACT}</p>
                      <p className="text-sm font-bold text-slate-800">{formData.emergencyContact?.name || l.UNKNOWN}</p>
                      <p className="text-xs font-black text-blue-600 tracking-wider">{formData.emergencyContact?.phone}</p>
                    </div>
                    <EditBtn target={OnboardingStep.EMERGENCY} />
                  </div>

                  <div className="p-6 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.STEPS.LOCATION}</p>
                      <p className="text-sm font-bold text-slate-800 leading-snug">
                        {formData.location?.street}{formData.location?.houseNumber ? `, Nº ${formData.location.houseNumber}` : ''}
                      </p>
                      <p className="text-sm font-bold text-slate-800 leading-snug pt-1">
                        {formData.location?.bairro}, {formData.location?.distrito}
                      </p>
                      <p className="text-sm font-bold text-slate-800 leading-snug pt-1">
                        {formData.location?.cidade}
                      </p>
                    </div>
                    <EditBtn target={OnboardingStep.LOCATION} />
                  </div>

                  <div className="p-6 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.FIELDS.CHRONIC_DISEASES}</p>
                      <p className="text-xs font-black text-[#001D36] leading-tight mb-2">
                        {formData.chronicDiseases || 'None reported'}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.FIELDS.HISTORY}</p>
                      <p className="text-xs font-bold text-slate-700 leading-tight italic">
                        {formData.pastMedicalHistory || 'No history reported'}
                      </p>
                      <p className="text-[10px] font-black text-red-600 uppercase mt-2">{s.FIELDS.ALLERGIES}</p>
                      <p className="text-xs font-black text-red-900">{formData.allergies || 'None'}</p>
                    </div>
                    <EditBtn target={OnboardingStep.BACKGROUND} />
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 bg-white/95 backdrop-blur-md p-6 border-t border-slate-100 z-[60] flex gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        {step > OnboardingStep.IDENTITY && (
          <button onClick={handleBack} className="m3-button-tonal flex-1 py-4 h-16">{common.BACK}</button>
        )}
        {step < OnboardingStep.REVIEW ? (
           <button onClick={handleNext} disabled={step === OnboardingStep.IDENTITY && !formData.fullName} className={`m3-button-primary flex-[2] py-4 h-16 ${step === OnboardingStep.IDENTITY && !formData.fullName ? 'opacity-50' : ''}`}>{common.NEXT}</button>
        ) : (
           <button onClick={handleFinalSave} className="flex-[2] h-16 rounded-full font-black text-lg bg-emerald-600 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center">{common.SAVE}</button>
        )}
      </div>
    </div>
  );
};

export default PatientScreen;