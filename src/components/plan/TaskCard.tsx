
import React, { useState } from 'react';
import { Task } from '../../types';
import { Folder, FileCode, CheckSquare, Settings, Cpu, Variable, ChevronDown, ChevronRight, Zap, ArrowRightCircle, Loader2, ShoppingBag, ExternalLink, Tag, ListOrdered, Braces, Workflow, SlidersHorizontal, MousePointer2, Box, FunctionSquare, ShieldCheck, Activity, Link2, CheckCircle2, Circle } from 'lucide-react';
import TutorialGallery from '../TutorialGallery';
import { useGamePlan } from '../../hooks/useGamePlan';

interface TaskCardProps {
  task: Task;
  onNavigateToBlueprint: (assetName: string) => void;
  taskId?: string;
  isCompleted?: boolean;
  onToggleComplete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onNavigateToBlueprint,
  taskId,
  isCompleted = false,
  onToggleComplete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const { fetchTutorialsForContext, fetchMarketplaceAssets } = useGamePlan();

  const isBlueprint = task.assetName && (
      task.assetName.startsWith('BP_') || 
      task.assetName.startsWith('WBP_') || 
      task.assetName.startsWith('ABP_') || 
      task.assetName.startsWith('BPC_') || 
      task.assetName.startsWith('BPI_') ||
      task.assetName.startsWith('GM_')
  );

  const handleBlueprintClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.assetName) {
        onNavigateToBlueprint(task.assetName);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (taskId && onToggleComplete) {
      onToggleComplete(taskId);
    }
  };

  const handleSearchTutorials = async () => {
      setIsSearching(true);
      try {
          await fetchTutorialsForContext(
              `UE5 tutorial ${task.title} for ${task.assetName}`, 
              'task', 
              task.assetName || task.title
          );
      } finally {
          setIsSearching(false);
      }
  };

  const handleSearchMarketplace = async () => {
      setIsSearchingMarket(true);
      try {
          await fetchMarketplaceAssets(
              `Unreal Engine 5 asset for ${task.title}: ${task.description}`, 
              task.assetName || task.title
          );
      } finally {
          setIsSearchingMarket(false);
      }
  };

  return (
    <div 
        className={`glass-card rounded-xl transition-all duration-300 overflow-hidden group relative ${
            isCompleted
            ? 'bg-slate-900/40 border-emerald-500/30'
            : isExpanded 
              ? 'bg-slate-800/60 border-blue-500/40 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]' 
              : 'hover:border-slate-600/50 hover:bg-slate-800/30'
        }`}
    >
      {isCompleted ? (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
      ) : isExpanded ? (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
      ) : null}

      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 cursor-pointer flex items-start gap-4 sm:gap-5 relative z-10"
      >
        {/* Task Completion Checkbox */}
        {onToggleComplete && taskId && (
          <button
            type="button"
            onClick={handleToggleClick}
            className={`mt-0.5 p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
              isCompleted 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                : 'bg-slate-900/80 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300'
            }`}
            title={isCompleted ? "Mark task incomplete" : "Mark task completed"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
        )}

        <div className={`mt-0.5 p-2 rounded-xl transition-all border border-transparent ${
            isExpanded ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 rotate-0' : 'text-slate-500 bg-slate-900/50 border-white/5 group-hover:text-slate-300'
        }`}>
             {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className={`text-base sm:text-lg font-bold transition-colors ${
                    isCompleted 
                      ? 'text-slate-300 line-through opacity-80' 
                      : isExpanded 
                        ? 'text-blue-100' 
                        : 'text-slate-200 group-hover:text-white'
                  }`}>
                      {task.title}
                  </h4>
                  {isCompleted && (
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold rounded border border-emerald-500/30 uppercase tracking-wider">
                      Done
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2 shrink-0">
                    {isBlueprint && (
                        <button
                            onClick={handleBlueprintClick}
                            className="hidden group-hover:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20 animate-in fade-in zoom-in duration-200 hover:scale-105 active:scale-95"
                        >
                            <Cpu className="w-3.5 h-3.5" />
                            Architect
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSearchMarketplace(); }}
                        disabled={isSearchingMarket}
                        className="hidden group-hover:flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-lg shadow-purple-600/20 animate-in fade-in zoom-in duration-200 hover:scale-105 active:scale-95"
                    >
                        {isSearchingMarket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                        Scout Fab
                    </button>
                </div>
            </div>
            
            <p className={`text-slate-400 text-sm mt-2 leading-relaxed line-clamp-2 group-hover:text-slate-300 transition-colors font-light ${isCompleted ? 'opacity-70' : ''}`}>
                {task.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 bg-black/40 px-2.5 py-1 rounded-md border border-white/5 uppercase tracking-tighter">
                    <Folder className="w-3 h-3 opacity-60" />
                    {task.folderPath}
                </div>
                {task.assetName && (
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20 shadow-inner tracking-tighter">
                        <FileCode className="w-3 h-3" />
                        {task.assetName}
                    </div>
                )}
                {task.requiredFunctions && task.requiredFunctions.length > 0 && (
                   <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 bg-blue-900/20 px-2 py-1 rounded-md border border-blue-500/20 uppercase tracking-tighter">
                      <FunctionSquare className="w-3 h-3" />
                      {task.requiredFunctions.length} API Requirements
                   </div>
                )}
            </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-6" />
          
          <div className="grid grid-cols-1 gap-8">
            
            {/* Logic API Definition Section */}
            {( (task.requiredFunctions && task.requiredFunctions.length > 0) || (task.blueprintDetails?.variables && task.blueprintDetails.variables.length > 0)) && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        <h5 className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Logic Contract for {task.assetName || "Subsystem"}</h5>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Required Functions List */}
                        {task.requiredFunctions && task.requiredFunctions.length > 0 && (
                            <div className="bg-slate-900/80 p-6 rounded-2xl border border-blue-500/20 shadow-lg">
                                <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                                    <FunctionSquare className="w-3.5 h-3.5" /> Core Functions Required
                                </h5>
                                <div className="space-y-4">
                                    {task.requiredFunctions.map((fn, i) => (
                                        <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group/fn">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <div className="text-xs font-bold text-blue-200 group-hover/fn:text-blue-400 transition-colors">{fn.name}</div>
                                                    {fn.implementationTarget && (
                                                       <div className="flex items-center gap-1.5 mt-1">
                                                          <Link2 className="w-2.5 h-2.5 text-blue-500/60" />
                                                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target: {fn.implementationTarget}</span>
                                                       </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 flex-wrap justify-end">
                                                    {fn.parameters?.map((p, pi) => (
                                                        <span key={pi} className="text-[8px] font-mono bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed italic">{fn.logicDescription}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Internal Variables List */}
                        {task.blueprintDetails?.variables && task.blueprintDetails.variables.length > 0 && (
                            <div className="bg-slate-900/80 p-6 rounded-2xl border border-purple-500/20 shadow-lg">
                                <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                                    <Variable className="w-3.5 h-3.5" /> State Management (Variables)
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {task.blueprintDetails.variables.map((v, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/5 shadow-sm hover:border-purple-500/30 transition-all">
                                            <Box className="w-2.5 h-2.5 text-purple-400 opacity-60" />
                                            <span className="text-[11px] font-mono font-bold text-slate-300">{v.name}</span>
                                            <span className="text-[8px] font-mono bg-purple-900/40 text-purple-400 px-1 py-0.5 rounded uppercase">{v.type}</span>
                                        </div>
                                    ))}
                                </div>
                                {task.blueprintDetails.components && task.blueprintDetails.components.length > 0 && (
                                   <div className="mt-8">
                                       <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Required Components</h5>
                                       <div className="flex flex-wrap gap-2">
                                           {task.blueprintDetails.components.map((c, ci) => (
                                               <span key={ci} className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-white/5 uppercase tracking-tighter">
                                                   {c}
                                               </span>
                                           ))}
                                       </div>
                                   </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Implementation Steps */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none">
                  <ListOrdered className="w-32 h-32 text-blue-500" />
              </div>
              
              <h5 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <MousePointer2 className="w-3.5 h-3.5" />
                </div>
                Execution Workflow
              </h5>

              <ol className="space-y-4 relative">
                {(task.stepByStepGuide || []).map((step, i) => (
                  <li key={i} className="flex gap-4 group/step">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover/step:border-blue-500 group-hover/step:text-blue-400 transition-all shadow-sm">
                        {i + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                        <p className="text-[14px] text-slate-200 leading-relaxed font-light group-hover/step:text-white transition-colors">
                            {step}
                        </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Details Panel Configuration */}
                {task.blueprintDetails?.propertySettings && task.blueprintDetails.propertySettings.length > 0 && (
                    <div className="bg-slate-900/60 p-6 rounded-2xl border border-amber-500/30">
                        <h5 className="text-xs font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Defaults Panel Config
                        </h5>
                        <div className="space-y-3">
                            {task.blueprintDetails.propertySettings.map((prop, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{prop.component}</div>
                                        <div className="text-xs font-bold text-slate-200">{prop.property}</div>
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-500/20">
                                        {prop.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggested Logic Nodes */}
                {task.suggestedNodes && task.suggestedNodes.length > 0 && (
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-blue-500/30">
                        <h5 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                            <Zap className="w-3.5 h-3.5" /> Registry Nodes
                        </h5>
                        <div className="flex flex-wrap gap-2">
                            {task.suggestedNodes.map((node, i) => (
                                <span key={i} className="text-[10px] font-mono font-bold text-blue-100 bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                                    {node}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Tutorials Gallery */}
            <div className="mt-2 animate-in fade-in" style={{ animationDelay: '200ms' }}>
                <TutorialGallery 
                    tutorials={task.tutorials || []} 
                    isLoading={isSearching}
                    onSearch={handleSearchTutorials}
                    defaultQuery={task.assetName || task.title}
                />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
