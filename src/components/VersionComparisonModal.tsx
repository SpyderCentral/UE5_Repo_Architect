import React, { useState, useEffect, useMemo } from 'react';
import { GamePlan, PlanSnapshot, PlanDiffResult } from '../types';
import { 
  getSavedSnapshots, 
  saveSnapshot, 
  deleteSnapshot, 
  computePlanDiff 
} from '../services/planDiff';
import { 
  History, 
  Plus, 
  Trash2, 
  RotateCcw, 
  GitCompare, 
  Check, 
  X, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Layers, 
  FileText, 
  Tag, 
  ChevronDown, 
  ChevronRight,
  Download,
  Flame,
  ArrowUpRight
} from 'lucide-react';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: GamePlan;
  projectId?: string;
  projectIdOrTitle?: string;
  onRestoreSnapshot: (snapshotPlan: any) => void;
}

const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  projectId,
  projectIdOrTitle,
  onRestoreSnapshot
}) => {
  const activeProjectId = projectId || projectIdOrTitle || currentPlan.title || 'default_project';
  const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotNotes, setNewSnapshotNotes] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'changes-only'>('all');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('unified');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Load snapshots on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = getSavedSnapshots(activeProjectId);
      
      // If no snapshots exist yet, automatically create an Initial Baseline snapshot
      if (loaded.length === 0 && currentPlan) {
        const initial = saveSnapshot(
          activeProjectId, 
          'v1.0 Baseline Architecture', 
          currentPlan, 
          'Auto-captured initial architecture baseline snapshot',
          'auto'
        );
        setSnapshots([initial]);
        setSelectedSnapshotId(initial.id);
      } else {
        setSnapshots(loaded);
        if (loaded.length > 0 && !selectedSnapshotId) {
          setSelectedSnapshotId(loaded[0].id);
        }
      }
    }
  }, [isOpen, activeProjectId, currentPlan]);

  const selectedSnapshot = useMemo(() => {
    return snapshots.find(s => s.id === selectedSnapshotId);
  }, [snapshots, selectedSnapshotId]);

  // Compute diff between selected snapshot and current active plan
  const diffResult: PlanDiffResult | null = useMemo(() => {
    if (!selectedSnapshot || !currentPlan) return null;
    return computePlanDiff(
      selectedSnapshot.plan,
      currentPlan,
      selectedSnapshot.name,
      'Current Working Plan'
    );
  }, [selectedSnapshot, currentPlan]);

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotName.trim()) return;

    const snap = saveSnapshot(
      activeProjectId,
      newSnapshotName.trim(),
      currentPlan,
      newSnapshotNotes.trim() || undefined,
      'manual'
    );

    const updated = getSavedSnapshots(activeProjectId);
    setSnapshots(updated);
    setSelectedSnapshotId(snap.id);
    setNewSnapshotName('');
    setNewSnapshotNotes('');
    setIsCreatingSnapshot(false);
    showToast('Snapshot saved successfully!');
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSnapshot(activeProjectId, id);
    const updated = getSavedSnapshots(activeProjectId);
    setSnapshots(updated);
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(updated.length > 0 ? updated[0].id : null);
    }
    showToast('Snapshot deleted');
  };

  const handleRestore = (snapshot: PlanSnapshot) => {
    onRestoreSnapshot(snapshot.plan);
    showToast(`Restored "${snapshot.name}" as active plan!`);
    setConfirmRestoreId(null);
    onClose();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportDiffReport = () => {
    if (!diffResult) return;
    
    let md = `# Plan Version Comparison Report\n\n`;
    md += `**Base Snapshot:** ${diffResult.sourceSnapshotName}\n`;
    md += `**Target Plan:** ${diffResult.targetSnapshotName}\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `## Summary of Changes (${diffResult.summary.totalChanges} total changes)\n\n`;
    md += `- Phases: +${diffResult.summary.phasesAdded} added, -${diffResult.summary.phasesRemoved} removed, ~${diffResult.summary.phasesModified} modified\n`;
    md += `- Tasks: +${diffResult.summary.tasksAdded} added, -${diffResult.summary.tasksRemoved} removed, ~${diffResult.summary.tasksModified} modified\n`;
    if (diffResult.summary.pluginsAdded.length > 0) md += `- Plugins Added: ${diffResult.summary.pluginsAdded.join(', ')}\n`;
    if (diffResult.summary.pluginsRemoved.length > 0) md += `- Plugins Removed: ${diffResult.summary.pluginsRemoved.join(', ')}\n\n`;

    md += `## Phase-by-Phase Breakdown\n\n`;
    diffResult.phaseDiffs.forEach(pd => {
      const symbol = pd.type === 'added' ? '[+]' : pd.type === 'removed' ? '[-]' : pd.type === 'modified' ? '[~]' : '[=]';
      md += `### ${symbol} ${pd.phaseName}\n`;
      if (pd.newDuration && pd.oldDuration && pd.newDuration !== pd.oldDuration) {
        md += `*Duration changed:* \`${pd.oldDuration}\` -> \`${pd.newDuration}\`\n`;
      }
      if (pd.newGoal && pd.oldGoal && pd.newGoal !== pd.oldGoal) {
        md += `*Goal changed:* "${pd.oldGoal}" -> "${pd.newGoal}"\n`;
      }
      md += `\n**Tasks:**\n`;
      pd.tasks.forEach(t => {
        const tSym = t.type === 'added' ? '+' : t.type === 'removed' ? '-' : t.type === 'modified' ? '~' : ' ';
        md += `- [${tSym}] **${t.title}** (${t.assetName || 'Core'})\n`;
      });
      md += `\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plan_Diff_${diffResult.sourceSnapshotName.replace(/\s+/g, '_')}_vs_Current.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden text-slate-200 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 right-14 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 border border-blue-400 animate-in fade-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-inner">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Plan Version Comparison & Snapshots</h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded-full border border-blue-500/30">
                  Diff Inspector
                </span>
              </div>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Compare your active architecture with point-in-time snapshots, track additions, removals, and restore prior builds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingSnapshot(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Snapshot</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Snapshot Drawer Form */}
        {isCreatingSnapshot && (
          <form 
            onSubmit={handleCreateSnapshot}
            className="p-4 bg-slate-950/90 border-b border-blue-500/30 flex flex-col sm:flex-row items-end gap-3 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex-1 w-full space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Snapshot Version Name
              </label>
              <input
                type="text"
                value={newSnapshotName}
                onChange={e => setNewSnapshotName(e.target.value)}
                placeholder="e.g. v1.1 - Combat System Overhaul"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="flex-1 w-full space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Optional Notes / Changelog
              </label>
              <input
                type="text"
                value={newSnapshotNotes}
                onChange={e => setNewSnapshotNotes(e.target.value)}
                placeholder="e.g. Added GAS attributes and boss AI tree"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSnapshotName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow"
              >
                Save Snapshot
              </button>
            </div>
          </form>
        )}

        {/* Modal Main Body (2 Columns: Snapshot List Sidebar & Diff Canvas) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Sidebar: Snapshots List */}
          <div className="w-full md:w-80 border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-400" /> Saved Snapshots ({snapshots.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {snapshots.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No snapshots captured yet. Click "New Snapshot" to create your first baseline.
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isSelected = snap.id === selectedSnapshotId;
                  const dateFormatted = new Date(snap.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={snap.id}
                      onClick={() => setSelectedSnapshotId(snap.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-1.5 relative ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 shadow-md text-white'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs truncate max-w-[170px] text-white">
                          {snap.name}
                        </span>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                          {snapshots.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                              className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-400 transition-colors"
                              title="Delete Snapshot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span>{snap.totalPhases || snap.plan.phases?.length || 0} Phases</span>
                      </div>

                      {snap.notes && (
                        <p className="text-[11px] text-slate-400 font-light line-clamp-1 italic">
                          "{snap.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Diff Comparison Details */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30 overflow-hidden">
            {diffResult && selectedSnapshot ? (
              <>
                {/* Diff Control Bar */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-400">Comparing:</span>
                    <span className="px-2 py-1 bg-slate-800 rounded font-bold text-white border border-slate-700 truncate max-w-[150px]">
                      {selectedSnapshot.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded font-bold border border-blue-500/30">
                      Current Working Plan
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter Toggle */}
                    <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex text-xs">
                      <button
                        onClick={() => setFilterMode('all')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All Items
                      </button>
                      <button
                        onClick={() => setFilterMode('changes-only')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          filterMode === 'changes-only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Changes Only ({diffResult.summary.totalChanges})
                      </button>
                    </div>

                    {/* Export Diff Report */}
                    <button
                      onClick={handleExportDiffReport}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all"
                      title="Download Markdown Diff Report"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Restore Snapshot Button */}
                    {confirmRestoreId === selectedSnapshot.id ? (
                      <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 p-1 rounded-lg">
                        <span className="text-[10px] text-amber-300 font-bold px-1">Overwrite current plan?</span>
                        <button
                          onClick={() => handleRestore(selectedSnapshot)}
                          className="px-2 py-0.5 bg-amber-500 text-slate-950 text-xs font-bold rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRestoreId(null)}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRestoreId(selectedSnapshot.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                        title="Restore this snapshot to overwrite current working plan"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Restore Snapshot</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Diff Summary Cards */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/20 border-b border-slate-800/80">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Changes</span>
                    <span className={`text-xl font-black ${diffResult.summary.totalChanges > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                      {diffResult.summary.totalChanges}
                    </span>
                  </div>
                  <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Additions (+)</span>
                    <span className="text-xl font-black text-emerald-400">
                      +{diffResult.summary.phasesAdded + diffResult.summary.tasksAdded + diffResult.summary.pluginsAdded.length}
                    </span>
                  </div>
                  <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Removals (-)</span>
                    <span className="text-xl font-black text-rose-400">
                      -{diffResult.summary.phasesRemoved + diffResult.summary.tasksRemoved + diffResult.summary.pluginsRemoved.length}
                    </span>
                  </div>
                  <div className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Modified (~)</span>
                    <span className="text-xl font-black text-amber-400">
                      ~{diffResult.summary.phasesModified + diffResult.summary.tasksModified}
                    </span>
                  </div>
                </div>

                {/* Diff Main Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {diffResult.summary.totalChanges === 0 && (
                    <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 max-w-md mx-auto">
                      <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-white">Identical Architecture</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        The current working plan exactly matches this saved snapshot with zero drift.
                      </p>
                    </div>
                  )}

                  {/* Plugin Diff Callout */}
                  {(diffResult.summary.pluginsAdded.length > 0 || diffResult.summary.pluginsRemoved.length > 0) && (
                    <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
                      <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Unreal Engine Plugin Drift
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {diffResult.summary.pluginsAdded.map(p => (
                          <span key={p} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded-lg border border-emerald-500/30">
                            + {p}
                          </span>
                        ))}
                        {diffResult.summary.pluginsRemoved.map(p => (
                          <span key={p} className="px-2.5 py-1 bg-rose-500/20 text-rose-300 text-xs font-mono font-bold rounded-lg border border-rose-500/30 line-through">
                            - {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase & Task Diffs */}
                  {diffResult.phaseDiffs.map((phaseDiff, pIdx) => {
                    const isPhaseChanged = phaseDiff.type !== 'unchanged';
                    if (filterMode === 'changes-only' && !isPhaseChanged && !phaseDiff.tasks.some(t => t.type !== 'unchanged')) {
                      return null;
                    }

                    return (
                      <div 
                        key={pIdx}
                        className={`rounded-2xl border p-5 transition-all ${
                          phaseDiff.type === 'added'
                            ? 'bg-emerald-950/15 border-emerald-500/40'
                            : phaseDiff.type === 'removed'
                              ? 'bg-rose-950/15 border-rose-500/40'
                              : phaseDiff.type === 'modified'
                                ? 'bg-amber-950/15 border-amber-500/40'
                                : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        {/* Phase Title Row */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase tracking-wider ${
                              phaseDiff.type === 'added'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : phaseDiff.type === 'removed'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : phaseDiff.type === 'modified'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                            }`}>
                              {phaseDiff.type === 'added' ? '+ Added Phase' : phaseDiff.type === 'removed' ? '- Removed Phase' : phaseDiff.type === 'modified' ? '~ Modified Phase' : 'Unchanged'}
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {phaseDiff.phaseName}
                            </h4>
                          </div>

                          {phaseDiff.newDuration && (
                            <span className="text-xs font-mono text-slate-400">
                              {phaseDiff.oldDuration && phaseDiff.oldDuration !== phaseDiff.newDuration ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="line-through text-rose-400">{phaseDiff.oldDuration}</span>
                                  <ArrowRight className="w-3 h-3 text-amber-400" />
                                  <span className="text-emerald-400 font-bold">{phaseDiff.newDuration}</span>
                                </span>
                              ) : (
                                phaseDiff.newDuration
                              )}
                            </span>
                          )}
                        </div>

                        {/* Phase Goal Diff */}
                        {phaseDiff.newGoal && phaseDiff.oldGoal && phaseDiff.newGoal !== phaseDiff.oldGoal && (
                          <div className="mb-4 text-xs bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl font-light">
                            <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider mb-1">Goal Drift:</span>
                            <div className="text-rose-300/80 line-through mb-1">"{phaseDiff.oldGoal}"</div>
                            <div className="text-emerald-300 font-medium">"{phaseDiff.newGoal}"</div>
                          </div>
                        )}

                        {/* Task Breakdown Items */}
                        <div className="space-y-2">
                          {phaseDiff.tasks.map((task, tIdx) => {
                            if (filterMode === 'changes-only' && task.type === 'unchanged') {
                              return null;
                            }

                            return (
                              <div
                                key={tIdx}
                                className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                                  task.type === 'added'
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : task.type === 'removed'
                                      ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                                      : task.type === 'modified'
                                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                                      task.type === 'added'
                                        ? 'bg-emerald-500 text-slate-950'
                                        : task.type === 'removed'
                                          ? 'bg-rose-500 text-white'
                                          : task.type === 'modified'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {task.type === 'added' ? '+' : task.type === 'removed' ? '-' : task.type === 'modified' ? '~' : '='}
                                    </span>
                                    <span className="font-bold">{task.title}</span>
                                    {task.assetName && (
                                      <span className="px-1.5 py-0.5 bg-slate-950/60 font-mono text-[10px] rounded text-blue-300 border border-slate-700">
                                        {task.assetName}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono opacity-60 uppercase">
                                    {task.type}
                                  </span>
                                </div>

                                {task.description && (
                                  <p className="text-[11px] opacity-80 font-light pl-6">
                                    {task.description}
                                  </p>
                                )}

                                {task.changes && task.changes.length > 0 && (
                                  <div className="pl-6 pt-1 space-y-1">
                                    {task.changes.map((c, cIdx) => (
                                      <div key={cIdx} className="text-[10px] font-mono bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                                        <span className="font-bold text-amber-400">{c.field}: </span>
                                        <span className="line-through text-rose-400 mr-2">{c.oldVal}</span>
                                        <span className="text-emerald-400 font-bold">{c.newVal}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs">
                Select a snapshot from the sidebar to inspect difference comparison.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VersionComparisonModal;
