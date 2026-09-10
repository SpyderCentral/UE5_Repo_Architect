import React, { useState, useMemo } from 'react';
import { 
  X, Sparkles, Layers, Download, RefreshCw, Filter, Search, 
  CheckCircle2, AlertCircle, Play, Square, Eye, Edit3, Image as ImageIcon
} from 'lucide-react';
import JSZip from 'jszip';
import { BlueprintSpec, BlueprintArchetype, BlueprintThumbnailMetadata } from '../../types';
import { BlueprintThumbnailBadge } from './BlueprintThumbnailBadge';
import { 
  BlueprintIconStylePreset, 
  STYLE_PRESET_OPTIONS, 
  analyzeBlueprintFunctionAndNodes, 
  generateBlueprintThumbnail,
  generateProceduralVectorThumbnail,
  buildBlueprintThumbnailPrompt,
  saveStoredThumbnail
} from '../../services/blueprintThumbnailGenerator';

interface BlueprintThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  blueprints: Record<string, BlueprintSpec>;
  availableAssets: { name: string; desc?: string; type: string }[];
  storedThumbnails: Record<string, BlueprintThumbnailMetadata>;
  onUpdateThumbnail: (blueprintName: string, metadata: BlueprintThumbnailMetadata) => void;
  onBatchUpdateThumbnails: (batch: Record<string, BlueprintThumbnailMetadata>) => void;
}

export const BlueprintThumbnailStudioModal: React.FC<BlueprintThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  projectId,
  blueprints,
  availableAssets,
  storedThumbnails,
  onUpdateThumbnail,
  onBatchUpdateThumbnails
}) => {
  const [selectedStyle, setSelectedStyle] = useState<BlueprintIconStylePreset>('ue5-realistic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<BlueprintArchetype | 'ALL'>('ALL');
  const [generatingAssets, setGeneratingAssets] = useState<Record<string, boolean>>({});
  
  // Batch generation state
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentAsset: string }>({
    current: 0,
    total: 0,
    currentAsset: ''
  });
  const [cancelBatchRef, setCancelBatchRef] = useState(false);

  // Prompt edit dialog state
  const [editingAssetPrompt, setEditingAssetPrompt] = useState<{
    blueprintName: string;
    prompt: string;
    analysis: any;
  } | null>(null);

  // Inspector preview modal state
  const [inspectingThumbnail, setInspectingThumbnail] = useState<BlueprintThumbnailMetadata | null>(null);

  // Collect all blueprints from availableAssets (type === 'Blueprint' or 'Widget') or blueprints
  const allBlueprintAssets = useMemo(() => {
    const map = new Map<string, { name: string; desc?: string; spec?: BlueprintSpec }>();
    
    // Add from blueprints
    Object.values(blueprints as Record<string, BlueprintSpec>).forEach((spec: BlueprintSpec) => {
      if (spec && spec.assetName) {
        map.set(spec.assetName, { name: spec.assetName, spec });
      }
    });

    // Add from availableAssets
    availableAssets.forEach(a => {
      if (a.type === 'Blueprint' || a.type === 'Widget') {
        const existing = map.get(a.name);
        map.set(a.name, {
          name: a.name,
          desc: a.desc || existing?.desc,
          spec: existing?.spec || blueprints[a.name]
        });
      }
    });

    return Array.from(map.values());
  }, [blueprints, availableAssets]);

  // Analyzed list with metadata
  const analyzedAssets = useMemo(() => {
    return allBlueprintAssets.map(item => {
      const blueprintData = item.spec || { assetName: item.name, desc: item.desc };
      const analysis = analyzeBlueprintFunctionAndNodes(blueprintData);
      const thumbnail = storedThumbnails[item.name] || (item.spec?.thumbnailMetadata) || null;
      return {
        ...item,
        analysis,
        thumbnail
      };
    });
  }, [allBlueprintAssets, storedThumbnails]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return analyzedAssets.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.analysis.primaryFunction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.analysis.archetypeLabel.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesArchetype = selectedArchetype === 'ALL' || item.analysis.archetype === selectedArchetype;

      return matchesSearch && matchesArchetype;
    });
  }, [analyzedAssets, searchQuery, selectedArchetype]);

  // Statistics
  const stats = useMemo(() => {
    const total = analyzedAssets.length;
    const generated = analyzedAssets.filter(a => a.thumbnail).length;
    const aiCount = analyzedAssets.filter(a => a.thumbnail?.isAiGenerated).length;
    const proceduralCount = analyzedAssets.filter(a => a.thumbnail && !a.thumbnail.isAiGenerated).length;
    const missing = total - generated;
    return { total, generated, aiCount, proceduralCount, missing };
  }, [analyzedAssets]);

  // Single Item AI Generation
  const handleGenerateSingle = async (assetName: string, customPrompt?: string) => {
    const item = analyzedAssets.find(a => a.name === assetName);
    if (!item) return;

    setGeneratingAssets(prev => ({ ...prev, [assetName]: true }));
    try {
      const spec = item.spec || { assetName: item.name, desc: item.desc };
      const metadata = await generateBlueprintThumbnail(spec, selectedStyle, customPrompt);
      saveStoredThumbnail(projectId, metadata);
      onUpdateThumbnail(assetName, metadata);
    } catch (err) {
      console.error(`Failed to generate thumbnail for ${assetName}:`, err);
    } finally {
      setGeneratingAssets(prev => ({ ...prev, [assetName]: false }));
    }
  };

  // Single Item Procedural Instant Generation
  const handleGenerateProcedural = (assetName: string) => {
    const item = analyzedAssets.find(a => a.name === assetName);
    if (!item) return;

    const proceduralUrl = generateProceduralVectorThumbnail(assetName, item.analysis, selectedStyle);
    const metadata: BlueprintThumbnailMetadata = {
      blueprintName: assetName,
      imageUrl: proceduralUrl,
      prompt: buildBlueprintThumbnailPrompt(item.analysis, selectedStyle),
      archetype: item.analysis.archetype,
      archetypeLabel: item.analysis.archetypeLabel,
      primaryFunction: item.analysis.primaryFunction,
      keyNodes: item.analysis.keyNodes,
      colorTheme: item.analysis.accentHex,
      accentHex: item.analysis.accentHex,
      generatedAt: Date.now(),
      isAiGenerated: false,
      stylePreset: selectedStyle
    };

    saveStoredThumbnail(projectId, metadata);
    onUpdateThumbnail(assetName, metadata);
  };

  // Instant Procedural Generation for all missing
  const handleGenerateAllProcedural = () => {
    const batch: Record<string, BlueprintThumbnailMetadata> = {};
    analyzedAssets.forEach(item => {
      const proceduralUrl = generateProceduralVectorThumbnail(item.name, item.analysis, selectedStyle);
      const meta: BlueprintThumbnailMetadata = {
        blueprintName: item.name,
        imageUrl: proceduralUrl,
        prompt: buildBlueprintThumbnailPrompt(item.analysis, selectedStyle),
        archetype: item.analysis.archetype,
        archetypeLabel: item.analysis.archetypeLabel,
        primaryFunction: item.analysis.primaryFunction,
        keyNodes: item.analysis.keyNodes,
        colorTheme: item.analysis.accentHex,
        accentHex: item.analysis.accentHex,
        generatedAt: Date.now(),
        isAiGenerated: false,
        stylePreset: selectedStyle
      };
      batch[item.name] = meta;
    });

    onBatchUpdateThumbnails(batch);
  };

  // Batch AI Generation
  const handleStartBatchAiGeneration = async () => {
    const targets = analyzedAssets.filter(a => !a.thumbnail?.isAiGenerated);
    if (targets.length === 0) return;

    setIsBatchRunning(true);
    setCancelBatchRef(false);
    setBatchProgress({ current: 0, total: targets.length, currentAsset: '' });

    const batchUpdates: Record<string, BlueprintThumbnailMetadata> = {};

    for (let i = 0; i < targets.length; i++) {
      if (cancelBatchRef) {
        break;
      }

      const target = targets[i];
      setBatchProgress({ current: i + 1, total: targets.length, currentAsset: target.name });
      setGeneratingAssets(prev => ({ ...prev, [target.name]: true }));

      try {
        const spec = target.spec || { assetName: target.name, desc: target.desc };
        const meta = await generateBlueprintThumbnail(spec, selectedStyle);
        saveStoredThumbnail(projectId, meta);
        onUpdateThumbnail(target.name, meta);
        batchUpdates[target.name] = meta;
      } catch (e) {
        console.warn(`Batch item failed for ${target.name}`, e);
      } finally {
        setGeneratingAssets(prev => ({ ...prev, [target.name]: false }));
      }

      // Small throttling delay to avoid aggressive rate limiting
      await new Promise(r => setTimeout(r, 600));
    }

    setIsBatchRunning(false);
  };

  const handleStopBatch = () => {
    setCancelBatchRef(true);
    setIsBatchRunning(false);
  };

  // Download Single Icon PNG or SVG
  const handleDownloadIcon = (metadata: BlueprintThumbnailMetadata) => {
    const link = document.createElement('a');
    link.href = metadata.imageUrl;
    const extension = metadata.imageUrl.startsWith('data:image/svg') ? 'svg' : 'png';
    link.download = `T_Icon_${metadata.blueprintName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download All Generated Icons as ZIP Bundle
  const handleDownloadAllAsZip = async () => {
    const itemsToExport = analyzedAssets.filter(a => a.thumbnail);
    if (itemsToExport.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("UE5_Blueprint_Icons");

    for (const item of itemsToExport) {
      if (!item.thumbnail) continue;
      const fileName = `T_Icon_${item.name}`;
      const url = item.thumbnail.imageUrl;

      if (url.startsWith('data:image/svg+xml')) {
        const svgContent = decodeURIComponent(url.replace('data:image/svg+xml;utf8,', ''));
        folder?.file(`${fileName}.svg`, svgContent);
      } else if (url.startsWith('data:image/png;base64,')) {
        const base64Data = url.replace('data:image/png;base64,', '');
        folder?.file(`${fileName}.png`, base64Data, { base64: true });
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${projectId}_UE5_Blueprint_Icons.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">Blueprint Visual Identity Studio</h2>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase rounded border border-blue-500/30">
                  AI Auto-Icon Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically generate unique, recognizable thumbnail icons for blueprints based on gameplay function and node architectures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAllAsZip}
              disabled={stats.generated === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Download all generated icons as a packaged ZIP bundle for Unreal Engine Content Browser"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export ZIP ({stats.generated})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar & Stats */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
          
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
              <span className="text-slate-400">Total:</span>
              <span className="font-bold text-white">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30 text-amber-300">
              <Sparkles className="w-3 h-3" />
              <span>AI Gen:</span>
              <span className="font-bold">{stats.aiCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-300">
              <Layers className="w-3 h-3" />
              <span>Vector:</span>
              <span className="font-bold">{stats.proceduralCount}</span>
            </div>
            {stats.missing > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 rounded-lg border border-slate-700 text-slate-400">
                <span>Pending:</span>
                <span className="font-bold text-slate-300">{stats.missing}</span>
              </div>
            )}
          </div>

          {/* Batch Generation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAllProcedural}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Instantly generate procedural vector icons for all blueprints"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Vector All</span>
            </button>

            {isBatchRunning ? (
              <button
                onClick={handleStopBatch}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Batch</span>
              </button>
            ) : (
              <button
                onClick={handleStartBatchAiGeneration}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                title="Automatically generate AI thumbnails sequentially for all blueprints"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate All with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Batch Progress Bar (if active) */}
        {isBatchRunning && (
          <div className="px-6 py-2.5 bg-blue-950/40 border-b border-blue-900/50 flex items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-slate-300">
                Processing {batchProgress.current} of {batchProgress.total}:
              </span>
              <span className="text-blue-300 font-bold">{batchProgress.currentAsset}</span>
            </div>
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters & Style Selector */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          
          {/* Style Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Style:</span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {STYLE_PRESET_OPTIONS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStyle === preset.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Archetype Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search blueprints or functions..."
                className="bg-slate-950 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 outline-none w-56 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedArchetype}
              onChange={e => setSelectedArchetype(e.target.value as any)}
              className="bg-slate-950 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Archetypes</option>
              <option value="combat">Combat & Weapons</option>
              <option value="locomotion">Locomotion & Physics</option>
              <option value="ai">Neural AI & Behavior</option>
              <option value="inventory">Inventory & Economy</option>
              <option value="ui">Tactical HUD & UI</option>
              <option value="world">World & Interaction</option>
              <option value="vfx">VFX & Spellcasting</option>
              <option value="audio">Audio & MetaSound</option>
              <option value="network">Multiplayer & Network</option>
              <option value="system">System Subsystem</option>
            </select>
          </div>
        </div>

        {/* Blueprint Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No blueprints matching criteria</p>
              <p className="text-xs text-slate-600 mt-1">Try resetting filters or search query</p>
            </div>
          ) : (
            filteredAssets.map(item => {
              const isGen = generatingAssets[item.name] || false;
              const hasThumbnail = !!item.thumbnail;

              return (
                <div
                  key={item.name}
                  className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    hasThumbnail
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Row: Thumbnail + Title */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <BlueprintThumbnailBadge
                        thumbnail={item.thumbnail}
                        size="md"
                        isGenerating={isGen}
                        onClick={() => item.thumbnail && setInspectingThumbnail(item.thumbnail)}
                        className="flex-shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border"
                            style={{
                              backgroundColor: `${item.analysis.accentHex}15`,
                              color: item.analysis.secondaryHex,
                              borderColor: `${item.analysis.accentHex}40`
                            }}
                          >
                            {item.analysis.archetypeLabel}
                          </span>
                          {hasThumbnail && (
                            <span className="text-[9px] font-mono text-slate-500">
                              {item.thumbnail?.isAiGenerated ? 'AI Model' : 'Vector SVG'}
                            </span>
                          )}
                        </div>

                        <h3 className="font-mono font-bold text-sm text-white truncate tracking-tight" title={item.name}>
                          {item.name}
                        </h3>

                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.analysis.primaryFunction}
                        </p>
                      </div>
                    </div>

                    {/* Key Graph Nodes Chips */}
                    <div className="flex flex-wrap items-center gap-1 my-2.5">
                      {item.analysis.keyNodes.map(node => (
                        <span
                          key={node}
                          className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[9px] font-mono border border-slate-800"
                        >
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleGenerateSingle(item.name)}
                        disabled={isGen || isBatchRunning}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        title="Generate unique AI icon with Gemini flash image model"
                      >
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span>AI Gen</span>
                      </button>

                      <button
                        onClick={() => handleGenerateProcedural(item.name)}
                        disabled={isGen || isBatchRunning}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Generate procedural vector icon (instant)"
                      >
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Vector</span>
                      </button>

                      <button
                        onClick={() => setEditingAssetPrompt({
                          blueprintName: item.name,
                          prompt: item.thumbnail?.prompt || buildBlueprintThumbnailPrompt(item.analysis, selectedStyle),
                          analysis: item.analysis
                        })}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Customize prompt"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>

                    {item.thumbnail && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInspectingThumbnail(item.thumbnail)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Preview thumbnail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadIcon(item.thumbnail!)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Download icon file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Generated icons are formatted for Unreal Engine Content Browser / UI icon palettes</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>

      {/* Inspect / Zoom Dialog */}
      {inspectingThumbnail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <button
              onClick={() => setInspectingThumbnail(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <BlueprintThumbnailBadge
              thumbnail={inspectingThumbnail}
              size="xl"
              className="mb-4"
            />

            <div className="flex items-center gap-1.5 mb-1">
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${inspectingThumbnail.accentHex}15`,
                  color: inspectingThumbnail.accentHex,
                  borderColor: `${inspectingThumbnail.accentHex}40`
                }}
              >
                {inspectingThumbnail.archetypeLabel}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {inspectingThumbnail.isAiGenerated ? 'Gemini Flash Image' : 'Procedural Vector SVG'}
              </span>
            </div>

            <h3 className="font-mono font-black text-lg text-white mb-2">{inspectingThumbnail.blueprintName}</h3>
            
            <p className="text-xs text-slate-300 mb-4 px-2 leading-relaxed">
              {inspectingThumbnail.primaryFunction}
            </p>

            <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-left">
              <span className="text-[10px] font-mono text-slate-500 block mb-1">Prompt Spec:</span>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-4">
                {inspectingThumbnail.prompt}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => handleDownloadIcon(inspectingThumbnail)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Icon File</span>
              </button>
              <button
                onClick={() => setInspectingThumbnail(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Customization Dialog */}
      {editingAssetPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-base">Customize AI Thumbnail Prompt</h3>
              </div>
              <button
                onClick={() => setEditingAssetPrompt(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Editing generation parameters for <span className="text-white font-mono font-bold">{editingAssetPrompt.blueprintName}</span>.
            </p>

            <textarea
              value={editingAssetPrompt.prompt}
              onChange={e => setEditingAssetPrompt({ ...editingAssetPrompt, prompt: e.target.value })}
              rows={6}
              className="w-full bg-slate-950 text-white text-xs font-mono p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 mb-4 leading-relaxed"
              placeholder="Enter custom prompt instructions for the image model..."
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingAssetPrompt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const name = editingAssetPrompt.blueprintName;
                  const prompt = editingAssetPrompt.prompt;
                  setEditingAssetPrompt(null);
                  await handleGenerateSingle(name, prompt);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate with Custom Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
