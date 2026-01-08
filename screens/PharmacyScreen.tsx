
import React, { useState } from 'react';

const PharmacyScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const mockPharmacies = [
    { name: 'City Central Pharmacy', distance: '1.2 km', address: '45 Hospital Road', open: true },
    { name: 'Sector 4 Community Chemist', distance: '2.5 km', address: 'West Village Market', open: true },
    { name: 'Good Life Meds', distance: '3.8 km', address: 'Old Town Square', open: false },
    { name: 'Sunshine Pharmacy', distance: '4.1 km', address: 'North Bypass', open: true }
  ];

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setResults(mockPharmacies);
    }, 1200);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <input 
            type="text" 
            className="m3-input pr-12"
            placeholder="Search medicine or supplies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={handleSearch}
            className="absolute right-2 top-2 p-3 text-[#0061A4]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
        
        <div className="m3-card p-4 flex items-center justify-between bg-blue-50 border-blue-100">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 rounded-full text-blue-700">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>
             <div>
               <p className="text-xs font-bold text-blue-800 uppercase">Current Location</p>
               <p className="text-sm font-medium">Sector 4, West Village</p>
             </div>
          </div>
          <button className="text-blue-700 font-bold text-xs">Update</button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Pharmacies Nearby</h3>
        
        {isSearching && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#0061A4] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!isSearching && results.length === 0 && (
          <div className="text-center py-10 opacity-60">
             <p>No pharmacies found nearby. Try searching for a specific item.</p>
          </div>
        )}

        {!isSearching && results.map((p, i) => (
          <div key={i} className="m3-card p-4 flex justify-between items-center group active:bg-slate-50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold">{p.name}</h4>
                <span className={`w-2 h-2 rounded-full ${p.open ? 'bg-green-500' : 'bg-red-400'}`}></span>
              </div>
              <p className="text-sm text-slate-500">{p.distance} • {p.address}</p>
              {!p.open && <p className="text-[10px] text-red-500 font-bold">CLOSED UNTIL 08:00 AM</p>}
            </div>
            <button 
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=pharmacy+${p.address}`, '_blank')}
              className="m3-button-tonal p-3 rounded-2xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyScreen;
