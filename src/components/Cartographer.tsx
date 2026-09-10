import React, { useState, useMemo } from 'react';
import { LevelLayout, PointOfInterest } from '../types';
import { 
  Map, 
  Plus, 
  Target, 
  Ghost, 
  Coins, 
  Skull, 
  HelpCircle, 
  Navigation, 
  Loader2, 
  LayoutGrid, 
  ZoomIn, 
  ZoomOut, 
  ExternalLink, 
  Globe, 
  Gauge, 
  Grid3X3, 
  Box, 
  Download, 
  Layers, 
  BoxSelect, 
  Check, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { ThreeViewport } from './ThreeViewport';
import { 
  buildLevel3DBlockout, 
  exportToGLB, 
  exportToOBJ, 
  generateUE5T3DScript, 
  generateGodotScene, 
  generateUnityPrefabManifest, 
  downloadFile 
} from '../services/model3dGenerator';

interface CartographerProps {
  layouts: LevelLayout[];
  onGenerateLayout: () => Promise<void>;
  onUpdatePosition: (layoutId: string, poiId: string, x: number, y: number) => void;
  onAnalyzePerformance?: (layout: LevelLayout) => void;
  onNavigateToVision?: (layout?: LevelLayout) => void;
}

const Cartographer: React.FC<CartographerProps> = ({ 
  layouts, 
  onGenerateLayout, 
  onUpdatePosition, 
  onAnalyzePerformance,
  onNavigateToVision
}) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(layouts[0]?.id || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const activeLayout = layouts.find(l => l.id === selectedLayoutId) || layouts[0];

  // Build the 3D level blockout group matching the active layout
  const level3DGroup = useMemo(() => {
    if (!activeLayout) return null;
    return buildLevel3DBlockout(activeLayout);
  }, [activeLayout]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateLayout();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAudit = async () => {
    if (!activeLayout || !onAnalyzePerformance) return;
    setIsAuditing(true);
    try {
      await onAnalyzePerformance(activeLayout);
      alert("Theoretical Performance Report generated and saved to 'Diagnose' tab.");
    } finally {
      setIsAuditing(false);
    }
  };

  const notifyExport = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportGLB = async () => {
    if (!level3DGroup || !activeLayout) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const glbData = await exportToGLB(level3DGroup);
      const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadFile(glbData, `${safeName}_Level_Blockout.glb`, 'model/gltf-binary');
      notifyExport(`Exported ${safeName}_Level_Blockout.glb (glTF 2.0 Universal)`);
    } catch (err) {
      console.error('Failed to export GLB', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportOBJ = () => {
    if (!level3DGroup || !activeLayout) return;
    setShowExportMenu(false);
    const objData = exportToOBJ(level3DGroup);
    const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadFile(objData, `${safeName}_Level_Blockout.obj`, 'text/plain');
    notifyExport(`Exported ${safeName}_Level_Blockout.obj`);
  };

  const handleExportUE5 = async () => {
    if (!level3DGroup || !activeLayout) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      // Export .t3d level script
      const t3dScript = generateUE5T3DScript(safeName, 'Level', activeLayout);
      downloadFile(t3dScript, `${safeName}_UE5_Level.t3d`, 'text/plain');
      // Also export matching .glb
      const glbData = await exportToGLB(level3DGroup);
      downloadFile(glbData, `${safeName}_UE5_Mesh.glb`, 'model/gltf-binary');
      notifyExport(`Exported Unreal Engine 5 Level Package (.t3d + .glb)`);
    } catch (err) {
      console.error('Failed to export UE5 assets', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGodot = async () => {
    if (!level3DGroup || !activeLayout) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const glbFileName = `${safeName}_Godot_Mesh.glb`;
      const tscnData = generateGodotScene(safeName, glbFileName, 'Level');
      downloadFile(tscnData, `${safeName}_Level.tscn`, 'text/plain');
      const glbData = await exportToGLB(level3DGroup);
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported Godot 4 Level Package (.tscn + .glb)`);
    } catch (err) {
      console.error('Failed to export Godot assets', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUnity = async () => {
    if (!level3DGroup || !activeLayout) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const glbFileName = `${safeName}_Unity_Mesh.glb`;
      const prefabData = generateUnityPrefabManifest(safeName, glbFileName, 'Level');
      downloadFile(prefabData, `${safeName}_Level_Prefab.json`, 'application/json');
      const glbData = await exportToGLB(level3DGroup);
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported Unity Level Package (.prefab + .glb)`);
    } catch (err) {
      console.error('Failed to export Unity assets', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport2DMap = () => {
    if (!activeLayout?.imageBase64) return;
    setShowExportMenu(false);
    const link = document.createElement('a');
    link.href = activeLayout.imageBase64;
    const safeName = activeLayout.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeName}_Blueprint_Map.png`;
    link.click();
    notifyExport(`Downloaded 2D Blueprint Map (.png)`);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('poiId', id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const poiId = e.dataTransfer.getData('poiId');
    if (!poiId || !activeLayout?.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    onUpdatePosition(activeLayout.id, poiId, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getIcon = (type: PointOfInterest['type']) => {
    switch (type) {
      case 'Spawn': return <Navigation className="w-4 h-4 text-emerald-400" />;
      case 'Enemy': return <Ghost className="w-4 h-4 text-red-400" />;
      case 'Boss': return <Skull className="w-4 h-4 text-purple-400" />;
      case 'Loot': return <Coins className="w-4 h-4 text-yellow-400" />;
      case 'Puzzle': return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case 'NavMesh': return <Grid3X3 className="w-4 h-4 text-emerald-300" />;
      case 'Volume': return <Box className="w-4 h-4 text-blue-300" />;
      default: return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPoiStyle = (type: PointOfInterest['type']) => {
    if (type === 'NavMesh') return 'bg-emerald-950/40 border-emerald-500 border-2 rounded-lg w-16 h-12 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (type === 'Volume') return 'bg-blue-900/30 border-blue-400/50 border-2 dashed rounded-md w-10 h-10 flex items-center justify-center';
    return 'p-1.5 rounded-full border shadow-lg bg-slate-900 border-white/20';
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Map className="w-4 h-4" /> World Maps & Levels
          </h2>
          
          <button
            id="cartographer-generate-level-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg mb-4"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Generate New Level
          </button>

          <div className="space-y-2">
            {layouts.map(layout => (
              <button
                key={layout.id}
                id={`cartographer-layout-btn-${layout.id}`}
                onClick={() => setSelectedLayoutId(layout.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  (activeLayout?.id === layout.id)
                    ? 'bg-slate-800 text-white border border-slate-600'
                    : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{layout.name}</span>
                  {layout.location?.includes('Grounded') && <Globe className="w-3 h-3 text-blue-400 shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {activeLayout && (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Key Locations</h3>
              <div className="text-[9px] font-mono text-slate-600">{activeLayout.pointsOfInterest.length} POIs</div>
            </div>
            <div className="space-y-3">
              {activeLayout.pointsOfInterest.map(poi => (
                <div key={poi.id} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2 group/poi">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(poi.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{poi.name}</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-1">{poi.description}</div>
                    </div>
                  </div>
                  {poi.mapUri && (
                    <a 
                      href={poi.mapUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-blue-400 hover:text-white transition-colors bg-blue-500/5 px-2 py-1 rounded border border-blue-500/20"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View Real-World Reference
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Map / 3D World View */}
      <div className="flex-1 bg-[#0b0f19] p-6 lg:p-8 overflow-hidden relative flex flex-col">
        {exportNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            {exportNotice}
          </div>
        )}

        {activeLayout ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header controls */}
            <div className="mb-4 flex flex-wrap justify-between items-end gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl lg:text-3xl font-black text-white">{activeLayout.name}</h1>
                  {activeLayout.location?.includes('Grounded') && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                      <Globe className="w-3 h-3" /> Grounded Design
                    </div>
                  )}
                </div>
                <p className="text-slate-400 text-xs lg:text-sm max-w-2xl mt-1 line-clamp-1">{activeLayout.description}</p>
              </div>

              {/* View Mode Switcher & Export Menu */}
              <div className="flex items-center gap-2.5">
                {/* 2D / 3D Toggle */}
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/80 shadow-inner">
                  <button
                    id="cartographer-mode-2d"
                    onClick={() => setViewMode('2d')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      viewMode === '2d'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    2D Blueprint
                  </button>

                  <button
                    id="cartographer-mode-3d"
                    onClick={() => setViewMode('3d')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      viewMode === '3d'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BoxSelect className="w-3.5 h-3.5" />
                    3D World Blockout
                  </button>
                </div>

                {/* Open in Vision 3D Studio button */}
                {onNavigateToVision && (
                  <button
                    id="cartographer-open-in-vision-btn"
                    onClick={() => onNavigateToVision(activeLayout)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                    title="Open this world map level in Vision 3D Asset Studio to forge matching assets and concepts"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sync to Vision Studio</span>
                  </button>
                )}

                {/* Audit button */}
                <button
                  onClick={handleAudit}
                  disabled={isAuditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/20 transition-all shadow-md group"
                  title="Run Theoretical Performance Audit"
                >
                  {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />}
                  Audit
                </button>

                {/* Zoom controls for 2D mode */}
                {viewMode === '2d' && (
                  <div className="flex bg-slate-900 rounded-lg border border-white/5 overflow-hidden">
                    <button onClick={() => setZoom(z => Math.max(z - 25, 50))} className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
                    <span className="px-2 py-1.5 text-[10px] font-mono text-slate-500 border-x border-white/5 flex items-center min-w-[42px] justify-center">{zoom}%</span>
                    <button onClick={() => setZoom(z => Math.min(z + 25, 200))} className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                {/* Export Dropdown for All Engines */}
                <div className="relative">
                  <button
                    id="cartographer-export-dropdown-btn"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Export Game Assets</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl z-50 p-2 space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                        Engine-Ready Level Assets
                      </div>
                      
                      <button
                        onClick={handleExportGLB}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-mono font-bold">GLB</span>
                          Universal 3D Mesh
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">UE / Godot / Unity</span>
                      </button>

                      <button
                        onClick={handleExportOBJ}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-mono font-bold">OBJ</span>
                          Wavefront 3D Mesh
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Blender / Max</span>
                      </button>

                      <button
                        onClick={handleExportUE5}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[10px] font-mono font-bold">UE5</span>
                          Unreal Engine 5 Pack
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.T3D + .GLB</span>
                      </button>

                      <button
                        onClick={handleExportGodot}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 text-[10px] font-mono font-bold">GD4</span>
                          Godot 4 Scene
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.TSCN + .GLB</span>
                      </button>

                      <button
                        onClick={handleExportUnity}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono font-bold">UNT</span>
                          Unity Prefab Pack
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.Prefab + .GLB</span>
                      </button>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          onClick={handleExport2DMap}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                        >
                          <span>Download 2D Map (.PNG)</span>
                          <span className="text-[10px] text-slate-500">Image</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View Area: 2D Blueprint OR 3D World Blockout */}
            {viewMode === '2d' ? (
              <div className="flex-1 bg-slate-950 rounded-xl overflow-auto border border-slate-700 shadow-2xl group select-none custom-scrollbar relative">
                {activeLayout.imageBase64 ? (
                  <div 
                    className="relative transition-all duration-300 origin-top-left"
                    style={{ 
                      width: `${zoom}%`, 
                      minWidth: '100%',
                      aspectRatio: '16/9'
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <img 
                      src={activeLayout.imageBase64} 
                      alt="Map" 
                      className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      draggable={false}
                    />
                    
                    {/* POI Markers */}
                    {activeLayout.pointsOfInterest.map(poi => (
                      <div
                        key={poi.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, poi.id)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move hover:scale-110 transition-transform z-10"
                        style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                        title={poi.name}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-black/50 blur-sm rounded-full"></div>
                          <div className={`relative ${getPoiStyle(poi.type)} transition-colors`}>
                            {getIcon(poi.type)}
                            {poi.type === 'NavMesh' && <span className="absolute -top-6 text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">AI ZONE</span>}
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1.5">
                          {poi.name}
                          {poi.mapUri && <Globe className="w-2.5 h-2.5 text-blue-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              /* 3D World Blockout View */
              <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col">
                <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
                  <BoxSelect className="w-3.5 h-3.5 text-purple-400" />
                  <span>3D Greybox Level Mesh • {activeLayout.pointsOfInterest.length} POI Volumes</span>
                </div>
                <ThreeViewport modelGroup={level3DGroup} className="flex-1 w-full h-full" />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-3xl">
            <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Select or Generate a Level Layout</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cartographer;
