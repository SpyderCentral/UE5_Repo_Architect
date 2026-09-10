
import React, { useState, useEffect, useCallback } from 'react';
import { GamePlan } from '../../types';
import PhaseCard from './PhaseCard';
import RoadmapSummaryCard from './RoadmapSummaryCard';
import RoadmapVisualTimeline from './RoadmapVisualTimeline';
import { Layout, Box, GitBranch, ShieldCheck, Calendar, ListChecks, Split } from 'lucide-react';

interface PlanDisplayProps {
  plan: GamePlan;
  onNavigateToBlueprint: (assetName: string) => void;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onNavigateToBlueprint }) => {
  const planStorageKey = `ue5_plan_tasks_${plan.title || 'current'}`;
  const [viewMode, setViewMode] = useState<'both' | 'timeline' | 'cards'>('both');

  // Initialize completed task IDs from localStorage
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(planStorageKey);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load completed tasks', e);
    }
    return new Set<string>();
  });

  // Sync to localStorage whenever completedTaskIds changes
  useEffect(() => {
    try {
      localStorage.setItem(planStorageKey, JSON.stringify(Array.from(completedTaskIds)));
    } catch (e) {
      console.error('Failed to save completed tasks', e);
    }
  }, [completedTaskIds, planStorageKey]);

  // Toggle single task
  const handleToggleTask = useCallback((taskId: string) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Toggle all tasks in the plan
  const handleToggleAllTasks = useCallback((completed: boolean) => {
    if (!completed) {
      setCompletedTaskIds(new Set<string>());
      return;
    }

    const allIds = new Set<string>();
    (plan.phases || []).forEach((phase, pIdx) => {
      (phase.tasks || []).forEach((task, tIdx) => {
        const taskId = `task-${pIdx}-${tIdx}-${task.assetName || task.title}`;
        allIds.add(taskId);
      });
    });
    setCompletedTaskIds(allIds);
  }, [plan]);

  // Toggle all tasks in a single phase
  const handleTogglePhaseTasks = useCallback((phaseIndex: number, completed: boolean) => {
    const targetPhase = plan.phases?.[phaseIndex];
    if (!targetPhase) return;

    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      (targetPhase.tasks || []).forEach((task, tIdx) => {
        const taskId = `task-${phaseIndex}-${tIdx}-${task.assetName || task.title}`;
        if (completed) {
          next.add(taskId);
        } else {
          next.delete(taskId);
        }
      });
      return next;
    });
  }, [plan]);

  // Smooth scroll to a specific phase card
  const handleScrollToPhase = useCallback((phaseIndex: number) => {
    const el = document.getElementById(`phase-card-${phaseIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      {/* High-Level Project Statistics Summary Card at the Top */}
      <RoadmapSummaryCard 
        plan={plan}
        completedTaskIds={completedTaskIds}
        onToggleAllTasks={handleToggleAllTasks}
        onScrollToPhase={handleScrollToPhase}
      />

      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 mb-3 tracking-tight">
                    {plan.title}
                </h2>
                <p className="text-slate-400 text-lg font-light leading-relaxed max-w-4xl">
                    {plan.summary}
                </p>
            </div>
            
            <div className="flex flex-wrap gap-2 shrink-0">
                {(plan.targetPlatformRecommendations || []).map((rec, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <Layout className="w-3 h-3 text-blue-400" />
                        {rec}
                    </div>
                ))}
            </div>
        </div>

        {/* Technical Dependencies HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Plugins Manifest */}
            <div className="glass-card p-6 rounded-2xl bg-blue-600/5 border-blue-500/20">
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <Box className="w-4 h-4" /> Required Engine Plugins
                </h3>
                <div className="flex flex-wrap gap-2">
                    {plan.requiredPlugins && plan.requiredPlugins.length > 0 ? (
                        plan.requiredPlugins.map((plugin, i) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-900 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-300">
                                {plugin}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-slate-500 italic">No specialized plugins required for this configuration.</span>
                    )}
                </div>
            </div>

            {/* Migration Notes */}
            <div className="glass-card p-6 rounded-2xl bg-purple-600/5 border-purple-500/20">
                <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" /> Migration & Handshake
                </h3>
                <div className="space-y-2">
                    {plan.migrationNotes && plan.migrationNotes.length > 0 ? (
                        plan.migrationNotes.map((note, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                                <ShieldCheck className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{note}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-[10px] text-slate-500 italic">No critical migration steps detected.</span>
                    )}
                </div>
            </div>
        </div>
        {/* View Mode Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Roadmap Perspective:</span>
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('both')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'both' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Split className="w-3.5 h-3.5" /> Split (Timeline + Cards)
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Visual Milestone Gantt
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'cards' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" /> Phase Checklist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Timeline Section */}
      {(viewMode === 'both' || viewMode === 'timeline') && (
        <RoadmapVisualTimeline 
          plan={plan}
          completedTaskIds={completedTaskIds}
          onToggleTask={handleToggleTask}
          onNavigateToBlueprint={onNavigateToBlueprint}
          onScrollToPhase={handleScrollToPhase}
        />
      )}

      {/* Phases Checklist Section */}
      {(viewMode === 'both' || viewMode === 'cards') && (
        <div className="space-y-2">
            {(plan.phases || []).map((phase, index) => (
              <PhaseCard 
                  key={index} 
                  phase={phase} 
                  index={index} 
                  onNavigateToBlueprint={onNavigateToBlueprint}
                  completedTaskIds={completedTaskIds}
                  onToggleTask={handleToggleTask}
                  onTogglePhaseTasks={handleTogglePhaseTasks}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default PlanDisplay;

