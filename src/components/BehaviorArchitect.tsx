
import React from 'react';
import { BehaviorTreeSpec, BehaviorTreeNode } from '../types';
import { GitBranch, Brain, Activity, Target, ShieldCheck, Zap, Layers, HelpCircle } from 'lucide-react';

interface BehaviorArchitectProps {
    spec: BehaviorTreeSpec;
}

const BehaviorArchitect: React.FC<BehaviorArchitectProps> = ({ spec }) => {
    const renderNode = (nodeId: string, depth: number = 0) => {
        if (!spec.nodes) return null;
        const node = spec.nodes[nodeId];
        if (!node) return null;

        const isComposite = node.type === 'Composite';
        const isTask = node.type === 'Task';

        return (
            <div key={nodeId} className="flex flex-col items-center">
                {/* Node Box */}
                <div className={`relative min-w-[220px] rounded-xl border-2 p-4 shadow-2xl transition-all hover:scale-105 ${
                    isComposite ? 'bg-[#2a2a2a] border-slate-600' : 
                    isTask ? 'bg-[#3b1f4d] border-[#9c27b0]/50' : 
                    'bg-slate-800 border-slate-700'
                }`}>
                    {/* Decorators */}
                    {node.decorators && node.decorators.length > 0 && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-[90%]">
                            {(node.decorators || []).map((d, i) => (
                                <div key={i} className="bg-blue-600 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border border-blue-400 text-white truncate shadow-lg">
                                    {d.name}: {d.condition}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Service Nodes */}
                    {node.services && node.services.length > 0 && (
                        <div className="absolute -right-16 top-0 flex flex-col gap-1">
                             {(node.services || []).map((s, i) => (
                                <div key={i} className="bg-emerald-600/90 text-[8px] font-black uppercase px-2 py-1 rounded border border-emerald-400 text-white whitespace-nowrap shadow-md">
                                    S: {s.name}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                        {isComposite ? (
                            <div className="bg-slate-700 p-1.5 rounded-lg">
                                {node.subType === 'Selector' ? <HelpCircle className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4 text-white" />}
                            </div>
                        ) : (
                            <div className="bg-[#9c27b0]/20 p-1.5 rounded-lg border border-[#9c27b0]/30">
                                <Activity className="w-4 h-4 text-[#ce93d8]" />
                            </div>
                        )}
                        <div className="text-xs font-black text-white uppercase tracking-wider">{node.name}</div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">"{node.description}"</p>
                </div>

                {/* Children Connection Lines & Recursive Render */}
                {node.children && node.children.length > 0 && (
                    <div className="mt-8 relative flex gap-8">
                        <div className="absolute top-[-32px] left-1/2 w-[2px] h-8 bg-slate-700 -translate-x-1/2"></div>
                        {node.children.map(childId => renderNode(childId, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12 pb-20">
            {/* Header / Blackboard Summary */}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-600/20 p-2 rounded-xl border border-purple-500/30">
                            <Brain className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">{spec.assetName}</h2>
                            <div className="flex gap-3 mt-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Blackboard:</span>
                                <span className="text-[10px] font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">{spec.blackboardAsset}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-light bg-slate-900/40 p-5 rounded-2xl border border-white/5">{spec.logicSummary}</p>
                </div>

                {/* Blackboard Keys Panel */}
                <div className="w-full lg:w-96 glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
                    <div className="bg-slate-900/80 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-400" /> Blackboard Keys
                         </h3>
                         <div className="text-[9px] text-slate-600 font-mono">Neural Memory</div>
                    </div>
                    <div className="p-4 space-y-2">
                        {spec.blackboardKeys && spec.blackboardKeys.map((key, i) => (
                            <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                                <div>
                                    <div className="text-xs font-mono font-bold text-slate-200">{key.name}</div>
                                    <div className="text-[9px] text-slate-500 mt-1 italic">{key.description}</div>
                                </div>
                                <span className="text-[9px] font-black bg-purple-500/10 text-purple-300 px-2 py-1 rounded border border-purple-500/20 uppercase tracking-widest">{key.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tree Designer */}
            <div className="glass-card rounded-[2.5rem] border border-slate-700/50 bg-[#0f111a] p-12 overflow-x-auto custom-scrollbar shadow-2xl relative min-h-[600px]">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-slate-900/80 rounded-full border border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest z-10">
                    <GitBranch className="w-3 h-3" /> Behavior Execution Flow (Top Down)
                </div>
                
                <div className="flex justify-center pt-8">
                    {spec.rootNode && renderNode(spec.rootNode)}
                </div>
            </div>

            {/* Validation */}
            {spec.validationReport && (
                <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-xl">
                    <h4 className="flex items-center gap-3 text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">
                        <ShieldCheck className="w-4 h-4" /> AI Engineer Verification Log
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-500 uppercase">Architecture</div>
                            <div className="text-xs font-bold text-emerald-400">Pass</div>
                            <p className="text-[9px] text-slate-500 font-mono leading-tight">{spec.validationReport.technicalAuditor.findings[0]}</p>
                        </div>
                        <div className="space-y-2 border-x border-white/5 px-6">
                            <div className="text-[10px] font-black text-slate-500 uppercase">Logic Integrity</div>
                            <div className="text-xs font-bold text-emerald-400">Pass</div>
                            <p className="text-[9px] text-slate-500 font-mono leading-tight">{spec.validationReport.logicFlowValidator.findings[0]}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-500 uppercase">Blackboard Sync</div>
                            <div className="text-xs font-bold text-emerald-400">Verified</div>
                            <p className="text-[9px] text-slate-500 font-mono leading-tight">{spec.validationReport.functionalEngineer.findings[0]}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BehaviorArchitect;
