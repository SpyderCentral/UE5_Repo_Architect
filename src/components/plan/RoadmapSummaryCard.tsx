import React, { useMemo } from 'react';
import { GamePlan } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  Flag, 
  Layers, 
  TrendingUp, 
  RotateCcw, 
  CheckCheck, 
  Milestone, 
  Hourglass,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface RoadmapSummaryCardProps {
  plan: GamePlan;
  completedTaskIds: Set<string>;
  onToggleAllTasks?: (completed: boolean) => void;
  onScrollToPhase?: (phaseIndex: number) => void;
}

// Utility to parse duration strings from phases into structured numbers
export function parseAndAggregateDurations(phases: GamePlan['phases']) {
  if (!phases || phases.length === 0) {
    return {
      totalMinDays: 0,
      totalMaxDays: 0,
      formattedTotal: 'N/A',
      primaryUnit: 'days' as const
    };
  }

  let totalMinDays = 0;
  let totalMaxDays = 0;
  let hasValidDuration = false;

  phases.forEach(phase => {
    const raw = (phase.duration || '').toLowerCase().trim();
    if (!raw) return;

    // Matches patterns like "1-2 weeks", "3 weeks", "4 - 5 days", "1 month", "20-30 hours"
    const rangeMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(week|day|month|hr|hour|sprint)/i);
    
    if (rangeMatch) {
      hasValidDuration = true;
      const val1 = parseFloat(rangeMatch[1]);
      const val2 = rangeMatch[2] ? parseFloat(rangeMatch[2]) : val1;
      const unit = rangeMatch[3].toLowerCase();

      let multiplier = 1; // Default to days
      if (unit.startsWith('week')) multiplier = 5; // 5 working days per week
      else if (unit.startsWith('month')) multiplier = 20; // 20 working days per month
      else if (unit.startsWith('hr') || unit.startsWith('hour')) multiplier = 1 / 8; // 8 hours per working day
      else if (unit.startsWith('sprint')) multiplier = 10; // 2-week sprint = 10 working days

      totalMinDays += Math.min(val1, val2) * multiplier;
      totalMaxDays += Math.max(val1, val2) * multiplier;
    } else {
      // Fallback estimate based on tasks count (1.5 - 2.5 days per task)
      const taskCount = phase.tasks?.length || 1;
      totalMinDays += taskCount * 1.5;
      totalMaxDays += taskCount * 2.5;
      hasValidDuration = true;
    }
  });

  if (!hasValidDuration) {
    const totalTasks = phases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
    totalMinDays = Math.max(5, totalTasks * 1.5);
    totalMaxDays = Math.max(10, totalTasks * 2.5);
  }

  // Format nicely based on magnitude
  let formattedTotal = '';
  let primaryUnit: 'hours' | 'days' | 'weeks' | 'months' = 'weeks';

  if (totalMaxDays < 4) {
    const minHours = Math.round(totalMinDays * 8);
    const maxHours = Math.round(totalMaxDays * 8);
    formattedTotal = minHours === maxHours ? `${minHours} Hours` : `${minHours}–${maxHours} Hours`;
    primaryUnit = 'hours';
  } else if (totalMaxDays < 14) {
    const minD = Math.round(totalMinDays);
    const maxD = Math.round(totalMaxDays);
    formattedTotal = minD === maxD ? `${minD} Days` : `${minD}–${maxD} Days`;
    primaryUnit = 'days';
  } else if (totalMaxDays < 60) {
    const minW = Math.max(1, Math.round((totalMinDays / 5) * 10) / 10);
    const maxW = Math.max(1, Math.round((totalMaxDays / 5) * 10) / 10);
    formattedTotal = minW === maxW ? `${minW} Weeks` : `${minW}–${maxW} Weeks`;
    primaryUnit = 'weeks';
  } else {
    const minM = Math.round((totalMinDays / 20) * 10) / 10;
    const maxM = Math.round((totalMaxDays / 20) * 10) / 10;
    formattedTotal = minM === maxM ? `${minM} Months` : `${minM}–${maxM} Months`;
    primaryUnit = 'months';
  }

  return { totalMinDays, totalMaxDays, formattedTotal, primaryUnit };
}

const RoadmapSummaryCard: React.FC<RoadmapSummaryCardProps> = ({ 
  plan, 
  completedTaskIds,
  onToggleAllTasks,
  onScrollToPhase
}) => {
  const phases = plan.phases || [];

  // Calculate high-level task metrics
  const { totalTasks, completedTasksCount, completionPercentage, phaseProgressList } = useMemo(() => {
    let allTasksCount = 0;
    let completedCount = 0;

    const list = phases.map((phase, pIdx) => {
      const pTasks = phase.tasks || [];
      const phaseTotal = pTasks.length;
      let phaseCompleted = 0;

      pTasks.forEach((task, tIdx) => {
        allTasksCount++;
        const taskId = `task-${pIdx}-${tIdx}-${task.assetName || task.title}`;
        if (completedTaskIds.has(taskId)) {
          completedCount++;
          phaseCompleted++;
        }
      });

      const isPhaseDone = phaseTotal > 0 && phaseCompleted === phaseTotal;
      const isPhaseStarted = phaseCompleted > 0;

      return {
        phaseIndex: pIdx,
        phaseName: phase.phaseName,
        duration: phase.duration,
        phaseTotal,
        phaseCompleted,
        isPhaseDone,
        isPhaseStarted
      };
    });

    const percent = allTasksCount > 0 ? Math.round((completedCount / allTasksCount) * 100) : 0;

    return {
      totalTasks: allTasksCount,
      completedTasksCount: completedCount,
      completionPercentage: percent,
      phaseProgressList: list
    };
  }, [phases, completedTaskIds]);

  // Calculate Milestones metrics
  const totalMilestones = phases.length;
  const completedMilestones = useMemo(() => {
    return phaseProgressList.filter(p => p.isPhaseDone).length;
  }, [phaseProgressList]);
  
  const remainingMilestones = Math.max(0, totalMilestones - completedMilestones);

  // Calculate Estimated Development Time
  const durationStats = useMemo(() => {
    return parseAndAggregateDurations(phases);
  }, [phases]);

  // Calculate remaining estimated development time based on remaining incomplete tasks
  const remainingEstTimeText = useMemo(() => {
    if (totalTasks === 0 || completedTasksCount === totalTasks) {
      return 'Completed';
    }
    const remainingRatio = (totalTasks - completedTasksCount) / totalTasks;
    const remMinDays = durationStats.totalMinDays * remainingRatio;
    const remMaxDays = durationStats.totalMaxDays * remainingRatio;

    if (remMaxDays < 4) {
      const h = Math.round(remMaxDays * 8);
      return `~${h} hrs`;
    } else if (remMaxDays < 14) {
      const d = Math.round(remMaxDays);
      return `~${d} days`;
    } else if (remMaxDays < 60) {
      const w = Math.round((remMaxDays / 5) * 10) / 10;
      return `~${w} wks`;
    } else {
      const m = Math.round((remMaxDays / 20) * 10) / 10;
      return `~${m} mos`;
    }
  }, [totalTasks, completedTasksCount, durationStats]);

  // Total unique assets in the plan
  const uniqueAssetCount = useMemo(() => {
    const set = new Set<string>();
    phases.forEach(p => {
      (p.tasks || []).forEach(t => {
        if (t.assetName) set.add(t.assetName);
      });
    });
    return set.size;
  }, [phases]);

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7 border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 shadow-2xl mb-8 relative overflow-hidden backdrop-blur-xl">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Header Row of Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400 shadow-md">
            <Milestone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Roadmap Execution Summary
              </h3>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded-full border border-blue-500/30">
                UE5 Production Plan
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light mt-0.5">
              High-level milestone progress, development estimates, and task completion metrics.
            </p>
          </div>
        </div>

        {/* Action Buttons: Mark All / Reset */}
        {onToggleAllTasks && totalTasks > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {completedTasksCount > 0 && (
              <button
                onClick={() => onToggleAllTasks(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Reset all task completion checkboxes"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={() => onToggleAllTasks(completedTasksCount !== totalTasks)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-md active:scale-95 ${
                completedTasksCount === totalTasks
                  ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 shadow-blue-600/20'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{completedTasksCount === totalTasks ? 'All Tasks Done' : 'Complete All'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-6 relative z-10">
        
        {/* KPI 1: Tasks Completed */}
        <div className="bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Tasks Completed
            </span>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              {completionPercentage}%
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {completedTasksCount}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                / {totalTasks} Tasks
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 mt-2 overflow-hidden p-0.5 border border-slate-700/40">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              style={{ width: `${Math.max(completionPercentage, totalTasks > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Remaining Milestones */}
        <div className="bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-purple-400" /> Milestones Status
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              remainingMilestones === 0 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              {completedMilestones}/{totalMilestones} Done
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {remainingMilestones}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                {remainingMilestones === 1 ? 'Milestone Remaining' : 'Milestones Remaining'}
              </span>
            </div>
          </div>

          {/* Milestone Step Pills */}
          <div className="flex gap-1.5 mt-2">
            {phaseProgressList.map((p, idx) => (
              <div 
                key={idx}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  p.isPhaseDone 
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' 
                    : p.isPhaseStarted 
                      ? 'bg-purple-500/80' 
                      : 'bg-slate-800'
                }`}
                title={`Phase ${idx + 1}: ${p.phaseName} (${p.phaseCompleted}/${p.phaseTotal} tasks)`}
              />
            ))}
          </div>
        </div>

        {/* KPI 3: Estimated Development Time */}
        <div className="bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimated Dev Time
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
              <Hourglass className="w-2.5 h-2.5" />
              {remainingEstTimeText}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {durationStats.formattedTotal}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-2 font-mono">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>Across {totalMilestones} engineering phases</span>
          </div>
        </div>

        {/* KPI 4: Architecture & Assets Mapped */}
        <div className="bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Subsystems Mapped
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {plan.requiredPlugins?.length || 0} Plugins
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {uniqueAssetCount}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                Core Assets
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-2 font-mono truncate">
            <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">Blueprints, BTs, Materials & Audio</span>
          </div>
        </div>

      </div>

      {/* Phase Quick Navigation / Milestone Breakdown Pills */}
      {phases.length > 0 && (
        <div className="pt-4 border-t border-slate-800/70 flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-slate-400" /> Milestones:
          </span>
          {phaseProgressList.map((phaseItem, index) => {
            return (
              <button
                key={index}
                onClick={() => onScrollToPhase && onScrollToPhase(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer group ${
                  phaseItem.isPhaseDone
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                    : phaseItem.isPhaseStarted
                      ? 'bg-blue-950/40 border-blue-500/30 text-blue-300 hover:bg-blue-900/50'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={`Click to navigate to ${phaseItem.phaseName}`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  phaseItem.isPhaseDone 
                    ? 'bg-emerald-500 text-slate-950' 
                    : phaseItem.isPhaseStarted 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-800 text-slate-400'
                }`}>
                  {phaseItem.isPhaseDone ? '✓' : index + 1}
                </div>
                <span className="font-medium text-[11px] truncate max-w-[140px] sm:max-w-[200px]">
                  {phaseItem.phaseName}
                </span>
                <span className="text-[10px] font-mono opacity-60">
                  ({phaseItem.phaseCompleted}/{phaseItem.phaseTotal})
                </span>
                <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoadmapSummaryCard;
