import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GamePlan, 
  BlueprintSpec, 
  MaterialSpec, 
  EnhancedInputSpec, 
  NodeData, 
  CppCode, 
  TutorialLink, 
  MetaSoundSpec, 
  PcgSpec, 
  BehaviorTreeSpec, 
  AssetResourceMetric,
  VerseCode,
  UE6ReadinessAudit,
  BlueprintTemplate,
  BlueprintComplexityInfo
} from '../types';
import { 
  BoxSelect, Cpu, Database, Palette, Gamepad2, Layout, ArrowRight, Loader2, Download, Zap, Code, 
  FileCode2, Copy, Check, HelpCircle, ClipboardCopy, Plus, X, Sparkles, Terminal, Youtube, Music, 
  Box, ShieldCheck, ShieldAlert, User, Shield, Layers, Settings, Activity, Brain, FunctionSquare, 
  Braces, BellRing, Gauge, Flame, HardDrive, AlertTriangle, ExternalLink, Search, Filter, 
  FolderTree, Folder, ArrowUpDown, SlidersHorizontal, RotateCcw, CheckCircle2, CircleDashed, 
  ChevronDown, ChevronRight, Tag, CheckSquare, Square, GitFork, ListChecks, ArrowLeft, Boxes, BookmarkPlus
} from 'lucide-react';
import BlueprintCanvas from './blueprint/BlueprintCanvas';
import BehaviorArchitect from './BehaviorArchitect';
import InputDesigner from './subsystems/InputDesigner';
import TutorialGallery from './TutorialGallery';
import { useGamePlan } from '../hooks/useGamePlan';
import { exportBlueprintSpecToPdf, exportMultipleBlueprintSpecsToPdf } from '../services/blueprintPdfExporter';
import { 
  getAssetTags, 
  setAssetTags, 
  addAssetTag, 
  removeAssetTag, 
  getAllUniqueTags, 
  getTagStyle, 
  PRESET_TAGS 
} from '../services/blueprintTags';
import { buildDependencyGraph } from '../services/blueprintDependencyGraph';
import BlueprintDependencyGraph from './BlueprintDependencyGraph';
import UE6VerseHub from './UE6VerseHub';
import { TemplateLibrary } from './TemplateLibrary';
import { transpileBlueprintToVerse } from '../services/verseGenerator';
import { parseSearchQuery, matchesSearchFilter, ParsedSearchFilter } from '../services/searchFilterParser';
import { calculateBlueprintComplexity } from '../services/blueprintComplexity';
import { NodeHeatmapViewer } from './NodeHeatmapViewer';
import NodeExecutionFlowChart from './blueprint/NodeExecutionFlowChart';
import { BlueprintThumbnailBadge } from './blueprint/BlueprintThumbnailBadge';
import { BlueprintThumbnailStudioModal } from './blueprint/BlueprintThumbnailStudioModal';
import { 
  getAllStoredThumbnails, 
  saveStoredThumbnail, 
  batchSaveThumbnails, 
  generateBlueprintThumbnail, 
  analyzeBlueprintFunctionAndNodes 
} from '../services/blueprintThumbnailGenerator';
import { 
  calculateBlueprintMetric, 
  calculateMaterialMetric, 
  calculatePcgMetric, 
  calculateMetaSoundMetric, 
  calculateBehaviorTreeMetric, 
  calculateInputMetric, 
  PLATFORM_PRESETS 
} from '../services/resourceCalculator';
import { BlueprintThumbnailMetadata } from '../types';

interface BlueprintArchitectProps {
  plan: GamePlan;
  onGenerateBlueprint: (name: string, desc: string) => Promise<BlueprintSpec>;
  onGenerateBehaviorTree: (name: string, desc: string) => Promise<BehaviorTreeSpec>;
  onGenerateMaterial: (name: string, desc: string) => Promise<MaterialSpec>;
  onGenerateInput: (name: string, desc: string) => Promise<EnhancedInputSpec>;
  onGenerateMetaSound: (name: string, desc: string) => Promise<MetaSoundSpec>;
  onGeneratePcg: (name: string, desc: string) => Promise<PcgSpec>;
  onGenerateCpp: (name: string, spec: BlueprintSpec) => Promise<CppCode>;
  onGenerateT3d: (name: string, spec: BlueprintSpec) => Promise<string>;
  selectedAsset: string | null;
  onSelectAsset: (name: string) => void;
  onNavigateToResources?: () => void;
  savedBlueprints: Record<string, BlueprintSpec>;
  savedBehaviorTrees: Record<string, BehaviorTreeSpec>;
  savedMaterials: Record<string, MaterialSpec>;
  savedInputs: Record<string, EnhancedInputSpec>;
  savedMetaSounds: Record<string, MetaSoundSpec>;
  savedPcgs: Record<string, PcgSpec>;
  savedCppCodes: Record<string, CppCode>;
  savedVerseCodes?: Record<string, VerseCode>;
  onGenerateVerse?: (name: string, spec: BlueprintSpec) => Promise<VerseCode>;
  batchSetVerseCodes?: (codes: Record<string, VerseCode>) => void;
  ue6Audit?: UE6ReadinessAudit;
  onUpdateUE6Audit?: (audit: UE6ReadinessAudit) => void;
  onRegisterBlueprint?: (name: string, spec: BlueprintSpec) => void;
}

export type AssetType = 'Blueprint' | 'Material' | 'Input' | 'Widget' | 'MetaSound' | 'PCG' | 'BehaviorTree' | 'Unknown';

export interface AssetItem {
  name: string;
  desc?: string;
  folder: string;
  type: AssetType;
}

export type SortOption = 'recent' | 'name_asc' | 'name_desc' | 'type' | 'folder' | 'cost' | 'complexity_desc' | 'complexity_asc';

const BlueprintArchitect: React.FC<BlueprintArchitectProps> = ({ 
  plan, 
  onGenerateBlueprint,
  onGenerateBehaviorTree,
  onGenerateMaterial,
  onGenerateInput,
  onGenerateMetaSound,
  onGeneratePcg,
  onGenerateCpp,
  onGenerateT3d,
  selectedAsset,
  onSelectAsset,
  onNavigateToResources,
  savedBlueprints = {},
  savedBehaviorTrees = {},
  savedMaterials = {},
  savedInputs = {},
  savedMetaSounds = {},
  savedPcgs = {},
  savedCppCodes = {},
  savedVerseCodes = {},
  onGenerateVerse,
  batchSetVerseCodes,
  ue6Audit,
  onUpdateUE6Audit,
  onRegisterBlueprint
}) => {
  const projectId = useMemo(() => plan?.title || 'default_project', [plan?.title]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingMultiPdf, setIsExportingMultiPdf] = useState(false);
  const [viewMode, setViewMode] = useState<'blueprint' | 'dependency' | 'cpp' | 'verse' | 'ue6readiness' | 'templates' | 'heatmap' | 'flowchart'>('blueprint');
  const [copiedCode, setCopiedCode] = useState<'header' | 'source' | 't3d' | null>(null);

  const handleInstantiateTemplate = (template: BlueprintTemplate, customName: string) => {
    const specToSave: BlueprintSpec = {
      ...template.spec,
      assetName: customName
    };
    if (onRegisterBlueprint) {
      onRegisterBlueprint(customName, specToSave);
    }
    if (template.verseCode && batchSetVerseCodes && savedVerseCodes) {
      batchSetVerseCodes({
        ...savedVerseCodes,
        [customName]: {
          ...template.verseCode,
          fileName: `${customName.toLowerCase()}.verse`
        }
      });
    }
    onSelectAsset(customName);
    setViewMode('blueprint');
  };

  // Search, Filter & Organization State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSyntaxHelp, setShowSearchSyntaxHelp] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | AssetType>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [isGroupedByFolder, setIsGroupedByFolder] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  
  // Multi-Selection State for Combined PDF Export
  const [selectedAssetsForExport, setSelectedAssetsForExport] = useState<Set<string>>(new Set());
  const [isBatchSelectMode, setIsBatchSelectMode] = useState(false);

  // Tag Management State
  const [tagRefreshKey, setTagRefreshKey] = useState(0);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  // Recently Modified / Accessed Tracker
  const [recentAccessTimestamps, setRecentAccessTimestamps] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(`ue5_recent_access_${projectId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track access timestamp whenever selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      setRecentAccessTimestamps(prev => {
        const next = { ...prev, [selectedAsset]: Date.now() };
        try {
          localStorage.setItem(`ue5_recent_access_${projectId}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [selectedAsset, projectId]);

  // Blueprint Visual Identity & Thumbnail Studio State
  const [isThumbnailStudioOpen, setIsThumbnailStudioOpen] = useState(false);
  const [storedThumbnails, setStoredThumbnails] = useState<Record<string, BlueprintThumbnailMetadata>>(() => {
    return getAllStoredThumbnails(projectId);
  });
  const [isGeneratingSingleThumbnail, setIsGeneratingSingleThumbnail] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStoredThumbnails(getAllStoredThumbnails(projectId));
  }, [projectId]);

  const handleUpdateThumbnail = (blueprintName: string, metadata: BlueprintThumbnailMetadata) => {
    setStoredThumbnails(prev => ({ ...prev, [blueprintName]: metadata }));
    if (savedBlueprints[blueprintName] && onRegisterBlueprint) {
      onRegisterBlueprint(blueprintName, {
        ...savedBlueprints[blueprintName],
        thumbnailUrl: metadata.imageUrl,
        thumbnailMetadata: metadata
      });
    }
  };

  const handleBatchUpdateThumbnails = (batch: Record<string, BlueprintThumbnailMetadata>) => {
    batchSaveThumbnails(projectId, batch);
    setStoredThumbnails(prev => ({ ...prev, ...batch }));
    if (onRegisterBlueprint) {
      Object.entries(batch).forEach(([name, meta]) => {
        if (savedBlueprints[name]) {
          onRegisterBlueprint(name, {
            ...savedBlueprints[name],
            thumbnailUrl: meta.imageUrl,
            thumbnailMetadata: meta
          });
        }
      });
    }
  };

  const handleGenerateSingleThumbnail = async (assetName: string) => {
    const spec = savedBlueprints[assetName] || uniqueAssets.find(a => a.name === assetName);
    if (!spec) return;
    setIsGeneratingSingleThumbnail(prev => ({ ...prev, [assetName]: true }));
    try {
      const meta = await generateBlueprintThumbnail(spec as any, 'ue5-realistic');
      saveStoredThumbnail(projectId, meta);
      handleUpdateThumbnail(assetName, meta);
    } catch (err) {
      console.error("Failed to generate thumbnail for " + assetName, err);
    } finally {
      setIsGeneratingSingleThumbnail(prev => ({ ...prev, [assetName]: false }));
    }
  };

  // Keyboard shortcut listener (/ or Ctrl/Cmd+K to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const currentAssetMetric = useMemo<AssetResourceMetric | null>(() => {
    if (!selectedAsset) return null;
    const defaultPlatform = PLATFORM_PRESETS[0]; // PC High 60 FPS baseline
    if (savedBlueprints[selectedAsset]) {
      return calculateBlueprintMetric(selectedAsset, savedBlueprints[selectedAsset], defaultPlatform);
    }
    if (savedMaterials[selectedAsset]) {
      return calculateMaterialMetric(selectedAsset, savedMaterials[selectedAsset], defaultPlatform);
    }
    if (savedPcgs[selectedAsset]) {
      return calculatePcgMetric(selectedAsset, savedPcgs[selectedAsset], defaultPlatform);
    }
    if (savedMetaSounds[selectedAsset]) {
      return calculateMetaSoundMetric(selectedAsset, savedMetaSounds[selectedAsset], defaultPlatform);
    }
    if (savedBehaviorTrees[selectedAsset]) {
      return calculateBehaviorTreeMetric(selectedAsset, savedBehaviorTrees[selectedAsset], defaultPlatform);
    }
    if (savedInputs[selectedAsset]) {
      return calculateInputMetric(selectedAsset, savedInputs[selectedAsset], defaultPlatform);
    }
    return null;
  }, [selectedAsset, savedBlueprints, savedMaterials, savedPcgs, savedMetaSounds, savedBehaviorTrees, savedInputs]);
  
  const assets = useMemo(() => {
    const planPhases = plan?.phases || [];
    const planAssets = planPhases.flatMap(phase => 
        (phase.tasks || [])
          .filter(t => t.assetName && t.assetName.length > 2)
          .map(t => {
              let type: AssetType = 'Unknown';
              const n = t.assetName;
              if (n.startsWith('BP_') || n.startsWith('ABP_')) type = 'Blueprint';
              else if (n.startsWith('WBP_')) type = 'Widget';
              else if (n.startsWith('M_') || n.startsWith('MI_')) type = 'Material';
              else if (n.startsWith('IA_') || n.startsWith('IMC_')) type = 'Input';
              else if (n.startsWith('MS_')) type = 'MetaSound';
              else if (n.startsWith('PCG_')) type = 'PCG';
              else if (n.startsWith('BT_') || n.startsWith('BB_')) type = 'BehaviorTree';
              else if (n.startsWith('BPC_')) type = 'Blueprint';
              else if (n.startsWith('GM_')) type = 'Blueprint';
              
              return { name: n, desc: t.description, folder: t.folderPath || '/Game/Blueprints', type };
          })
    );

    // Also ensure all cached assets from saved state are included in the map
    const map = new Map<string, { name: string; desc?: string; folder: string; type: AssetType }>();
    planAssets.forEach(item => map.set(item.name, item));

    Object.keys(savedBlueprints || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: savedBlueprints[name]?.parentClass ? `Parent: ${savedBlueprints[name].parentClass}` : 'Blueprint Logic Asset',
          folder: '/Game/Blueprints',
          type: name.startsWith('WBP_') ? 'Widget' : 'Blueprint'
        });
      }
    });
    Object.keys(savedBehaviorTrees || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: 'AI Behavior Tree Architecture',
          folder: '/Game/AI/Behaviors',
          type: 'BehaviorTree'
        });
      }
    });
    Object.keys(savedInputs || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: 'Enhanced Input Action / Context',
          folder: '/Game/Input',
          type: 'Input'
        });
      }
    });
    Object.keys(savedMaterials || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: 'PBR Material Shader Graph',
          folder: '/Game/Materials',
          type: 'Material'
        });
      }
    });
    Object.keys(savedMetaSounds || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: 'Procedural Audio DSP Graph',
          folder: '/Game/Audio',
          type: 'MetaSound'
        });
      }
    });
    Object.keys(savedPcgs || {}).forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          desc: 'Procedural Content Generation Graph',
          folder: '/Game/PCG',
          type: 'PCG'
        });
      }
    });

    return Array.from(map.values());
  }, [plan, savedBlueprints, savedBehaviorTrees, savedInputs, savedMaterials, savedMetaSounds, savedPcgs]);

  const uniqueAssets = useMemo(() => {
     return Array.from(new Map(assets.map(item => [item.name, item])).values());
  }, [assets]);

  // Unique tags for filter navigation
  const uniqueTags = useMemo(() => {
    return getAllUniqueTags(projectId, uniqueAssets);
  }, [projectId, uniqueAssets, tagRefreshKey]);

  // Dependency Graph Data
  const dependencyGraphData = useMemo(() => {
    return buildDependencyGraph(
      plan,
      savedBlueprints,
      savedBehaviorTrees,
      savedInputs,
      savedMaterials,
      savedMetaSounds,
      savedPcgs,
      projectId
    );
  }, [plan, savedBlueprints, savedBehaviorTrees, savedInputs, savedMaterials, savedMetaSounds, savedPcgs, projectId, tagRefreshKey]);

  // Helper to check if asset has already been generated
  const isAssetGenerated = (assetName: string, type: AssetType): boolean => {
    if (type === 'Blueprint' || type === 'Widget') return !!savedBlueprints[assetName];
    if (type === 'BehaviorTree') return !!savedBehaviorTrees[assetName];
    if (type === 'Input') return !!savedInputs[assetName];
    if (type === 'Material') return !!savedMaterials[assetName];
    if (type === 'MetaSound') return !!savedMetaSounds[assetName];
    if (type === 'PCG') return !!savedPcgs[assetName];
    return !!(savedBlueprints[assetName] || savedBehaviorTrees[assetName] || savedInputs[assetName] || savedMaterials[assetName] || savedMetaSounds[assetName] || savedPcgs[assetName]);
  };

  // Helper to get estimated or calculated cost for sorting
  const getAssetCost = (assetName: string): number => {
    const defaultPlatform = PLATFORM_PRESETS[0];
    if (savedBlueprints[assetName]) return calculateBlueprintMetric(assetName, savedBlueprints[assetName], defaultPlatform).cpuCostMs;
    if (savedBehaviorTrees[assetName]) return calculateBehaviorTreeMetric(assetName, savedBehaviorTrees[assetName], defaultPlatform).cpuCostMs;
    if (savedMaterials[assetName]) return calculateMaterialMetric(assetName, savedMaterials[assetName], defaultPlatform).gpuCostMs;
    return 0.1;
  };

  // Count per asset type for filter badge display
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: uniqueAssets.length,
      Blueprint: 0,
      BehaviorTree: 0,
      Input: 0,
      Widget: 0,
      Material: 0,
      MetaSound: 0,
      PCG: 0,
    };
    uniqueAssets.forEach(a => {
      if (counts[a.type] !== undefined) {
        counts[a.type]++;
      }
    });
    return counts;
  }, [uniqueAssets]);

  // Complexity Score map for all assets
  const complexityMap = useMemo<Map<string, BlueprintComplexityInfo>>(() => {
    const map = new Map<string, BlueprintComplexityInfo>();
    uniqueAssets.forEach(asset => {
      const bp = savedBlueprints[asset.name];
      map.set(asset.name, calculateBlueprintComplexity(asset.name, bp, bp?.parentClass));
    });
    return map;
  }, [uniqueAssets, savedBlueprints]);

  // Parse advanced search query into structured tokens
  const parsedSearchFilter = useMemo<ParsedSearchFilter>(() => {
    return parseSearchQuery(searchQuery);
  }, [searchQuery]);

  // Filtered and Sorted Assets
  const filteredAndSortedAssets = useMemo(() => {
    return uniqueAssets
      .filter(asset => {
        // 1. UI Dropdown Type Filter
        if (selectedTypeFilter !== 'ALL' && asset.type !== selectedTypeFilter) {
          return false;
        }
        
        // 2. UI Status Filter
        const generated = isAssetGenerated(asset.name, asset.type);
        if (statusFilter === 'generated' && !generated) return false;
        if (statusFilter === 'pending' && generated) return false;

        // 3. UI Tag Filter
        const tags = getAssetTags(projectId, asset.name, asset.type);
        if (selectedTagFilter !== 'ALL') {
          if (!tags.includes(selectedTagFilter)) return false;
        }

        // 4. Advanced Search Query Parser Matching (handles text & tokens like type:AI status:todo score:>50)
        const bpSpec = savedBlueprints[asset.name];
        const complexity = complexityMap.get(asset.name);
        const cost = getAssetCost(asset.name);

        const matches = matchesSearchFilter(asset, parsedSearchFilter, {
          isGenerated: generated,
          tags,
          parentClass: bpSpec?.parentClass,
          complexity,
          nodeCount: complexity?.breakdown.nodeCount
        });

        return matches;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          const timeA = recentAccessTimestamps[a.name] || 0;
          const timeB = recentAccessTimestamps[b.name] || 0;
          if (timeB !== timeA) return timeB - timeA;
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'type') {
          return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        }
        if (sortBy === 'folder') {
          return (a.folder || '').localeCompare(b.folder || '') || a.name.localeCompare(b.name);
        }
        if (sortBy === 'cost') {
          const costA = getAssetCost(a.name);
          const costB = getAssetCost(b.name);
          return costB - costA || a.name.localeCompare(b.name);
        }
        if (sortBy === 'complexity_desc') {
          const scoreA = complexityMap.get(a.name)?.score || 0;
          const scoreB = complexityMap.get(b.name)?.score || 0;
          return scoreB - scoreA || a.name.localeCompare(b.name);
        }
        if (sortBy === 'complexity_asc') {
          const scoreA = complexityMap.get(a.name)?.score || 0;
          const scoreB = complexityMap.get(b.name)?.score || 0;
          return scoreA - scoreB || a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [uniqueAssets, searchQuery, parsedSearchFilter, selectedTypeFilter, selectedTagFilter, statusFilter, sortBy, recentAccessTimestamps, savedBlueprints, savedBehaviorTrees, savedInputs, savedMaterials, savedMetaSounds, savedPcgs, projectId, tagRefreshKey, complexityMap]);

  // Grouped by Folder Map
  const folderGroupedAssets = useMemo<Record<string, AssetItem[]>>(() => {
    const groups: Record<string, AssetItem[]> = {};
    filteredAndSortedAssets.forEach(asset => {
      const folder = asset.folder || '/Game/Blueprints';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(asset);
    });
    return groups;
  }, [filteredAndSortedAssets]);

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTypeFilter('ALL');
    setSelectedTagFilter('ALL');
    setStatusFilter('all');
    setSortBy('name_asc');
  };

  // Multi-Selection Toggle
  const toggleAssetSelection = (assetName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssetsForExport(prev => {
      const next = new Set(prev);
      if (next.has(assetName)) {
        next.delete(assetName);
      } else {
        next.add(assetName);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    const blueprintNames = filteredAndSortedAssets
      .filter(a => a.type === 'Blueprint' || a.type === 'Widget')
      .map(a => a.name);
    setSelectedAssetsForExport(new Set(blueprintNames));
  };

  const clearSelection = () => {
    setSelectedAssetsForExport(new Set());
  };

  // Tag Management Handlers
  const handleAddTag = (tagToAdd: string) => {
    if (!selectedAsset || !tagToAdd.trim()) return;
    addAssetTag(projectId, selectedAsset, tagToAdd.trim());
    setTagRefreshKey(k => k + 1);
    setCustomTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedAsset) return;
    removeAssetTag(projectId, selectedAsset, tagToRemove);
    setTagRefreshKey(k => k + 1);
  };

  useEffect(() => {
    const triggerGeneration = async () => {
        if (!selectedAsset) return;
        if (isGenerating) return;

        const assetData = uniqueAssets.find(b => b.name === selectedAsset);
        if (!assetData) return;

        if (assetData.type === 'Blueprint' || assetData.type === 'Widget') {
            if (savedBlueprints && savedBlueprints[selectedAsset]) return;
        } else if (assetData.type === 'BehaviorTree') {
            if (savedBehaviorTrees && savedBehaviorTrees[selectedAsset]) return;
        } else if (assetData.type === 'Material') {
            if (savedMaterials && savedMaterials[selectedAsset]) return;
        } else if (assetData.type === 'Input') {
            if (savedInputs && savedInputs[selectedAsset]) return;
        } else if (assetData.type === 'MetaSound') {
            if (savedMetaSounds && savedMetaSounds[selectedAsset]) return;
        } else if (assetData.type === 'PCG') {
            if (savedPcgs && savedPcgs[selectedAsset]) return;
        }

        setIsGenerating(true);
        try {
            if (assetData.type === 'Blueprint' || assetData.type === 'Widget') {
                await onGenerateBlueprint(assetData.name, assetData.desc || '');
            } else if (assetData.type === 'BehaviorTree') {
                await onGenerateBehaviorTree(assetData.name, assetData.desc || '');
            } else if (assetData.type === 'Material') {
                await onGenerateMaterial(assetData.name, assetData.desc || '');
            } else if (assetData.type === 'Input') {
                await onGenerateInput(assetData.name, assetData.desc || '');
            } else if (assetData.type === 'MetaSound') {
                await onGenerateMetaSound(assetData.name, assetData.desc || '');
            } else if (assetData.type === 'PCG') {
                await onGeneratePcg(assetData.name, assetData.desc || '');
            }
        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    triggerGeneration();
  }, [selectedAsset, uniqueAssets, savedBlueprints, savedBehaviorTrees, savedMaterials, savedInputs, savedMetaSounds, savedPcgs]); 
  
  const handleGenerateCpp = async () => {
      if (!selectedAsset || !savedBlueprints[selectedAsset]) return;
      setIsGenerating(true);
      try {
          await onGenerateCpp(selectedAsset, savedBlueprints[selectedAsset]);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleCopyT3d = async () => {
      if (!selectedAsset || !savedBlueprints[selectedAsset]) return;
      setIsGenerating(true);
      try {
          const t3d = await onGenerateT3d(selectedAsset, savedBlueprints[selectedAsset]);
          await navigator.clipboard.writeText(t3d);
          setCopiedCode('t3d');
          setTimeout(() => setCopiedCode(null), 2000);
      } finally {
          setIsGenerating(false);
      }
  };

  // Single PDF Export
  const handleExportPdf = async () => {
      if (!selectedAsset || !savedBlueprints[selectedAsset]) return;
      setIsExportingPdf(true);
      try {
          const spec = savedBlueprints[selectedAsset];
          await exportBlueprintSpecToPdf(spec, {
              projectName: plan?.title || 'UE5 Project',
              includeTelemetry: true,
              currentPlatformMetric: currentAssetMetric || undefined
          });
      } catch (err) {
          console.error("PDF Export failed:", err);
      } finally {
          setIsExportingPdf(false);
      }
  };

  // Combined Multi-Blueprint PDF Export
  const handleExportCombinedPdf = async () => {
    // If specific blueprints selected, use those. If none selected, use all available generated blueprints
    const targets: string[] = selectedAssetsForExport.size > 0 
      ? Array.from(selectedAssetsForExport)
      : Object.keys(savedBlueprints);

    if (targets.length === 0) return;

    setIsExportingMultiPdf(true);
    try {
      // Gather specs
      const specs: BlueprintSpec[] = [];
      for (const name of targets) {
        if (savedBlueprints[name]) {
          specs.push(savedBlueprints[name]);
        } else {
          // If not generated yet, generate on the fly
          const assetInfo = uniqueAssets.find(a => a.name === name);
          if (assetInfo && (assetInfo.type === 'Blueprint' || assetInfo.type === 'Widget')) {
            const spec = await onGenerateBlueprint(assetInfo.name, assetInfo.desc || '');
            specs.push(spec);
          }
        }
      }

      await exportMultipleBlueprintSpecsToPdf(specs, {
        projectName: plan?.title || 'Unreal Engine 5 Project Architecture',
        includeTelemetry: true,
        documentTitle: `${plan?.title || 'UE5'} Master Blueprint Specifications`
      });
    } catch (err) {
      console.error("Combined PDF Export failed:", err);
    } finally {
      setIsExportingMultiPdf(false);
    }
  };
  
  const copyToClipboard = async (text: string, type: 'header' | 'source') => {
      await navigator.clipboard.writeText(text);
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
  };

  const getIcon = (assetName: string, type: AssetType) => {
      if (assetName.startsWith('BP_')) return <User className="w-3.5 h-3.5 text-blue-400" />; 
      if (assetName.startsWith('BPC_')) return <Settings className="w-3.5 h-3.5 text-cyan-400" />; 
      if (assetName.startsWith('GM_')) return <Shield className="w-3.5 h-3.5 text-indigo-400" />; 
      if (assetName.startsWith('ABP_')) return <Activity className="w-3.5 h-3.5 text-teal-400" />; 
      if (assetName.startsWith('WBP_')) return <Layout className="w-3.5 h-3.5 text-sky-400" />; 
      switch(type) {
          case 'BehaviorTree': return <Brain className="w-3.5 h-3.5 text-purple-400" />;
          case 'Blueprint': return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
          case 'Material': return <Palette className="w-3.5 h-3.5 text-pink-400" />;
          case 'Input': return <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />;
          case 'MetaSound': return <Music className="w-3.5 h-3.5 text-amber-400" />;
          case 'PCG': return <Layers className="w-3.5 h-3.5 text-orange-400" />;
          default: return <BoxSelect className="w-3.5 h-3.5 text-slate-400" />;
      }
  };

  const renderResourceHud = (metric: AssetResourceMetric | null) => {
    if (!metric) return null;
    
    const riskLevel = metric.riskLevel || (metric.status === 'Critical' ? 'high' : metric.status === 'Warning' ? 'medium' : 'low');
    const riskBadge = {
      low: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'OPTIMIZED', icon: <Check className="w-3 h-3 text-emerald-400" /> },
      medium: { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'MODERATE LOAD', icon: <Activity className="w-3 h-3 text-yellow-400" /> },
      high: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', label: 'BUDGET WARNING', icon: <Flame className="w-3 h-3 text-rose-400" /> }
    }[riskLevel];

    const cpuCost = metric.estimatedCpuCostMs ?? metric.cpuCostMs ?? 0;
    const gpuCost = metric.estimatedGpuCostMs ?? metric.gpuCostMs ?? 0;
    const memCost = metric.estimatedMemoryMb ?? metric.memoryMb ?? 0;
    const drawCalls = metric.estimatedDrawCalls ?? metric.drawCalls ?? 0;

    return (
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider">UE5 Target Budget Telemetry</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 uppercase tracking-widest ${riskBadge.bg}`}>
                  {riskBadge.icon} {riskBadge.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Baseline PC (60 FPS @ 16.6ms target frame budget)</span>
            </div>
          </div>

          {onNavigateToResources && (
            <button
              onClick={onNavigateToResources}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-teal-300 hover:text-white rounded-lg text-[11px] font-bold border border-teal-500/20 transition-all shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" /> Full Workspace Budget
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-400" /> CPU GameThread</span>
              <span className="text-white font-bold">{cpuCost.toFixed(2)} ms</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${cpuCost > 1 ? 'bg-rose-500' : cpuCost > 0.4 ? 'bg-yellow-400' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(100, (cpuCost / 2.0) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-purple-400" /> GPU Render</span>
              <span className="text-white font-bold">{gpuCost.toFixed(2)} ms</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${gpuCost > 1.5 ? 'bg-rose-500' : gpuCost > 0.5 ? 'bg-yellow-400' : 'bg-purple-500'}`} 
                style={{ width: `${Math.min(100, (gpuCost / 3.0) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-emerald-400" /> VRAM / RAM</span>
              <span className="text-white font-bold">{memCost.toFixed(1)} MB</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${Math.min(100, (memCost / 50.0) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Box className="w-3 h-3 text-amber-400" /> Draw Calls</span>
              <span className="text-white font-bold">{drawCalls} calls</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500" 
                style={{ width: `${Math.min(100, (drawCalls / 20.0) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {metric.warnings && metric.warnings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
            {metric.warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Blueprint Complexity Score Indicator & Refactoring Recommendations
  const renderComplexityHud = (assetName: string, spec: BlueprintSpec) => {
    const complexity = complexityMap.get(assetName) || calculateBlueprintComplexity(assetName, spec, spec.parentClass);

    const tierBadges = {
      low: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'OPTIMAL ARCHITECTURE' },
      moderate: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'ACCEPTABLE DENSITY' },
      high: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', label: 'REFACTORING RECOMMENDED' },
      critical: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', label: 'CRITICAL OVERCOMPLEXITY' }
    }[complexity.tier];

    return (
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center font-mono font-black text-sm ${complexity.badgeClass}`}>
              <Zap className="w-4 h-4 mr-1 inline" />
              <span>{complexity.score}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider">Complexity Score & Logic Density</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-widest ${tierBadges.bg}`}>
                  {tierBadges.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Calculated dynamically from {complexity.breakdown.nodeCount} nodes, {complexity.breakdown.connectionCount} wires, {complexity.breakdown.branchCount} branches, and runtime hazard weights
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('heatmap')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-white rounded-lg text-[11px] font-bold border border-rose-500/30 transition-all shadow-sm cursor-pointer"
              title="Inspect node-by-node execution intensity in heatmap overlay"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" /> View Usage Heatmap
            </button>
          </div>
        </div>

        {/* Breakdown Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Boxes className="w-3 h-3 text-blue-400" /> Graph Nodes</span>
              <span className="text-white font-bold">{complexity.breakdown.nodeCount}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${Math.min(100, (complexity.breakdown.nodeCount / 25) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><GitFork className="w-3 h-3 text-indigo-400" /> Wires / Links</span>
              <span className="text-white font-bold">{complexity.breakdown.connectionCount}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500" 
                style={{ width: `${Math.min(100, (complexity.breakdown.connectionCount / 30) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-cyan-400" /> Branch Decision Flow</span>
              <span className="text-white font-bold">{complexity.breakdown.branchCount}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500" 
                style={{ width: `${Math.min(100, (complexity.breakdown.branchCount / 8) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-amber-400" /> Casts & Tick Hazards</span>
              <span className={`font-bold ${complexity.breakdown.hasTick ? 'text-rose-400' : 'text-white'}`}>
                {complexity.breakdown.castCount} {complexity.breakdown.hasTick ? '• EventTick' : '• Event-Driven'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${complexity.breakdown.hasTick ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (complexity.breakdown.castCount * 25) + (complexity.breakdown.hasTick ? 50 : 20))}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Refactoring Recommendations */}
        {complexity.recommendations && complexity.recommendations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Refactoring & Architectural Advice:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {complexity.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800/80 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                  <span className="leading-snug text-[11px]">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBlueprintView = (spec: BlueprintSpec) => {
    const currentTags = getAssetTags(projectId, spec.assetName, 'Blueprint');
    const thumbnail = storedThumbnails[spec.assetName] || spec.thumbnailMetadata;
    const analysis = analyzeBlueprintFunctionAndNodes(spec);
    const isGeneratingThumb = isGeneratingSingleThumbnail[spec.assetName] || false;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="border-b border-slate-800 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-4">
                {/* Blueprint Visual Identity Thumbnail Badge */}
                <div className="relative group flex-shrink-0">
                  <BlueprintThumbnailBadge
                    thumbnail={thumbnail}
                    size="lg"
                    isGenerating={isGeneratingThumb}
                    altName={spec.assetName}
                    onClick={() => setIsThumbnailStudioOpen(true)}
                    className="cursor-pointer"
                  />
                  <button
                    onClick={() => handleGenerateSingleThumbnail(spec.assetName)}
                    disabled={isGeneratingThumb}
                    className="absolute -bottom-2 -left-1 px-1.5 py-0.5 bg-slate-900/90 hover:bg-blue-600 text-slate-300 hover:text-white rounded-md border border-slate-700 hover:border-blue-400 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Regenerate unique AI thumbnail"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    <span>Reroll</span>
                  </button>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Archetype Badge */}
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${(thumbnail?.accentHex || analysis.accentHex)}18`,
                        color: (thumbnail?.secondaryHex || thumbnail?.accentHex || analysis.accentHex),
                        borderColor: `${(thumbnail?.accentHex || analysis.accentHex)}40`
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{thumbnail?.archetypeLabel || analysis.archetypeLabel}</span>
                    </span>

                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase rounded border border-blue-500/30 tracking-widest">
                        Parent: {spec.parentClass}
                    </span>
                    {spec.activeMode && (
                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold uppercase rounded border border-indigo-500/30 tracking-widest flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Mode: {spec.activeMode}
                        </span>
                    )}

                    {/* Tag Badges in Header */}
                    {currentTags.map(tag => {
                      const style = getTagStyle(tag);
                      return (
                        <span 
                          key={tag}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 ${style.bg} ${style.text} ${style.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                          <span>{tag}</span>
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-white transition-colors cursor-pointer p-0.5"
                            title={`Remove '${tag}' tag`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      );
                    })}

                    {/* Add Tag Popover / Button */}
                    <div className="relative">
                      {isAddingTag ? (
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 shadow-xl z-30">
                          <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag(customTagInput)}
                            placeholder="Tag name (e.g. Movement, UI)..."
                            className="bg-slate-950 text-white text-[11px] px-2 py-1 rounded border border-slate-700 outline-none w-44 font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddTag(customTagInput)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            Add
                          </button>
                          <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1">
                            {PRESET_TAGS.filter(p => !currentTags.includes(p)).slice(0, 4).map(p => (
                              <button
                                key={p}
                                onClick={() => handleAddTag(p)}
                                className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono cursor-pointer"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setIsAddingTag(false)}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingTag(true)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer bg-slate-900/50"
                          title="Add organization category tag"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Tag</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-white mb-1 tracking-tight">{spec.assetName}</h2>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    <span className="text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">Primary Function:</span> {thumbnail?.primaryFunction || analysis.primaryFunction}
                  </p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mb-1">
                {/* Visual Identity Studio Button */}
                <button
                    onClick={() => setIsThumbnailStudioOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 hover:text-white rounded-xl border border-amber-500/30 transition-all text-xs font-bold shadow-lg cursor-pointer"
                    title="Open Visual Identity Studio to customize or batch generate icon thumbnails"
                >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Icon Studio</span>
                </button>

                {/* Single Spec PDF Export */}
                <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600 transition-all text-xs font-bold shadow-lg cursor-pointer disabled:opacity-50"
                    title="Export blueprint architecture document as a formatted PDF"
                >
                    {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                </button>

                {/* Combined Spec PDF Export Button */}
                <button
                    onClick={handleExportCombinedPdf}
                    disabled={isExportingMultiPdf}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl border border-blue-400/40 transition-all text-xs font-bold shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                    title="Export all selected blueprints as a single combined PDF specification bundle"
                >
                    {isExportingMultiPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Layers className="w-3.5 h-3.5 text-white" />}
                    <span>{isExportingMultiPdf ? 'Compiling Bundle...' : selectedAssetsForExport.size > 0 ? `Export (${selectedAssetsForExport.size}) as PDF Bundle` : 'Export Combined PDF Bundle'}</span>
                </button>

                <button
                    onClick={handleCopyT3d}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600 transition-all text-xs font-bold shadow-lg cursor-pointer"
                >
                    {isGenerating && copiedCode !== 't3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copiedCode === 't3d' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    {copiedCode === 't3d' ? 'Copied' : 'Copy Nodes'}
                </button>

                {/* View Mode Switcher */}
                <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                    <button
                        onClick={() => setViewMode('blueprint')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'blueprint' 
                            ? 'bg-blue-600 text-white shadow-xl' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5" /> Spec Graph
                    </button>
                    <button
                        onClick={() => setViewMode('dependency')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'dependency' 
                            ? 'bg-indigo-600 text-white shadow-xl' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <GitFork className="w-3.5 h-3.5" /> Dependencies
                    </button>
                    <button
                        onClick={() => setViewMode('cpp')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'cpp' 
                            ? 'bg-emerald-600 text-white shadow-xl' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Code className="w-3.5 h-3.5" /> C++ Source
                    </button>
                    <button
                        onClick={() => setViewMode('verse')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'verse' 
                            ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40' 
                            : 'text-cyan-400 hover:text-white hover:bg-cyan-950/40'
                        }`}
                    >
                        <Cpu className="w-3.5 h-3.5 text-cyan-300" /> 
                        <span>Verse (.verse)</span>
                        <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">UE6</span>
                    </button>
                    <button
                        onClick={() => setViewMode('ue6readiness')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'ue6readiness' 
                            ? 'bg-purple-600 text-white shadow-xl' 
                            : 'text-purple-400 hover:text-white hover:bg-purple-950/40'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-300" /> 
                        <span>UE6 Audit</span>
                    </button>
                    <button
                        onClick={() => setViewMode('templates')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'templates' 
                            ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' 
                            : 'text-purple-400 hover:text-white hover:bg-purple-950/40'
                        }`}
                        title="Open Blueprint Template Library"
                    >
                        <Boxes className="w-3.5 h-3.5 text-purple-300" /> 
                        <span>Templates</span>
                        <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30">Lib</span>
                    </button>

                    <button
                        onClick={() => setViewMode('flowchart')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'flowchart' 
                            ? 'bg-amber-600 text-white shadow-xl shadow-amber-900/40' 
                            : 'text-amber-400 hover:text-white hover:bg-amber-950/40'
                        }`}
                        title="Interactive Node Dependency Flow Chart & Execution Path Analyzer"
                    >
                        <GitFork className="w-3.5 h-3.5 text-amber-300" /> 
                        <span>Flow Chart</span>
                        <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">Paths</span>
                    </button>

                    <button
                        onClick={() => setViewMode('heatmap')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            viewMode === 'heatmap' 
                            ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40' 
                            : 'text-rose-400 hover:text-white hover:bg-rose-950/40'
                        }`}
                        title="Open Blueprint Node Usage Intensity & Performance Heatmap"
                    >
                        <Flame className="w-3.5 h-3.5 text-rose-300" /> 
                        <span>Heatmap</span>
                    </button>
                </div>
            </div>
        </div>

        {renderComplexityHud(spec.assetName, spec)}

        {renderResourceHud(currentAssetMetric)}

        {/* Event Graph Visualizer */}
        <div className="glass-card p-1 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4 text-blue-400" /> Event Execution Flow
                </h4>
                <div className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">Decoupled Architecture</div>
            </div>
            <div className="space-y-6 p-6 bg-black/20">
                {(spec.eventGraph || []).map((graph, i) => (
                    <div key={i} className="mb-12 last:mb-0 animate-in slide-in-from-left-2 fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="text-xs font-bold text-slate-400 mb-4 pl-3 border-l-2 border-blue-500 py-1 bg-blue-500/5 rounded-r-lg max-w-2xl italic">
                            {graph.description}
                        </div>
                        <BlueprintCanvas 
                            eventName={graph.eventName}
                            initialNodes={graph.nodes}
                            initialConnections={graph.connections}
                        />
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Functions Section */}
            <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl bg-slate-900/10">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                    <FunctionSquare className="w-4 h-4 text-blue-400" /> API (Functions)
                </h4>
                <div className="space-y-4">
                    {(spec.functions || []).map((fn, i) => (
                        <div key={i} className="bg-slate-900/60 p-4 rounded-xl border border-white/5 group hover:border-blue-500/30 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-blue-200 group-hover:text-blue-400 transition-colors">{fn.name}</span>
                                    {fn.category && <span className="text-[8px] text-slate-600 uppercase font-black">{fn.category}</span>}
                                </div>
                                <div className="flex gap-1 flex-wrap justify-end">
                                    {(fn.parameters || []).map((p, pi) => (
                                        <span key={pi} className="text-[8px] font-mono bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{p}</span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">{fn.logicDescription}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Variables Section */}
            <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl bg-slate-900/10">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                    <Database className="w-4 h-4 text-purple-400" /> Internal State
                </h4>
                <div className="space-y-3">
                    {(spec.variables || []).map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all group shadow-sm">
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-purple-200 font-bold truncate">{v.name}</span>
                                    <span className="text-[8px] font-black bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest">{v.type}</span>
                                </div>
                                <div className="text-[10px] text-slate-600 font-light truncate">{v.tooltip}</div>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5 flex-shrink-0">{v.default}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Macros & Dispatchers Section */}
            <div className="space-y-8">
                {spec.macros && spec.macros.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl bg-slate-900/10">
                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                            <Braces className="w-4 h-4 text-emerald-400" /> Utility Macros
                        </h4>
                        <div className="space-y-3">
                            {(spec.macros || []).map((m, i) => (
                                <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all">
                                    <div className="text-xs font-bold text-emerald-200 mb-1">{m.name}</div>
                                    <p className="text-[10px] text-slate-500 italic leading-relaxed">"{m.description}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {spec.dispatchers && spec.dispatchers.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl bg-slate-900/10">
                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                            <BellRing className="w-4 h-4 text-amber-400" /> Signal Dispatchers
                        </h4>
                        <div className="space-y-3">
                            {(spec.dispatchers || []).map((d, i) => (
                                <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 group hover:border-amber-500/30 transition-all">
                                    <div className="text-xs font-bold text-amber-200 mb-2">{d.name}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {(d.parameters || []).map((p, idx) => (
                                            <span key={idx} className="text-[8px] font-mono bg-amber-900/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">{p}</span>
                                        ))}
                                        {d.parameters.length === 0 && <span className="text-[9px] text-slate-700 uppercase font-black">Parameterless</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  const renderCppView = (assetName: string) => {
      const code = savedCppCodes[assetName];
      if (!code) {
          return (
              <div className="flex flex-col items-center justify-center h-[500px] glass-card rounded-xl border-slate-700/50 bg-slate-950/40">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                      <FileCode2 className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Generate C++ Foundation</h3>
                  <button onClick={handleGenerateCpp} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-blue-600/20 cursor-pointer">
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                      Synthesize Header & Source
                  </button>
              </div>
          );
      }
      return (
          <div className="space-y-6 pb-12">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Spec
                </button>
                <h3 className="text-xl font-black text-white font-mono">{assetName} Native C++</h3>
              </div>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[700px] shadow-2xl">
                    <div className="bg-slate-950/90 px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-500 tracking-widest">{assetName}.h</span>
                        <button onClick={() => copyToClipboard(code.header, 'header')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-400 transition-all cursor-pointer">Copy</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#1a1c24] p-6 font-mono text-[13px] leading-relaxed">
                        <pre className="text-blue-300">{code.header}</pre>
                    </div>
                </div>
                <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[700px] shadow-2xl">
                    <div className="bg-slate-950/90 px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-500 tracking-widest">{assetName}.cpp</span>
                        <button onClick={() => copyToClipboard(code.source, 'source')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-400 transition-all cursor-pointer">Copy</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#1a1c24] p-6 font-mono text-[13px] leading-relaxed">
                        <pre className="text-emerald-200">{code.source}</pre>
                    </div>
                </div>
            </div>
          </div>
      );
  };

  // Render single asset card in the list
  const renderAssetListItem = (asset: { name: string; desc?: string; folder: string; type: AssetType }) => {
    const isSelected = selectedAsset === asset.name;
    const isGenerated = isAssetGenerated(asset.name, asset.type);
    const isCheckedForExport = selectedAssetsForExport.has(asset.name);
    const tags = getAssetTags(projectId, asset.name, asset.type);
    const complexity = complexityMap.get(asset.name);

    return (
      <div
        key={asset.name}
        id={`asset-item-${asset.name}`}
        onClick={() => onSelectAsset(asset.name)}
        className={`w-full text-left p-3 rounded-xl border text-sm transition-all group relative overflow-hidden active:scale-[0.99] cursor-pointer ${
          isSelected 
          ? 'bg-blue-600/90 border-blue-400 text-white shadow-xl ring-1 ring-blue-400/50' 
          : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:border-slate-500 hover:bg-slate-800/80 hover:text-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            {/* Checkbox for Multi-Select Export */}
            {(isBatchSelectMode || selectedAssetsForExport.size > 0) && (
              <button
                onClick={(e) => toggleAssetSelection(asset.name, e)}
                className="p-1 hover:text-white transition-colors cursor-pointer text-slate-400"
                title={isCheckedForExport ? "Deselect for PDF export" : "Select for PDF export"}
              >
                {isCheckedForExport ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            {/* Thumbnail or Fallback Icon */}
            {storedThumbnails[asset.name] || savedBlueprints[asset.name]?.thumbnailMetadata ? (
              <BlueprintThumbnailBadge
                thumbnail={storedThumbnails[asset.name] || savedBlueprints[asset.name]?.thumbnailMetadata}
                size="sm"
                isGenerating={isGeneratingSingleThumbnail[asset.name]}
                altName={asset.name}
                className="flex-shrink-0"
              />
            ) : (
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-900/60 border border-slate-700/40'}`}>
                {getIcon(asset.name, asset.type)}
              </div>
            )}
            <span className="font-mono font-bold truncate text-[12.5px] text-white tracking-tight">
              {asset.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Complexity Score Indicator */}
            {complexity && (
              <span 
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors ${
                  isSelected 
                    ? 'bg-blue-900/70 text-blue-100 border-blue-300/40' 
                    : complexity.badgeClass
                }`}
                title={`Complexity Score: ${complexity.score}/100 (${complexity.tierLabel})\n• Nodes: ${complexity.breakdown.nodeCount}\n• Wires: ${complexity.breakdown.connectionCount}\n• Branching: ${complexity.breakdown.branchCount}\n• Hard Casts: ${complexity.breakdown.castCount}\n• EventTick: ${complexity.breakdown.hasTick ? 'YES (High GameThread Risk)' : 'NO'}`}
              >
                <Zap className="w-2.5 h-2.5" />
                <span>{complexity.score}</span>
                <span className="text-[7.5px] uppercase font-bold opacity-80">
                  {complexity.tier === 'critical' ? 'Crit' : complexity.tier === 'high' ? 'High' : complexity.tier === 'moderate' ? 'Mod' : 'Low'}
                </span>
              </span>
            )}

            {isGenerated ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="Asset logic synthesized">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span className="hidden sm:inline">Ready</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 bg-slate-900/40 border border-slate-700/40" title="Pending generation on selection">
                <CircleDashed className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Queue</span>
              </span>
            )}
          </div>
        </div>

        {/* Tags Row */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.slice(0, 3).map(tag => {
              const style = getTagStyle(tag);
              return (
                <span
                  key={tag}
                  className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                >
                  {tag}
                </span>
              );
            })}
            {tags.length > 3 && (
              <span className="text-[8px] font-mono text-slate-500 self-center">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-medium">
          <span className="truncate group-hover:text-slate-300 transition-colors font-mono">
            {asset.folder}
          </span>
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border tracking-wider flex-shrink-0 ${
            isSelected 
              ? 'bg-blue-900/40 text-blue-200 border-blue-300/30' 
              : 'bg-slate-900/40 text-slate-400 border-slate-700/40'
          }`}>
            {asset.type}
          </span>
        </div>
      </div>
    );
  };

  const filterChips: { id: 'ALL' | AssetType; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: typeCounts.ALL || 0 },
    { id: 'Blueprint', label: 'Blueprints', count: typeCounts.Blueprint || 0 },
    { id: 'BehaviorTree', label: 'Behaviors', count: typeCounts.BehaviorTree || 0 },
    { id: 'Input', label: 'Inputs', count: typeCounts.Input || 0 },
    { id: 'Widget', label: 'Widgets', count: typeCounts.Widget || 0 },
    { id: 'Material', label: 'Materials', count: typeCounts.Material || 0 },
    { id: 'MetaSound', label: 'MetaSound', count: typeCounts.MetaSound || 0 },
    { id: 'PCG', label: 'PCG', count: typeCounts.PCG || 0 },
  ];

  return (
    <div className="flex h-full">
      {/* Left Sidebar: Subsystems Map with Search, Tagging, Filters, and Hierarchy */}
      <div className="w-80 lg:w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col flex-shrink-0">
        
        {/* Header Title & Quick Count */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Subsystem Map</h3>
              <p className="text-[10px] text-slate-400 font-mono">{uniqueAssets.length} Assets Registered</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode(viewMode === 'verse' ? 'blueprint' : 'verse')}
              className={`px-2 py-1 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'verse' || viewMode === 'ue6readiness'
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                  : 'bg-slate-800/80 text-cyan-400 border-cyan-800/40 hover:text-white hover:bg-cyan-950/40'
              }`}
              title="Switch to UE6 Verse Architecture & Migration Hub"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold font-mono">UE6</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'templates' ? 'blueprint' : 'templates')}
              className={`px-2 py-1 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'templates'
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-950/40'
                  : 'bg-slate-800/80 text-purple-400 border-purple-800/40 hover:text-white hover:bg-purple-950/40'
              }`}
              title="Open Blueprint Template Library"
            >
              <Boxes className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-bold font-mono">Templates</span>
            </button>

            <button
              onClick={() => setIsThumbnailStudioOpen(true)}
              className="px-2 py-1 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shadow-sm"
              title="Open Blueprint Visual Identity Studio (AI Icon Thumbnail Generator)"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold font-mono">Icons</span>
            </button>


            <button
              onClick={() => setIsBatchSelectMode(!isBatchSelectMode)}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                isBatchSelectMode || selectedAssetsForExport.size > 0
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Toggle multi-blueprint selection for combined PDF export"
            >
              <ListChecks className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 text-[10px] font-mono text-slate-400">
              <kbd className="font-bold text-slate-300">/</kbd>
              <span>or</span>
              <kbd className="font-bold text-slate-300">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Batch Selection Action Bar (when active) */}
        {(isBatchSelectMode || selectedAssetsForExport.size > 0) && (
          <div className="p-2.5 bg-blue-950/40 border-b border-blue-500/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-300">
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              <span><strong>{selectedAssetsForExport.size}</strong> selected</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllFiltered}
                className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer font-mono"
              >
                Select Filtered
              </button>
              <button
                onClick={clearSelection}
                className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer font-mono"
              >
                Clear
              </button>
              <button
                onClick={handleExportCombinedPdf}
                disabled={isExportingMultiPdf || (selectedAssetsForExport.size === 0 && Object.keys(savedBlueprints).length === 0)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Export selected blueprints as a single combined PDF specification"
              >
                {isExportingMultiPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/20 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              id="blueprint-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blueprints or type 'type:AI status:todo'..."
              className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white text-xs pl-9 pr-20 py-2 rounded-xl placeholder:text-slate-500 transition-all outline-none font-mono"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSearchSyntaxHelp(!showSearchSyntaxHelp)}
                className={`p-1 rounded-md transition-all cursor-pointer text-[10px] font-mono flex items-center gap-0.5 ${
                  showSearchSyntaxHelp
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle advanced search syntax cheatsheet"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden sm:inline">Syntax</span>
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Syntax Cheatsheet Popover */}
          {showSearchSyntaxHelp && (
            <div className="p-3 bg-slate-900/95 rounded-xl border border-blue-500/40 shadow-2xl space-y-2.5 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Power User Syntax Quick Filters</span>
                </div>
                <button
                  onClick={() => setShowSearchSyntaxHelp(false)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 font-light">
                Combine keywords and free text to instantly slice your architecture. Click any preset to test:
              </p>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'type:AI status:todo', title: 'Unreal AI blueprints needing synthesis' },
                  { label: 'type:Blueprint status:generated', title: 'Synthesized Actor Blueprints' },
                  { label: 'score:>50', title: 'High complexity blueprints needing refactoring' },
                  { label: 'nodes:>10', title: 'Blueprints with heavy node density' },
                  { label: 'class:Character', title: 'Character subclasses' },
                  { label: 'tag:Combat', title: 'Tagged with Combat' },
                  { label: 'folder:Subsystems', title: 'Assets inside Subsystems directory' }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSearchQuery(item.label);
                      setShowSearchSyntaxHelp(false);
                    }}
                    className="px-2 py-1 bg-slate-950 hover:bg-blue-600/30 hover:border-blue-400 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                    title={item.title}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Parsed Syntax Tokens */}
          {parsedSearchFilter.rawTokens.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px] font-mono">
              <span className="text-slate-500 uppercase text-[9px] font-bold">Active Filters:</span>
              {parsedSearchFilter.rawTokens.map((tok, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-500/40 shadow-sm"
                >
                  <span className="font-bold text-blue-400">{tok.key}:</span>
                  <span className="text-white">{tok.value}</span>
                  <button
                    onClick={() => {
                      const escapedVal = tok.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const regex = new RegExp(`\\b${tok.key}:(?:"${escapedVal}"|${escapedVal})\\b`, 'gi');
                      setSearchQuery(prev => prev.replace(regex, '').replace(/\s+/g, ' ').trim());
                    }}
                    className="hover:text-rose-400 ml-0.5 cursor-pointer font-sans text-xs"
                    title={`Remove ${tok.key}:${tok.value} filter`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Type Filter Chips (Horizontal Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {filterChips.filter(chip => chip.count > 0 || chip.id === 'ALL').map(chip => (
              <button
                key={chip.id}
                id={`filter-chip-${chip.id}`}
                onClick={() => setSelectedTypeFilter(chip.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  selectedTypeFilter === chip.id
                    ? 'bg-blue-600 text-white border border-blue-400 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                  selectedTypeFilter === chip.id ? 'bg-blue-800 text-blue-200' : 'bg-slate-900/80 text-slate-400'
                }`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tag Filter Chips (if tags exist) */}
          {uniqueTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                <Tag className="w-2.5 h-2.5" /> Tags:
              </span>
              <button
                onClick={() => setSelectedTagFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTagFilter === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
                }`}
              >
                All
              </button>
              {uniqueTags.map(({ tag, count }) => {
                const style = getTagStyle(tag);
                const isSelected = selectedTagFilter === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(isSelected ? 'ALL' : tag)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap border transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? `${style.bg} ${style.text} ${style.border} ring-1 ring-white/30`
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="text-[8px] opacity-70 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Secondary Controls: Status, Sort Toggle & Folder Grouping */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/60 text-[11px]">
            {/* Status Pills */}
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('generated')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                  statusFilter === 'generated' ? 'bg-emerald-600/80 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ready
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-amber-600/80 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Queue
              </button>
            </div>

            {/* Sort Dropdown Toggle & Folder View Toggle */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-slate-900/90 text-slate-300 text-[10px] font-mono border border-slate-700 rounded-lg px-2 py-1 appearance-none pr-5 hover:border-slate-500 focus:outline-none focus:border-blue-500 cursor-pointer"
                  title="Sort blueprints list"
                >
                  <option value="recent">Sort: Recently Modified</option>
                  <option value="complexity_desc">Sort: Complexity (High → Low)</option>
                  <option value="complexity_asc">Sort: Complexity (Low → High)</option>
                  <option value="name_asc">Sort: Alphabetical (A-Z)</option>
                  <option value="name_desc">Sort: Alphabetical (Z-A)</option>
                  <option value="type">Sort: Blueprint Type</option>
                  <option value="folder">Sort: Folder Path</option>
                  <option value="cost">Sort: Est. Resource Cost</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
              </div>

              <button
                onClick={() => setIsGroupedByFolder(!isGroupedByFolder)}
                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                  isGroupedByFolder 
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
                title={isGroupedByFolder ? "Switch to flat list view" : "Group assets by folder path"}
              >
                <FolderTree className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Summary Header */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredAndSortedAssets.length}</strong> of {uniqueAssets.length}
          </span>
          {(searchQuery || selectedTypeFilter !== 'ALL' || selectedTagFilter !== 'ALL' || statusFilter !== 'all' || sortBy !== 'name_asc') && (
            <button
              onClick={handleResetFilters}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Scrollable Asset List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredAndSortedAssets.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700/60 text-slate-400">
                <Search className="w-5 h-5 opacity-60" />
              </div>
              <h4 className="text-xs font-bold text-slate-300 mb-1">No matching assets</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px] mx-auto mb-4">
                No blueprints match &ldquo;{searchQuery || selectedTypeFilter || selectedTagFilter}&rdquo;
              </p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : isGroupedByFolder ? (
            // Grouped by Folder Hierarchy
            <div className="space-y-4">
              {(Object.entries(folderGroupedAssets) as [string, AssetItem[]][]).map(([folderPath, groupAssets]) => {
                const isCollapsed = !!collapsedFolders[folderPath];
                return (
                  <div key={folderPath} className="rounded-xl border border-slate-800/80 bg-slate-950/30 overflow-hidden">
                    <button
                      onClick={() => toggleFolder(folderPath)}
                      className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-800/90 flex items-center justify-between text-left transition-colors border-b border-slate-800/60 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <Folder className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                        <span className="font-mono text-xs font-bold text-slate-200 truncate">{folderPath}</span>
                      </div>
                      <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {groupAssets.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="p-2 space-y-2">
                        {groupAssets.map(asset => renderAssetListItem(asset))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat List View
            <div className="space-y-2">
              {filteredAndSortedAssets.map(asset => renderAssetListItem(asset))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative bg-slate-950/10">
        
        {/* Top View Mode Switcher when in graph or cpp mode */}
        {viewMode === 'templates' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setViewMode('blueprint')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Blueprint Specification
              </button>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-600 text-white shadow-xl cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Templates
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-950/40 cursor-pointer"
                  title="Open Blueprint Usage Intensity & Performance Heatmap"
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-300" /> Heatmap
                </button>
                <button
                  onClick={() => setViewMode('cpp')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" /> C++ Source
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[600px]">
              <TemplateLibrary
                currentSpec={selectedAsset && savedBlueprints[selectedAsset] ? savedBlueprints[selectedAsset] : undefined}
                currentVerseCode={selectedAsset && savedVerseCodes ? savedVerseCodes[selectedAsset] : undefined}
                onInstantiateTemplate={handleInstantiateTemplate}
                onSelectSpecByName={(name) => {
                  onSelectAsset(name);
                  setViewMode('blueprint');
                }}
              />
            </div>
          </div>
        ) : viewMode === 'dependency' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setViewMode('blueprint')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Blueprint Specification
              </button>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xl cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Templates
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-950/40 cursor-pointer"
                  title="Open Blueprint Usage Intensity & Performance Heatmap"
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-300" /> Heatmap
                </button>
                <button
                  onClick={() => setViewMode('cpp')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" /> C++ Source
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[600px]">
              <BlueprintDependencyGraph
                graphData={dependencyGraphData}
                selectedAsset={selectedAsset}
                onSelectAsset={(assetName) => onSelectAsset(assetName)}
                onOpenAssetSpec={(assetName) => {
                  onSelectAsset(assetName);
                  setViewMode('blueprint');
                }}
              />
            </div>
          </div>
        ) : viewMode === 'flowchart' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setViewMode('blueprint')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Blueprint Specification
              </button>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('flowchart')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-600 text-white shadow-xl cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1 text-amber-200" /> Flow Chart
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-950/40 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-300" /> Heatmap
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Templates
                </button>
                <button
                  onClick={() => setViewMode('cpp')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" /> C++ Source
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[650px]">
              {selectedAsset && savedBlueprints[selectedAsset] ? (
                <NodeExecutionFlowChart
                  blueprintName={selectedAsset}
                  spec={savedBlueprints[selectedAsset]}
                  onBackToSpec={() => setViewMode('blueprint')}
                />
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                    <GitFork className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">No Blueprint Selected</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Select a synthesized Blueprint from the left asset panel to trace its node execution paths, branch points, and latency hazards.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'heatmap' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setViewMode('blueprint')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Blueprint Specification
              </button>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xl cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-200" /> Heatmap
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Templates
                </button>
                <button
                  onClick={() => setViewMode('cpp')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" /> C++ Source
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[650px]">
              <NodeHeatmapViewer
                savedBlueprints={savedBlueprints}
                currentBlueprintName={selectedAsset}
                onSelectBlueprint={(name) => {
                  onSelectAsset(name);
                  setViewMode('blueprint');
                }}
              />
            </div>
          </div>
        ) : (viewMode === 'verse' || viewMode === 'ue6readiness') ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setViewMode('blueprint')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Blueprint Specification
              </button>

              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex flex-wrap gap-1 shadow-inner">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Spec Graph
                </button>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-950/40 cursor-pointer"
                  title="Open Blueprint Usage Intensity & Performance Heatmap"
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-300" /> Heatmap
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 inline mr-1" /> Templates
                </button>
                <button
                  onClick={() => setViewMode('cpp')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" /> C++ Source
                </button>
                <button
                  onClick={() => setViewMode('verse')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'verse'
                      ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-950/50'
                      : 'text-cyan-400 hover:text-white bg-cyan-950/40'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 inline mr-1 text-cyan-300" /> Verse (.verse)
                </button>
                <button
                  onClick={() => setViewMode('ue6readiness')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'ue6readiness'
                      ? 'bg-purple-600 text-white shadow-xl'
                      : 'text-purple-400 hover:text-white bg-purple-950/40'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-purple-300" /> UE6 Audit
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[650px]">
              <UE6VerseHub
                selectedAsset={selectedAsset}
                blueprints={savedBlueprints}
                savedVerseCodes={savedVerseCodes}
                onGenerateVerse={onGenerateVerse || (async (name, spec) => transpileBlueprintToVerse(name, spec))}
                onBatchUpdateVerseCodes={batchSetVerseCodes || (() => {})}
                ue6Audit={ue6Audit}
                onUpdateAudit={onUpdateUE6Audit}
              />
            </div>
          </div>
        ) : isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-blue-400">
                <Loader2 className="w-20 h-20 animate-spin mb-8 text-blue-500" />
                <p className="font-mono text-xs tracking-[0.4em] uppercase text-slate-400 animate-pulse">Architecting Decoupled Subsystems</p>
                <p className="text-[11px] text-slate-600 mt-2">Synthesizing node graphs, functions, and state definitions...</p>
            </div>
        ) : selectedAsset && savedBlueprints[selectedAsset] ? (
            viewMode === 'cpp' 
              ? renderCppView(selectedAsset) 
              : renderBlueprintView(savedBlueprints[selectedAsset])
        ) : selectedAsset && savedBehaviorTrees[selectedAsset] ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-slate-800 pb-6 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase rounded border border-purple-500/30 tracking-widest flex items-center gap-1.5">
                                <Brain className="w-3 h-3" /> AI Behavior Architecture
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{selectedAsset}</h2>
                    </div>

                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex gap-1 shadow-inner">
                      <button
                        onClick={() => setViewMode('blueprint')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          viewMode === 'blueprint' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Architecture
                      </button>
                      <button
                        onClick={() => setViewMode('dependency')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          viewMode === 'dependency' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                      </button>
                    </div>
                </div>
                {renderResourceHud(currentAssetMetric)}
                <BehaviorArchitect spec={savedBehaviorTrees[selectedAsset]} />
            </div>
        ) : selectedAsset && savedInputs[selectedAsset] ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-slate-800 pb-6 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase rounded border border-emerald-500/30 tracking-widest flex items-center gap-1.5">
                                <Gamepad2 className="w-3 h-3" /> Enhanced Input Configuration
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{selectedAsset}</h2>
                    </div>

                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex gap-1 shadow-inner">
                      <button
                        onClick={() => setViewMode('blueprint')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          viewMode === 'blueprint' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Input Config
                      </button>
                      <button
                        onClick={() => setViewMode('dependency')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          viewMode === 'dependency' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5 inline mr-1" /> Dependencies
                      </button>
                    </div>
                </div>
                {renderResourceHud(currentAssetMetric)}
                <InputDesigner spec={savedInputs[selectedAsset]} />
            </div>
        ) : selectedAsset ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-700/60 text-center max-w-md shadow-2xl">
                    <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        {getIcon(selectedAsset, 'Blueprint')}
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">{selectedAsset}</h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Ready to synthesize graph logic, variable maps, and performance telemetry for this asset.
                    </p>
                    <button
                        onClick={async () => {
                            const asset = uniqueAssets.find(a => a.name === selectedAsset);
                            if (asset) {
                                setIsGenerating(true);
                                try {
                                    if (asset.type === 'Blueprint' || asset.type === 'Widget') {
                                        await onGenerateBlueprint(asset.name, asset.desc || '');
                                    } else if (asset.type === 'BehaviorTree') {
                                        await onGenerateBehaviorTree(asset.name, asset.desc || '');
                                    } else if (asset.type === 'Input') {
                                        await onGenerateInput(asset.name, asset.desc || '');
                                    } else if (asset.type === 'Material') {
                                        await onGenerateMaterial(asset.name, asset.desc || '');
                                    } else if (asset.type === 'MetaSound') {
                                        await onGenerateMetaSound(asset.name, asset.desc || '');
                                    } else if (asset.type === 'PCG') {
                                        await onGeneratePcg(asset.name, asset.desc || '');
                                    }
                                } finally {
                                    setIsGenerating(false);
                                }
                            }
                        }}
                        disabled={isGenerating}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer text-xs uppercase tracking-wider"
                    >
                        <Sparkles className="w-4 h-4" /> Synthesize Architecture Graph
                    </button>
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <Cpu className="w-24 h-24 mb-6 opacity-10" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-20 mb-4">Select an asset to view technical logic</p>
                <button
                  onClick={() => setViewMode('dependency')}
                  className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <GitFork className="w-4 h-4" /> View Full Dependency Graph
                </button>
            </div>
        )}
      </div>

      {/* Blueprint Visual Identity & AI Thumbnail Studio Modal */}
      <BlueprintThumbnailStudioModal
        isOpen={isThumbnailStudioOpen}
        onClose={() => setIsThumbnailStudioOpen(false)}
        projectId={projectId}
        blueprints={savedBlueprints}
        availableAssets={uniqueAssets}
        storedThumbnails={storedThumbnails}
        onUpdateThumbnail={handleUpdateThumbnail}
        onBatchUpdateThumbnails={handleBatchUpdateThumbnails}
      />
    </div>
  );
};

export default BlueprintArchitect;
