
import React, { useState, useMemo, useEffect } from 'react';
import { UserInput, ExperienceLevel, UETemplate, MarketAsset, DriveSyncStatus, AssetCompatibilityReport } from '../types';
import { Wand2, MonitorPlay, Gamepad2, Users, LayoutTemplate, BoxSelect, CheckCircle2, Sparkles, Loader2, Cpu, Palette, Sun, ChevronDown, Layers, Globe, Network, Settings2, Info, BrainCircuit, HardDrive, FolderOpen, Unlink, Check, MapPin, ExternalLink, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { enhanceGameConcept, analyzeProjectConcept, generateAssetCompatibilityAudit } from '../services/ai/client';
import { driveClient } from '../services/driveClient';

interface InputFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
  driveStatus: DriveSyncStatus;
  drivePath: string | null;
  onLinkDrive: () => void;
  onUnlinkDrive: () => void;
  onSwitchToGdd?: () => void;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading, driveStatus, drivePath, onLinkDrive, onUnlinkDrive, onSwitchToGdd }) => {
  const [idea, setIdea] = useState('');
  const [level, setLevel] = useState<ExperienceLevel>(ExperienceLevel.Beginner);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action']);
  const [platforms, setPlatforms] = useState<string[]>(['PC']);
  const [mechanics, setMechanics] = useState<string[]>([]);
  const [artStyle, setArtStyle] = useState('Photorealistic');
  const [lightingMethod, setLightingMethod] = useState('Lumen');
  const [ueVersion, setUeVersion] = useState('5.4');
  const [inputSystem, setInputSystem] = useState<'Enhanced Input' | 'Legacy Input'>('Enhanced Input');
  const [networking, setNetworking] = useState<'Single Player' | 'Listen Server (Co-op)' | 'Dedicated Server'>('Single Player');
  const [teamSize, setTeamSize] = useState(1);
  const [template, setTemplate] = useState<UETemplate>('Third Person');
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [autoFillTriggered, setAutoFillTriggered] = useState(false);
  const [compReport, setCompReport] = useState<AssetCompatibilityReport | null>(null);

  const isRestrictedEnvironment = driveClient.isIframe();

  // Constants
  const genres = ['Action', 'RPG', 'Horror', 'Simulation', 'Puzzle', 'Strategy', 'Platformer', 'Racing', 'FPS', 'TPS', 'Survival', 'Open World', 'Stealth', 'Fighting', 'Sports', 'Sandbox', 'MOBA', 'Rogue-like'];
  const platformOptions = ['PC', 'PS5', 'Xbox Series X', 'Nintendo Switch', 'Android', 'iOS', 'VR/Meta Quest', 'Apple Vision Pro'];
  const mechanicOptions = ['Inventory', 'Skill Tree', 'Crafting', 'Quest System', 'Melee Combat', 'Ranged Combat', 'Stealth', 'Building System', 'Dialogue System', 'Day/Night Cycle', 'Vehicle Physics', 'AI Companions', 'Boss AI', 'Procedural Generation', 'Climbing/Parkour', 'Swimming', 'Flight Mechanics'];
  const artStyles = ['Photorealistic', 'Stylized (Hand Painted)', 'Stylized (Cel Shaded)', 'Low Poly', 'Retro/Pixel Art', 'Noir / High Contrast', 'Voxel', 'Cyberpunk'];
  const lightingMethods = ['Lumen (Dynamic)', 'Baked (Static)', 'Path Tracing', 'Ray Tracing (Hardware)', 'Unlit (Performance)'];
  const ueVersions = ['5.3', '5.4', '5.5', '5.6', '5.7 (Edge)', '6.0 (UE6 Next-Gen)'];
  
  const templates: UETemplate[] = ['None', 'Third Person', 'First Person', 'Top Down', 'Vehicle', 'Virtual Reality'];
  const availableAssets: MarketAsset[] = [
    'ALS V4 (Advanced Locomotion)', 
    'Game Animation Sample (GASP)', 
    'Lyra Starter Game',
    'Gameplay Ability System (GAS)',
    'Common UI Plugin', 
    'PCG Framework',
    'Ultra Dynamic Sky',
    'Electronic Nodes',
    'FluidNinja',
    'Motion Warping',
    'Control Rig',
    'Water System',
    'Landmass Plugin'
  ];

  const levels = [
    { value: ExperienceLevel.Beginner, label: 'Beginner', desc: 'BP Only, Epic Defaults', color: 'text-green-400' },
    { value: ExperienceLevel.Intermediate, label: 'Intermediate', desc: 'C++/BP Mix, Optimization', color: 'text-blue-400' },
    { value: ExperienceLevel.Expert, label: 'Expert', desc: 'GAS, Shaders, Network Arch', color: 'text-purple-400' },
  ];

  // Auto-run compatibility audit when parameters change
  useEffect(() => {
    if (assets.length > 0) {
        handleRunAudit();
    } else {
        setCompReport(null);
    }
  }, [assets, ueVersion, template]);

  const handleRunAudit = async () => {
    if (assets.length === 0) return;
    setIsAuditing(true);
    try {
        const report = await generateAssetCompatibilityAudit(assets, ueVersion, template);
        setCompReport(report);
    } catch (e) {
        console.error("Audit failed", e);
    } finally {
        setIsAuditing(false);
    }
  };

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank');
  };

  const handleAutoConfigure = async () => {
    if (idea.split(' ').length < 5) return;
    setIsAnalyzing(true);
    setAutoFillTriggered(true);
    try {
        const allowedLists = {
            genres, platforms: platformOptions, mechanics: mechanicOptions, 
            artStyles, lightingMethods, ueVersions, templates, assets: availableAssets
        };
        const config = await analyzeProjectConcept(idea, allowedLists);
        if (config.genres) setSelectedGenres(config.genres.filter((g: string) => genres.includes(g)).slice(0, 5));
        if (config.platforms) setPlatforms(config.platforms.filter((p: string) => platformOptions.includes(p)));
        if (config.mechanics) setMechanics(config.mechanics.filter((m: string) => mechanicOptions.includes(m)));
        if (config.artStyle && artStyles.includes(config.artStyle)) setArtStyle(config.artStyle);
        if (config.lightingMethod && lightingMethods.includes(config.lightingMethod)) setLightingMethod(config.lightingMethod);
        if (config.ueVersion && ueVersions.includes(config.ueVersion)) setUeVersion(config.ueVersion);
        if (config.template && templates.includes(config.template as any)) setTemplate(config.template as any);
        if (config.assets) setAssets(config.assets.filter((a: any) => availableAssets.includes(a)));
        if (config.teamSize) setTeamSize(Math.max(1, config.teamSize));
        if (config.inputSystem) setInputSystem(config.inputSystem as any);
        if (config.networking) setNetworking(config.networking as any);
    } catch (e) {
        console.error("Auto-config error:", e);
    } finally {
        setIsAnalyzing(false);
        setTimeout(() => setAutoFillTriggered(false), 2000);
    }
  };

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(g)) return prev.filter(x => x !== g);
      if (prev.length >= 5) return prev;
      return [...prev, g];
    });
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleMechanic = (m: string) => {
    setMechanics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleAsset = (fw: MarketAsset) => {
    setAssets(prev => prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]);
  };

  const handleEnhance = async () => {
    if (idea.split(' ').length < 5) return;
    setIsEnhancing(true);
    try {
        const enhanced = await enhanceGameConcept(idea);
        setIdea(enhanced);
    } catch (e) {
        console.error(e);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    onSubmit({ 
      gameIdea: idea, 
      level, 
      genres: selectedGenres, 
      platforms, 
      mechanics,
      artStyle,
      lightingMethod,
      ueVersion,
      inputSystem,
      networking,
      teamSize,
      template,
      assets
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80"></div>
      
      {onSwitchToGdd && (
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-cyan-950/60 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Have a Game Design Document (GDD)?
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">Agentic AI</span>
              </div>
              <p className="text-[11px] text-slate-400">Upload PDF, DOCX, or text — our autonomous multi-agent pipeline extracts mechanics, blueprints, quests, and builds your project automatically.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToGdd}
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Upload GDD Instead</span>
            <span>→</span>
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <h2 className="text-4xl font-black flex items-center gap-5 text-white tracking-tight">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-2xl shadow-xl border border-white/10 ring-4 ring-blue-500/10">
             <Settings2 className="w-8 h-8 text-white" />
          </div>
          Architectural Blueprint
        </h2>
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/60 rounded-xl border border-white/5">
            <Cpu className="w-4 h-4 text-blue-400" />
            <div className="text-left">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Target Version</div>
                <select 
                    value={ueVersion} 
                    onChange={(e) => setUeVersion(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-200 focus:outline-none cursor-pointer"
                >
                    {ueVersions.map(v => <option key={v} value={v} className="bg-slate-900">{v}</option>)}
                </select>
            </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-12">
        
        {/* Project Destination Section */}
        <div className={`p-8 rounded-3xl border transition-all duration-700 shadow-xl ${isRestrictedEnvironment ? 'bg-amber-500/5 border-amber-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className={`p-5 rounded-2xl transition-all duration-500 ${
                        driveStatus === DriveSyncStatus.Linked ? 'bg-emerald-500/10 border-emerald-500/30' : 
                        isRestrictedEnvironment ? 'bg-amber-500/10 border-amber-500/30' : 
                        'bg-blue-500/10 border-blue-500/30'
                    }`}>
                        {isRestrictedEnvironment && driveStatus !== DriveSyncStatus.Linked ? (
                             <ShieldAlert className="w-10 h-10 text-amber-400" />
                        ) : (
                             <MapPin className={`w-10 h-10 ${driveStatus === DriveSyncStatus.Linked ? 'text-emerald-400' : 'text-blue-400'}`} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                           Project Destination
                           {driveStatus === DriveSyncStatus.Linked && <div className="px-2 py-0.5 rounded text-[10px] bg-emerald-500 text-white animate-pulse">PATH CONFIGURED</div>}
                        </h3>
                        {isRestrictedEnvironment && driveStatus !== DriveSyncStatus.Linked ? (
                            <p className="text-amber-300/80 text-sm font-light max-w-md leading-relaxed mt-1">
                                Drive access is restricted in the current preview frame. Open the app in a new tab to enable local file syncing.
                            </p>
                        ) : (
                            <p className="text-slate-400 text-sm font-light max-w-md leading-relaxed mt-1">
                                Choose where to save your Unreal Engine project files. This will automatically sync your AI-generated roadmap, C++ code, and assets.
                            </p>
                        )}
                    </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                    {driveStatus === DriveSyncStatus.Linked ? (
                        <div className="flex flex-col items-end gap-3">
                            <div className="bg-slate-900/80 px-5 py-3 rounded-xl border border-emerald-500/30 flex items-center gap-4 group">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Drive</div>
                                    <div className="text-xs font-mono font-bold text-emerald-400 truncate max-w-[180px]">{drivePath}</div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={onUnlinkDrive}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-500 hover:text-red-400"
                                    title="Change Location"
                                >
                                    <Unlink className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : isRestrictedEnvironment ? (
                        <button
                            type="button"
                            onClick={handleOpenStandalone}
                            className="w-full md:w-auto px-10 py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-3 active:scale-95"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Open Standalone App
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onLinkDrive}
                            className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-95"
                        >
                            {driveStatus === DriveSyncStatus.Syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                            {driveStatus === DriveSyncStatus.Syncing ? 'Accessing Drive...' : 'Choose Save Location'}
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Concept Input */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 ml-1 tracking-[0.2em] uppercase flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-yellow-400" /> Core Vision & High Concept
          </label>
          <div className="relative group/input">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="E.g., A first-person survival horror set in a deep-sea research facility..."
              className="w-full h-44 px-6 py-6 input-premium rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none transition-all resize-none font-light text-xl pb-16"
              required
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
                 <button 
                    type="button"
                    onClick={handleAutoConfigure}
                    disabled={idea.length < 20 || isAnalyzing || isEnhancing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                        idea.length >= 20 && !isAnalyzing
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                        : 'bg-slate-800/50 text-slate-600 border-slate-700 cursor-not-allowed'
                    }`}
                 >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    {isAnalyzing ? 'Analyzing...' : 'Auto-Configure'}
                 </button>

                 <button 
                    type="button"
                    onClick={handleEnhance}
                    disabled={idea.length < 20 || isEnhancing || isAnalyzing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                        idea.length >= 20 && !isEnhancing
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                        : 'bg-slate-800/50 text-slate-600 border-slate-700 cursor-not-allowed'
                    }`}
                 >
                    {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    {isEnhancing ? 'Enhancing...' : 'Refine Concept'}
                 </button>
            </div>
          </div>
        </div>

        {/* Multi-Select Genre */}
        <div className={`space-y-4 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-blue-400" /> Genre Fusion
                </label>
                <span className="text-[10px] font-mono text-blue-400/60 bg-blue-500/5 px-2 py-0.5 rounded">{selectedGenres.length} / 5</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 ${
                            selectedGenres.includes(g)
                            ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}
                    >
                        {g}
                    </button>
                ))}
            </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3 text-purple-400" /> Art Style</label>
                <div className="relative">
                    <select value={artStyle} onChange={(e) => setArtStyle(e.target.value)} className="w-full pl-4 pr-10 py-3.5 input-premium rounded-xl text-slate-200 text-sm font-bold appearance-none cursor-pointer">
                        {artStyles.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sun className="w-3 h-3 text-amber-400" /> Lighting</label>
                <div className="relative">
                    <select value={lightingMethod} onChange={(e) => setLightingMethod(e.target.value)} className="w-full pl-4 pr-10 py-3.5 input-premium rounded-xl text-slate-200 text-sm font-bold appearance-none cursor-pointer">
                        {lightingMethods.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Network className="w-3 h-3 text-emerald-400" /> Networking</label>
                <div className="relative">
                    <select value={networking} onChange={(e) => setNetworking(e.target.value as any)} className="w-full pl-4 pr-10 py-3.5 input-premium rounded-xl text-slate-200 text-sm font-bold appearance-none cursor-pointer">
                        {['Single Player', 'Listen Server (Co-op)', 'Dedicated Server'].map(n => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3 text-blue-400" /> Input</label>
                <div className="relative">
                    <select value={inputSystem} onChange={(e) => setInputSystem(e.target.value as any)} className="w-full pl-4 pr-10 py-3.5 input-premium rounded-xl text-slate-200 text-sm font-bold appearance-none cursor-pointer">
                        <option value="Enhanced Input" className="bg-slate-900">Enhanced Input (Modern)</option>
                        <option value="Legacy Input" className="bg-slate-900">Legacy Input (Classic)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>
        </div>

        <div className={`space-y-5 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-cyan-400" /> Target Architecture
            </label>
            <div className="flex flex-wrap gap-3">
                {platformOptions.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`text-xs font-bold px-5 py-3 rounded-xl border transition-all duration-300 transform active:scale-95 flex items-center gap-2 ${
                            platforms.includes(p)
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}
                    >
                        {platforms.includes(p) && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {p}
                    </button>
                ))}
            </div>
        </div>

        <div className={`space-y-5 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> Specialized Mechanics
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {mechanicOptions.map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => toggleMechanic(m)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border transition-all text-center ${
                            mechanics.includes(m)
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-900/40 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <div className="space-y-5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-blue-400" /> Starting Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {templates.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTemplate(t)}
                            className={`text-[10px] font-bold px-4 py-3 rounded-xl border transition-all ${
                                template === t
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" /> Development Unit
                </label>
                <div className="relative bg-slate-900/40 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-2xl font-black text-white">{teamSize}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Developers</div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setTeamSize(Math.max(1, teamSize - 1))} className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white hover:bg-slate-700 transition-colors">-</button>
                        <button type="button" onClick={() => setTeamSize(teamSize + 1)} className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white hover:bg-slate-700 transition-colors">+</button>
                    </div>
                </div>
            </div>
        </div>

        <div className={`space-y-6 transition-all duration-700 ${autoFillTriggered ? 'scale-[1.02] blur-[1px] brightness-125' : ''}`}>
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <BoxSelect className="w-4 h-4 text-purple-400" /> Marketplace & Engine Extensions
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableAssets.map((asset) => (
                        <button
                            key={asset}
                            type="button"
                            onClick={() => toggleAsset(asset)}
                            className={`group relative p-4 rounded-2xl border text-left transition-all duration-300 flex items-center gap-4 overflow-hidden ${
                                assets.includes(asset)
                                ? 'bg-purple-900/30 border-purple-500/50 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                                : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:border-slate-700 hover:bg-slate-800/60'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                assets.includes(asset) ? 'bg-purple-500 text-white' : 'bg-slate-800 border border-slate-700'
                            }`}>
                                {assets.includes(asset) && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-[10px] font-bold tracking-wider uppercase leading-tight">{asset}</span>
                        </button>
                    ))}
                </div>

                {/* Compatibility HUD */}
                <div className="md:col-span-4 h-full">
                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-950/40 h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                            <ShieldCheck className="w-32 h-32 text-blue-400" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-400" /> Deployment Audit
                            </h4>
                            {isAuditing && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                        </div>

                        {assets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                <Info className="w-8 h-8 text-slate-700 mb-2 opacity-20" />
                                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Select assets to run cross-reference audit</p>
                            </div>
                        ) : compReport ? (
                            <div className="flex-1 flex flex-col min-h-0 relative z-10 animate-in fade-in duration-500">
                                <div className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg border w-fit ${
                                    compReport.overallStatus === 'Compatible' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    compReport.overallStatus === 'Warnings' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                                }`}>
                                    {compReport.overallStatus === 'Compatible' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{compReport.overallStatus}</span>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar-hidden space-y-4 mb-4">
                                    {compReport.warnings.map((warn, i) => (
                                        <div key={i} className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[9px] font-black text-slate-200 uppercase">{warn.asset}</span>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                                    warn.severity === 'Low' ? 'text-blue-400' :
                                                    warn.severity === 'Medium' ? 'text-amber-400' :
                                                    'text-red-400'
                                                }`}>{warn.severity}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-tight mb-2">{warn.issue}</p>
                                            <div className="text-[9px] text-blue-300 bg-blue-900/20 p-2 rounded border border-blue-500/20 font-medium">
                                                <span className="font-black mr-1 uppercase">Patch:</span> {warn.fix}
                                            </div>
                                        </div>
                                    ))}
                                    {compReport.warnings.length === 0 && (
                                        <div className="py-8 text-center">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-40" />
                                            <p className="text-[10px] text-slate-500 uppercase font-black">All systems nominal</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Architect Advice</h5>
                                    <p className="text-[10px] text-slate-300 leading-relaxed font-light italic">"{compReport.architecturalAdvice}"</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3 opacity-40" />
                                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Scanning Neural Grid for Version Conflicts...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-6">
          <label className="block text-xs font-black text-slate-400 ml-1 tracking-[0.2em] uppercase mb-6">Complexity Threshold</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {levels.map((lvl) => (
              <button
                key={lvl.value}
                type="button"
                onClick={() => setLevel(lvl.value)}
                className={`relative overflow-hidden flex flex-col items-start p-6 rounded-3xl border transition-all duration-500 ${
                  level === lvl.value
                    ? `bg-slate-800 border-white/20 shadow-2xl scale-[1.02] ring-1 ring-blue-500/50`
                    : `bg-slate-900/40 border-slate-800/50 opacity-60 hover:opacity-100`
                }`}
              >
                <span className={`font-black text-sm mb-2 uppercase tracking-widest ${level === lvl.value ? lvl.color : 'text-slate-400'}`}>{lvl.label}</span>
                <span className="text-[10px] text-slate-500 font-medium leading-relaxed">{lvl.desc}</span>
                {level === lvl.value && <div className="absolute top-2 right-4 text-blue-500/20"><Cpu className="w-12 h-12" /></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-10">
            <button
                type="submit"
                disabled={isLoading || isAnalyzing || !idea.trim()}
                className={`w-full py-8 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl relative overflow-hidden group ${
                    isLoading || isAnalyzing || !idea.trim()
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white hover:shadow-blue-500/40 transform hover:-translate-y-1'
                }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="animate-pulse tracking-[0.2em] uppercase">Forging Architecture...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-7 h-7" />
                        <span className="tracking-[0.2em] uppercase">Initialize Project Development</span>
                    </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;
