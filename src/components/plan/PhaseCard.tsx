
import React from 'react';
import { Phase } from '../../types';
import TaskCard from './TaskCard';
import { Clock, Cpu, Lightbulb, BookOpen, CheckCircle2, CheckCheck } from 'lucide-react';

interface PhaseCardProps {
  phase: Phase;
  index: number;
  onNavigateToBlueprint: (assetName: string) => void;
  completedTaskIds?: Set<string>;
  onToggleTask?: (taskId: string) => void;
  onTogglePhaseTasks?: (phaseIndex: number, complete: boolean) => void;
}

const PhaseCard: React.FC<PhaseCardProps> = ({ 
  phase, 
  index, 
  onNavigateToBlueprint,
  completedTaskIds = new Set(),
  onToggleTask,
  onTogglePhaseTasks
}) => {
  const tasks = phase.tasks || [];
  
  // Calculate completed tasks in this phase
  let completedCount = 0;
  tasks.forEach((task, tIdx) => {
    const taskId = `task-${index}-${tIdx}-${task.assetName || task.title}`;
    if (completedTaskIds.has(taskId)) {
      completedCount++;
    }
  });

  const isPhaseCompleted = tasks.length > 0 && completedCount === tasks.length;
  const isPhaseInProgress = completedCount > 0 && !isPhaseCompleted;

  return (
    <div 
        id={`phase-card-${index}`}
        className="relative pl-10 pb-16 last:pb-0 animate-in fade-in duration-700 fill-mode-forwards group"
        style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Vertical Timeline Line */}
      <div className={`absolute left-0 top-3 bottom-0 w-[2px] transition-colors duration-500 group-last:hidden ${
        isPhaseCompleted 
          ? 'bg-gradient-to-b from-emerald-500/80 via-emerald-500/40 to-slate-800' 
          : 'bg-gradient-to-b from-blue-500/50 via-slate-800 to-transparent'
      }`}></div>

      {/* Timeline Node Icon */}
      <div className={`absolute -left-[14px] top-1 w-7 h-7 rounded-lg bg-slate-950 border-2 transition-all duration-300 z-10 flex items-center justify-center ${
        isPhaseCompleted 
          ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] text-emerald-300' 
          : 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] text-white'
      }`}>
        <span className="text-[10px] font-black">{isPhaseCompleted ? '✓' : index + 1}</span>
      </div>

      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors ${
              isPhaseCompleted ? 'text-emerald-100' : 'text-white group-hover:text-blue-100'
            }`}>
              {phase.phaseName}
            </h3>
            {isPhaseCompleted && (
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Milestone Achieved
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-white/5 shadow-sm">
                <Clock className="w-3 h-3 text-blue-400" />
                {phase.duration}
            </span>
            <span className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border ${
              isPhaseCompleted 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                : isPhaseInProgress
                  ? 'bg-blue-950/60 text-blue-300 border-blue-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>
              {completedCount}/{tasks.length} Tasks
            </span>
            {onTogglePhaseTasks && tasks.length > 0 && (
              <button
                type="button"
                onClick={() => onTogglePhaseTasks(index, !isPhaseCompleted)}
                className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-1 bg-slate-900/60 hover:bg-slate-800 rounded border border-slate-700/50 transition-all flex items-center gap-1 cursor-pointer"
                title={isPhaseCompleted ? "Mark phase tasks incomplete" : "Complete all tasks in this phase"}
              >
                <CheckCheck className="w-3 h-3" />
                <span className="hidden sm:inline">{isPhaseCompleted ? 'Reset' : 'Complete Phase'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Phase Goal Block */}
            <div className={`lg:col-span-2 glass-card p-5 rounded-2xl transition-all shadow-lg ${
              isPhaseCompleted 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-blue-500/5 border-blue-500/20'
            }`}>
                <div className={`flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest ${
                  isPhaseCompleted ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                    <Lightbulb className="w-3.5 h-3.5" />
                    Engineering Goal
                </div>
                <p className="text-[15px] text-slate-300 leading-relaxed font-light italic">
                    "{phase.goal}"
                </p>
            </div>

            {/* Key Concepts Block */}
            <div className="glass-card p-5 rounded-2xl bg-slate-900/60 border-slate-700/50">
                <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    Technical Concepts
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(phase.keyConcepts || []).map((concept, i) => (
                        <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5 uppercase tracking-tighter">
                            {concept}
                        </span>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-5">
          <div className="flex items-center gap-3 px-2 mb-4">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Workflow Checklist</span>
              <div className="h-px flex-1 bg-white/5"></div>
          </div>
          {tasks.map((task, tIndex) => {
            const taskId = `task-${index}-${tIndex}-${task.assetName || task.title}`;
            const isCompleted = completedTaskIds.has(taskId);

            return (
              <div 
                  key={tIndex} 
                  className="slide-in-up"
                  style={{ animationDelay: `${(index * 100) + (tIndex * 50)}ms` }}
              >
                  <TaskCard 
                      task={task} 
                      onNavigateToBlueprint={onNavigateToBlueprint}
                      taskId={taskId}
                      isCompleted={isCompleted}
                      onToggleComplete={onToggleTask}
                  />
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default PhaseCard;

