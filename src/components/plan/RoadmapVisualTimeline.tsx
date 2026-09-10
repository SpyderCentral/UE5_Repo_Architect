import React, { useState, useMemo } from 'react';
import { GamePlan, Phase, Task } from '../../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Flag, 
  Layers, 
  Cpu, 
  Sparkles, 
  Filter, 
  ZoomIn, 
  ZoomOut,
  Target,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface RoadmapVisualTimelineProps {
  plan: GamePlan;
  completedTaskIds: Set<string>;
  onToggleTask?: (taskId: string) => void;
  onNavigateToBlueprint: (assetName: string) => void;
  onScrollToPhase?: (phaseIndex: number) => void;
}

interface TimelinePhaseData {
  phase: Phase;
  index: number;
  startWeek: number;
  durationWeeks: number;
  endWeek: number;
  completedCount: number;
  totalTasks: number;
  progressPercent: number;
  isCompleted: boolean;
  isInProgress: boolean;
  isPending: boolean;
}

const RoadmapVisualTimeline: React.FC<RoadmapVisualTimelineProps> = ({
  plan,
  completedTaskIds,
  onToggleTask,
  onNavigateToBlueprint,
  onScrollToPhase
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'pending'>('all');
  const [timeUnit, setTimeUnit] = useState<'sprints' | 'weeks'>('weeks');

  const phases = plan.phases || [];

  // Helper to parse duration string (e.g. "1-2 Weeks", "3 Days", "1 Month") into weeks
  const parseWeeks = (durationStr?: string): number => {
    if (!durationStr) return 2;
    const str = durationStr.toLowerCase();
    const numbers = str.match(/\d+(\.\d+)?/g);
    const num = numbers ? parseFloat(numbers[numbers.length - 1]) : 2;

    if (str.includes('month')) return Math.max(1, Math.round(num * 4));
    if (str.includes('day')) return Math.max(0.5, Math.round((num / 7) * 10) / 10);
    return Math.max(1, num);
  };

  // Compute timeline data for all phases
  const timelineData = useMemo<TimelinePhaseData[]>(() => {
    let currentWeekOffset = 0;

    return phases.map((phase, index) => {
      const durationWeeks = parseWeeks(phase.duration);
      const startWeek = currentWeekOffset;
      const endWeek = currentWeekOffset + durationWeeks;
      currentWeekOffset = endWeek;

      const tasks = phase.tasks || [];
      let completedCount = 0;

      tasks.forEach((task, tIdx) => {
        const taskId = `task-${index}-${tIdx}-${task.assetName || task.title}`;
        if (completedTaskIds.has(taskId)) {
          completedCount++;
        }
      });

      const totalTasks = tasks.length;
      const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      const isCompleted = totalTasks > 0 && completedCount === totalTasks;
      const isInProgress = completedCount > 0 && !isCompleted;
      const isPending = completedCount === 0;

      return {
        phase,
        index,
        startWeek,
        durationWeeks,
        endWeek,
        completedCount,
        totalTasks,
        progressPercent,
        isCompleted,
        isInProgress,
        isPending
      };
    });
  }, [phases, completedTaskIds]);

  const totalProjectWeeks = useMemo(() => {
    if (timelineData.length === 0) return 8;
    return Math.ceil(timelineData[timelineData.length - 1].endWeek);
  }, [timelineData]);

  const totalSprints = Math.max(1, Math.ceil(totalProjectWeeks / 2));

  // Toggle phase sub-lane expansion
  const togglePhaseExpand = (index: number) => {
    setExpandedPhases(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const filteredTimeline = useMemo(() => {
    if (filterStatus === 'all') return timelineData;
    if (filterStatus === 'completed') return timelineData.filter(p => p.isCompleted);
    if (filterStatus === 'in-progress') return timelineData.filter(p => p.isInProgress);
    return timelineData.filter(p => p.isPending);
  }, [timelineData, filterStatus]);

  // Overall milestone metrics
  const completedMilestones = timelineData.filter(p => p.isCompleted).length;

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl mb-10 animate-in fade-in duration-500">
      
      {/* Timeline Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Visual Milestone Roadmap Timeline</h3>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded-full border border-blue-500/30">
                  Interactive Gantt
                </span>
              </div>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Track sequential milestones, duration schedules, sprint velocity, and component deliverables.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Unit & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Unit Selector */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex text-xs font-semibold">
            <button
              onClick={() => setTimeUnit('weeks')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeUnit === 'weeks' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weeks ({totalProjectWeeks}w)
            </button>
            <button
              onClick={() => setTimeUnit('sprints')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeUnit === 'sprints' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sprints ({totalSprints} Sp)
            </button>
          </div>

          {/* Status Filter */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({timelineData.length})
            </button>
            <button
              onClick={() => setFilterStatus('in-progress')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                filterStatus === 'in-progress' ? 'bg-blue-950 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                filterStatus === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Done ({completedMilestones})
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Time Scale Axis */}
      <div className="mt-6 pt-2">
        <div className="grid grid-cols-12 gap-1 mb-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest pl-4 sm:pl-72 pr-4 border-b border-slate-800/60 pb-2">
          {Array.from({ length: 6 }).map((_, idx) => {
            const fraction = (idx / 5);
            const weekVal = Math.round(fraction * totalProjectWeeks);
            const sprintVal = Math.round(fraction * totalSprints);
            const label = timeUnit === 'sprints' ? `Sprint ${sprintVal || 1}` : `Week ${weekVal || 1}`;

            return (
              <div key={idx} className="col-span-2 text-center first:text-left last:text-right">
                {label}
              </div>
            );
          })}
        </div>

        {/* Phase Timeline Lanes */}
        <div className="space-y-4">
          {filteredTimeline.map((item) => {
            const isExpanded = !!expandedPhases[item.index];
            const leftPercent = Math.min(95, Math.max(0, (item.startWeek / totalProjectWeeks) * 100));
            const widthPercent = Math.min(100 - leftPercent, Math.max(8, (item.durationWeeks / totalProjectWeeks) * 100));

            return (
              <div 
                key={item.index}
                className={`rounded-2xl border transition-all duration-300 ${
                  item.isCompleted
                    ? 'bg-emerald-950/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : item.isInProgress
                      ? 'bg-blue-950/20 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Lane Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left Phase Info & Collapsible trigger */}
                  <div className="w-full sm:w-64 shrink-0 flex items-start gap-3">
                    <button
                      onClick={() => togglePhaseExpand(item.index)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer mt-0.5"
                      title={isExpanded ? "Collapse task details" : "Expand task details"}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                          item.isCompleted
                            ? 'bg-emerald-500 text-slate-950'
                            : item.isInProgress
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.isCompleted ? '✓' : item.index + 1}
                        </span>
                        <h4 
                          onClick={() => onScrollToPhase?.(item.index)}
                          className={`text-sm font-bold truncate cursor-pointer hover:underline ${
                            item.isCompleted ? 'text-emerald-200' : 'text-white'
                          }`}
                          title={`Phase ${item.index + 1}: ${item.phase.phaseName}`}
                        >
                          {item.phase.phaseName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>{item.phase.duration || `${item.durationWeeks}w`}</span>
                        <span>•</span>
                        <span className={item.isCompleted ? 'text-emerald-400 font-bold' : item.isInProgress ? 'text-blue-400 font-bold' : ''}>
                          {item.completedCount}/{item.totalTasks} Tasks ({item.progressPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Timeline Gantt Bar */}
                  <div className="flex-1 w-full relative h-10 bg-slate-950/60 rounded-xl border border-slate-800/80 p-1 flex items-center overflow-hidden">
                    
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-6 divide-x divide-white/5 pointer-events-none" />

                    {/* Active Milestone Gantt Block */}
                    <div 
                      className={`absolute top-1 bottom-1 rounded-lg transition-all duration-500 flex items-center justify-between px-3 border shadow-md group ${
                        item.isCompleted
                          ? 'bg-gradient-to-r from-emerald-600/80 to-teal-600/80 border-emerald-400/50 text-white'
                          : item.isInProgress
                            ? 'bg-gradient-to-r from-blue-600/80 to-cyan-600/80 border-blue-400/50 text-white animate-pulse'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '60px'
                      }}
                    >
                      {/* Milestone Diamond Marker */}
                      <div className="flex items-center gap-1.5 truncate">
                        <Flag className={`w-3 h-3 shrink-0 ${item.isCompleted ? 'text-emerald-200' : 'text-blue-200'}`} />
                        <span className="text-[10px] font-mono font-bold truncate">
                          M{item.index + 1}
                        </span>
                      </div>

                      <span className="text-[9px] font-mono font-bold opacity-90 hidden sm:inline">
                        {item.progressPercent}%
                      </span>
                    </div>
                  </div>

                </div>

                {/* Expanded Sub-lane: Task Level Breakdown */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50 bg-slate-950/30 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                      <Target className="w-3 h-3 text-blue-400" />
                      Phase {item.index + 1} Task Milestones & Blueprint Deliverables
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(item.phase.tasks || []).map((task, tIdx) => {
                        const taskId = `task-${item.index}-${tIdx}-${task.assetName || task.title}`;
                        const isTaskDone = completedTaskIds.has(taskId);

                        return (
                          <div 
                            key={tIdx}
                            className={`p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 ${
                              isTaskDone
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onToggleTask?.(taskId)}
                                  className="mt-0.5 text-slate-400 hover:text-white cursor-pointer shrink-0"
                                >
                                  {isTaskDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-600 hover:text-blue-400" />
                                  )}
                                </button>
                                <span className={`font-semibold line-clamp-2 ${isTaskDone ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {task.title}
                                </span>
                              </div>
                            </div>

                            {task.assetName && (
                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 font-mono text-[10px] rounded border border-blue-500/20 truncate max-w-[130px]">
                                  {task.assetName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onNavigateToBlueprint(task.assetName!)}
                                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Spec</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default RoadmapVisualTimeline;
