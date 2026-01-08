
import React, { useState, useRef } from 'react';
import { Patient, Sex, BloodType, PatientLocation } from '../types';
import { APP_STRINGS } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

interface PatientProps {
  currentPatient: Patient | null;
  setCurrentPatient: (p: Patient | null) => void;
}

const PatientScreen: React.FC<PatientProps> = ({ currentPatient, setCurrentPatient }) => {
  const [isEditing, setIsEditing] = useState(!currentPatient);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<PatientLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimeout = useRef<number | null>(null);
  
  const initialLocation: PatientLocation = currentPatient?.location || {
    street: '',
    bairro: '',
    distrito: '',
    cidade: '',
    country: 'Moçambique'
  };

  const [formData, setFormData] = useState<Partial<Patient>>(currentPatient || {
    fullName: '',
    age: 0,
    sex: Sex.FEMALE,
    knownConditions: [],
    location: initialLocation
  });

  const handleSave = () => {
    if (!formData.fullName || formData.fullName.trim() === '') {
      alert("Please enter a name");
      return;
    }
    const newPatient = { ...formData, id: Date.now().toString() } as Patient;
    setCurrentPatient(newPatient);
    setIsEditing(false);
  };

  const conditions = ['HIV', 'TB', 'Diabetes', 'Asthma', 'Hypertension', 'Malaria', 'None'];
  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

  const updateLocation = (field: keyof PatientLocation, value: string) => {
    const newLoc = {
      ...(formData.location as PatientLocation),
      [field]: value
    };
    setFormData({ ...formData, location: newLoc });

    // 仅在街道和社区字段触发建议
    if (field === 'street' || field === 'bairro') {
      fetchAddressSuggestions(value);
    }
  };

  const fetchAddressSuggestions = async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (suggestionTimeout.current) window.clearTimeout(suggestionTimeout.current);

    suggestionTimeout.current = window.setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Provide a list of 5 real address suggestions in Mozambique based on this partial input: "${input}". 
          The results should be specific to urban or rural areas in Mozambique. 
          Format as JSON array of objects with fields: street, bairro, distrito, cidade, country (fixed as Moçambique).`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  street: { type: Type.STRING },
                  bairro: { type: Type.STRING },
                  distrito: { type: Type.STRING },
                  cidade: { type: Type.STRING },
                  country: { type: Type.STRING }
                },
                required: ["street", "bairro", "distrito", "cidade", "country"]
              }
            }
          }
        });

        const data = JSON.parse(response.text || '[]');
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (e) {
        console.error("Autocomplete failed", e);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 500);
  };

  const selectSuggestion = (s: PatientLocation) => {
    setFormData({ ...formData, location: s });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 强制背景色的辅助对象
  const whiteInputStyle = { backgroundColor: '#FFFFFF' };

  if (!currentPatient && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-8 animate-in fade-in duration-700">
        <div className="w-40 h-40 bg-blue-100 rounded-[48px] flex items-center justify-center shadow-inner">
          <svg className="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#1B1B1F]">Welcome to TriageAssist</h2>
          <p className="text-slate-600 leading-relaxed px-4">
            {APP_STRINGS.PATIENT.CREATE_FIRST}
          </p>
        </div>
        <button onClick={() => setIsEditing(true)} className="m3-button-primary w-full max-w-xs shadow-lg">
          {APP_STRINGS.PATIENT.ADD_NEW}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Current Patient Summary Card */}
      {currentPatient && !isEditing && (
        <div className="m3-card p-6 space-y-4 shadow-md bg-gradient-to-br from-white to-[#f0f4f8]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#1B1B1F] tracking-tight">{currentPatient.fullName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#D1E4FF] text-[#001D36] px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  {currentPatient.sex === Sex.INTERSEX ? 'Intersex' : currentPatient.sex}
                </span>
                
                {/* 增加怀孕/哺乳状态显示 */}
                {currentPatient.sex === Sex.FEMALE && currentPatient.isPregnantOrBreastfeeding && (
                  <span className="bg-[#FFD9E2] text-[#3E001D] px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    Pregnant / Nursing
                  </span>
                )}

                <span className="text-slate-600 font-bold">{currentPatient.age}y</span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-slate-600 font-bold">{currentPatient.bloodType === 'Unknown' ? 'BT Not Sure' : (currentPatient.bloodType || 'Unknown BT')}</span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-slate-600 font-bold">{currentPatient.height}cm</span>
              </div>
            </div>
            <button onClick={() => setIsEditing(true)} className="m3-button-tonal py-2 px-5 text-sm font-bold">Edit</button>
          </div>
          {currentPatient.location && (
             <div className="flex items-start gap-2 pt-2 text-[#44474E] border-t border-slate-100 pt-4">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <div className="text-sm">
                  <p className="font-bold">{currentPatient.location.street}</p>
                  <p className="text-xs">{currentPatient.location.bairro}, {currentPatient.location.distrito}</p>
                  <p className="text-xs uppercase font-black">{currentPatient.location.cidade}, {currentPatient.location.country}</p>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Editing Form */}
      {(isEditing) && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <h3 className="text-xl font-black px-1 text-[#001D36]">
              {currentPatient ? 'Update Information' : 'New Patient Profile'}
            </h3>
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0061A4] px-4 uppercase tracking-widest">{APP_STRINGS.PATIENT.FIELDS.NAME}</label>
              <input 
                type="text" 
                className="m3-input text-lg font-bold"
                style={whiteInputStyle}
                placeholder="e.g. Amina Nkosi"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            {/* Vital Info Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#0061A4] px-2 uppercase">{APP_STRINGS.PATIENT.FIELDS.AGE}</label>
                <input 
                  type="number" 
                  className="m3-input font-bold"
                  style={whiteInputStyle}
                  value={formData.age || ''}
                  onChange={e => setFormData({...formData, age: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#0061A4] px-2 uppercase">Height (cm)</label>
                <input 
                  type="number" 
                  className="m3-input font-bold text-center"
                  style={whiteInputStyle}
                  placeholder="cm"
                  value={formData.height || ''}
                  onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#0061A4] px-2 uppercase">Weight (kg)</label>
                <input 
                  type="number" 
                  className="m3-input font-bold text-center"
                  style={whiteInputStyle}
                  placeholder="kg"
                  value={formData.weight || ''}
                  onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            {/* Blood Type Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0061A4] px-4 uppercase tracking-widest">Blood Type</label>
              <div className="grid grid-cols-3 gap-2 px-2">
                {bloodTypes.map(bt => (
                  <button 
                    key={bt}
                    onClick={() => setFormData({...formData, bloodType: bt})}
                    className={`py-3 rounded-xl border-2 text-sm font-black transition-all ${formData.bloodType === bt ? 'bg-[#0061A4] border-[#0061A4] text-white shadow-md' : 'bg-white border-[#001D36] text-slate-700'}`}
                  >
                    {bt === 'Unknown' ? 'Not sure' : bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Biological Sex Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0061A4] px-4 uppercase tracking-widest">Biological Sex *</label>
              <div className="flex flex-col gap-2 px-2">
                {Object.values(Sex).map(s => (
                  <button 
                    key={s}
                    onClick={() => setFormData({...formData, sex: s})}
                    className={`w-full px-4 py-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${formData.sex === s ? 'bg-[#D1E4FF] border-[#0061A4] text-[#001D36] shadow-sm' : 'bg-white border-[#001D36] text-slate-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.sex === s ? 'border-[#0061A4]' : 'border-slate-300'}`}>
                      {formData.sex === s && <div className="w-3 h-3 bg-[#0061A4] rounded-full"></div>}
                    </div>
                    <span className="font-bold text-sm text-left leading-tight">{s}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pregnancy Option - Only for Female */}
            {formData.sex === Sex.FEMALE && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 px-2">
                 <div className="m3-card p-5 flex items-center justify-between border-[#001D36] border-2">
                    <div className="space-y-1">
                      <p className="font-black text-[#1B1B1F]">{APP_STRINGS.PATIENT.FIELDS.PREGNANCY}</p>
                      <p className="text-xs text-slate-500 font-medium italic">Pregnant or breastfeeding?</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-8 h-8 rounded-lg accent-[#0061A4] cursor-pointer"
                      checked={formData.isPregnantOrBreastfeeding || false}
                      onChange={e => setFormData({...formData, isPregnantOrBreastfeeding: e.target.checked})}
                    />
                 </div>
              </div>
            )}

            {/* Structured Address with Autocomplete */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#0061A4] px-4 uppercase tracking-widest">Address (Moçambique)</label>
              <div className="m3-card p-4 space-y-3 bg-[#F2F3F7]/50 border-[#001D36] border-2 relative">
                
                {/* Street Input with Suggestion Dropdown Attached */}
                <div className="relative">
                  <input 
                    type="text" 
                    className="m3-input py-3 text-sm font-bold"
                    style={whiteInputStyle}
                    placeholder="Street / Avenue"
                    value={formData.location?.street || ''}
                    onChange={e => updateLocation('street', e.target.value)}
                    onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                  />
                  {isFetchingSuggestions && (
                    <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-[#0061A4] border-t-transparent rounded-full animate-spin"></div>
                  )}

                  {/* Suggestions List - Fixed Position below this specific input */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[110%] z-[100] m3-card border-2 border-[#0061A4] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(s)}
                          className="w-full p-4 text-left border-b border-slate-100 last:border-0 hover:bg-blue-50 active:bg-blue-100 flex flex-col gap-0.5"
                        >
                          <span className="font-bold text-sm text-[#001D36]">{s.street}</span>
                          <span className="text-xs text-slate-500">{s.bairro}, {s.distrito}, {s.cidade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    className="m3-input py-3 text-sm font-bold"
                    style={whiteInputStyle}
                    placeholder="Bairro"
                    value={formData.location?.bairro || ''}
                    onChange={e => updateLocation('bairro', e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="m3-input py-3 text-sm font-bold"
                    style={whiteInputStyle}
                    placeholder="Distrito"
                    value={formData.location?.distrito || ''}
                    onChange={e => updateLocation('distrito', e.target.value)}
                  />
                </div>
                <input 
                  type="text" 
                  className="m3-input py-3 text-sm font-bold"
                  style={whiteInputStyle}
                  placeholder="Cidade / Província"
                  value={formData.location?.cidade || ''}
                  onChange={e => updateLocation('cidade', e.target.value)}
                />
                
                <div className="flex items-center justify-between px-2 pt-2 opacity-50">
                  <span className="text-xs font-black uppercase text-slate-500">Country</span>
                  <span className="text-sm font-black text-slate-800 tracking-wide">Moçambique</span>
                </div>
              </div>
            </div>

            {/* Conditions Chips */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0061A4] px-4 uppercase tracking-widest">{APP_STRINGS.PATIENT.FIELDS.CONDITIONS}</label>
              <div className="flex flex-wrap gap-2 px-2">
                {conditions.map(c => (
                  <button 
                    key={c}
                    onClick={() => {
                      const current = formData.knownConditions || [];
                      if (current.includes(c)) setFormData({...formData, knownConditions: current.filter(x => x !== c)});
                      else setFormData({...formData, knownConditions: [...current, c]});
                    }}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${formData.knownConditions?.includes(c) ? 'bg-[#0061A4] text-white border-transparent shadow-md' : 'bg-white border-[#001D36] text-slate-700'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 px-2">
            <button onClick={handleSave} className="m3-button-primary h-16 text-xl shadow-lg">
              {APP_STRINGS.COMMON.SAVE}
            </button>
            {currentPatient && (
              <button onClick={() => setIsEditing(false)} className="m3-button-secondary h-16">
                {APP_STRINGS.COMMON.CANCEL}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="text-center p-8 opacity-40">
        <p className="text-xs italic leading-relaxed text-[#1B1B1F]">
          {APP_STRINGS.COMMON.NOT_A_DIAGNOSIS}
        </p>
      </div>
    </div>
  );
};

export default PatientScreen;
