
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// Import GoogleGenAI for processing uploaded medical images
import { GoogleGenAI } from "@google/genai";

const ArchiveScreen: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Gemini 3 Flash to extract medical data from document photos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setOcrResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
              {
                text: "Extract information from this medical document. Provide a summary including patient name, date, type of document, and key medical findings or prescriptions.",
              },
            ],
          },
        });

        setOcrResult(response.text || "No information could be extracted.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("OCR extraction failed:", error);
      alert("Failed to extract data. Please ensure the photo is clear.");
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/record')} className="p-2 bg-slate-200 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <h2 className="text-xl font-bold">Document Archive</h2>
      </div>

      <div className="m3-card border-dashed border-2 border-slate-300 p-10 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div>
          <h3 className="font-bold">Upload Photo or PDF</h3>
          <p className="text-sm text-slate-500">Receipts, Lab Reports, Prescriptions</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={handleFileChange} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="m3-button-primary px-10"
        >
          Select File
        </button>
      </div>

      {isUploading && (
        <div className="flex flex-col items-center gap-2 text-[#0061A4]">
          <div className="w-8 h-8 border-4 border-[#0061A4] border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold">Gemini is extracting data...</span>
        </div>
      )}

      {ocrResult && (
        <div className="m3-card p-6 space-y-4 bg-white border-l-4 border-blue-500">
          <h3 className="font-bold text-blue-800 uppercase text-xs tracking-widest">OCR Extraction Result</h3>
          <pre className="text-sm whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded-lg border">
            {ocrResult}
          </pre>
          <div className="flex gap-2">
            <button onClick={() => { alert("Saved to timeline"); navigate('/record'); }} className="m3-button-primary flex-1 py-3 text-sm">Save to Timeline</button>
            <button onClick={() => setOcrResult(null)} className="m3-button-secondary px-6 py-3 text-sm">Discard</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold">Recent Documents</h3>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="m3-card p-2 space-y-2">
              <div className="aspect-square bg-slate-200 rounded-xl overflow-hidden">
                <img src={`https://picsum.photos/200?sig=${i}`} alt="Doc" className="w-full h-full object-cover opacity-50" />
              </div>
              <p className="text-xs font-bold truncate">Lab Report {i}</p>
              <p className="text-[10px] text-slate-400">Oct {10+i}, 2024</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArchiveScreen;
