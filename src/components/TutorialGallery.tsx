
import React, { useState } from 'react';
import { TutorialLink } from '../types';
import { Youtube, ExternalLink, PlayCircle, Search, Loader2, Play } from 'lucide-react';

interface TutorialGalleryProps {
  tutorials: TutorialLink[];
  isLoading?: boolean;
  onSearch: (query: string) => void;
  defaultQuery?: string;
}

const TutorialGallery: React.FC<TutorialGalleryProps> = ({ tutorials, isLoading, onSearch, defaultQuery }) => {
  const [localQuery, setLocalQuery] = useState('');

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" /> UE5 Learning Center
          </h5>
        </div>

        <form onSubmit={handleManualSearch} className="relative group">
          <input 
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={defaultQuery ? `Search for ${defaultQuery}...` : "Search UE5 tutorials..."}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:text-slate-600 shadow-inner"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-white/5 animate-pulse">
              <div className="w-10 h-10 bg-slate-800 rounded-lg shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
           <PlayCircle className="w-10 h-10 text-slate-700 mx-auto mb-3 opacity-20" />
           <p className="text-xs text-slate-500 font-medium px-6">
             Enter a specific Unreal Engine 5 topic above to find the best community tutorials.
           </p>
           {defaultQuery && (
              <button 
                onClick={() => onSearch(defaultQuery)}
                className="mt-4 text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest border-b border-red-500/20 pb-0.5"
              >
                Find Recommended Guides
              </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tutorials.map((link, i) => (
            <a
              key={i}
              href={link.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-slate-900/60 border border-white/5 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-red-500/20 transition-all shadow-inner relative z-10">
                <Youtube className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              </div>
              
              <div className="flex-1 min-w-0 relative z-10">
                <div className="text-xs font-bold text-slate-200 line-clamp-2 group-hover:text-white leading-snug mb-1">{link.title}</div>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-950 px-1.5 py-0.5 rounded border border-white/5">{new URL(link.uri).hostname}</span>
                   <span className="text-[9px] text-red-400 font-bold opacity-0 group-hover:opacity-100 transition-all">Watch Now &rarr;</span>
                </div>
              </div>
              
              <ExternalLink className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
      
      {tutorials.length > 0 && (
        <p className="text-[9px] text-slate-600 italic px-1 font-medium">
          Note: These results are retrieved live from community educational resources.
        </p>
      )}
    </div>
  );
};

export default TutorialGallery;
