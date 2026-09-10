
import React from 'react';
import { DesignReview, AgentFeedback, ProducerFeedback } from '../types';
// Added missing Sparkles import
import { Cpu, Palette, Timer, AlertTriangle, CheckCircle2, Award, Zap, Loader2, PlayCircle, BarChart3, Sparkles } from 'lucide-react';

interface DesignReviewProps {
    review?: DesignReview;
    onGenerate: () => void;
    isLoading: boolean;
}

const DesignReviewPanel: React.FC<DesignReviewProps> = ({ review, onGenerate, isLoading }) => {
    
    const renderAgentFeedback = (agent: AgentFeedback, icon: React.ReactNode, title: string, accentColor: string) => (
        <div className={`glass-card rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-full shadow-xl transition-all hover:border-${accentColor}-500/30 group`}>
            {/* Header */}
            <div className={`bg-slate-900/80 p-5 border-b border-slate-800 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-${accentColor}-500/10 border border-${accentColor}-500/20 group-hover:scale-110 transition-transform`}>
                        {React.cloneElement(icon as React.ReactElement, { className: `w-5 h-5 text-${accentColor}-400` })}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Active Advisor</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Confidence</span>
                    <span className={`text-xs font-mono font-bold text-${accentColor}-400`}>{agent.score}%</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 bg-slate-950/20">
                <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Award className="w-3 h-3" /> Executive Summary
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-light italic">
                        "{agent.summary}"
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <h4 className={`text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2`}>
                            <AlertTriangle className="w-3 h-3" /> Technical Flags
                        </h4>
                        <ul className="space-y-2">
                            {agent.flags.map((flag, i) => (
                                <li key={i} className="text-xs text-slate-400 flex items-start gap-2.5 group/flag">
                                    <span className="w-1 h-1 rounded-full bg-red-500/50 mt-1.5 shrink-0 group-hover/flag:scale-150 transition-transform"></span>
                                    {flag}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className={`text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2`}>
                            <CheckCircle2 className="w-3 h-3" /> Recommendations
                        </h4>
                        <ul className="space-y-2">
                            {agent.recommendations.map((rec, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 group/rec">
                                    <Zap className={`w-3 h-3 text-emerald-500 mt-0.5 shrink-0 opacity-40 group-hover/rec:opacity-100 transition-opacity`} />
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProducerFeedback = (agent: ProducerFeedback) => (
        <div className="lg:col-span-3 glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden shadow-2xl">
            <div className="p-6 flex flex-col md:flex-row items-center gap-8">
                <div className="flex items-center gap-4">
                     <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <BarChart3 className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">Production Roadmap Review</h3>
                        <p className="text-xs text-amber-300/60 font-medium">Feasibility & Resource Management</p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 shadow-inner">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Timer className="w-3 h-3 text-amber-400" /> Time to Prototype
                        </div>
                        <div className="text-2xl font-black text-white tracking-tight">{agent.timeToPrototype}</div>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 shadow-inner">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-emerald-400" /> Feasibility Score
                        </div>
                        <div className="text-2xl font-black text-white tracking-tight">{agent.score}%</div>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 shadow-inner">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> Risk Level
                        </div>
                        <div className={`text-2xl font-black tracking-tight ${
                            agent.estimatedBudgetRisk === 'Low' ? 'text-emerald-400' :
                            agent.estimatedBudgetRisk === 'Medium' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                            {agent.estimatedBudgetRisk}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="px-6 pb-6 pt-2">
                 <div className="bg-slate-950/40 p-5 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Executive Strategy</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-light">{agent.summary}</p>
                 </div>
            </div>
        </div>
    );

    return (
        <div className="h-full p-8 max-w-7xl mx-auto overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight flex items-center gap-4">
                        <PlayCircle className="w-10 h-10 text-blue-500" /> Director's Cut Review
                    </h1>
                    <p className="text-slate-400 text-lg font-light max-w-2xl">
                        A triple-agent analysis of your Unreal Engine 5 project strategy from the perspectives of Tech, Art, and Production.
                    </p>
                </div>
                {!review && (
                    <button 
                        onClick={onGenerate}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-3 group disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                        Request Peer Review
                    </button>
                )}
            </div>

            {isLoading && !review && (
                <div className="h-96 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                        <div className="w-20 h-20 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin relative z-10"></div>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-400 font-mono text-sm tracking-[0.4em] uppercase mb-2">Consulting Board of Directors...</p>
                        <p className="text-slate-600 text-xs">Analyzing shaders, network replication, and scope feasibility</p>
                    </div>
                </div>
            )}

            {review && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {/* Producer Summary (Full Width) */}
                    {renderProducerFeedback(review.producer)}

                    {/* TD Feedback */}
                    {renderAgentFeedback(review.technicalDirector, <Cpu />, "Technical Director", "blue")}

                    {/* AD Feedback */}
                    {renderAgentFeedback(review.artDirector, <Palette />, "Art Director", "purple")}

                    {/* Quick Recommendations card */}
                    <div className="glass-card rounded-2xl border border-slate-700/50 bg-slate-900/20 p-6 flex flex-col shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-cyan-400" /> Global Pivot Points
                        </h3>
                        <div className="space-y-4 flex-1">
                             <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                <h4 className="text-xs font-bold text-emerald-400 mb-2">Priority Optimization</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Implement <strong>Nanite</strong> for high-poly environment meshes immediately to reduce draw call overhead found in the initial plan.</p>
                             </div>
                             <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                <h4 className="text-xs font-bold text-blue-400 mb-2">Lighting Strategy</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Transition from static baked lighting to full <strong>Lumen</strong> GI to allow for the dynamic level changes requested.</p>
                             </div>
                             <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                <h4 className="text-xs font-bold text-purple-400 mb-2">Code Architecture</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">Use the <strong>Gameplay Ability System (GAS)</strong> for status effects to avoid Blueprint sprawl as the team scales.</p>
                             </div>
                        </div>
                        <button 
                            onClick={onGenerate}
                            className="mt-8 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest text-center border-t border-white/5 pt-4 transition-colors"
                        >
                            Refresh Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesignReviewPanel;
