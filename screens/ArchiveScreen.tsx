import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { Patient, MedicalRecord, OperatorRole, RecordAttachment, Language } from '../types';
import { APP_STRINGS } from '../constants';

interface ArchiveProps {
  currentPatient: Patient | null;
  medicalRecords: MedicalRecord[];
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
  language: Language;
}

type CameraMode = 'photo' | 'video' | 'voice' | 'idle';

const ArchiveScreen: React.FC<ArchiveProps> = ({ currentPatient, medicalRecords, setMedicalRecords, language }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [extractedDate, setExtractedDate] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<{name: string, type: string, data: string} | null>(null);
  
  const [cameraMode, setCameraMode] = useState<CameraMode>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const s = APP_STRINGS[language].RECORD;
  const common = APP_STRINGS[language].COMMON;
  const l = APP_STRINGS[language].LABELS;

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const initDevice = async () => {
      if (cameraMode === 'idle') return;
      try {
        setIsVideoReady(false);
        setRecordingTime(0);
        const constraints = {
          video: cameraMode === 'voice' ? false : { facingMode: { ideal: 'environment' } },
          audio: true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        streamRef.current = stream;
        
        if (videoRef.current && (cameraMode === 'photo' || cameraMode === 'video')) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play().then(() => setIsVideoReady(true));
        } else if (cameraMode === 'voice') {
          setIsVideoReady(true);
        }
      } catch (err) {
        console.error("Device init error:", err);
        setCameraMode('idle');
      }
    };
    initDevice();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cameraMode]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = cameraMode === 'video' ? 'video/webm' : 'audio/webm';
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        processCapture(base64, mimeType, cameraMode === 'video' ? 'video.webm' : 'voice.webm');
      };
      reader.readAsDataURL(blob);
      stopCapture();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecordingAction = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopCapture = () => {
    setCameraMode('idle');
    setIsVideoReady(false);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isGeminiSupportedMime = (mime: string) => {
    const supported = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'application/pdf',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
    ];
    return supported.includes(mime) || mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/');
  };

  const processCapture = async (base64Full: string, type: string, name: string) => {
    setIsProcessing(true);
    setCurrentFile({ name, type, data: base64Full });
    setOcrResult(null);

    try {
      const base64Data = base64Full.split(',')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let parts: any[] = [];
      const isTextFile = type === 'application/json' || type === 'text/csv' || type === 'text/plain';
      const isWordExcel = type.includes('msword') || type.includes('wordprocessingml') || type.includes('excel') || type.includes('spreadsheetml');

      if (isTextFile) {
        // Decode base64 to text for JSON/CSV/TXT so AI can read it as a string
        const decodedText = atob(base64Data);
        parts = [{ text: `Clinical data from file "${name}" (${type}):\n\n${decodedText}\n\nSummarize the medical findings and endemic risks.` }];
      } else if (isGeminiSupportedMime(type)) {
        // Standard multimodal handling (Image, PDF, Audio, Video)
        const promptText = type.startsWith('image/') 
          ? `Extract clinical data into JSON: { "summary": "markdown string", "documentDate": "YYYY-MM-DD" }. Respond in ${language === 'en' ? 'English' : 'Portuguese'}.`
          : `Analyze this clinical file (${name}). Summarize findings and endemic risks. Respond in ${language === 'en' ? 'English' : 'Portuguese'}.`;
        
        parts = [
          { inlineData: { mimeType: type, data: base64Data } },
          { text: promptText }
        ];
      } else if (isWordExcel) {
        // Fallback for Word/Excel which cannot be sent as inlineData
        parts = [{ text: `The user has uploaded a clinical document named "${name}" (${type}). Since this is a binary document format, please provide a general note that the file is attached and suggest that the clinician reviews it manually for detailed classification accuracy tests.` }];
      } else {
        parts = [{ text: `Uploaded file: ${name}. Summarize context based on filename.` }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: type.startsWith('image/') ? { responseMimeType: "application/json" } : undefined
      });

      if (type.startsWith('image/')) {
        try {
          const data = JSON.parse(response.text || '{}');
          setOcrResult(data.summary);
          setExtractedDate(data.documentDate);
        } catch {
          setOcrResult(response.text);
        }
      } else {
        setOcrResult(response.text);
      }
    } catch (e) {
      console.error("AI analysis error:", e);
      setOcrResult(language === 'en' 
        ? "File attached successfully. AI automated analysis is currently unavailable for this binary format." 
        : "Arquivo anexado com sucesso. A análise automatizada por IA não está disponível no momento para este formato binário.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToTimeline = () => {
    if (!currentPatient || !currentFile) return;
    const newRecord: MedicalRecord = {
      id: `doc-${Date.now()}`,
      patientId: currentPatient.id,
      operatorRole: OperatorRole.CLINICIAN,
      timestamp: Date.now(),
      documentDate: extractedDate ? Date.parse(extractedDate) : Date.now(),
      content: ocrResult || "Clinical file attached.",
      attachments: [{
        id: `att-${Date.now()}`,
        name: currentFile.name,
        mimeType: currentFile.type,
        data: currentFile.data
      }]
    };
    setMedicalRecords(prev => [newRecord, ...prev]);
    navigate('/record');
  };

  const getFileTag = (type: string) => {
    if (type.includes('json')) return 'JSON';
    if (type.includes('csv')) return 'CSV';
    if (type.includes('excel') || type.includes('spreadsheetml')) return 'XLS';
    if (type.includes('msword') || type.includes('wordprocessingml')) return 'DOC';
    if (type.includes('pdf')) return 'PDF';
    return 'DATA';
  };

  return (
    <div className="p-4 space-y-8 pb-32 h-full relative overflow-y-auto scrollbar-hide">
      {cameraMode !== 'idle' && (
        <div className="fixed inset-0 bg-[#001D36] z-[100] flex flex-col items-center justify-between overflow-hidden">
          <div className="w-full flex justify-between p-6 z-10 bg-gradient-to-b from-black/40 to-transparent">
             <button onClick={stopCapture} className="text-white p-3 bg-white/10 backdrop-blur-md rounded-full active:scale-90 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>
             {isRecording && (
                <div className="flex items-center gap-3 px-4 py-1.5 bg-red-600 rounded-full animate-pulse shadow-lg">
                   <div className="w-2 h-2 bg-white rounded-full" />
                   <span className="text-white font-black text-sm font-mono tracking-widest">{formatTime(recordingTime)}</span>
                </div>
             )}
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center relative px-6">
             {cameraMode === 'voice' ? (
                <div className="flex flex-col items-center gap-12 w-full animate-in zoom-in-95 duration-500">
                   <div className="relative flex items-center justify-center">
                      <div className={`absolute w-64 h-64 bg-purple-500/20 rounded-full ${isRecording ? 'animate-ping' : ''}`} />
                      <div className={`absolute w-48 h-48 bg-purple-500/30 rounded-full ${isRecording ? 'animate-pulse' : ''}`} />
                      <div className="w-32 h-32 bg-purple-600 rounded-[40px] flex items-center justify-center shadow-2xl z-10 border-4 border-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                      </div>
                   </div>
                   <div className="text-center space-y-2">
                      <h4 className="text-white text-2xl font-black uppercase tracking-widest">{isRecording ? l.RECORDING : l.READY}</h4>
                      <p className="text-purple-300 font-bold text-sm">{language === 'en' ? 'Speak clearly for better transcription' : 'Fale claramente para melhor transcrição'}</p>
                   </div>
                </div>
             ) : (
                <div className="w-full h-full absolute inset-0 bg-black">
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
             )}
          </div>

          <div className="w-full p-12 flex justify-center items-center z-10 bg-gradient-to-t from-black/40 to-transparent">
             {cameraMode === 'photo' && isVideoReady && (
               <button 
                 onClick={() => {
                   const canvas = document.createElement('canvas');
                   canvas.width = videoRef.current!.videoWidth;
                   canvas.height = videoRef.current!.videoHeight;
                   canvas.getContext('2d')?.drawImage(videoRef.current!, 0, 0);
                   processCapture(canvas.toDataURL('image/jpeg'), 'image/jpeg', 'photo.jpg');
                   stopCapture();
                 }}
                 className="w-20 h-20 bg-white rounded-full border-8 border-white/30 shadow-2xl active:scale-90 transition-transform"
               />
             )}

             {(cameraMode === 'video' || cameraMode === 'voice') && isVideoReady && (
                <button 
                  onClick={isRecording ? stopRecordingAction : startRecording}
                  className={`w-20 h-20 rounded-full border-8 shadow-2xl active:scale-90 transition-all flex items-center justify-center ${
                    isRecording 
                      ? 'bg-red-600 border-red-200' 
                      : cameraMode === 'voice' ? 'bg-purple-600 border-purple-200' : 'bg-red-600 border-red-200'
                  }`}
                >
                  {isRecording ? (
                    <div className="w-8 h-8 bg-white rounded-sm" />
                  ) : (
                    <div className={`w-8 h-8 bg-white rounded-full`} />
                  )}
                </button>
             )}
          </div>
        </div>
      )}

      {!currentFile && !isProcessing && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#001D36] tracking-tight">{s.CAPTURE_TITLE}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {s.CAPTURE_DESC} {currentPatient?.fullName}
            </p>
          </div>

          <div className="m3-card p-4 bg-blue-50/50 border-blue-100 flex gap-3 items-center">
             <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
               <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <p className="text-[10px] font-black text-blue-800 tracking-tight leading-tight uppercase italic">
               {s.SUPPORTED_FORMATS}
             </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setCameraMode('photo')} className="m3-card p-6 flex flex-col items-center justify-center gap-4 active:bg-blue-50 transition-colors group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </div>
              <span className="font-black text-xs uppercase text-[#001D36] tracking-widest">{s.TAKE_PHOTO}</span>
            </button>

            <button onClick={() => setCameraMode('video')} className="m3-card p-6 flex flex-col items-center justify-center gap-4 active:bg-rose-50 transition-colors group">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              </div>
              <span className="font-black text-xs uppercase text-[#001D36] tracking-widest">{s.RECORD_VIDEO}</span>
            </button>

            <button onClick={() => setCameraMode('voice')} className="m3-card p-6 flex flex-col items-center justify-center gap-4 active:bg-purple-50 transition-colors group">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 116 0v6a3 3 0 0 0-3 3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              </div>
              <span className="font-black text-xs uppercase text-[#001D36] tracking-widest">{s.VOICE_NOTE}</span>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="m3-card p-6 flex flex-col items-center justify-center gap-4 active:bg-amber-50 transition-colors group">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <span className="font-black text-xs uppercase text-[#001D36] tracking-widest">{s.UPLOAD_FILE}</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*,application/pdf,application/json,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onloadend = () => processCapture(reader.result as string, file.type || 'application/octet-stream', file.name);
                   reader.readAsDataURL(file);
                 }
              }} />
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-40 gap-8 animate-in fade-in">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-blue-100 rounded-full" />
            <div className="absolute inset-0 w-24 h-24 border-t-8 border-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-4 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="font-black uppercase text-sm tracking-[0.2em] text-blue-800">{common.PROCESSING}</p>
            <p className="text-xs font-bold text-slate-400 tracking-tight">{l.AI_ANALYZING}</p>
          </div>
        </div>
      )}

      {currentFile && !isProcessing && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="m3-card overflow-hidden bg-white shadow-2xl border-2 border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l.AI_TRANSCRIPTION}</span>
                <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase">{getFileTag(currentFile.type)}</span>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            
            <textarea 
              className="w-full h-48 bg-slate-50 rounded-2xl p-4 text-base font-bold text-slate-700 italic outline-none focus:ring-2 focus:ring-blue-100 border-2 border-transparent transition-all"
              value={ocrResult || ''}
              onChange={(e) => setOcrResult(e.target.value)}
              placeholder="..."
            />
            
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-[9px] font-black text-blue-700 uppercase text-center italic leading-tight">
                {common.TRANSCRIPTION_TIP}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <button onClick={handleSaveToTimeline} className="m3-button-primary h-20 shadow-xl !bg-[#001D36] !rounded-3xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
               {common.SAVING_TIMELINE}
             </button>
             <button onClick={() => {setCurrentFile(null); setOcrResult(null);}} className="m3-button-tonal h-16 border-2 border-slate-200 !rounded-3xl text-slate-500">
               {common.DISCARD}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveScreen;