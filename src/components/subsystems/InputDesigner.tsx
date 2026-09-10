import React from 'react';
import { EnhancedInputSpec } from '../../types';
import { Gamepad2, Keyboard, MousePointer2, Zap, ArrowRight, Layers } from 'lucide-react';

interface InputDesignerProps {
  spec: EnhancedInputSpec;
}

const InputDesigner: React.FC<InputDesignerProps> = ({ spec }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
       {/* Header */}
       <div className="border-b border-slate-800 pb-6">
            <h2 className="text-3xl font-black text-white mb-2">{spec.contextName}</h2>
            <p className="text-slate-400 text-sm">{spec.description}</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Input Actions List */}
           <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30">
                        <Zap className="w-4 h-4 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Input Actions</h3>
                </div>
                
                <div className="space-y-3">
                    {(spec.actions || []).map((action, i) => (
                        <div key={i} className="glass-card p-4 rounded-xl border border-slate-700/50 flex items-center justify-between group">
                            <div>
                                <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{action.name}</div>
                                <div className="text-xs text-slate-500">{action.description}</div>
                            </div>
                            <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-700">
                                {action.valueType}
                            </div>
                        </div>
                    ))}
                </div>
           </div>

           {/* Mappings Context */}
           <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30">
                        <Layers className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Mapping Context (IMC)</h3>
                </div>

                <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700/50 text-xs font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12">
                        <div className="col-span-4">Action</div>
                        <div className="col-span-4">Input Key</div>
                        <div className="col-span-4 text-right">Modifiers</div>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {(spec.mappings || []).map((map, i) => (
                            <div key={i} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-800/30 transition-colors">
                                <div className="col-span-4 font-semibold text-sm text-slate-300 flex items-center gap-2">
                                    <ArrowRight className="w-3 h-3 text-slate-600" />
                                    {map.actionName}
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                    {map.key.includes('Key') ? <Keyboard className="w-3.5 h-3.5 text-slate-500" /> : 
                                     map.key.includes('Mouse') ? <MousePointer2 className="w-3.5 h-3.5 text-slate-500" /> : 
                                     <Gamepad2 className="w-3.5 h-3.5 text-slate-500" />}
                                    <span className="text-xs font-mono text-emerald-300 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        {map.key}
                                    </span>
                                </div>
                                <div className="col-span-4 text-right flex flex-wrap justify-end gap-1">
                                    {(map.modifiers || []).map((mod, m) => (
                                        <span key={m} className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                                            {mod}
                                        </span>
                                    ))}
                                    {(map.triggers || []).map((trig, t) => (
                                        <span key={t} className="text-[10px] bg-orange-900/30 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/20">
                                            {trig}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           </div>
       </div>
    </div>
  );
};

export default InputDesigner;