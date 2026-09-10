
import React, { useState, useEffect } from 'react';
import { NarrativeData, NPC, Quest, DialogueScript } from '../types';
import { 
  BookOpen, Users, MessageCircle, Sword, Scroll, MapPin, Sparkles, Loader2, 
  Bot, ChevronRight, User, Image as ImageIcon, Film, Activity, Play, Pause, 
  RotateCw, Eye, Download, Code2, Layers, RefreshCw, Wand2, Plus
} from 'lucide-react';
import { ThreeViewport } from './ThreeViewport';
import { CharacterGenerationModal } from './CharacterGenerationModal';
import { generate3DAssetFromPrompt, exportToGLB, downloadBlob, generateMesh2MotionUE5Script, Generated3DAsset } from '../services/model3dGenerator';
import * as THREE from 'three';

interface NarrativeWeaverProps {
    narrative: NarrativeData;
    onFetchQuests: () => Promise<void>;
    onFetchNPCs: () => Promise<void>;
    onFetchDialogue: (npc: NPC) => Promise<DialogueScript[]>;
    onGenerateImage: (prompt: string, category: 'Environment' | 'Character' | 'Prop' | 'UI') => Promise<void>;
}

export const NarrativeWeaver: React.FC<NarrativeWeaverProps> = ({ 
    narrative, 
    onFetchQuests, 
    onFetchNPCs, 
    onFetchDialogue,
    onGenerateImage
}) => {
    const [activeTab, setActiveTab] = useState<'quests' | 'npcs'>('quests');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
    const [loadingDialogue, setLoadingDialogue] = useState(false);
    const [generatingArt, setGeneratingArt] = useState(false);

    // NPC Details Tabs: 'animation' | 'profile' | 'dialogue'
    const [npcDetailTab, setNpcDetailTab] = useState<'animation' | 'profile' | 'dialogue'>('animation');
    
    // NPC 3D & Animation State
    const [npc3DAssets, setNpc3DAssets] = useState<Record<string, Generated3DAsset>>({});
    const [generatingNPC3D, setGeneratingNPC3D] = useState(false);
    const [selectedNPCClip, setSelectedNPCClip] = useState<string>('Combat Idle');
    const [npcClips, setNpcClips] = useState<string[]>([]);
    const [npcPlaybackSpeed, setNpcPlaybackSpeed] = useState<number>(1.0);
    const [npcShowSkeleton, setNpcShowSkeleton] = useState<boolean>(false);
    const [npcAutoRotate, setNpcAutoRotate] = useState<boolean>(true);

    // Character Generation Modal
    const [isCharModalOpen, setIsCharModalOpen] = useState(false);
    const [modalInitialChar, setModalInitialChar] = useState<any>(null);

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            if (activeTab === 'quests' && narrative.quests.length === 0) {
                setIsLoading(true);
                await onFetchQuests();
                setIsLoading(false);
            } else if (activeTab === 'npcs' && narrative.npcs.length === 0) {
                setIsLoading(true);
                await onFetchNPCs();
                setIsLoading(false);
            }
        };
        fetchInitial();
    }, [activeTab]);

    // Auto-select first NPC when NPCs load
    useEffect(() => {
        if (narrative.npcs.length > 0 && !selectedNPC) {
            setSelectedNPC(narrative.npcs[0]);
        }
    }, [narrative.npcs]);

    // When an NPC is selected, ensure 3D model with Mesh2Motion rig is loaded or generated
    useEffect(() => {
        if (selectedNPC && !npc3DAssets[selectedNPC.id]) {
            handleGenerateNPC3D(selectedNPC);
        }
    }, [selectedNPC]);

    const handleGenerateNPC3D = async (npc: NPC) => {
        setGeneratingNPC3D(true);
        try {
            const prompt = `${npc.name}, ${npc.role}, ${npc.visualDescription || npc.personality}`;
            const asset = await generate3DAssetFromPrompt(prompt, 'Character', {
                name: npc.name,
                forceRig: true
            });
            setNpc3DAssets(prev => ({ ...prev, [npc.id]: asset }));
            if (asset.animations && asset.animations.length > 0) {
                const names = asset.animations.map(c => c.name);
                setNpcClips(names);
                const idle = names.find(n => n.toLowerCase().includes('idle')) || names[0];
                setSelectedNPCClip(idle);
            }
        } catch (e) {
            console.error('Failed to generate NPC 3D rig:', e);
        } finally {
            setGeneratingNPC3D(false);
        }
    };

    const handleGenerateDialogue = async (npc: NPC) => {
        setLoadingDialogue(true);
        try {
            await onFetchDialogue(npc);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDialogue(false);
        }
    };

    const handleGenerateArt = async (npc: NPC) => {
        setGeneratingArt(true);
        try {
            await onGenerateImage(
                `${npc.name}, ${npc.role}, ${npc.visualDescription}. Unreal Engine 5 render, cinematic character portrait.`,
                'Character'
            );
        } catch (e) {
            console.error(e);
        } finally {
            setGeneratingArt(false);
        }
    };

    const handleExportNPCGLB = async (npc: NPC) => {
        const asset = npc3DAssets[npc.id];
        if (!asset) return;
        try {
            const bytes = await exportToGLB(asset.scene);
            downloadBlob(bytes, `${npc.name.toLowerCase().replace(/\s+/g, '_')}_mesh2motion.glb`, 'model/gltf-binary');
        } catch (e) {
            console.error(e);
        }
    };

    const handleExportNPCUE5 = async (npc: NPC) => {
        const asset = npc3DAssets[npc.id];
        if (!asset) return;
        try {
            const bytes = await exportToGLB(asset.scene);
            downloadBlob(bytes, `${npc.name.toLowerCase().replace(/\s+/g, '_')}_mesh2motion.glb`, 'model/gltf-binary');
            const py = generateMesh2MotionUE5Script(npc.name, 'humanoid');
            downloadBlob(py, `${npc.name.toLowerCase().replace(/\s+/g, '_')}_retargeter.py`, 'text/x-python');
        } catch (e) {
            console.error(e);
        }
    };

    const openFullStudioForNPC = (npc: NPC) => {
        setModalInitialChar({
            name: npc.name,
            role: npc.role,
            archetype: npc.personality,
            prompt: `${npc.name}, ${npc.role}, ${npc.visualDescription}`,
            visualDescription: npc.visualDescription,
            backstory: npc.backstory
        });
        setIsCharModalOpen(true);
    };

    const renderQuestCard = (quest: Quest) => (
        <div key={quest.id} className="glass-card p-6 rounded-xl border border-slate-700/50 hover:border-yellow-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-yellow-400 transition-colors">{quest.title}</h3>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    quest.type === 'Main' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                    quest.type === 'Side' ? 'bg-slate-700 text-slate-300' :
                    'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                    {quest.type}
                </span>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{quest.description}</p>
            
            <div className="space-y-4">
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Scroll className="w-3 h-3" /> Objectives
                    </div>
                    <ul className="space-y-1">
                        {(quest.objectives || []).map((obj, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50"></span>
                                {obj}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(quest.rewards || []).map((reward, i) => (
                        <span key={i} className="text-xs font-mono text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> {reward}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderNPCCard = (npc: NPC) => (
        <div 
            key={npc.id} 
            onClick={() => setSelectedNPC(npc)}
            className={`cursor-pointer glass-card p-5 rounded-xl border transition-all relative overflow-hidden group ${
                selectedNPC?.id === npc.id 
                ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/10' 
                : 'border-slate-700/50 hover:border-blue-400/50 hover:bg-slate-800/60'
            }`}
        >
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-100">{npc.name}</h3>
                        <div className="text-xs text-blue-300 font-mono">{npc.role}</div>
                    </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                    Rigged
                </span>
            </div>
            
            <div className="mt-3 text-xs text-slate-400 line-clamp-2 relative z-10">
                {npc.visualDescription || npc.personality}
            </div>

            {selectedNPC?.id === npc.id && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-xl pointer-events-none"></div>
            )}
        </div>
    );

    const renderSelectedNPCDetails = () => {
        if (!selectedNPC) return null;
        
        const dialogues = narrative.dialogues[selectedNPC.id] || [];
        const current3D = npc3DAssets[selectedNPC.id];

        return (
            <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500 overflow-hidden">
                {/* Header Banner */}
                <div className="glass-card p-5 rounded-2xl border border-slate-700/50 mb-4 relative overflow-hidden shrink-0">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedNPC.name}</h2>
                                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> Mesh2Motion Rigged
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs font-bold text-blue-300 bg-blue-900/30 px-2.5 py-0.5 rounded-md border border-blue-500/20">{selectedNPC.role}</span>
                                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">{selectedNPC.location}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => openFullStudioForNPC(selectedNPC)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                title="Open full Mesh2Motion Character Studio Modal"
                            >
                                <Wand2 className="w-3.5 h-3.5 text-cyan-200" />
                                <span>Character Studio</span>
                            </button>

                            <button 
                                onClick={(e) => { e.stopPropagation(); handleGenerateArt(selectedNPC); }}
                                disabled={generatingArt}
                                className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-3 py-2 rounded-xl border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                {generatingArt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">Vision Board</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subtabs: Animation Preview | Profile Details | Dialogue */}
                <div className="flex items-center gap-2 mb-3 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                        onClick={() => setNpcDetailTab('animation')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            npcDetailTab === 'animation'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                    >
                        <Film className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Animation Preview</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black uppercase">
                            Live
                        </span>
                    </button>

                    <button
                        onClick={() => setNpcDetailTab('profile')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            npcDetailTab === 'profile'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>Lore & Profile</span>
                    </button>

                    <button
                        onClick={() => setNpcDetailTab('dialogue')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            npcDetailTab === 'dialogue'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                    >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Dialogue Scripts ({dialogues.length})</span>
                    </button>
                </div>

                {/* Subtab Content */}
                <div className="flex-1 min-h-0 relative overflow-hidden">
                    
                    {/* ---------------------------------------------------- */}
                    {/* DEDICATED ANIMATION PREVIEW TAB                      */}
                    {/* ---------------------------------------------------- */}
                    {npcDetailTab === 'animation' && (
                        <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
                            {/* 3D Animation Viewport Canvas */}
                            <div className="flex-1 h-full min-h-[340px] bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col">
                                {generatingNPC3D ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                        <Activity className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                                        <p className="text-sm font-bold text-white mb-1">Building Mesh2Motion Rig for {selectedNPC.name}...</p>
                                        <p className="text-xs text-slate-400 font-mono">Generating Manny/Quinn compatible skeleton & clips</p>
                                    </div>
                                ) : current3D ? (
                                    <ThreeViewport
                                        modelGroup={current3D.scene}
                                        selectedClipName={selectedNPCClip}
                                        playbackSpeed={npcPlaybackSpeed}
                                        showSkeleton={npcShowSkeleton}
                                        autoRotate={npcAutoRotate}
                                        className="w-full h-full"
                                        onClipsDetected={(clips) => setNpcClips(clips)}
                                        onActiveClipChange={(c) => setSelectedNPCClip(c)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6">
                                        <Activity className="w-10 h-10 text-slate-600 mb-3" />
                                        <p className="text-sm text-slate-400 mb-3">No 3D Model loaded for {selectedNPC.name}</p>
                                        <button
                                            onClick={() => handleGenerateNPC3D(selectedNPC)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg"
                                        >
                                            Generate Mesh2Motion Rig
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Animation Clips Deck & Engine Export */}
                            <div className="w-full lg:w-80 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                                            <Film className="w-3.5 h-3.5 text-cyan-400" /> Test Animations
                                        </h4>
                                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                            {npcClips.length} Clips
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {npcClips.map((clip) => {
                                            const isSelected = selectedNPCClip === clip;
                                            return (
                                                <button
                                                    key={clip}
                                                    onClick={() => setSelectedNPCClip(clip)}
                                                    className={`w-full p-2 rounded-xl text-left text-xs font-mono transition-all flex items-center justify-between ${
                                                        isSelected
                                                            ? 'bg-gradient-to-r from-blue-900/70 to-indigo-900/70 border border-cyan-500 text-white font-bold shadow-md shadow-cyan-500/10'
                                                            : 'bg-slate-950/70 border border-slate-800/80 text-slate-300 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Play className={`w-3 h-3 ${isSelected ? 'fill-cyan-400 text-cyan-400' : 'text-slate-500'}`} />
                                                        {clip}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">60 FPS</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Animation Control Toggles */}
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2.5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Viewport Controls
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-300 flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Bone Skeleton
                                        </span>
                                        <button
                                            onClick={() => setNpcShowSkeleton(!npcShowSkeleton)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                                npcShowSkeleton ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                                            }`}
                                        >
                                            {npcShowSkeleton ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-300 flex items-center gap-1.5">
                                            <RotateCw className="w-3.5 h-3.5 text-blue-400" /> Auto-Rotate
                                        </span>
                                        <button
                                            onClick={() => setNpcAutoRotate(!npcAutoRotate)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                                npcAutoRotate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                                            }`}
                                        >
                                            {npcAutoRotate ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    <div className="space-y-1 pt-1">
                                        <div className="text-[10px] text-slate-400 font-mono">Speed Multiplier:</div>
                                        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                                            {[0.25, 0.5, 1.0, 1.5].map((spd) => (
                                                <button
                                                    key={spd}
                                                    onClick={() => setNpcPlaybackSpeed(spd)}
                                                    className={`py-1 rounded text-center transition-colors ${
                                                        npcPlaybackSpeed === spd
                                                            ? 'bg-indigo-600 text-white font-bold'
                                                            : 'bg-slate-850 text-slate-400 hover:text-white'
                                                    }`}
                                                >
                                                    {spd}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Export Suite */}
                                <div className="space-y-2 mt-auto">
                                    <button
                                        onClick={() => handleExportNPCGLB(selectedNPC)}
                                        className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-between transition-colors"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                                            Download Rigged .GLB
                                        </span>
                                        <span className="text-[10px] text-slate-400">glTF 2.0</span>
                                    </button>

                                    <button
                                        onClick={() => handleExportNPCUE5(selectedNPC)}
                                        className="w-full py-2 px-3 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 text-blue-200 rounded-xl text-xs font-bold border border-blue-500/30 flex items-center justify-between transition-colors"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Code2 className="w-3.5 h-3.5 text-blue-400" />
                                            UE5 Manny Retargeter
                                        </span>
                                        <span className="text-[10px] text-blue-300 font-mono">.py</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* PROFILE & LORE TAB                                   */}
                    {/* ---------------------------------------------------- */}
                    {npcDetailTab === 'profile' && (
                        <div className="h-full bg-slate-900/60 p-6 rounded-2xl border border-slate-800 overflow-y-auto space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                    Personality & Archetype
                                </h4>
                                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                    {selectedNPC.personality || 'No archetype specified.'}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                    Character Backstory
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                    {selectedNPC.backstory || 'No backstory provided.'}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                    Visual & Costume Design
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed italic bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                    {selectedNPC.visualDescription || 'Standard tactical uniform.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* DIALOGUE SCRIPTS TAB                                 */}
                    {/* ---------------------------------------------------- */}
                    {npcDetailTab === 'dialogue' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-emerald-400" /> Interactive Dialogue Lines
                                </h3>
                                <button 
                                    onClick={() => handleGenerateDialogue(selectedNPC)}
                                    disabled={loadingDialogue}
                                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {loadingDialogue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                                    Generate New Script
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                {dialogues.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-950/40">
                                        <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm font-medium mb-1">No dialogue scripts generated yet.</p>
                                        <p className="text-xs text-slate-500 mb-4">Generate branching dialogue trees with emotion tagging.</p>
                                        <button
                                            onClick={() => handleGenerateDialogue(selectedNPC)}
                                            disabled={loadingDialogue}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                                        >
                                            Generate First Dialogue Script
                                        </button>
                                    </div>
                                ) : (
                                    (dialogues || []).map((script) => (
                                        <div key={script.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                                            <div className="text-xs font-mono text-emerald-400 border-b border-white/5 pb-2">
                                                Context: {script.context}
                                            </div>
                                            <div className="space-y-2.5">
                                                {(script.lines || []).map((line, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="w-20 flex-shrink-0 text-xs font-bold text-slate-400 text-right mt-1 font-mono">
                                                            {line.speaker}
                                                        </div>
                                                        <div className="flex-1 bg-black/30 p-2.5 rounded-lg text-xs text-slate-200 border border-white/5">
                                                            {line.text}
                                                            {line.emotion && (
                                                                <span className="ml-2 text-[10px] text-emerald-400 italic">({line.emotion})</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full relative overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Story Engine</h2>
                    <div className="space-y-1.5">
                        <button 
                            onClick={() => setActiveTab('quests')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'quests' 
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Sword className="w-4 h-4" /> Quest Log
                        </button>
                        <button 
                            onClick={() => setActiveTab('npcs')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'npcs' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Users className="w-4 h-4" /> Cast & Characters
                        </button>
                    </div>
                </div>

                <div className="p-3 border-b border-slate-800">
                    <button
                        onClick={() => {
                            setModalInitialChar(null);
                            setIsCharModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Mesh2Motion Studio</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {activeTab === 'quests' && (
                        (narrative.quests || []).map((q) => (
                            <div 
                                key={q.id}
                                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 cursor-pointer"
                            >
                                <div className="font-bold text-white mb-0.5">{q.title}</div>
                                <div className="text-[10px] text-yellow-400 font-mono">{q.type} Quest</div>
                            </div>
                        ))
                    )}

                    {activeTab === 'npcs' && (
                        (narrative.npcs || []).map((npc) => (
                            <button
                                key={npc.id}
                                onClick={() => setSelectedNPC(npc)}
                                className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                                    selectedNPC?.id === npc.id
                                        ? 'bg-blue-600 text-white font-bold shadow-md'
                                        : 'bg-slate-900/40 border border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                <div>
                                    <div className="font-bold">{npc.name}</div>
                                    <div className="text-[10px] opacity-75 font-mono">{npc.role}</div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 overflow-hidden p-5 flex flex-col">
                {activeTab === 'quests' ? (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-white">Campaign Quests</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {narrative.quests.map(renderQuestCard)}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex-1 min-h-0">
                        {renderSelectedNPCDetails()}
                    </div>
                )}
            </div>

            {/* Character Generation & Animation Preview Modal */}
            <CharacterGenerationModal
                isOpen={isCharModalOpen}
                onClose={() => setIsCharModalOpen(false)}
                initialData={modalInitialChar}
                onSaveToVisionBoard={(asset) => onGenerateImage(asset.prompt, asset.category)}
            />
        </div>
    );
};

export default NarrativeWeaver;
