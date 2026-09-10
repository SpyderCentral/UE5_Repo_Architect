import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  X, Sparkles, Activity, Wand2, Play, Pause, RotateCw, Eye, Sun, Moon, 
  Compass, Download, Film, Layers, Shield, Sword, User, Bot, 
  CheckCircle2, RefreshCw, ChevronRight, Zap, Code2, Sliders, 
  Maximize2, Share2, FileCode, Check, Camera, Gauge, Cpu, Repeat, ArrowRightLeft, Square, FastForward
} from 'lucide-react';
import { ThreeViewport, AnimationLoopMode } from './ThreeViewport';
import { 
  Generated3DAsset, 
  generate3DAssetFromPrompt, 
  exportToGLB, 
  downloadBlob, 
  generateMesh2MotionUE5Script,
  generateGodot4Scene,
  generateGodot4Controller,
  generateUnityManifest,
  generateUnityController,
  RigType
} from '../services/model3dGenerator';
import { generateConceptArtImage, generateAI3DModelSpec } from '../services/ai/client';
import { VisionCategory, NPC } from '../types';
import { ModelPerformanceAuditor, ModelPerformanceReport } from '../services/modelPerformanceAuditor';
import { ModelPerformanceReportModal } from './ModelPerformanceReportModal';

export interface CharacterGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    role?: string;
    archetype?: string;
    prompt?: string;
    visualDescription?: string;
    backstory?: string;
    base64?: string;
  } | null;
  onSaveToVisionBoard?: (asset: { prompt: string; category: VisionCategory; base64: string }) => void;
  onSaveToNarrative?: (npc: NPC) => void;
}

const CHARACTER_ARCHETYPES = [
  { id: 'Cybernetic Commando', label: 'Cyber Commando', rig: 'humanoid', desc: 'Futuristic armored soldier with glowing energy core and cybernetics' },
  { id: 'Shadow Rogue', label: 'Shadow Assassin', rig: 'humanoid', desc: 'Agile cloaked ninja with twin daggers and dark cloth textures' },
  { id: 'Arcane Sorcerer', label: 'Arcane Sorcerer', rig: 'humanoid', desc: 'Mystical spellcaster in layered arcane robes wielding a runic crystal staff' },
  { id: 'Armored Knight', label: 'Paladin Knight', rig: 'humanoid', desc: 'Heavy Damascus steel-clad guardian with ornate heraldry and broadsword' },
  { id: 'Mecha Guardian', label: 'Heavy Mech Droid', rig: 'mech', desc: 'Reinforced titanium robotic combat unit with hydraulic servos' },
  { id: 'Mythic Beast', label: 'Mythic Beast / Dragon', rig: 'creature', desc: 'Quadruped scaled drake with obsidian spikes and dragon scales' },
];

export const CharacterGenerationModal: React.FC<CharacterGenerationModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSaveToVisionBoard,
  onSaveToNarrative
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'visual' | 'mesh3d' | 'animation'>('animation');
  
  // Character Spec State
  const [charName, setCharName] = useState(initialData?.name || 'Astra_Vanguard');
  const [charRole, setCharRole] = useState(initialData?.role || 'Protagonist / Operative');
  const [selectedArchetype, setSelectedArchetype] = useState(initialData?.archetype || 'Cybernetic Commando');
  const [charPrompt, setCharPrompt] = useState(
    initialData?.prompt || 
    'Cinematic cybernetic commando hero in Damascus steel armor with glowing cyan energy core and tactical visor'
  );
  const [charBackstory, setCharBackstory] = useState(
    initialData?.backstory || 
    'A high-tier operative reconstructed through the Astra neural weave, specializing in rapid assault and tactical breaches.'
  );

  // 2D & 3D Assets State
  const [conceptImage, setConceptImage] = useState<string | null>(initialData?.base64 || null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generated3D, setGenerated3D] = useState<Generated3DAsset | null>(null);
  const [isForging3D, setIsForging3D] = useState(false);

  // Animation Preview Tab State & Looping Controls
  const [availableClips, setAvailableClips] = useState<string[]>([]);
  const [selectedClip, setSelectedClip] = useState<string>('Combat Idle');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [loopMode, setLoopMode] = useState<AnimationLoopMode>('repeat');
  const [animCurrentTime, setAnimCurrentTime] = useState<number>(0);
  const [animDuration, setAnimDuration] = useState<number>(1);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [lightingPreset, setLightingPreset] = useState<'cyberpunk' | 'daylight' | 'studio'>('cyberpunk');
  const [cameraPreset, setCameraPreset] = useState<'front' | 'perspective' | 'side' | 'closeUp' | 'top'>('perspective');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [rigInfo, setRigInfo] = useState<{ isRigged: boolean; rigType: string }>({ isRigged: true, rigType: 'humanoid' });
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Performance Auditor & Pre-Export Report State
  const [auditReport, setAuditReport] = useState<ModelPerformanceReport | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);

  // Auto-generate 3D model on initial open if not yet generated
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      if (initialData.name) setCharName(initialData.name);
      if (initialData.role) setCharRole(initialData.role);
      if (initialData.prompt) setCharPrompt(initialData.prompt);
      if (initialData.backstory) setCharBackstory(initialData.backstory);
      if (initialData.base64) setConceptImage(initialData.base64);
    }

    if (!generated3D) {
      handleForgeCharacter3D(initialData?.prompt || charPrompt, initialData?.base64);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Perform Model Performance Audit
  const handleRunPerformanceAudit = (onConfirmed?: () => void) => {
    if (!generated3D || !generated3D.scene) {
      notify('No active 3D model to audit.');
      return;
    }

    const report = ModelPerformanceAuditor.auditModel(generated3D.scene, charName, rigInfo.rigType);
    setAuditReport(report);
    if (onConfirmed) {
      setPendingDownloadAction(() => onConfirmed);
    } else {
      setPendingDownloadAction(null);
    }
    setIsAuditModalOpen(true);
  };

  // Generate 2D Concept Art with Gemini
  const handleGenerate2DConcept = async () => {
    setIsGeneratingImage(true);
    try {
      const fullPrompt = `${charName}, ${charRole}, ${charPrompt}. Full body character concept art, Unreal Engine 5 cinematic render, photorealistic lighting, dynamic action pose, 8k resolution.`;
      const base64 = await generateConceptArtImage(fullPrompt, 'Character');
      setConceptImage(base64);
      setActiveTab('visual');
      notify('2D Character Visual synthesized successfully!');
      
      // Also automatically forge 3D model with Astra
      handleForgeCharacter3D(fullPrompt, base64);
    } catch (e: any) {
      console.error('Failed to generate 2D concept:', e);
      notify(`2D Generation error: ${e.message || 'Check API key'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Forge 3D Mesh & Mesh2Motion Rig
  const handleForgeCharacter3D = async (promptToUse?: string, imageBase64?: string) => {
    setIsForging3D(true);
    const p = promptToUse || charPrompt;
    try {
      // 1. Generate 3D Spec with AI if possible
      let spec = null;
      try {
        spec = await generateAI3DModelSpec('Character', p, undefined, imageBase64 || conceptImage || undefined);
      } catch (specErr) {
        console.warn('AI Spec generation fell back to procedural synthesis:', specErr);
      }

      // 2. Generate Three.js Scene + Mesh2Motion Rig
      const asset = await generate3DAssetFromPrompt(p, 'Character', {
        name: charName,
        aiSpec: spec || undefined,
        forceRig: true,
        sourceImage: imageBase64 || conceptImage || undefined
      });

      setGenerated3D(asset);
      if (asset.animations && asset.animations.length > 0) {
        const names = asset.animations.map(c => c.name);
        setAvailableClips(names);
        const idle = names.find(n => n.toLowerCase().includes('idle')) || names[0];
        setSelectedClip(idle);
      }
      notify(`Rigged 3D Character "${charName}" ready with Mesh2Motion animations!`);
    } catch (err: any) {
      console.error('3D Forge error:', err);
      notify(`3D Forge error: ${err.message || 'Procedural fallback applied'}`);
    } finally {
      setIsForging3D(false);
    }
  };

  // Direct download GLB
  const executeDownloadGLB = async () => {
    if (!generated3D) return;
    try {
      const glbBytes = await exportToGLB(generated3D.scene);
      downloadBlob(glbBytes, `${charName.toLowerCase().replace(/\s+/g, '_')}_mesh2motion_rigged.glb`, 'model/gltf-binary');
      notify(`Downloaded .GLB with embedded Mesh2Motion animation tracks!`);
    } catch (e) {
      console.error(e);
      notify('Export failed.');
    }
  };

  // Export Handlers with optional pre-audit review
  const handleExportGLB = () => {
    handleRunPerformanceAudit(executeDownloadGLB);
  };

  const handleExportUE5Rig = async () => {
    if (!generated3D) return;
    try {
      const glbBytes = await exportToGLB(generated3D.scene);
      downloadBlob(glbBytes, `${charName.toLowerCase().replace(/\s+/g, '_')}_mesh2motion.glb`, 'model/gltf-binary');
      
      const ue5PyScript = generateMesh2MotionUE5Script(charName, rigInfo.rigType || 'humanoid');
      downloadBlob(ue5PyScript, `${charName.toLowerCase().replace(/\s+/g, '_')}_ue5_retargeter.py`, 'text/x-python');
      notify(`Exported UE5 Manny/Quinn IK Retargeter script + Rigged .GLB!`);
    } catch (e) {
      console.error(e);
      notify('UE5 Export failed.');
    }
  };

  const handleExportGodot = () => {
    if (!generated3D) return;
    const tscn = generateGodot4Scene(charName, 'Character');
    const gd = generateGodot4Controller(charName);
    downloadBlob(tscn, `${charName}.tscn`, 'text/plain');
    downloadBlob(gd, `${charName}.gd`, 'text/plain');
    notify(`Exported Godot 4 AnimationPlayer scene & controller!`);
  };

  const handleExportUnity = () => {
    if (!generated3D) return;
    const manifest = generateUnityManifest(charName, 'Character');
    const cs = generateUnityController(charName);
    downloadBlob(manifest, `${charName}_manifest.json`, 'application/json');
    downloadBlob(cs, `${charName}Controller.cs`, 'text/plain');
    notify(`Exported Unity Animator manifest & C# controller!`);
  };

  const handleSaveToProject = () => {
    if (conceptImage && onSaveToVisionBoard) {
      onSaveToVisionBoard({
        prompt: `${charName} - ${charPrompt}`,
        category: 'Character',
        base64: conceptImage
      });
    }

    if (onSaveToNarrative) {
      onSaveToNarrative({
        id: `npc_${Date.now()}`,
        name: charName,
        role: charRole,
        personality: selectedArchetype,
        backstory: charBackstory,
        visualDescription: charPrompt,
        location: 'Astra Foundry'
      });
    }

    notify(`Saved "${charName}" to Vision Board & Narrative Story Engine!`);
  };

  // Helper to switch animation states quickly (Idle, Walk, Run, Combat, Action)
  const handleSelectMotionCategory = (category: 'idle' | 'walk' | 'run' | 'combat' | 'action') => {
    if (!availableClips.length) return;
    
    let target = availableClips[0];
    if (category === 'idle') {
      target = availableClips.find(c => c.toLowerCase().includes('idle')) || availableClips[0];
    } else if (category === 'walk') {
      target = availableClips.find(c => c.toLowerCase().includes('walk')) || availableClips[0];
    } else if (category === 'run') {
      target = availableClips.find(c => c.toLowerCase().includes('run') || c.toLowerCase().includes('sprint')) || availableClips[0];
    } else if (category === 'combat') {
      target = availableClips.find(c => c.toLowerCase().includes('attack') || c.toLowerCase().includes('strike') || c.toLowerCase().includes('combat') || c.toLowerCase().includes('slash')) || availableClips[0];
    } else if (category === 'action') {
      target = availableClips.find(c => c.toLowerCase().includes('jump') || c.toLowerCase().includes('emote') || c.toLowerCase().includes('cast') || c.toLowerCase().includes('block')) || availableClips[0];
    }
    
    setSelectedClip(target);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl h-[92vh] max-h-[920px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notice */}
        {exportNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Mesh2Motion Character Studio
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                  Skeletal Rigging & Animation
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                  UE5 Manny/Quinn IK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rigged Character Generation, PBR Shaders & Interactive Motion Testing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Performance Audit Button */}
            <button
              onClick={() => handleRunPerformanceAudit()}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 font-mono"
              title="Audit Triangles, Texture VRAM & Draw Calls"
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Audit Performance</span>
            </button>

            <button
              onClick={handleSaveToProject}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              title="Save character to Vision Board & Narrative Log"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Character</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('animation')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative ${
                activeTab === 'animation'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-cyan-300" />
              <span>Animation Loop & Rig Controls</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                Live
              </span>
            </button>

            <button
              onClick={() => setActiveTab('mesh3d')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'mesh3d'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Mesh & PBR Shaders</span>
            </button>

            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'visual'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2D Concept Visual</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Character Specs & AI Prompt</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleForgeCharacter3D()}
              disabled={isForging3D}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Re-forge 3D model and regenerate skeleton"
            >
              <RefreshCw className={`w-3 h-3 ${isForging3D ? 'animate-spin' : ''}`} />
              <span>{isForging3D ? 'Forging 3D...' : 'Re-Rig 3D Model'}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 min-h-0 bg-slate-950/40 relative overflow-hidden">
          
          {/* ======================================================== */}
          {/* TAB 1: DEDICATED ANIMATION PREVIEW TAB (USER REQUEST)     */}
          {/* ======================================================== */}
          {activeTab === 'animation' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden">
              
              {/* Left/Main Area: Interactive 3D Canvas Stage */}
              <div className="flex-1 h-full min-h-[360px] relative bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden flex flex-col">
                
                {/* 3D Viewport with fine-grained animation control */}
                <div className="flex-1 w-full h-full relative">
                  {isForging3D ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center animate-bounce shadow-2xl mb-3">
                        <Activity className="w-6 h-6 text-white animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-white mb-1">Synthesizing Mesh2Motion Skeletal Rig...</p>
                      <p className="text-xs text-slate-400 font-mono">Applying 4-bone vertex skinning & animation keyframes</p>
                    </div>
                  ) : generated3D ? (
                    <ThreeViewport
                      modelGroup={generated3D.scene}
                      selectedClipName={selectedClip}
                      playbackSpeed={playbackSpeed}
                      loopMode={loopMode}
                      showSkeleton={showSkeleton}
                      autoRotate={autoRotate}
                      lightingPreset={lightingPreset}
                      isPlaying={isPlaying}
                      cameraPreset={cameraPreset}
                      hideBottomBar={true}
                      onClipsDetected={(clips) => setAvailableClips(clips)}
                      onActiveClipChange={(clip) => setSelectedClip(clip)}
                      onRigDetected={(info) => setRigInfo(info)}
                      onTimeUpdate={(currentTime, duration) => {
                        setAnimCurrentTime(currentTime);
                        setAnimDuration(duration || 1);
                      }}
                      onReRig={(newGroup, rigType) => {
                        setGenerated3D(prev => prev ? { ...prev, scene: newGroup, rigType } : null);
                        notify(`Applied ${rigType.toUpperCase()} Rig & Skeleton Hierarchy!`);
                      }}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <Activity className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium text-slate-400">No 3D Model Loaded</p>
                      <button
                        onClick={() => handleForgeCharacter3D()}
                        className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg"
                      >
                        Forge Rigged Character Now
                      </button>
                    </div>
                  )}

                  {/* Stage Overlay: Current Action HUD */}
                  <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
                    <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/40 text-xs text-white font-mono flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-slate-400">Action:</span>
                      <strong className="text-cyan-300 font-bold">{selectedClip}</strong>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      <span>{charName} • {selectedArchetype}</span>
                    </div>
                  </div>

                  {/* Floating Viewport Settings Controls */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        autoRotate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Toggle 360° Orbit Rotation"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setShowSkeleton(!showSkeleton)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        showSkeleton ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Toggle Mesh2Motion Skeleton Bone Wireframe"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const presets: ('cyberpunk' | 'daylight' | 'studio')[] = ['cyberpunk', 'daylight', 'studio'];
                        const nextIdx = (presets.indexOf(lightingPreset) + 1) % presets.length;
                        setLightingPreset(presets[nextIdx]);
                      }}
                      className="p-1.5 rounded-lg text-xs text-amber-400 hover:bg-slate-800 transition-colors"
                      title={`Lighting preset: ${lightingPreset.toUpperCase()}`}
                    >
                      {lightingPreset === 'cyberpunk' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* ANIMATION LOOPING CONTROL PANEL (USER REQUEST)          */}
                {/* ======================================================== */}
                <div className="p-3 bg-slate-950/95 border-t border-slate-800/80 flex flex-col gap-2 shrink-0">
                  
                  {/* Row 1: Timeline Scrubber & Timecode */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 w-24 shrink-0">
                      <span>{animCurrentTime.toFixed(2)}s</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-400">{animDuration.toFixed(2)}s</span>
                    </div>

                    {/* Interactive Scrubber Bar */}
                    <div className="flex-1 relative flex items-center">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75"
                          style={{ width: `${Math.min(100, Math.max(0, (animCurrentTime / (animDuration || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Loop Mode Indicator Pill */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300">
                      {loopMode === 'repeat' ? 'Repeat' : loopMode === 'pingpong' ? 'Ping-Pong' : 'Single'}
                    </span>
                  </div>

                  {/* Row 2: Playback Controls, Speed, Loop Modes, Camera Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900">
                    
                    {/* Play/Pause & Speed Group */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
                        title={isPlaying ? 'Pause Animation' : 'Play Animation'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      {/* Speed Buttons */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                        {[0.25, 0.5, 1.0, 1.5, 2.0].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setPlaybackSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                              playbackSpeed === spd
                                ? 'bg-cyan-600 text-white font-bold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd === 0.25 ? '0.25x' : `${spd}x`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Looping Mode Controls (Continuous, PingPong, Clamp) */}
                    <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
                      <span className="text-[10px] font-mono text-slate-400 px-1 hidden sm:inline">Loop:</span>
                      
                      <button
                        onClick={() => setLoopMode('repeat')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all ${
                          loopMode === 'repeat'
                            ? 'bg-blue-600 text-white font-bold shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Continuous Repeat Loop"
                      >
                        <Repeat className="w-3 h-3" />
                        <span>Loop</span>
                      </button>

                      <button
                        onClick={() => setLoopMode('pingpong')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all ${
                          loopMode === 'pingpong'
                            ? 'bg-purple-600 text-white font-bold shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Ping-Pong Forward-Reverse Loop"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Ping-Pong</span>
                      </button>

                      <button
                        onClick={() => setLoopMode('once')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all ${
                          loopMode === 'once'
                            ? 'bg-pink-600 text-white font-bold shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Play Once and Clamp"
                      >
                        <Square className="w-3 h-3" />
                        <span>Clamp</span>
                      </button>
                    </div>

                    {/* Camera Angle Presets */}
                    <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 rounded-xl px-2 py-1 text-xs">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      {(['perspective', 'front', 'side', 'closeUp', 'top'] as const).map((cam) => (
                        <button
                          key={cam}
                          onClick={() => setCameraPreset(cam)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                            cameraPreset === cam
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {cam === 'closeUp' ? 'Close' : cam}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Test Animations Selector & Rig Diagnostics */}
              <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto">
                
                {/* Section 1: Locomotion State Switcher */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-cyan-400" /> Locomotion States
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Mesh2Motion Kinematics
                    </span>
                  </div>

                  {/* Fast State Switcher Pills (Idle, Walk, Run, Combat, Action) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'idle', label: 'Idle', color: 'border-emerald-500/40 text-emerald-300' },
                      { id: 'walk', label: 'Walk', color: 'border-blue-500/40 text-blue-300' },
                      { id: 'run', label: 'Run / Sprint', color: 'border-cyan-500/40 text-cyan-300' },
                      { id: 'combat', label: 'Combat', color: 'border-red-500/40 text-red-300' },
                      { id: 'action', label: 'Jump / Action', color: 'border-purple-500/40 text-purple-300' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleSelectMotionCategory(st.id as any)}
                        className={`p-1.5 rounded-lg border text-center text-[10px] font-bold font-mono transition-all hover:bg-slate-800 ${
                          st.color
                        } bg-slate-900/80`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: All Available Animation Clips */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Available Clip Tracks ({availableClips.length})
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableClips.map((clip) => {
                      const isActive = selectedClip === clip;
                      let badge = 'Locomotion';
                      let badgeColor = 'bg-blue-950 text-blue-300 border-blue-500/30';
                      if (clip.toLowerCase().includes('idle')) {
                        badge = 'Idle';
                        badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-500/30';
                      } else if (clip.toLowerCase().includes('attack') || clip.toLowerCase().includes('strike') || clip.toLowerCase().includes('block')) {
                        badge = 'Combat';
                        badgeColor = 'bg-red-950 text-red-300 border-red-500/30';
                      } else if (clip.toLowerCase().includes('jump') || clip.toLowerCase().includes('emote') || clip.toLowerCase().includes('stance') || clip.toLowerCase().includes('cast')) {
                        badge = 'Action';
                        badgeColor = 'bg-purple-950 text-purple-300 border-purple-500/30';
                      }

                      return (
                        <button
                          key={clip}
                          onClick={() => {
                            setSelectedClip(clip);
                            setIsPlaying(true);
                          }}
                          className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-cyan-500 shadow-lg shadow-cyan-500/10'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isActive ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                            }`}>
                              {isActive ? <Play className="w-3 h-3 fill-current" /> : <Film className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className={`text-xs font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                {clip}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                60 FPS • {loopMode.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono border font-semibold ${badgeColor}`}>
                            {badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Performance Audit Tool Card */}
                <div className="p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Gauge className="w-3.5 h-3.5" />
                      Pre-Export Performance Audit
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">VRAM & Draw Calls</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Analyze geometry topology, texture memory footprint, and draw call overhead before downloading.
                  </p>

                  <button
                    onClick={() => handleRunPerformanceAudit()}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Run Full Model Audit</span>
                  </button>
                </div>

                {/* Section 4: Engine Export Actions */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                    Export Rigged Model & Clips
                  </div>

                  <button
                    onClick={handleExportGLB}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-between transition-all shadow-lg group"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" />
                      Audit & Download .GLB
                    </span>
                    <span className="text-[10px] text-cyan-200 font-mono">glTF 2.0</span>
                  </button>

                  <button
                    onClick={handleExportUE5Rig}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-between transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      UE5 Manny/Quinn IK Script
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.py + .glb</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportGodot}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Godot 4 (.tscn)</span>
                    </button>
                    <button
                      onClick={handleExportUnity}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Unity (.cs)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 3D MESH & PBR SHADERS INSPECTOR                   */}
          {/* ======================================================== */}
          {activeTab === 'mesh3d' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 h-full min-h-[350px] relative bg-slate-950">
                {generated3D ? (
                  <ThreeViewport
                    modelGroup={generated3D.scene}
                    selectedClipName={selectedClip}
                    showSkeleton={showSkeleton}
                    autoRotate={autoRotate}
                    lightingPreset={lightingPreset}
                    cameraPreset={cameraPreset}
                    onReRig={(newGroup, rigType) => {
                      setGenerated3D(prev => prev ? { ...prev, scene: newGroup, rigType } : null);
                      notify(`Applied ${rigType.toUpperCase()} Rig & Skeleton Hierarchy!`);
                    }}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    No 3D asset generated yet.
                  </div>
                )}
              </div>

              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-4 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> PBR Material Layers
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white mb-1">Nanite & Lumen Geometry</div>
                      <p className="text-[11px] text-slate-400">
                        Multi-part modular geometry with tangent-space perturbed normal maps, roughness variation, and metallic channels.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white mb-1">Procedural Surface Textures</div>
                      <p className="text-[11px] text-slate-400">
                        Synthesized 1024x1024 diffuse, roughness, and metalness maps generated dynamically based on part semantics.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExportGLB}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download 3D Asset (.GLB)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: 2D CONCEPT ART VISUAL                             */}
          {/* ======================================================== */}
          {activeTab === 'visual' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden p-5 gap-5">
              <div className="flex-1 h-full bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                {conceptImage ? (
                  <img
                    src={conceptImage}
                    alt={charName}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/50"
                  />
                ) : (
                  <div className="text-center p-8">
                    <User className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400 mb-1">No 2D Portrait Generated Yet</p>
                    <p className="text-xs text-slate-500 max-w-xs mb-4">
                      Click below to generate a photorealistic concept portrait using Gemini Image AI.
                    </p>
                    <button
                      onClick={handleGenerate2DConcept}
                      disabled={isGeneratingImage}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGeneratingImage ? 'Synthesizing...' : 'Generate 2D Concept Art'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full md:w-80 flex flex-col gap-3">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Astra 2D → 3D Pipeline
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Transform this 2D portrait into a full 3D model with skeletal bone hierarchies and PBR materials using GPT-6 Astra Vision.
                  </p>
                  <button
                    onClick={() => handleForgeCharacter3D(charPrompt, conceptImage || undefined)}
                    disabled={isForging3D}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-4 h-4 text-purple-200" />
                    <span>{isForging3D ? 'Reconstructing 3D...' : 'Reconstruct 3D with Astra'}</span>
                  </button>
                </div>

                {conceptImage && (
                  <button
                    onClick={handleGenerate2DConcept}
                    disabled={isGeneratingImage}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                    <span>Regenerate 2D Portrait</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CHARACTER SPECS & AI PROMPT                       */}
          {/* ======================================================== */}
          {activeTab === 'generate' && (
            <div className="h-full p-6 overflow-y-auto max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Character Blueprint & Generation Specs</h2>
                <p className="text-xs text-slate-400">Configure identity, archetype, and AI generation prompts.</p>
              </div>

              {/* Archetype Quick Pick */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Select Archetype & Rig Class
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CHARACTER_ARCHETYPES.map((arch) => (
                    <button
                      key={arch.id}
                      onClick={() => {
                        setSelectedArchetype(arch.id);
                        setCharPrompt(arch.desc);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedArchetype === arch.id
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white mb-0.5">{arch.label}</div>
                      <div className="text-[10px] text-indigo-300 font-mono mb-1">{arch.rig.toUpperCase()} RIG</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">{arch.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Character Info Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 font-bold">Character Name</label>
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 font-bold">Game Role / Class</label>
                  <input
                    type="text"
                    value={charRole}
                    onChange={(e) => setCharRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 font-bold">AI Visual & 3D Synthesis Prompt</label>
                <textarea
                  value={charPrompt}
                  onChange={(e) => setCharPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* Backstory */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 font-bold">Narrative Lore & Backstory</label>
                <textarea
                  value={charBackstory}
                  onChange={(e) => setCharBackstory(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    handleForgeCharacter3D();
                    setActiveTab('animation');
                  }}
                  disabled={isForging3D}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                  <Wand2 className="w-4 h-4 text-cyan-200" />
                  <span>Generate & Preview Rigged Character</span>
                </button>

                <button
                  onClick={handleGenerate2DConcept}
                  disabled={isGeneratingImage}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Generate 2D Visual First</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Model Performance Audit Modal */}
      <ModelPerformanceReportModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setPendingDownloadAction(null);
        }}
        report={auditReport}
        onProceedExport={pendingDownloadAction ? () => {
          const action = pendingDownloadAction;
          setPendingDownloadAction(null);
          setIsAuditModalOpen(false);
          action();
        } : undefined}
      />
    </div>
  );
};
