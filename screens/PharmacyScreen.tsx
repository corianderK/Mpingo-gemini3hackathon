
import React, { useState, useEffect } from 'react';
// Correct import from @google/genai
import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { APP_STRINGS } from '../constants';

interface PharmacyProps {
  language: Language;
}

const PharmacyScreen: React.FC<PharmacyProps> = ({ language }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const l = APP_STRINGS[language].LABELS;

  const getCoordinates = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    getCoordinates().then(setUserLocation).catch(console.error);
  }, []);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const coords = await getCoordinates();
      setUserLocation(coords);
      const defaultQuery = language === 'en' ? 'Pharmacies and hospitals near me' : 'Farmácias e hospitais perto de mim';
      setSearchQuery(defaultQuery);
      setTimeout(() => performSearch(defaultQuery, coords), 100);
    } catch (error) {
      console.error("Location access failed:", error);
      alert(language === 'en' ? "Please enable location services to use this feature." : "Por favor, ative os serviços de localização para usar este recurso.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    performSearch(searchQuery, userLocation);
  };

  const performSearch = async (query: string, location: { lat: number; lng: number } | null) => {
    setIsSearching(true);
    setAiResponse(null);
    setGroundingLinks([]);

    try {
      // Initialize GoogleGenAI with named parameter apiKey from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        // Maps grounding is only supported in Gemini 2.5 series models.
        model: "gemini-2.5-flash",
        contents: `Find pharmacies or medical facilities near my location for: ${query}. 
        Provide names, specific areas/bairros in Mozambique. 
        IMPORTANT: Your response MUST be EXACTLY 3 sentences long. 
        Respond in ${language === 'en' ? 'English' : 'Portuguese'}.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: location ? {
                latitude: location.lat,
                longitude: location.lng
              } : undefined
            }
          }
        },
      });

      // Directly access .text property from GenerateContentResponse
      setAiResponse(response.text || "");
      
      // Extract grounding links for UI display
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks
        .filter((chunk: any) => chunk.maps?.uri)
        .map((chunk: any) => {
          const title = chunk.maps.title || "";
          const isHospital = /hospital|clinic|centro de saude|health center/i.test(title);
          return {
            title,
            uri: chunk.maps.uri,
            type: isHospital ? 'hospital' : 'pharmacy'
          };
        });
      setGroundingLinks(links);

    } catch (error) {
      console.error("Pharmacy search failed:", error);
      setAiResponse(language === 'en' ? "Could not find real-time pharmacy data." : "Não foi possível encontrar dados da farmácia em tempo real.");
    } finally {
      setIsSearching(false);
    }
  };

  const mapEmbedUrl = userLocation 
    ? `https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=14&hl=${language}&output=embed`
    : `https://maps.google.com/maps?q=Mozambique&z=6&hl=${language}&output=embed`;

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="m3-card overflow-hidden aspect-square w-full shadow-lg border-2 border-white relative group">
        <iframe
          key={`${language}-${userLocation?.lat}-${userLocation?.lng}`}
          title="Pharmacy Map View"
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={mapEmbedUrl}
          allowFullScreen
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 border border-blue-100">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
            {language === 'en' ? 'Live Area View' : 'Visualização em Tempo Real'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleLocateMe}
          className={`h-16 w-16 flex items-center justify-center rounded-2xl shadow-md transition-all active:scale-90 ${isLocating ? 'bg-blue-100 text-blue-400' : 'bg-white text-blue-600 border border-slate-200'}`}
          title="Locate Me"
        >
          <svg className={`w-8 h-8 ${isLocating ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
            <path d="M12 8v8"/>
            <path d="M8 12h8"/>
          </svg>
        </button>
        <div className="relative flex-1">
          <input 
            type="text" 
            className="m3-input pr-14 h-16 text-lg font-bold shadow-md"
            placeholder={language === 'en' ? "Search medicine or area..." : "Procurar medicamento ou área..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            className="absolute right-2 top-2 w-12 h-12 bg-[#0061A4] text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-12 h-12 border-4 border-[#0061A4] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {language === 'en' ? 'Searching Google Maps...' : 'Pesquisando Google Maps...'}
            </p>
          </div>
        )}

        {aiResponse && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <div className="m3-card p-6 bg-white border-l-8 border-[#0061A4]">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{l.AI_INSIGHT}</span>
              </div>
              <p className="text-base font-bold text-slate-700 leading-relaxed italic">{aiResponse}</p>
            </div>

            {groundingLinks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{l.VERIFIED_LOCATIONS}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {groundingLinks.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="m3-card p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-2 border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.type === 'hospital' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {link.type === 'hospital' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49 0 2.5-1.01 2.5-2.5V10h-5v4h2.5z"/><path d="M5 14c-1.49 0-2.5-1.01-2.5-2.5V10h5v4H5z"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#001D36]">{link.title}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{link.type}</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13.5 10.5 21 3m0 0h-5.25M21 3v5.25M7.5 13.5 3 18m0 0h5.25M3 18v-5.25"></path></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyScreen;
