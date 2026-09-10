
import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, Sparkles, Loader2, ExternalLink, ArrowUpRight, Zap, Info, Package, DollarSign, Plus, Check, ShieldAlert, GitBranch, Terminal, Layout } from 'lucide-react';
import { MarketplaceSuggestion, ConflictAnalysis } from '../types';
import { searchMarketplace } from '../services/ai/client';
import { useGamePlan } from '../hooks/useGamePlan';

const MarketplaceScout: React.FC = () => {
    const { installedAssets, toggleAssetInstallation, performConflictAnalysis } = useGamePlan();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MarketplaceSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const assets = await searchMarketplace(query);
            setResults(assets);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        const result = await performConflictAnalysis();
        setAnalysis(result);
        setIsAnalyzing(false);
    };

    // Calculate Class Dependency Map
    const classMap = useMemo(() => {
        const map = new Map<string, string[]>();
        installedAssets.forEach(asset => {
            asset.technicalOverlaps?.forEach(cls => {
                if (!map.has(cls)) map.set(cls, []);
                map.get(cls)?.push(asset.name);
            });
        });
        return map;
    }, [installedAssets]);

    const conflictingClasses = useMemo(() => {
        return Array.from(classMap.entries()).filter(([_, assets]) => assets.length > 1);
    }, [classMap]);

    return (
        <div className="h-full flex overflow-hidden">
            {/* Left Column: Search & Discovery */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-slate-800">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-12">
                        <h1 className="text-4xl font-black text-white mb-3 tracking-tight flex items-center gap-4">
                            <ShoppingBag className="w-10 h-10 text-purple-500" /> Marketplace Scout
                        </h1>
                        <p className="text-slate-400 text-lg font-light leading-relaxed">
                            Discover assets on <span className="text-white font-bold">Fab.com</span> and map their dependencies in real-time.
                        </p>
                    </div>

                    <div className="glass-card p-1 rounded-2xl border border-slate-700/50 shadow-2xl mb-12 relative z-10">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input 
                                    type="text" 
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Try 'Advanced Inventory System' or 'Modular Gothic Environment'..."
                                    className="w-full bg-slate-900/60 pl-14 pr-6 py-5 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-slate-600"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading || !query.trim()}
                                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-10 py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                                Search Fab
                            </button>
                        </form>
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-6">
                            <Loader2 className="w-16 h-16 border-t-2 border-r-2 border-purple-500 rounded-full animate-spin" />
                            <p className="text-purple-400 font-mono text-xs tracking-[0.4em] uppercase">Connecting to Unified Marketplace...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            {results.map((asset, i) => {
                                const isInstalled = installedAssets.some(a => a.name === asset.name);
                                return (
                                    <div key={i} className={`glass-card rounded-2xl border transition-all overflow-hidden flex flex-col group ${isInstalled ? 'border-purple-500 bg-purple-500/5' : 'border-slate-700/50 hover:border-slate-500'}`}>
                                        <div className="bg-slate-900/80 p-5 border-b border-slate-800 flex items-start justify-between">
                                            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                <Package className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <button 
                                                onClick={() => toggleAssetInstallation(asset)}
                                                className={`p-2 rounded-lg transition-all ${isInstalled ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                                            >
                                                {isInstalled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="p-6 flex-1">
                                            <h3 className="text-lg font-black text-white mb-2 leading-tight">{asset.name}</h3>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">{asset.price}</span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{asset.category || 'Asset'}</span>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed font-light line-clamp-2 mb-4">"{asset.description}"</p>
                                            
                                            <div className="space-y-2">
                                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Tech Profile</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {asset.technicalOverlaps?.map((cls, idx) => (
                                                        <span key={idx} className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-white/5 text-slate-400">{cls}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <a href={asset.uri} target="_blank" rel="noopener noreferrer" className="block text-center py-3 bg-slate-900/50 border-t border-slate-800 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                                            View Details <ExternalLink className="inline w-2.5 h-2.5 ml-1" />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Dependency Map & Patching */}
            <div className="w-[450px] bg-slate-950/50 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="mb-8">
                    <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Dependency Map</h2>
                    <p className="text-xs text-slate-500">Conflict analysis for {installedAssets.length} project assets.</p>
                </div>

                {installedAssets.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 border border-dashed border-slate-800 rounded-2xl p-8">
                        <GitBranch className="w-12 h-12 mb-4" />
                        <p className="text-sm font-medium">Add assets from the marketplace to map dependencies.</p>
                    </div>
                ) : (
                    <div className="space-y-8 flex-1">
                        {/* Conflict Summary */}
                        <div className="glass-card p-6 rounded-2xl border border-slate-700/50 bg-slate-900/40">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                                Structural Analysis
                                {conflictingClasses.length > 0 && <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded animate-pulse"><ShieldAlert className="w-3 h-3" /> {conflictingClasses.length} OVERLAPS</span>}
                            </h3>

                            {conflictingClasses.length > 0 ? (
                                <div className="space-y-4 mb-8">
                                    {conflictingClasses.map(([cls, assets], i) => (
                                        <div key={i} className="bg-black/40 p-4 rounded-xl border border-red-500/20">
                                            <div className="text-[10px] font-mono text-red-400 mb-2 uppercase font-black tracking-widest">{cls} COLLISION</div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {assets.map((name, idx) => (
                                                    <span key={idx} className="text-[9px] font-bold bg-slate-800 text-white px-2 py-1 rounded shadow-sm">{name}</span>
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-slate-500 mt-2 italic leading-relaxed">Both assets override the {cls} logic. A manual merge or shim is required.</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center opacity-40">
                                    <Check className="w-8 h-8 text-emerald-500 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Architectural Integrity OK</p>
                                </div>
                            )}

                            <button 
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || installedAssets.length < 2}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                            >
                                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                                Analyze Neural Mesh
                            </button>
                        </div>

                        {/* Analysis & Patch Result */}
                        {analysis && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Zap className="w-3 h-3" /> Integration Summary
                                    </h4>
                                    <p className="text-xs text-slate-300 leading-relaxed font-light">"{analysis.summary}"</p>
                                </div>

                                <div className="glass-card p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                     <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <Terminal className="w-3 h-3" /> Compatibility Patch
                                        </h4>
                                        <span className="text-[9px] font-mono text-blue-300/60 bg-blue-900/40 px-2 py-0.5 rounded">NEW ASSET</span>
                                     </div>
                                     <div className="text-sm font-bold text-white mb-2">{analysis.recommendedPatchAsset}</div>
                                     <ul className="space-y-3">
                                        {analysis.patchSteps.map((step, i) => (
                                            <li key={i} className="text-[11px] text-slate-400 flex items-start gap-3 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-1.5 flex-shrink-0"></span>
                                                {step}
                                            </li>
                                        ))}
                                     </ul>
                                     <button className="w-full mt-8 py-3 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                         Initialize Patch Class
                                     </button>
                                </div>
                            </div>
                        )}

                        {/* List of "Installed" Assets */}
                        <div className="space-y-3 pb-12">
                             <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Layout className="w-3 h-3" /> Manifest
                             </div>
                             {installedAssets.map((asset, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-white/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded bg-purple-500/10 text-purple-400"><Package className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{asset.name}</span>
                                    </div>
                                    <button onClick={() => toggleAssetInstallation(asset)} className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketplaceScout;
