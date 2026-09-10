import React, { useState, useMemo, useEffect } from 'react';
import {
  GamePlan,
  BlueprintSpec,
  MaterialSpec,
  PcgSpec,
  MetaSoundSpec,
  BehaviorTreeSpec,
  EnhancedInputSpec,
  AssetResourceMetric,
  PlatformBudgetConfig,
  RevisionTrendPoint
} from '../types';
import {
  PLATFORM_PRESETS,
  calculateBlueprintMetric,
  calculateMaterialMetric,
  calculatePcgMetric,
  calculateMetaSoundMetric,
  calculateBehaviorTreeMetric,
  calculateInputMetric,
  calculateProjectResourceSummary,
  generateBlueprintRevisionHistory,
  generateProjectRevisionTrends
} from '../services/resourceCalculator';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Cpu,
  Zap,
  HardDrive,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowUpRight,
  Search,
  Filter,
  Terminal,
  Copy,
  Check,
  Download,
  Flame,
  Gauge,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info,
  Laptop,
  Gamepad2,
  Eye,
  EyeOff,
  Smartphone,
  Tv,
  TrendingUp,
  History,
  GitCommit,
  SlidersHorizontal,
  Volume2,
  Box,
  Brain,
  Palette,
  RotateCcw,
  PlusCircle,
  BarChart2,
  TrendingDown,
  ArrowUpDown,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  Tag
} from 'lucide-react';
import AIOptimizeModal from './AIOptimizeModal';
import { ResourceSidebar } from './ResourceSidebar';
import AssetNamingAssistantModal from './AssetNamingAssistantModal';
import { auditProjectNaming } from '../services/namingConventionRules';

interface ResourceTrackerProps {
  plan: GamePlan;
  savedBlueprints?: Record<string, BlueprintSpec>;
  savedBehaviorTrees?: Record<string, BehaviorTreeSpec>;
  savedMaterials?: Record<string, MaterialSpec>;
  savedInputs?: Record<string, EnhancedInputSpec>;
  savedMetaSounds?: Record<string, MetaSoundSpec>;
  savedPcgs?: Record<string, PcgSpec>;
  onNavigateToBlueprint?: (assetName: string) => void;
}

// Category filter state interface
interface CategoryFilterState {
  blueprints: boolean;
  materials: boolean;
  metaSounds: boolean;
  pcgs: boolean;
  behaviorTrees: boolean;
  inputs: boolean;
}

const ResourceTracker: React.FC<ResourceTrackerProps> = ({
  plan,
  savedBlueprints = {},
  savedBehaviorTrees = {},
  savedMaterials = {},
  savedInputs = {},
  savedMetaSounds = {},
  savedPcgs = {},
  onNavigateToBlueprint
}) => {
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('pc_high_60');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Independent Category Filter Toggles (allowing Blueprints, Materials, MetaSounds to be toggled independently)
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilterState>({
    blueprints: true,
    materials: true,
    metaSounds: true,
    pcgs: true,
    behaviorTrees: true,
    inputs: true
  });

  // Severity & Specialty Filters
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'Warning' | 'Nominal'>('all');
  const [onlyNativizationCandidates, setOnlyNativizationCandidates] = useState(false);
  const [onlyTickingAssets, setOnlyTickingAssets] = useState(false);
  const [sortBy, setSortBy] = useState<'cpu' | 'gpu' | 'memory' | 'drawCalls' | 'complexity' | 'name'>('cpu');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Trend Chart State
  const [trendScope, setTrendScope] = useState<'project' | 'asset'>('project');
  const [selectedTrendAsset, setSelectedTrendAsset] = useState<string>('');
  const [chartMetricView, setChartMetricView] = useState<'dual' | 'cpu' | 'memory' | 'all'>('dual');
  const [customSnapshots, setCustomSnapshots] = useState<RevisionTrendPoint[]>([]);
  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  // Inspector & AI Optimize details
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<AssetResourceMetric | null>(null);
  const [aiOptimizeAsset, setAiOptimizeAsset] = useState<AssetResourceMetric | null>(null);
  const [isTrendCollapsed, setIsTrendCollapsed] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [copiedIni, setCopiedIni] = useState(false);
  const [isNamingAssistantOpen, setIsNamingAssistantOpen] = useState(false);

  const currentPlatform = useMemo(() => {
    return PLATFORM_PRESETS.find(p => p.id === selectedPlatformId) || PLATFORM_PRESETS[0];
  }, [selectedPlatformId]);

  // Compute metrics for all generated assets
  const assetMetrics = useMemo<AssetResourceMetric[]>(() => {
    const list: AssetResourceMetric[] = [];

    // Blueprints
    Object.entries(savedBlueprints || {}).forEach(([name, spec]) => {
      list.push(calculateBlueprintMetric(name, spec as BlueprintSpec, currentPlatform));
    });

    // Materials
    Object.entries(savedMaterials || {}).forEach(([name, spec]) => {
      list.push(calculateMaterialMetric(name, spec as MaterialSpec, currentPlatform));
    });

    // PCGs
    Object.entries(savedPcgs || {}).forEach(([name, spec]) => {
      list.push(calculatePcgMetric(name, spec as PcgSpec, currentPlatform));
    });

    // MetaSounds
    Object.entries(savedMetaSounds || {}).forEach(([name, spec]) => {
      list.push(calculateMetaSoundMetric(name, spec as MetaSoundSpec, currentPlatform));
    });

    // Behavior Trees
    Object.entries(savedBehaviorTrees || {}).forEach(([name, spec]) => {
      list.push(calculateBehaviorTreeMetric(name, spec as BehaviorTreeSpec, currentPlatform));
    });

    // Enhanced Inputs
    Object.entries(savedInputs || {}).forEach(([name, spec]) => {
      list.push(calculateInputMetric(name, spec as EnhancedInputSpec, currentPlatform));
    });

    // If no assets generated yet, generate draft estimated baseline from roadmap plan tasks
    if (list.length === 0 && plan?.phases) {
      (plan.phases || []).forEach(phase => {
        (phase.tasks || []).forEach(task => {
          if (task.assetName && task.assetName.length > 2) {
            const name = task.assetName;
            if (name.startsWith('BP_') || name.startsWith('ABP_')) {
              list.push({
                assetName: name,
                assetType: 'Blueprint',
                cpuCostMs: 0.18,
                gpuCostMs: 0.08,
                memoryMb: 14.5,
                drawCalls: 6,
                tickLoadPercent: 12,
                complexityScore: 35,
                status: 'Nominal',
                warnings: [],
                optimizationTips: ['Draft placeholder estimate based on roadmap task. Generate asset in Architect for full audit.'],
                ue5ConsoleCommands: ['stat unit', 'stat game'],
                nativizationCandidate: false
              });
            } else if (name.startsWith('M_') || name.startsWith('MI_')) {
              list.push({
                assetName: name,
                assetType: 'Material',
                cpuCostMs: 0.005,
                gpuCostMs: 0.22,
                memoryMb: 24.0,
                drawCalls: 1,
                tickLoadPercent: 0,
                shaderInstructions: 165,
                complexityScore: 40,
                status: 'Nominal',
                warnings: [],
                optimizationTips: ['Draft placeholder estimate. Generate material in Architect for exact instruction profiling.'],
                ue5ConsoleCommands: ['viewmode shadercomplexity'],
                nativizationCandidate: false
              });
            } else if (name.startsWith('MS_') || name.startsWith('Audio_')) {
              list.push({
                assetName: name,
                assetType: 'MetaSound',
                cpuCostMs: 0.06,
                gpuCostMs: 0.0,
                memoryMb: 18.0,
                drawCalls: 0,
                tickLoadPercent: 5,
                complexityScore: 28,
                status: 'Nominal',
                warnings: [],
                optimizationTips: ['Profile active DSP voice limit and buffer size.'],
                ue5ConsoleCommands: ['stat soundwaves', 'au.DisableParallelAudioRendering 0'],
                nativizationCandidate: false
              });
            }
          }
        });
      });
    }

    return list;
  }, [savedBlueprints, savedMaterials, savedPcgs, savedMetaSounds, savedBehaviorTrees, savedInputs, plan, currentPlatform]);

  const summary = useMemo(() => {
    return calculateProjectResourceSummary(assetMetrics, currentPlatform);
  }, [assetMetrics, currentPlatform]);

  // Asset naming compliance audit
  const namingAudit = useMemo(() => {
    const rawAssets = assetMetrics.map(a => ({
      name: a.assetName,
      type: a.assetType
    }));
    return auditProjectNaming(rawAssets);
  }, [assetMetrics]);

  // Set default trend asset to first blueprint if available
  useEffect(() => {
    if (!selectedTrendAsset) {
      const firstBp = assetMetrics.find(a => a.assetType === 'Blueprint');
      if (firstBp) {
        setSelectedTrendAsset(firstBp.assetName);
      } else if (assetMetrics.length > 0) {
        setSelectedTrendAsset(assetMetrics[0].assetName);
      }
    }
  }, [assetMetrics, selectedTrendAsset]);

  // Subsystem stats for filtering sidebar
  const categoryStats = useMemo(() => {
    const stats = {
      blueprints: { count: 0, cpu: 0, memory: 0, warnings: 0, criticals: 0 },
      materials: { count: 0, gpu: 0, memory: 0, warnings: 0, criticals: 0 },
      metaSounds: { count: 0, cpu: 0, memory: 0, warnings: 0, criticals: 0 },
      pcgs: { count: 0, cpu: 0, gpu: 0, memory: 0, warnings: 0, criticals: 0 },
      behaviorTrees: { count: 0, cpu: 0, memory: 0, warnings: 0, criticals: 0 },
      inputs: { count: 0, cpu: 0, memory: 0, warnings: 0, criticals: 0 }
    };

    (assetMetrics || []).forEach(a => {
      const isWarn = a.status === 'Warning';
      const isCrit = a.status === 'Critical';

      if (a.assetType === 'Blueprint') {
        stats.blueprints.count++;
        stats.blueprints.cpu += a.cpuCostMs;
        stats.blueprints.memory += a.memoryMb;
        if (isWarn) stats.blueprints.warnings++;
        if (isCrit) stats.blueprints.criticals++;
      } else if (a.assetType === 'Material') {
        stats.materials.count++;
        stats.materials.gpu += a.gpuCostMs;
        stats.materials.memory += a.memoryMb;
        if (isWarn) stats.materials.warnings++;
        if (isCrit) stats.materials.criticals++;
      } else if (a.assetType === 'MetaSound') {
        stats.metaSounds.count++;
        stats.metaSounds.cpu += a.cpuCostMs;
        stats.metaSounds.memory += a.memoryMb;
        if (isWarn) stats.metaSounds.warnings++;
        if (isCrit) stats.metaSounds.criticals++;
      } else if (a.assetType === 'PCG') {
        stats.pcgs.count++;
        stats.pcgs.cpu += a.cpuCostMs;
        stats.pcgs.gpu += a.gpuCostMs;
        stats.pcgs.memory += a.memoryMb;
        if (isWarn) stats.pcgs.warnings++;
        if (isCrit) stats.pcgs.criticals++;
      } else if (a.assetType === 'BehaviorTree') {
        stats.behaviorTrees.count++;
        stats.behaviorTrees.cpu += a.cpuCostMs;
        stats.behaviorTrees.memory += a.memoryMb;
        if (isWarn) stats.behaviorTrees.warnings++;
        if (isCrit) stats.behaviorTrees.criticals++;
      } else if (a.assetType === 'EnhancedInput') {
        stats.inputs.count++;
        stats.inputs.cpu += a.cpuCostMs;
        stats.inputs.memory += a.memoryMb;
        if (isWarn) stats.inputs.warnings++;
        if (isCrit) stats.inputs.criticals++;
      }
    });

    return stats;
  }, [assetMetrics]);

  // Filtered and sorted assets based on independent category toggles & sidebar criteria
  const filteredAssets = useMemo(() => {
    return (assetMetrics || [])
      .filter(asset => {
        // Search query
        const matchesSearch =
          asset.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (asset.warnings || []).some(w => w.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        // Independent Subsystem Toggles
        if (asset.assetType === 'Blueprint' && !categoryFilters.blueprints) return false;
        if (asset.assetType === 'Material' && !categoryFilters.materials) return false;
        if (asset.assetType === 'MetaSound' && !categoryFilters.metaSounds) return false;
        if (asset.assetType === 'PCG' && !categoryFilters.pcgs) return false;
        if (asset.assetType === 'BehaviorTree' && !categoryFilters.behaviorTrees) return false;
        if (asset.assetType === 'EnhancedInput' && !categoryFilters.inputs) return false;

        // Severity filter
        if (severityFilter !== 'all' && asset.status !== severityFilter) return false;

        // Specialized filters
        if (onlyNativizationCandidates && !asset.nativizationCandidate) return false;
        if (onlyTickingAssets && asset.tickLoadPercent <= 0) return false;

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (sortBy) {
          case 'cpu':
            valA = a.cpuCostMs;
            valB = b.cpuCostMs;
            break;
          case 'gpu':
            valA = a.gpuCostMs;
            valB = b.gpuCostMs;
            break;
          case 'memory':
            valA = a.memoryMb;
            valB = b.memoryMb;
            break;
          case 'drawCalls':
            valA = a.drawCalls;
            valB = b.drawCalls;
            break;
          case 'complexity':
            valA = a.complexityScore;
            valB = b.complexityScore;
            break;
          case 'name':
            return sortOrder === 'asc'
              ? a.assetName.localeCompare(b.assetName)
              : b.assetName.localeCompare(a.assetName);
        }

        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [
    assetMetrics,
    searchQuery,
    categoryFilters,
    severityFilter,
    onlyNativizationCandidates,
    onlyTickingAssets,
    sortBy,
    sortOrder
  ]);

  // Revision Trend Data Generation for Recharts
  const trendData = useMemo<RevisionTrendPoint[]>(() => {
    if (trendScope === 'project') {
      const baseProjectTrends = generateProjectRevisionTrends(summary, currentPlatform) || [];
      if (customSnapshots && customSnapshots.length > 0) {
        return [...baseProjectTrends, ...customSnapshots];
      }
      return baseProjectTrends;
    } else {
      const targetMetric = (assetMetrics || []).find(a => a.assetName === selectedTrendAsset);
      return generateBlueprintRevisionHistory(
        selectedTrendAsset || 'BP_PlayerCharacter',
        targetMetric,
        (customSnapshots || []).filter(s => s.assetName === selectedTrendAsset)
      ) || [];
    }
  }, [trendScope, selectedTrendAsset, summary, currentPlatform, assetMetrics, customSnapshots]);

  // Delta calculation between initial and latest revision
  const trendDeltas = useMemo(() => {
    const list = trendData || [];
    if (list.length < 2) {
      return { cpuDelta: 0, memDelta: 0, cpuPct: 0, memPct: 0 };
    }
    const initial = list[0];
    const latest = list[list.length - 1];

    const cpuDelta = parseFloat((latest.cpuCostMs - initial.cpuCostMs).toFixed(2));
    const memDelta = parseFloat((latest.memoryMb - initial.memoryMb).toFixed(1));
    const cpuPct = initial.cpuCostMs > 0 ? Math.round((cpuDelta / initial.cpuCostMs) * 100) : 0;
    const memPct = initial.memoryMb > 0 ? Math.round((memDelta / initial.memoryMb) * 100) : 0;

    return { cpuDelta, memDelta, cpuPct, memPct, initial, latest };
  }, [trendData]);

  // Quick preset filter handlers for sidebar
  const handleSelectPreset = (preset: 'all' | 'blueprints' | 'materials' | 'metaSounds' | 'gamethread' | 'render') => {
    switch (preset) {
      case 'all':
        setCategoryFilters({
          blueprints: true,
          materials: true,
          metaSounds: true,
          pcgs: true,
          behaviorTrees: true,
          inputs: true
        });
        break;
      case 'blueprints':
        setCategoryFilters({
          blueprints: true,
          materials: false,
          metaSounds: false,
          pcgs: false,
          behaviorTrees: false,
          inputs: false
        });
        break;
      case 'materials':
        setCategoryFilters({
          blueprints: false,
          materials: true,
          metaSounds: false,
          pcgs: false,
          behaviorTrees: false,
          inputs: false
        });
        break;
      case 'metaSounds':
        setCategoryFilters({
          blueprints: false,
          materials: false,
          metaSounds: true,
          pcgs: false,
          behaviorTrees: false,
          inputs: false
        });
        break;
      case 'gamethread':
        setCategoryFilters({
          blueprints: true,
          materials: false,
          metaSounds: false,
          pcgs: false,
          behaviorTrees: true,
          inputs: true
        });
        break;
      case 'render':
        setCategoryFilters({
          blueprints: false,
          materials: true,
          metaSounds: false,
          pcgs: true,
          behaviorTrees: false,
          inputs: false
        });
        break;
    }
  };

  const handleCaptureSnapshot = () => {
    if (trendScope === 'project') {
      const nextRevNum = trendData.length + 1;
      const newPoint: RevisionTrendPoint = {
        revision: `v${(nextRevNum * 0.2).toFixed(1)} Snapshot`,
        revisionNumber: nextRevNum,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assetName: 'Project Aggregate',
        cpuCostMs: summary.totalCpuMs,
        memoryMb: summary.totalMemoryMb,
        gpuCostMs: summary.totalGpuMs,
        drawCalls: summary.totalDrawCalls,
        changeDescription: newSnapshotNote.trim() || 'Manual revision benchmark captured from current workspace session.',
        eventTickActive: false,
        nodeCount: 650
      };
      setCustomSnapshots(prev => [...prev, newPoint]);
    } else {
      const targetMetric = assetMetrics.find(a => a.assetName === selectedTrendAsset);
      const nextRevNum = trendData.length + 1;
      const newPoint: RevisionTrendPoint = {
        revision: `Rev 1.${nextRevNum}`,
        revisionNumber: nextRevNum,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assetName: selectedTrendAsset,
        cpuCostMs: targetMetric ? targetMetric.cpuCostMs : 0.45,
        memoryMb: targetMetric ? targetMetric.memoryMb : 20.0,
        gpuCostMs: targetMetric ? targetMetric.gpuCostMs : 0.1,
        drawCalls: targetMetric ? targetMetric.drawCalls : 4,
        changeDescription: newSnapshotNote.trim() || 'Custom Blueprint revision recorded during performance tuning.',
        eventTickActive: targetMetric ? targetMetric.tickLoadPercent > 20 : false,
        nodeCount: 60
      };
      setCustomSnapshots(prev => [...prev, newPoint]);
    }
    setNewSnapshotNote('');
    setShowSnapshotModal(false);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleCopyIni = () => {
    const iniConfig = `[SystemSettings]
; UE5 Performance Budget Optimization CVars (${currentPlatform.name})
r.Nanite.MaxNodes=1048576
r.Lumen.DiffuseIndirect.Allow=1
r.Lumen.Reflections.Allow=1
r.Shadow.Virtual.Enable=1
r.DynamicGlobalIlluminationMethod=1
r.ReflectionMethod=1
r.ShaderComplexity.Max=2500
wp.Runtime.EnableTrace=0
au.DisableParallelAudioRendering=0
gc.TimeBetweenPurgingPendingKillObjects=60`;
    navigator.clipboard.writeText(iniConfig);
    setCopiedIni(true);
    setTimeout(() => setCopiedIni(false), 2000);
  };

  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'pc_high_60': return <Laptop className="w-4 h-4" />;
      case 'console_ps5_60': return <Tv className="w-4 h-4" />;
      case 'steam_deck_30': return <Gamepad2 className="w-4 h-4" />;
      case 'vr_quest3_90': return <Eye className="w-4 h-4" />;
      case 'mobile_high_60': return <Smartphone className="w-4 h-4" />;
      default: return <Gauge className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: 'Nominal' | 'Warning' | 'Critical') => {
    switch (status) {
      case 'Nominal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Nominal
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            <AlertCircle className="w-3 h-3" /> Critical
          </span>
        );
    }
  };

  // Custom Tooltip for Recharts Trend Chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: RevisionTrendPoint = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-4 rounded-2xl shadow-2xl backdrop-blur-xl max-w-xs text-xs space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="font-bold text-white text-sm">{data.revision}</span>
              <div className="text-[10px] text-slate-400 font-mono">{data.timestamp}</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20">
              {data.assetName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                <Cpu className="w-3 h-3 text-blue-400" /> CPU Thread
              </span>
              <div className="text-blue-400 font-bold text-sm mt-0.5">{data.cpuCostMs} ms</div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                <HardDrive className="w-3 h-3 text-cyan-400" /> Memory Footprint
              </span>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">{data.memoryMb} MB</div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                <Zap className="w-3 h-3 text-emerald-400" /> GPU Time
              </span>
              <div className="text-emerald-400 font-bold text-xs mt-0.5">{data.gpuCostMs} ms</div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                <Layers className="w-3 h-3 text-purple-400" /> Draw Calls
              </span>
              <div className="text-purple-400 font-bold text-xs mt-0.5">{data.drawCalls}</div>
            </div>
          </div>

          {data.changeDescription && (
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-300 leading-relaxed italic">
              "{data.changeDescription}"
            </div>
          )}

          {data.eventTickActive && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 font-mono">
              <AlertTriangle className="w-3 h-3" /> Event Tick Active in this revision
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full max-w-[1600px] mx-auto flex flex-col space-y-6 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      
      {/* Top Header & Platform Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase rounded-full tracking-widest flex items-center gap-1.5">
              <Activity className="w-3 h-3 animate-pulse" /> Live Telemetry Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Unreal Engine 5 Resource & Budget Profiler
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Gauge className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400" /> Resource & Performance Tracker
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mt-1 leading-relaxed">
            Granular subsystem profiling, revision trend tracking, and bottleneck identification across Blueprints, Materials, and Audio.
          </p>
        </div>

        {/* Platform Selector Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-inner">
            {PLATFORM_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatformId(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedPlatformId === p.id
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {getPlatformIcon(p.id)}
                <span>{p.targetFps} FPS</span>
                <span className="hidden md:inline opacity-70 text-[10px]">({p.targetFrameTimeMs}ms)</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsNamingAssistantOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 hover:text-white text-xs font-bold border border-purple-500/30 hover:border-purple-500/50 transition-all shadow-sm cursor-pointer"
            title="Open Asset Naming Convention Assistant to audit and standardize project asset prefixes"
          >
            <Tag className="w-4 h-4 text-purple-400" />
            <span>Naming Assistant</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
              namingAudit.compliancePercentage >= 80 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {namingAudit.compliancePercentage}%
            </span>
          </button>

          <button
            onClick={handleCopyIni}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-slate-600 transition-all shadow-sm cursor-pointer"
          >
            {copiedIni ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            {copiedIni ? 'Copied Engine.ini' : 'Export CVars'}
          </button>
        </div>
      </div>

      {/* Primary Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: CPU Game Thread */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-900/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" /> CPU Game Thread
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              summary.cpuPercent > 100 ? 'bg-red-500/20 text-red-300' : summary.cpuPercent > 75 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/10 text-blue-300'
            }`}>
              {summary.cpuPercent}% Budget
            </span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{summary.totalCpuMs}</span>
              <span className="text-xs text-slate-400 font-mono">/ {currentPlatform.maxCpuBudgetMs} ms</span>
            </div>
            <p className="text-[10px] text-slate-500">Tick loops, event graph branches & delegates</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                summary.cpuPercent > 100 ? 'bg-red-500' : summary.cpuPercent > 75 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, summary.cpuPercent)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: GPU Render Thread */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-900/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> GPU Render Frame
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              summary.gpuPercent > 100 ? 'bg-red-500/20 text-red-300' : summary.gpuPercent > 75 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
            }`}>
              {summary.gpuPercent}% Budget
            </span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{summary.totalGpuMs}</span>
              <span className="text-xs text-slate-400 font-mono">/ {currentPlatform.maxGpuBudgetMs} ms</span>
            </div>
            <p className="text-[10px] text-slate-500">Shader instructions, Nanite raster & Lumen</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                summary.gpuPercent > 100 ? 'bg-red-500' : summary.gpuPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, summary.gpuPercent)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Draw Calls */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-900/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Draw Calls
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              summary.drawCallsPercent > 100 ? 'bg-red-500/20 text-red-300' : summary.drawCallsPercent > 75 ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/10 text-purple-300'
            }`}>
              {summary.drawCallsPercent}% Budget
            </span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{summary.totalDrawCalls}</span>
              <span className="text-xs text-slate-400 font-mono">/ {currentPlatform.maxDrawCalls} calls</span>
            </div>
            <p className="text-[10px] text-slate-500">Geometry passes, shadow maps & Niagara meshes</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                summary.drawCallsPercent > 100 ? 'bg-red-500' : summary.drawCallsPercent > 75 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, summary.drawCallsPercent)}%` }}
            />
          </div>
        </div>

        {/* Metric 4: RAM / VRAM */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-900/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" /> RAM / VRAM Footprint
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              summary.memoryPercent > 100 ? 'bg-red-500/20 text-red-300' : summary.memoryPercent > 75 ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'
            }`}>
              {summary.memoryPercent}% Budget
            </span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">{summary.totalMemoryMb}</span>
              <span className="text-xs text-slate-400 font-mono">/ {currentPlatform.maxVramMb} MB</span>
            </div>
            <p className="text-[10px] text-slate-500">Textures, audio buffers, PCG point data</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                summary.memoryPercent > 100 ? 'bg-red-500' : summary.memoryPercent > 75 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, summary.memoryPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🧭 SPLIT-PANE DASHBOARD: SIDEBAR ON LEFT, (TOP TREND + BOTTOM TABLE) ON RIGHT */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* --- DEDICATED FILTERING SIDEBAR (Accessible on Sidebar) --- */}
        <ResourceSidebar
          categoryFilters={categoryFilters}
          setCategoryFilters={setCategoryFilters}
          categoryStats={categoryStats}
          handleSelectPreset={handleSelectPreset}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          onlyNativizationCandidates={onlyNativizationCandidates}
          setOnlyNativizationCandidates={setOnlyNativizationCandidates}
          onlyTickingAssets={onlyTickingAssets}
          setOnlyTickingAssets={setOnlyTickingAssets}
          isSidebarOpen={isSidebarOpen}
        />

        {/* --- MAIN SPLIT-PANE WORKSPACE: TOP TREND VISUALIZATION + BOTTOM SCROLLABLE ASSET LIST --- */}
        <main className="flex-1 w-full min-w-0 flex flex-col space-y-5">
          
          {/* TOP SECTION: REVISION TREND VISUALIZATION (Recharts) */}
          <div className="glass-card rounded-3xl border border-slate-800/90 bg-slate-900/40 p-5 sm:p-6 shadow-2xl space-y-5">
        
        {/* Trend Visualization Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Historical Telemetry
              </span>
              <span className="text-xs text-slate-400 font-mono">Recharts Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <History className="w-6 h-6 text-blue-400" /> Blueprint & Asset Revision Trends
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracking fluctuation of estimated CPU GameThread time (ms) and Memory footprint (MB) across recent asset iterations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Selector (Project Aggregate vs Specific Blueprint) */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setTrendScope('project')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  trendScope === 'project'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Project Aggregate
              </button>
              <button
                onClick={() => setTrendScope('asset')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  trendScope === 'asset'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" /> Specific Asset
              </button>
            </div>

            {/* Asset Selector Dropdown if 'asset' scope */}
            {trendScope === 'asset' && (
              <select
                value={selectedTrendAsset}
                onChange={e => setSelectedTrendAsset(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 transition-all max-w-[200px]"
              >
                {(assetMetrics || []).map(a => (
                  <option key={a.assetName} value={a.assetName}>
                    {a.assetName} ({a.assetType})
                  </option>
                ))}
              </select>
            )}

            {/* Metric View Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setChartMetricView('dual')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartMetricView === 'dual' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CPU & RAM
              </button>
              <button
                onClick={() => setChartMetricView('cpu')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartMetricView === 'cpu' ? 'bg-blue-900/60 text-blue-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CPU Only
              </button>
              <button
                onClick={() => setChartMetricView('memory')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartMetricView === 'memory' ? 'bg-cyan-900/60 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RAM Only
              </button>
            </div>

            {/* Record Snapshot Button */}
            <button
              onClick={() => setShowSnapshotModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Benchmark Snapshot
            </button>

            {/* Collapse / Expand Trend Section */}
            <button
              onClick={() => setIsTrendCollapsed(prev => !prev)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={isTrendCollapsed ? "Expand Trend Chart" : "Collapse Trend Chart"}
            >
              {isTrendCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed State OR Full Trend Body */}
        {isTrendCollapsed ? (
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400 font-mono">
                Scope: <strong className="text-white">{trendScope === 'project' ? 'All Project Systems' : selectedTrendAsset}</strong> ({trendData.length} checkpoints)
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className={`font-mono font-bold ${trendDeltas.cpuDelta <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Δ CPU: {trendDeltas.cpuDelta > 0 ? `+${trendDeltas.cpuDelta}` : trendDeltas.cpuDelta} ms ({trendDeltas.cpuPct > 0 ? `+${trendDeltas.cpuPct}%` : `${trendDeltas.cpuPct}%`})
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className={`font-mono font-bold ${trendDeltas.memDelta <= 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                Δ RAM: {trendDeltas.memDelta > 0 ? `+${trendDeltas.memDelta}` : trendDeltas.memDelta} MB ({trendDeltas.memPct > 0 ? `+${trendDeltas.memPct}%` : `${trendDeltas.memPct}%`})
              </span>
            </div>
            <button
              onClick={() => setIsTrendCollapsed(false)}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
            >
              Expand Visualization
            </button>
          </div>
        ) : (
          <>
        {/* Trend Summary Delta Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Scope Target</span>
            <div className="text-xs font-bold text-slate-200 truncate font-mono">
              {trendScope === 'project' ? 'All Project Systems' : selectedTrendAsset}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">CPU GameThread Delta</span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
              <span className={trendDeltas.cpuDelta <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {trendDeltas.cpuDelta > 0 ? `+${trendDeltas.cpuDelta}` : trendDeltas.cpuDelta} ms
              </span>
              <span className={`text-[10px] px-1 rounded ${trendDeltas.cpuDelta <= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                {trendDeltas.cpuPct > 0 ? `+${trendDeltas.cpuPct}%` : `${trendDeltas.cpuPct}%`}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Memory Delta</span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
              <span className={trendDeltas.memDelta <= 0 ? 'text-emerald-400' : 'text-cyan-400'}>
                {trendDeltas.memDelta > 0 ? `+${trendDeltas.memDelta}` : trendDeltas.memDelta} MB
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-1 rounded">
                {trendDeltas.memPct > 0 ? `+${trendDeltas.memPct}%` : `${trendDeltas.memPct}%`}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Revisions Tracked</span>
            <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-blue-400" />
              <span>{trendData.length} Milestone Snapshots</span>
            </div>
          </div>
        </div>

        {/* Main Recharts Container */}
        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendData}
              margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
              
              <XAxis
                dataKey="revision"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
              />

              {/* Left Y-Axis: CPU (ms) */}
              {(chartMetricView === 'dual' || chartMetricView === 'cpu') && (
                <YAxis
                  yAxisId="cpu"
                  orientation="left"
                  stroke="#3b82f6"
                  tick={{ fill: '#60a5fa', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#3b82f6' }}
                  unit=" ms"
                  domain={[0, 'auto']}
                />
              )}

              {/* Right Y-Axis: Memory (MB) */}
              {(chartMetricView === 'dual' || chartMetricView === 'memory') && (
                <YAxis
                  yAxisId="memory"
                  orientation="right"
                  stroke="#06b6d4"
                  tick={{ fill: '#22d3ee', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#06b6d4' }}
                  unit=" MB"
                  domain={[0, 'auto']}
                />
              )}

              <Tooltip content={<CustomTrendTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
              />

              {/* Threshold Reference Line for CPU frame limit if project view */}
              {trendScope === 'project' && (
                <ReferenceLine
                  yAxisId="cpu"
                  y={currentPlatform.maxCpuBudgetMs}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Target CPU Budget (${currentPlatform.maxCpuBudgetMs}ms)`,
                    fill: '#f87171',
                    fontSize: 10,
                    position: 'insideTopLeft'
                  }}
                />
              )}

              {/* Memory Area */}
              {(chartMetricView === 'dual' || chartMetricView === 'memory') && (
                <Area
                  yAxisId="memory"
                  type="monotone"
                  dataKey="memoryMb"
                  name="Memory Footprint (MB)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#memoryGradient)"
                  dot={{ fill: '#06b6d4', r: 4, strokeWidth: 1, stroke: '#083344' }}
                  activeDot={{ r: 6, fill: '#67e8f9', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* CPU Line */}
              {(chartMetricView === 'dual' || chartMetricView === 'cpu') && (
                <Line
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="cpuCostMs"
                  name="CPU GameThread (ms)"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#1e3a8a' }}
                  activeDot={{ r: 7, fill: '#93c5fd', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* GPU Line if in all view */}
              {chartMetricView === 'all' && (
                <Line
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="gpuCostMs"
                  name="GPU Time (ms)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone Changelog Timeline Chips */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
            Revision Milestone Annotations
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {(trendData || []).map((pt, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-white">{pt.revision}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{pt.timestamp}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-blue-400 font-bold">{pt.cpuCostMs} ms</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-400">{pt.memoryMb} MB</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {pt.changeDescription}
                </p>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 📋 BOTTOM SECTION: DETAILED ASSET LIST IN SCROLLABLE TABLE */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-3xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Table Controls Header */}
            <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Active Subsystem Inspector
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  ({filteredAssets.length} of {assetMetrics.length} Assets Displayed)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter by name or warning..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all w-48 sm:w-60"
                  />
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1.5" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-transparent text-slate-200 border-none focus:outline-none text-xs pr-2 py-0.5 cursor-pointer"
                  >
                    <option value="cpu">Sort: CPU Cost</option>
                    <option value="gpu">Sort: GPU Cost</option>
                    <option value="memory">Sort: Memory</option>
                    <option value="drawCalls">Sort: Draw Calls</option>
                    <option value="complexity">Sort: Complexity</option>
                    <option value="name">Sort: Name</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
              </div>
            </div>

            {/* Asset Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] lg:max-h-[540px] custom-scrollbar border-t border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider shadow-sm">
                  <tr>
                    <th className="py-3.5 px-6 font-bold">Asset Name</th>
                    <th className="py-3.5 px-4 font-bold">Subsystem</th>
                    <th className="py-3.5 px-4 font-bold text-right">CPU Cost</th>
                    <th className="py-3.5 px-4 font-bold text-right">GPU Cost</th>
                    <th className="py-3.5 px-4 font-bold text-right">RAM / VRAM</th>
                    <th className="py-3.5 px-4 font-bold text-right">Draw Calls</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {(filteredAssets || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500 italic">
                        No assets match the active subsystem filters. Check the sidebar toggles.
                      </td>
                    </tr>
                  ) : (
                    (filteredAssets || []).map(asset => (
                      <tr
                        key={asset.assetName}
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        onClick={() => setSelectedAssetForDetails(asset)}
                      >
                        <td className="py-4 px-6">
                          <div className="font-mono font-bold text-slate-200 group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                            {asset.assetName}
                            {asset.nativizationCandidate && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                                C++
                              </span>
                            )}
                          </div>
                          {(asset.warnings || []).length > 0 ? (
                            <div className="text-[10px] text-amber-400/80 truncate max-w-sm mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{(asset.warnings || [])[0]}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Complexity Score: {asset.complexityScore}/100
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-medium">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            asset.assetType === 'Blueprint' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            asset.assetType === 'Material' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            asset.assetType === 'MetaSound' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            asset.assetType === 'PCG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {asset.assetType}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-blue-400">
                          {asset.cpuCostMs} ms
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                          {asset.gpuCostMs} ms
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-300">
                          {asset.memoryMb} MB
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-300">
                          {asset.drawCalls}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {getStatusBadge(asset.status)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            {onNavigateToBlueprint && (
                              <button
                                onClick={() => onNavigateToBlueprint(asset.assetName)}
                                title="Open in Blueprint Architect"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            {/* AI OPTIMIZE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiOptimizeAsset(asset);
                              }}
                              title="Intelligent AI Refactoring & Overhead Reduction Tips"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600 hover:to-indigo-600 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500/60 text-[11px] font-bold transition-all shadow-sm hover:shadow-purple-900/40 group/ai"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover/ai:text-white group-hover/ai:rotate-12 transition-transform" />
                              <span className="hidden xl:inline">AI Optimize</span>
                              <span className="xl:hidden">AI</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTrendAsset(asset.assetName);
                                setTrendScope('asset');
                              }}
                              title="View Revision Trend in Chart"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAssetForDetails(asset);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </main>

      </div>

      {/* ========================================================================= */}
      {/* 🔍 ASSET INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedAssetForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-700 p-6 sm:p-8 bg-slate-900 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedAssetForDetails.assetType}
                  </span>
                  {getStatusBadge(selectedAssetForDetails.status)}
                </div>
                <h3 className="text-2xl font-black text-white">{selectedAssetForDetails.assetName}</h3>
              </div>
              <button
                onClick={() => setSelectedAssetForDetails(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">CPU GameThread</span>
                <div className="text-lg font-black text-blue-400">{selectedAssetForDetails.cpuCostMs} ms</div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">GPU Render</span>
                <div className="text-lg font-black text-emerald-400">{selectedAssetForDetails.gpuCostMs} ms</div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Memory Footprint</span>
                <div className="text-lg font-black text-cyan-400">{selectedAssetForDetails.memoryMb} MB</div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Draw Calls</span>
                <div className="text-lg font-black text-purple-400">{selectedAssetForDetails.drawCalls}</div>
              </div>
            </div>

            {/* Warnings Section */}
            {(selectedAssetForDetails.warnings || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Detected Performance Friction
                </h4>
                <div className="space-y-1.5">
                  {(selectedAssetForDetails.warnings || []).map((w, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UE5 Optimization Recommendations */}
            {(selectedAssetForDetails.optimizationTips || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Unreal Engine 5 Action Plan
                </h4>
                <div className="space-y-2">
                  {(selectedAssetForDetails.optimizationTips || []).map((tip, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Console Commands Section */}
            {(selectedAssetForDetails.ue5ConsoleCommands || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" /> UE5 Diagnostics Console Commands
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedAssetForDetails.ue5ConsoleCommands || []).map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCopyCommand(cmd)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-blue-500 text-xs font-mono text-slate-300 hover:text-white transition-all group"
                    >
                      <span>{cmd}</span>
                      {copiedCommand === cmd ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedTrendAsset(selectedAssetForDetails.assetName);
                  setTrendScope('asset');
                  setSelectedAssetForDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                View Revision Trend
              </button>

              <div className="flex items-center gap-3">
                {onNavigateToBlueprint && (
                  <button
                    onClick={() => {
                      const name = selectedAssetForDetails.assetName;
                      setSelectedAssetForDetails(null);
                      onNavigateToBlueprint(name);
                    }}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Architect
                  </button>
                )}
                <button
                  onClick={() => {
                    const target = selectedAssetForDetails;
                    setSelectedAssetForDetails(null);
                    setAiOptimizeAsset(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Optimize Asset
                </button>
                <button
                  onClick={() => setSelectedAssetForDetails(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📸 SNAPSHOT CREATION MODAL */}
      {/* ========================================================================= */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full rounded-3xl border border-slate-700 p-6 bg-slate-900 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Record Revision Snapshot
              </h3>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Capture current performance telemetry point for{' '}
              <strong className="text-white">
                {trendScope === 'project' ? 'Project Aggregate' : selectedTrendAsset}
              </strong>{' '}
              to track memory & CPU evolution across future iterations.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Change Log Note</label>
              <textarea
                value={newSnapshotNote}
                onChange={e => setNewSnapshotNote(e.target.value)}
                placeholder="e.g., Replaced Event Tick with 0.2s timer; reduced texture sizes."
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCaptureSnapshot}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Save Benchmark Point
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✨ AI OPTIMIZE REFLECTION & SUGGESTION MODAL */}
      {/* ========================================================================= */}
      {aiOptimizeAsset && (
        <AIOptimizeModal
          asset={aiOptimizeAsset}
          platform={currentPlatform}
          onClose={() => setAiOptimizeAsset(null)}
          onNavigateToBlueprint={onNavigateToBlueprint}
        />
      )}

      {/* ========================================================================= */}
      {/* 🏷️ ASSET NAMING CONVENTION ASSISTANT MODAL */}
      {/* ========================================================================= */}
      {isNamingAssistantOpen && (
        <AssetNamingAssistantModal
          isOpen={isNamingAssistantOpen}
          onClose={() => setIsNamingAssistantOpen(false)}
          assets={assetMetrics.map(a => ({
            name: a.assetName,
            type: a.assetType
          }))}
        />
      )}

    </div>
  );
};

export default ResourceTracker;
