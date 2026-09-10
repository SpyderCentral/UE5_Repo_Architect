import React, { useState } from 'react';
import { AssetResourceMetric, PlatformBudgetConfig, AIOptimizeSuggestion } from '../types';
import { generateAIOptimizeSuggestions } from '../services/aiOptimizeService';
import {
  Sparkles,
  Cpu,
  Zap,
  HardDrive,
  Layers,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Code2,
  Terminal,
  Activity,
  Sliders,
  CheckCircle2,
  TrendingDown,
  FileCode2,
  Lightbulb
} from 'lucide-react';

interface AIOptimizeModalProps {
  asset: AssetResourceMetric;
  platform: PlatformBudgetConfig;
  onClose: () => void;
  onNavigateToBlueprint?: (assetName: string) => void;
}

export const AIOptimizeModal: React.FC<AIOptimizeModalProps> = ({
  asset,
  platform,
  onClose,
  onNavigateToBlueprint
}) => {
  const [activeTab, setActiveTab] = useState<'refactor' | 'diff' | 'cvars'>('refactor');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const suggestion: AIOptimizeSuggestion = generateAIOptimizeSuggestions(asset, platform);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const handleCopyAllInstructions = () => {
    const lines = [
      `# UE5 AI Optimization Refactoring Plan: ${asset.assetName} (${asset.assetType})`,
      `Target Platform: ${platform.name} (${platform.targetFps} FPS, Budget: ${platform.targetFrameTimeMs}ms)`,
      `Primary Bottleneck: ${suggestion.primaryBottleneck}`,
      '',
      `## Estimated Savings`,
      `- CPU GameThread Time: -${suggestion.estimatedSavings.cpuMsSaved} ms`,
      `- GPU Render Time: -${suggestion.estimatedSavings.gpuMsSaved} ms`,
      `- Memory Reclaimed: -${suggestion.estimatedSavings.memoryMbSaved} MB`,
      `- Draw Calls Reduced: -${suggestion.estimatedSavings.drawCallsSaved}`,
      `- Projected Frame Headroom Gain: +${suggestion.estimatedSavings.headroomGainPercent}%`,
      '',
      `## Refactoring Steps`
    ];

    suggestion.refactoringSteps.forEach((step, idx) => {
      lines.push(`${idx + 1}. [${step.priority} Priority] ${step.title}`);
      lines.push(`   Category: ${step.category}`);
      lines.push(`   Description: ${step.description}`);
      if (step.beforePattern) lines.push(`   Before: ${step.beforePattern}`);
      if (step.afterPattern) lines.push(`   After:  ${step.afterPattern}`);
      lines.push(`   Impact: ${step.impact}`);
      lines.push('');
    });

    if (suggestion.codeOrNodeDiff) {
      lines.push(`## Recommended Node / Code Pattern`);
      lines.push(`Before:\n${suggestion.codeOrNodeDiff.before}\n`);
      lines.push(`After:\n${suggestion.codeOrNodeDiff.after}\n`);
    }

    if (suggestion.recommendedCVars.length > 0) {
      lines.push(`## Diagnostic CVars`);
      suggestion.recommendedCVars.forEach(c => lines.push(`- ${c}`));
    }

    handleCopy(lines.join('\n'), 'all_instructions');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-3xl w-full rounded-3xl border border-purple-500/30 bg-slate-900/95 shadow-2xl shadow-purple-950/40 p-5 sm:p-7 space-y-6 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                AI Refactoring Advisor
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                asset.status === 'Critical'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : asset.status === 'Warning'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {asset.status} Overhead
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                {asset.assetType}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>{asset.assetName}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              {suggestion.summary}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Projected Resource Overhead Savings Grid */}
        <div className="bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-indigo-950/30 p-4 rounded-2xl border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Projected Overhead Reduction
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +{suggestion.estimatedSavings.headroomGainPercent}% Frame Headroom
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* CPU Saving */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>CPU Thread</span>
                <Cpu className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-base font-black text-blue-400">
                -{suggestion.estimatedSavings.cpuMsSaved} ms
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                Current: {asset.cpuCostMs} ms
              </div>
            </div>

            {/* GPU Saving */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>GPU Render</span>
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-base font-black text-emerald-400">
                -{suggestion.estimatedSavings.gpuMsSaved} ms
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                Current: {asset.gpuCostMs} ms
              </div>
            </div>

            {/* Memory Saving */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Memory Reclaimed</span>
                <HardDrive className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-base font-black text-cyan-400">
                -{suggestion.estimatedSavings.memoryMbSaved} MB
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                Current: {asset.memoryMb} MB
              </div>
            </div>

            {/* Draw Calls Saving */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Draw Calls</span>
                <Layers className="w-3 h-3 text-purple-400" />
              </div>
              <div className="text-base font-black text-purple-400">
                -{suggestion.estimatedSavings.drawCallsSaved} calls
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                Current: {asset.drawCalls}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Bottleneck Highlight */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 font-mono uppercase text-[11px] block mb-0.5">
              Identified Primary Bottleneck: {suggestion.primaryBottleneck}
            </span>
            Targeted platform is <span className="font-bold text-white">{platform.name}</span> with budget cap of{' '}
            <span className="font-mono text-amber-300">{platform.maxCpuBudgetMs}ms CPU</span> /{' '}
            <span className="font-mono text-amber-300">{platform.maxGpuBudgetMs}ms GPU</span>.
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('refactor')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'refactor'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Specific Refactoring Steps ({suggestion.refactoringSteps.length})
          </button>

          {suggestion.codeOrNodeDiff && (
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
                activeTab === 'diff'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Before vs. After Graph
            </button>
          )}

          <button
            onClick={() => setActiveTab('cvars')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'cvars'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            UE5 Profiling CVars
          </button>
        </div>

        {/* Tab 1: Refactoring Steps */}
        {activeTab === 'refactor' && (
          <div className="space-y-3.5">
            {(suggestion.refactoringSteps || []).map((step, idx) => (
              <div
                key={idx}
                className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-purple-900/60 text-purple-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{step.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                      {step.category}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    step.priority === 'High'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {step.priority} Priority
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {step.description}
                </p>

                {/* Pattern Compare */}
                {(step.beforePattern || step.afterPattern) && (
                  <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                    {step.beforePattern && (
                      <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300/90 flex items-start gap-2">
                        <span className="text-red-400 font-bold shrink-0">❌ Inefficient:</span>
                        <span className="leading-snug">{step.beforePattern}</span>
                      </div>
                    )}
                    {step.afterPattern && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300/90 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">✅ Refactored:</span>
                        <span className="leading-snug">{step.afterPattern}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {step.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Code / Graph Diff */}
        {activeTab === 'diff' && suggestion.codeOrNodeDiff && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {suggestion.codeOrNodeDiff.explanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Before */}
              <div className="bg-slate-950 rounded-2xl border border-red-500/30 overflow-hidden">
                <div className="bg-red-950/40 px-3.5 py-2 border-b border-red-500/20 flex items-center justify-between text-xs font-mono text-red-300">
                  <span className="font-bold">❌ Before Refactoring</span>
                  <span className="text-[10px] opacity-70">High Resource Draw</span>
                </div>
                <pre className="p-3.5 text-[11px] font-mono text-red-200/90 overflow-x-auto whitespace-pre leading-relaxed">
                  {suggestion.codeOrNodeDiff.before}
                </pre>
              </div>

              {/* After */}
              <div className="bg-slate-950 rounded-2xl border border-emerald-500/30 overflow-hidden">
                <div className="bg-emerald-950/40 px-3.5 py-2 border-b border-emerald-500/20 flex items-center justify-between text-xs font-mono text-emerald-300">
                  <span className="font-bold">✅ Optimized Architecture</span>
                  <span className="text-[10px] opacity-70">Streamlined</span>
                </div>
                <pre className="p-3.5 text-[11px] font-mono text-emerald-200/90 overflow-x-auto whitespace-pre leading-relaxed">
                  {suggestion.codeOrNodeDiff.after}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Diagnostics CVars */}
        {activeTab === 'cvars' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Execute these Unreal Engine 5 console commands in viewport (`~` key) or build packaging to benchmark this asset before and after refactoring:
            </p>

            <div className="space-y-2">
              {(suggestion.recommendedCVars || []).map((cvar, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300"
                >
                  <span className="text-emerald-400 font-bold">{cvar}</span>
                  <button
                    onClick={() => handleCopy(cvar, `cvar_${idx}`)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Copy command"
                  >
                    {copiedSection === `cvar_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleCopyAllInstructions}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            {copiedSection === 'all_instructions' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
            {copiedSection === 'all_instructions' ? 'Copied Full Action Plan!' : 'Copy Refactoring Plan'}
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onNavigateToBlueprint && asset.assetType === 'Blueprint' && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToBlueprint(asset.assetName);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-900/30"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Blueprint Architect
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AIOptimizeModal;
