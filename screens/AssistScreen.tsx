
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Patient, RiskLevel, TriageResult } from '../types';
import { APP_STRINGS } from '../constants';
// Import GoogleGenAI and Type for real-time medical triage analysis
import { GoogleGenAI, Type } from "@google/genai";

interface AssistProps {
  currentPatient: Patient | null;
}

const AssistScreen: React.FC<AssistProps> = ({ currentPatient }) => {
  const location = useLocation();
  const [draft, setDraft] = useState(location.state?.draft || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    if (location.state?.draft) setDraft(location.state.draft);
  }, [location.state]);

  // Use Gemini 3 Pro to analyze patient symptoms and provide structured triage results
  const handleRunTriage = async () => {
    if (!draft || !currentPatient) return;
    setIsLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Patient Profile:
          Name: ${currentPatient.fullName}
          Age: ${currentPatient.age}
          Sex: ${currentPatient.sex}
          Known Conditions: ${currentPatient.knownConditions.join(', ') || 'None'}
          
          Symptoms:
          ${draft}`,
        config: {
          systemInstruction: "You are an expert medical triage assistant. Analyze the symptoms provided and the patient's history. Determine the risk level and provide a structured assessment. Be conservative with risk levels. If symptoms sound life-threatening, use 'HIGH RISK / EMERGENCY'. Return response in JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { 
                type: Type.STRING, 
                description: "Must be exactly one of: LOW RISK, MODERATE RISK, HIGH RISK / EMERGENCY" 
              },
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
    } catch (error) {
      console.error("Triage analysis failed:", error);
      alert("Failed to analyze health risk. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: RiskLevel | string) => {
    const l = level.toString().toUpperCase();
    if (l.includes('HIGH') || l.includes('EMERGENCY')) return 'bg-red-600 text-white';
    if (l.includes('MODERATE') || l.includes('YELLOW')) return 'bg-yellow-400 text-yellow-950';
    if (l.includes('LOW') || l.includes('GREEN')) return 'bg-emerald-500 text-white';
    return 'bg-slate-200';
  };

  if (!currentPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-6">
        <h2 className="text-xl font-bold">Please select a patient first.</h2>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Input Card */}
      <div className="m3-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-600">Assessing: {currentPatient.fullName}</h3>
          <span className="text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-700">{currentPatient.age}y / {currentPatient.sex}</span>
        </div>
        
        <div className="space-y-2">
          <textarea
            className="m3-input h-32 text-lg"
            placeholder="What is the patient experiencing today?"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
        </div>

        <button 
          onClick={handleRunTriage}
          disabled={!draft || isLoading}
          className={`m3-button-primary w-full ${(!draft || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {APP_STRINGS.ASSIST.ANALYZING}
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.81 8.64 12 2l2.19 6.64L21 9.75l-6.81 1.11L12 17.5l-2.19-6.64L3 9.75l6.81-1.11Z"/><path d="m15.31 19.14 1.19-3.64 1.19 3.64L21 20l-3.31.86L16.5 24.5l-1.19-3.64L12 20l3.31-.86Z"/></svg>
              {APP_STRINGS.ASSIST.RUN}
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {result && !isLoading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`rounded-3xl p-6 shadow-md ${getRiskColor(result.riskLevel)}`}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Assessment Result</p>
            <h2 className="text-3xl font-black mt-1">{result.riskLevel}</h2>
            <p className="mt-4 text-lg font-medium leading-tight">{result.reason}</p>
          </div>

          <div className="m3-card p-6 space-y-6">
            <section className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-[#001D36]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Crucial Questions
              </h4>
              <ul className="space-y-3">
                {result.topQuestions.map((q, i) => (
                  <li key={i} className="p-3 bg-slate-50 rounded-xl border text-sm leading-snug">{q}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-[#001D36]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Next Steps
              </h4>
              <div className="space-y-2">
                {result.nextActions.map((action, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-black mt-1">{action.urgency}</span>
                    <p className="text-sm font-medium">{action.details}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-[#001D36]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-1.503 1.463l-2.812.603a2 2 0 01-1.637-1.123L5.61 14.823a2 2 0 01.537-2.31l2.408-2.022a2 2 0 00.547-1.022l.477-2.387a2 2 0 00-1.414-1.96L4.864 4.414a2 2 0 01-1.463-1.503l-.603-2.812A2 2 0 013.921 1.462l6.095 1.44a2 2 0 011.604 1.135l1.196 3.193a2 2 0 00.51 1.054l2.4 2.4a2 2 0 001.054.51l3.193 1.196a2 2 0 011.135 1.604l1.44 6.095a2 2 0 01-1.462 2.463l-2.812.603a2 2 0 01-2.463-1.462l-.603-2.812z"></path></svg>
                Seek Help Immediately If:
              </h4>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800 font-medium">
                  {result.whenToSeekCare.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 pt-4">
             {getRiskColor(result.riskLevel).includes('red') && (
               <button onClick={() => setShowEmergency(true)} className="bg-red-600 text-white rounded-full py-6 text-xl font-black shadow-xl animate-pulse">
                 CALL EMERGENCY NOW
               </button>
             )}
             <button className="m3-button-secondary">Save Summary</button>
          </div>
        </div>
      )}

      {/* Guidance Text */}
      {!result && !isLoading && (
        <div className="p-10 text-center opacity-60">
           <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <p className="text-lg">Enter details about the current symptoms above to start a risk assessment.</p>
        </div>
      )}

      {/* Emergency Sheet Simulation */}
      {showEmergency && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-16 h-1 bg-slate-200 mx-auto rounded-full"></div>
            <div className="space-y-2 text-center">
              <h3 className="text-2xl font-black text-red-600">{APP_STRINGS.ASSIST.EMERGENCY_SCRIPT_TITLE}</h3>
              <p className="text-slate-500 font-medium">Read this clearly to the operator</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-lg italic leading-relaxed">
              {/* Fixed TypeScript error by converting PatientLocation object to a string before replacement */}
              "{APP_STRINGS.ASSIST.EMERGENCY_SCRIPT
                .replace('[NAME]', currentPatient.fullName)
                .replace('[AGE]', currentPatient.age.toString())
                .replace('[SYMPTOMS]', draft || 'severe health complications')
                .replace('[LOCATION]', currentPatient.location ? `${currentPatient.location.street}, ${currentPatient.location.bairro}, ${currentPatient.location.cidade}` : 'our current location')}"
            </div>
            <div className="flex flex-col gap-3">
              <button className="bg-red-600 text-white py-4 rounded-full text-xl font-bold">Call Now</button>
              <button onClick={() => setShowEmergency(false)} className="py-4 text-slate-500 font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistScreen;
