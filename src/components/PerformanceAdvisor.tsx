
import React, { useState } from 'react';
import { Activity, Zap, Upload, AlertCircle, CheckCircle2, ChevronRight, BarChart3, Gauge, Cpu, Loader2, Image as ImageIcon, Clipboard, History } from 'lucide-react';
import { PerformanceAnalysis } from '../types';

interface PerformanceAdvisorProps {
    reports: PerformanceAnalysis[];
    onAnalyze: (image: string) => Promise<PerformanceAnalysis | null>;
    isLoading: boolean;
}

const PerformanceAdvisor: React.FC<PerformanceAdvisorProps> = ({ reports, onAnalyze, isLoading }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);

    const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            const result = await onAnalyze(base64);
            if (result) setSelectedReportId(result.id);
        };
        reader.readAsDataURL(file);
    };

    const onDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) handleFile(blob);
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Good': return 'text-emerald-400';
            case 'Warning': return 'text-amber-400';
            case 'Critical': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const getComplexityBadge = (complexity: string) => {
        switch (complexity) {
            case 'Low': return 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20';
            case 'Medium': return 'bg-amber-950/30 text-amber-400 border-amber-500/20';
            case 'High': return 'bg-red-950/30 text-red-400 border-red-500/20';
            default: return 'bg-slate-800 text-slate-400 border-white/5';
        }
    };

    return (
        <div className="h-full p-8 max-w-7xl mx-auto overflow-y-auto custom-scrollbar" onPaste={handlePaste}>
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight flex items-center gap-4">
                        <Gauge className="w-10 h-10 text-emerald-500" /> Performance Advisor
                    </h1>
                    <p className="text-slate-400 text-lg font-light max-w-2xl">
                        Upload <span className="text-white font-bold">Stat Unit</span> or <span className="text-white font-bold">Shader Complexity</span> screenshots for instant bottleneck analysis.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                
                {/* Left: Input & History */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Dropzone */}
                    <div 
                        className={`relative border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center group overflow-hidden ${
                            dragActive ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                        }`}
                        onDragEnter={onDrag}
                        onDragLeave={onDrag}
                        onDragOver={onDrag}
                        onDrop={onDrop}
                    >
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onFileInput} accept="image/*" />
                        
                        <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                            {isLoading ? <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /> : <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400" />}
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-200 mb-2">Drop Screenshot</h3>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                            or click to browse. <br/>
                            <span className="text-emerald-500/60 flex items-center justify-center gap-1 mt-2">
                                <Clipboard className="w-3 h-3" /> Ctrl+V to paste
                            </span>
                        </p>

                        {dragActive && (
                            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                        )}
                    </div>

                    {/* History */}
                    {reports.length > 0 && (
                        <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                            <div className="bg-slate-900/80 px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                                <History className="w-4 h-4 text-slate-500" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Scans</h4>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                                {reports.map((report) => (
                                    <button
                                        key={report.id}
                                        onClick={() => setSelectedReportId(report.id)}
                                        className={`w-full text-left p-4 hover:bg-white/5 transition-all flex items-center gap-4 ${selectedReportId === report.id ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : ''}`}
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden border border-white/5 flex-shrink-0">
                                            <img src={report.image} className="w-full h-full object-cover opacity-60" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-200 truncate">{report.summary}</div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono">{new Date(report.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                        <div className={`text-sm font-black ${report.score > 70 ? 'text-emerald-400' : report.score > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {report.score}%
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Analysis Details */}
                <div className="lg:col-span-8">
                    {activeReport ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Score & Summary Header */}
                            <div className="glass-card rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
                                <div className="p-8 flex flex-col md:flex-row gap-8 items-center bg-slate-900/40">
                                    <div className="relative">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                            <circle 
                                                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                                strokeDasharray={364}
                                                strokeDashoffset={364 - (364 * activeReport.score / 100)}
                                                strokeLinecap="round"
                                                className={`transition-all duration-1000 ease-out ${activeReport.score > 70 ? 'text-emerald-500' : activeReport.score > 40 ? 'text-amber-500' : 'text-red-500'}`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-white">{activeReport.score}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Health</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">System Diagnosis</h3>
                                        <p className="text-slate-300 text-lg leading-relaxed font-light italic">"{activeReport.summary}"</p>
                                    </div>
                                </div>
                                
                                <div className="px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-800 bg-slate-950/20">
                                    {activeReport.metrics.map((metric, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{metric.label}</div>
                                            <div className="flex items-center gap-2">
                                                <div className={`text-xl font-black ${getStatusColor(metric.status)}`}>{metric.value}</div>
                                                {metric.status === 'Critical' && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Bottlenecks */}
                                <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl bg-slate-900/20">
                                    <h4 className="flex items-center gap-3 text-xs font-black text-red-400 uppercase tracking-[0.2em] mb-6">
                                        <AlertCircle className="w-4 h-4" /> Detected Bottlenecks
                                    </h4>
                                    <ul className="space-y-4">
                                        {activeReport.bottlenecks.map((b, i) => (
                                            <li key={i} className="flex gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10 group">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                                                <p className="text-sm text-slate-300 font-medium leading-relaxed">{b}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Source Image Preview */}
                                <div className="glass-card p-6 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
                                    <h4 className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">
                                        <ImageIcon className="w-4 h-4" /> Analyzed Frame
                                    </h4>
                                    <div className="flex-1 rounded-xl overflow-hidden border border-white/5 relative group">
                                        <img src={activeReport.image} className="w-full h-full object-contain bg-black transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">Computer Vision Active</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="glass-card rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
                                <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                                    <Zap className="w-4 h-4 text-emerald-400" />
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recommended Actions</h4>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeReport.recommendations.map((rec, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <h5 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{rec.title}</h5>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getComplexityBadge(rec.complexity)}`}>
                                                    {rec.complexity} complexity
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed font-light flex-1">{rec.description}</p>
                                            <button className="mt-4 text-[10px] font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-2 group-hover:text-emerald-400">
                                                Learn Implementation <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-3xl min-h-[500px]">
                            <Activity className="w-16 h-16 mb-4 opacity-10 animate-pulse" />
                            <h3 className="text-xl font-bold text-slate-400">No active diagnosis</h3>
                            <p className="text-sm max-w-sm text-center mt-2 font-light">
                                Upload a performance screenshot from Unreal Engine 5 to get a detailed engineering report.
                            </p>
                            <div className="mt-10 flex gap-4 text-[10px] font-mono text-slate-500">
                                <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">stat unit</span>
                                <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">stat gpu</span>
                                <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">shader complexity</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Decorative Blur */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-emerald-600/5 blur-[120px] -z-10"></div>
        </div>
    );
};

export default PerformanceAdvisor;
