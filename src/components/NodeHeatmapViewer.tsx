import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Zap, 
  Activity, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  Info, 
  SlidersHorizontal,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { BlueprintSpec, NodeUsageHeatmapEntry } from '../types';
import { calculateNodeHeatmap, HeatmapAnalysisSummary } from '../services/nodeHeatmapCalculator';

interface NodeHeatmapViewerProps {
  savedBlueprints: Record<string, BlueprintSpec>;
  currentBlueprintName?: string;
  onSelectBlueprint?: (assetName: string) => void;
}

export const NodeHeatmapViewer: React.FC<NodeHeatmapViewerProps> = ({
  savedBlueprints,
  currentBlueprintName,
  onSelectBlueprint
}) => {
  // Scope: 'current' (active blueprint) or 'all' (entire project)
  const [scope, setScope] = useState<'current' | 'all'>(currentBlueprintName ? 'current' : 'all');
  const [tierFilter, setTierFilter] = useState<'all' | 'hot' | 'warm' | 'cool'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'flow' | 'function' | 'variable'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<NodeUsageHeatmapEntry | null>(null);

  // Compute heatmap data
  const heatmapData: HeatmapAnalysisSummary = useMemo(() => {
    return calculateNodeHeatmap(
      savedBlueprints,
      scope === 'current' ? currentBlueprintName : undefined
    );
  }, [savedBlueprints, scope, currentBlueprintName]);

  // Set default selected node
  React.useEffect(() => {
    if (!selectedNode && heatmapData.entries.length > 0) {
      setSelectedNode(heatmapData.entries[0]);
    } else if (selectedNode) {
      const refreshed = heatmapData.entries.find(e => e.nodeName === selectedNode.nodeName);
      if (refreshed) setSelectedNode(refreshed);
    }
  }, [heatmapData]);

  // Filtered entries for display
  const filteredEntries = useMemo(() => {
    return heatmapData.entries.filter(entry => {
      if (tierFilter !== 'all' && entry.intensityTier !== tierFilter) return false;
      if (typeFilter !== 'all' && entry.nodeType !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = entry.nodeName.toLowerCase().includes(q);
        const matchTip = entry.optimizationTip.toLowerCase().includes(q);
        const matchBp = entry.referencedInBlueprints.some(b => b.assetName.toLowerCase().includes(q));
        if (!matchName && !matchTip && !matchBp) return false;
      }
      return true;
    });
  }, [heatmapData, tierFilter, typeFilter, searchQuery]);

  // Export report as formatted Markdown
  const handleExportReport = () => {
    const lines = [
      `# Unreal Engine Blueprint Logic - Usage Intensity & Performance Heatmap`,
      `**Scope**: ${scope === 'current' ? `Blueprint: ${currentBlueprintName}` : 'All Project Subsystems'}`,
      `**Total Nodes Scanned**: ${heatmapData.totalNodesScanned}`,
      `**Unique Node Types**: ${heatmapData.uniqueNodeTypes}`,
      `**Overall Architecture Health Score**: ${heatmapData.overallHealthScore}/100`,
      ``,
      `## Summary Metrics`,
      `- 🔥 Critical Hotspot Nodes: ${heatmapData.hotCount}`,
      `- ⚡ Moderate Flow Nodes: ${heatmapData.warmCount}`,
      `- 🌿 Cool & Optimized Nodes: ${heatmapData.coolCount}`,
      `- EventTick-bound Nodes: ${heatmapData.tickBoundNodesCount}`,
      `- Dynamic Hard Casts: ${heatmapData.hardCastCount}`,
      `- Scene Traces/Sweeps: ${heatmapData.heavyTraceCount}`,
      ``,
      `## Node Usage Intensity Ranking`,
      `| Node Name | Type | References | Connections | Intensity | Impact | Recommendation |`,
      `| --- | --- | --- | --- | --- | --- | --- |`
    ];

    heatmapData.entries.forEach(e => {
      lines.push(
        `| ${e.nodeName} | ${e.nodeType} | ${e.referenceCount} | ${e.totalConnections} | ${e.usageIntensity}% (${e.intensityTier.toUpperCase()}) | ${e.performanceImpact.toUpperCase()} | ${e.optimizationTip} |`
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ue_node_intensity_heatmap_${scope}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-inner">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Node Usage Intensity & Heatmap
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Profiler
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light mt-0.5">
              Identifies high-frequency nodes, execution bottlenecks, and cyclic casting across logic trees to optimize runtime framerates.
            </p>
          </div>
        </div>

        {/* Scope Selector & Export Actions */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setScope('current')}
              disabled={!currentBlueprintName}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'current'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={currentBlueprintName ? `Analyze ${currentBlueprintName} only` : 'No blueprint currently selected'}
            >
              Active Blueprint {currentBlueprintName ? `(${currentBlueprintName})` : ''}
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Subsystems ({Object.keys(savedBlueprints).length})
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all shadow-md cursor-pointer"
            title="Export usage intensity heatmap as a markdown report"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Nodes */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Nodes Scanned</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{heatmapData.totalNodesScanned}</div>
          <div className="text-[10px] text-slate-500 mt-1">{heatmapData.uniqueNodeTypes} distinct types</div>
        </div>

        {/* Health Score */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Logic Health</div>
          <div className={`text-2xl font-black mt-1 font-mono ${
            heatmapData.overallHealthScore >= 80 ? 'text-emerald-400' : heatmapData.overallHealthScore >= 60 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {heatmapData.overallHealthScore}<span className="text-xs text-slate-500">/100</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {heatmapData.overallHealthScore >= 80 ? 'Optimal Structure' : 'Optimization Advised'}
          </div>
        </div>

        {/* Hot Nodes */}
        <div className="glass-card p-4 rounded-xl border border-rose-500/20 bg-rose-950/20">
          <div className="text-[10px] text-rose-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> Critical Hot
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1 font-mono">{heatmapData.hotCount}</div>
          <div className="text-[10px] text-rose-400/70 mt-1">High CPU / Memory risk</div>
        </div>

        {/* Warm Nodes */}
        <div className="glass-card p-4 rounded-xl border border-amber-500/20 bg-amber-950/20">
          <div className="text-[10px] text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Warm Flow
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{heatmapData.warmCount}</div>
          <div className="text-[10px] text-amber-400/70 mt-1">Moderate branching</div>
        </div>

        {/* Cool Nodes */}
        <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
          <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Cool / Pure
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">{heatmapData.coolCount}</div>
          <div className="text-[10px] text-emerald-400/70 mt-1">Zero latency overhead</div>
        </div>

        {/* Tick Bound */}
        <div className="glass-card p-4 rounded-xl border border-purple-500/20 bg-purple-950/20">
          <div className="text-[10px] text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <Cpu className="w-3 h-3 text-purple-400" /> Tick-Bound
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1 font-mono">{heatmapData.tickBoundNodesCount}</div>
          <div className="text-[10px] text-purple-400/70 mt-1">Per-frame executions</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-mono px-2 uppercase">Intensity:</span>
            {(['all', 'hot', 'warm', 'cool'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  tierFilter === tier
                    ? tier === 'hot'
                      ? 'bg-rose-600 text-white'
                      : tier === 'warm'
                      ? 'bg-amber-600 text-white'
                      : tier === 'cool'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-mono px-2 uppercase">Type:</span>
            {(['all', 'event', 'flow', 'function', 'variable'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${
                  typeFilter === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes, optimization tips..."
            className="w-full bg-slate-950/90 border border-slate-700 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg placeholder:text-slate-500 outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Main Grid: Heatmap Tiles & Selected Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Heatmap Visual Matrix (Left 7 cols) */}
        <div className="lg:col-span-7 glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Logic Node Heatmap ({filteredEntries.length} nodes)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              Sorted by Usage Intensity Index
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No nodes match the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredEntries.map(entry => {
                const isSelected = selectedNode?.nodeName === entry.nodeName;

                // Color themes based on intensity tier
                const tileStyles =
                  entry.intensityTier === 'hot'
                    ? {
                        bg: 'bg-rose-950/20 hover:bg-rose-900/30',
                        border: isSelected ? 'border-rose-400 ring-1 ring-rose-400/50' : 'border-rose-500/30',
                        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                        bar: 'bg-gradient-to-r from-rose-600 to-red-500',
                        text: 'text-rose-200'
                      }
                    : entry.intensityTier === 'warm'
                    ? {
                        bg: 'bg-amber-950/20 hover:bg-amber-900/30',
                        border: isSelected ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-amber-500/30',
                        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                        bar: 'bg-gradient-to-r from-amber-600 to-orange-500',
                        text: 'text-amber-200'
                      }
                    : {
                        bg: 'bg-emerald-950/20 hover:bg-emerald-900/30',
                        border: isSelected ? 'border-emerald-400 ring-1 ring-emerald-400/50' : 'border-emerald-500/30',
                        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        bar: 'bg-gradient-to-r from-emerald-600 to-teal-500',
                        text: 'text-emerald-200'
                      };

                return (
                  <div
                    key={entry.nodeName}
                    onClick={() => setSelectedNode(entry)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none group relative overflow-hidden ${tileStyles.bg} ${tileStyles.border}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <span className={`text-xs font-black truncate block font-mono ${tileStyles.text}`}>
                          {entry.nodeName}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">
                          {entry.nodeType}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${tileStyles.badge}`}>
                        {entry.usageIntensity}%
                      </span>
                    </div>

                    {/* Intensity Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${tileStyles.bar}`}
                        style={{ width: `${entry.usageIntensity}%` }}
                      />
                    </div>

                    {/* Reference and Wires Info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Ref: <strong>{entry.referenceCount}x</strong></span>
                      <span>Wires: <strong>{entry.totalConnections}</strong></span>
                      <span className="capitalize">{entry.performanceImpact} Impact</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Node Inspector (Right 5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl space-y-5">
          {selectedNode ? (
            <>
              {/* Header */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    selectedNode.intensityTier === 'hot'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : selectedNode.intensityTier === 'warm'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {selectedNode.intensityTier} Intensity ({selectedNode.usageIntensity}%)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Type: {selectedNode.nodeType}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-mono">{selectedNode.nodeName}</h3>
              </div>

              {/* Intensity Gauge & Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-mono">Total Refs</div>
                  <div className="text-lg font-black text-white font-mono mt-1">{selectedNode.referenceCount}</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-mono">Wire Pins</div>
                  <div className="text-lg font-black text-white font-mono mt-1">{selectedNode.totalConnections}</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-mono">Perf Impact</div>
                  <div className={`text-sm font-black uppercase font-mono mt-1.5 ${
                    selectedNode.performanceImpact === 'high' ? 'text-rose-400' : selectedNode.performanceImpact === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedNode.performanceImpact}
                  </div>
                </div>
              </div>

              {/* Optimization Tip Box */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-1.5">
                <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  Performance Optimization Guideline
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {selectedNode.optimizationTip}
                </p>
              </div>

              {/* Blueprints Referencing This Node */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Referenced In Blueprints ({selectedNode.referencedInBlueprints.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedNode.referencedInBlueprints.map((ref, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white font-mono truncate">{ref.assetName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Graph: {ref.eventName}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {ref.occurrences}x
                        </span>
                        {onSelectBlueprint && (
                          <button
                            onClick={() => onSelectBlueprint(ref.assetName)}
                            className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title={`Jump to ${ref.assetName}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select a node in the heatmap to view performance impact and optimization guidelines.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
