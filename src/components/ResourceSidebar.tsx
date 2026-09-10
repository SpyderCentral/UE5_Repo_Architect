import React from 'react';
import {
  SlidersHorizontal,
  Cpu,
  Palette,
  Volume2,
  Box,
  Brain,
  CheckSquare,
  Square,
} from 'lucide-react';

export interface CategoryFilters {
  blueprints: boolean;
  materials: boolean;
  metaSounds: boolean;
  pcgs: boolean;
  behaviorTrees: boolean;
}

export interface CategoryStatsItem {
  count: number;
  cpu: number;
  gpu: number;
  memory: number;
  criticals: number;
}

export interface CategoryStatsMap {
  blueprints: CategoryStatsItem;
  materials: CategoryStatsItem;
  metaSounds: CategoryStatsItem;
  pcgs: CategoryStatsItem;
  behaviorTrees: CategoryStatsItem;
}

export type SeverityFilterType = 'all' | 'Critical' | 'Warning' | 'Nominal';

interface ResourceSidebarProps {
  categoryFilters: CategoryFilters;
  setCategoryFilters: React.Dispatch<React.SetStateAction<CategoryFilters>>;
  categoryStats: CategoryStatsMap;
  handleSelectPreset: (preset: 'all' | 'blueprints' | 'materials' | 'metaSounds' | 'gamethread') => void;
  severityFilter: SeverityFilterType;
  setSeverityFilter: (filter: SeverityFilterType) => void;
  onlyNativizationCandidates: boolean;
  setOnlyNativizationCandidates: (val: boolean) => void;
  onlyTickingAssets: boolean;
  setOnlyTickingAssets: (val: boolean) => void;
  isSidebarOpen: boolean;
}

export const ResourceSidebar: React.FC<ResourceSidebarProps> = ({
  categoryFilters,
  setCategoryFilters,
  categoryStats,
  handleSelectPreset,
  severityFilter,
  setSeverityFilter,
  onlyNativizationCandidates,
  setOnlyNativizationCandidates,
  onlyTickingAssets,
  setOnlyTickingAssets,
  isSidebarOpen,
}) => {
  return (
    <aside
      className={`w-full lg:w-72 xl:w-80 shrink-0 space-y-4 transition-all duration-300 ${
        isSidebarOpen ? 'block' : 'hidden lg:block'
      }`}
    >
      <div className="glass-card rounded-3xl border border-slate-800/90 bg-slate-900/50 p-5 shadow-xl space-y-5 sticky top-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Subsystem Filters
            </h3>
          </div>
          <button
            onClick={() => handleSelectPreset('all')}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono font-bold transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Quick Filter Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Quick Bottleneck Presets
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => handleSelectPreset('blueprints')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-300 border border-blue-500/20 text-left transition-all truncate"
            >
              🔷 Blueprints Only
            </button>
            <button
              onClick={() => handleSelectPreset('materials')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/20 text-left transition-all truncate"
            >
              🟣 Materials Only
            </button>
            <button
              onClick={() => handleSelectPreset('metaSounds')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/20 text-left transition-all truncate"
            >
              🎵 MetaSounds Only
            </button>
            <button
              onClick={() => handleSelectPreset('gamethread')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/20 text-left transition-all truncate"
            >
              ⚡ GameThread Hotspots
            </button>
          </div>
        </div>

        {/* Independent Subsystem Toggle Switches */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Independent Subsystem Toggles
          </span>

          {/* 1. Blueprints Toggle */}
          <div
            onClick={() => setCategoryFilters(prev => ({ ...prev, blueprints: !prev.blueprints }))}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              categoryFilters.blueprints
                ? 'bg-blue-950/40 border-blue-500/40 shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${categoryFilters.blueprints ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Blueprints</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300">
                    {categoryStats.blueprints.count}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {categoryStats.blueprints.cpu.toFixed(2)} ms CPU • {categoryStats.blueprints.memory.toFixed(0)} MB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {categoryStats.blueprints.criticals > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
              {categoryFilters.blueprints ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
            </div>
          </div>

          {/* 2. Materials Toggle */}
          <div
            onClick={() => setCategoryFilters(prev => ({ ...prev, materials: !prev.materials }))}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              categoryFilters.materials
                ? 'bg-purple-950/40 border-purple-500/40 shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${categoryFilters.materials ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Materials & Shaders</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300">
                    {categoryStats.materials.count}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {categoryStats.materials.gpu.toFixed(2)} ms GPU • {categoryStats.materials.memory.toFixed(0)} MB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {categoryStats.materials.criticals > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
              {categoryFilters.materials ? (
                <CheckSquare className="w-4 h-4 text-purple-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
            </div>
          </div>

          {/* 3. MetaSounds Audio Toggle */}
          <div
            onClick={() => setCategoryFilters(prev => ({ ...prev, metaSounds: !prev.metaSounds }))}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              categoryFilters.metaSounds
                ? 'bg-cyan-950/40 border-cyan-500/40 shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${categoryFilters.metaSounds ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>MetaSounds Audio</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300">
                    {categoryStats.metaSounds.count}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {categoryStats.metaSounds.cpu.toFixed(2)} ms DSP • {categoryStats.metaSounds.memory.toFixed(0)} MB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {categoryStats.metaSounds.criticals > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
              {categoryFilters.metaSounds ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
            </div>
          </div>

          {/* 4. PCGs Toggle */}
          <div
            onClick={() => setCategoryFilters(prev => ({ ...prev, pcgs: !prev.pcgs }))}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              categoryFilters.pcgs
                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${categoryFilters.pcgs ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Box className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>PCG Graphs</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300">
                    {categoryStats.pcgs.count}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {categoryStats.pcgs.cpu.toFixed(2)} ms • {categoryStats.pcgs.memory.toFixed(0)} MB
                </span>
              </div>
            </div>

            {categoryFilters.pcgs ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-600" />
            )}
          </div>

          {/* 5. Behavior Trees Toggle */}
          <div
            onClick={() => setCategoryFilters(prev => ({ ...prev, behaviorTrees: !prev.behaviorTrees }))}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              categoryFilters.behaviorTrees
                ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${categoryFilters.behaviorTrees ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>AI Behavior Trees</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300">
                    {categoryStats.behaviorTrees.count}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {categoryStats.behaviorTrees.cpu.toFixed(2)} ms Tick
                </span>
              </div>
            </div>

            {categoryFilters.behaviorTrees ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </div>

        {/* Severity Status Filter */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Bottleneck Severity
          </span>
          <div className="flex flex-wrap gap-1 text-xs">
            {(['all', 'Critical', 'Warning', 'Nominal'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] ${
                  severityFilter === sev
                    ? sev === 'Critical'
                      ? 'bg-red-600 text-white'
                      : sev === 'Warning'
                      ? 'bg-amber-600 text-white'
                      : sev === 'Nominal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {sev === 'all' ? 'All Statuses' : sev}
              </button>
            ))}
          </div>
        </div>

        {/* Specialized Constraint Checkboxes */}
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Optimization Flags
          </span>

          <label className="flex items-center gap-2.5 text-slate-300 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyNativizationCandidates}
              onChange={e => setOnlyNativizationCandidates(e.target.checked)}
              className="rounded border-slate-700 text-emerald-600 focus:ring-0 bg-slate-900"
            />
            <span>C++ Nativization Candidates Only</span>
          </label>

          <label className="flex items-center gap-2.5 text-slate-300 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyTickingAssets}
              onChange={e => setOnlyTickingAssets(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900"
            />
            <span>Event Tick Active Only</span>
          </label>
        </div>
      </div>
    </aside>
  );
};
