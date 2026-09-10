import React, { useState, useMemo } from 'react';
import { 
  BlueprintSpec, 
  VerseCode, 
  UE6ReadinessAudit 
} from '../types';
import { 
  transpileBlueprintToVerse, 
  auditProjectUE6Readiness, 
  packageVerseModulesZip 
} from '../services/verseGenerator';
import VerseCodeViewer from './VerseCodeViewer';
import { 
  Code, 
  Cpu, 
  Zap, 
  Check, 
  Copy, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Layers, 
  FileCode2, 
  Package, 
  Terminal, 
  CheckCircle2, 
  CircleDashed,
  Play, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface UE6VerseHubProps {
  selectedAsset: string | null;
  blueprints: Record<string, BlueprintSpec>;
  savedVerseCodes: Record<string, VerseCode>;
  onGenerateVerse: (name: string, spec: BlueprintSpec) => Promise<VerseCode>;
  onBatchUpdateVerseCodes: (codes: Record<string, VerseCode>) => void;
  ue6Audit?: UE6ReadinessAudit;
  onUpdateAudit?: (audit: UE6ReadinessAudit) => void;
}

export const UE6VerseHub: React.FC<UE6VerseHubProps> = ({
  selectedAsset,
  blueprints,
  savedVerseCodes,
  onGenerateVerse,
  onBatchUpdateVerseCodes,
  ue6Audit,
  onUpdateAudit
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'audit' | 'concurrency_lab' | 'docs'>('editor');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Concurrency Simulation State
  const [simMode, setSimMode] = useState<'sync' | 'race' | 'rush'>('sync');
  const [simRunning, setSimRunning] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [txSuccess, setTxSuccess] = useState<boolean | null>(null);

  // Selected Blueprint
  const currentSpec = selectedAsset ? blueprints[selectedAsset] : null;

  // Current Verse code object (cached or dynamically generated)
  const currentVerseCode: VerseCode | null = useMemo(() => {
    if (!selectedAsset || !currentSpec) return null;
    if (savedVerseCodes[selectedAsset]) {
      return savedVerseCodes[selectedAsset];
    }
    // Auto-transpile preview if not saved yet
    return transpileBlueprintToVerse(selectedAsset, currentSpec);
  }, [selectedAsset, currentSpec, savedVerseCodes]);

  // Project Audit
  const audit = useMemo(() => {
    return ue6Audit || auditProjectUE6Readiness(blueprints, savedVerseCodes);
  }, [ue6Audit, blueprints, savedVerseCodes]);

  // Handle single asset AI generation
  const handleSynthesizeVerse = async () => {
    if (!selectedAsset || !currentSpec) return;
    setIsGenerating(true);
    try {
      const code = await onGenerateVerse(selectedAsset, currentSpec);
      onBatchUpdateVerseCodes({ [selectedAsset]: code });
      if (onUpdateAudit) {
        onUpdateAudit(auditProjectUE6Readiness(blueprints, { ...savedVerseCodes, [selectedAsset]: code }));
      }
    } catch (err) {
      console.error('Failed to generate Verse code:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Batch Convert all Blueprints to Verse
  const handleBatchConvertAll = async () => {
    const assetKeys = Object.keys(blueprints);
    if (assetKeys.length === 0) return;

    setIsGenerating(true);
    setBatchProgress({ current: 0, total: assetKeys.length });

    const newCodes: Record<string, VerseCode> = { ...savedVerseCodes };

    for (let i = 0; i < assetKeys.length; i++) {
      const key = assetKeys[i];
      const spec = blueprints[key];
      // Fast high-quality transpilation
      const verse = transpileBlueprintToVerse(key, spec);
      newCodes[key] = verse;
      setBatchProgress({ current: i + 1, total: assetKeys.length });
    }

    onBatchUpdateVerseCodes(newCodes);
    if (onUpdateAudit) {
      onUpdateAudit(auditProjectUE6Readiness(blueprints, newCodes));
    }

    setTimeout(() => {
      setIsGenerating(false);
      setBatchProgress(null);
    }, 400);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!currentVerseCode) return;
    navigator.clipboard.writeText(currentVerseCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download single .verse file
  const handleDownloadSingleVerse = () => {
    if (!selectedAsset || !currentVerseCode) return;
    const blob = new Blob([currentVerseCode.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedAsset}.verse`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download entire project as UE6 Verse ZIP
  const handleDownloadProjectZip = async () => {
    setIsZipping(true);
    try {
      // Ensure all blueprints have Verse code
      const completeVerseCodes: Record<string, VerseCode> = { ...savedVerseCodes };
      Object.keys(blueprints).forEach((name) => {
        const spec = blueprints[name];
        if (spec && !completeVerseCodes[name]) {
          completeVerseCodes[name] = transpileBlueprintToVerse(name, spec);
        }
      });

      const blob = await packageVerseModulesZip('UE6_GameProject', completeVerseCodes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UE6_Verse_Package.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Download combined single .verse package
  const handleDownloadCombinedVerse = () => {
    const completeVerseCodes: Record<string, VerseCode> = { ...savedVerseCodes };
    Object.keys(blueprints).forEach((name) => {
      const spec = blueprints[name];
      if (spec && !completeVerseCodes[name]) {
        completeVerseCodes[name] = transpileBlueprintToVerse(name, spec);
      }
    });

    const entries = Object.entries(completeVerseCodes);
    if (entries.length === 0) return;

    const combined = `# ==============================================================================
# UNREAL ENGINE 6 - MASTER VERSE PACKAGE
# Combined Game Devices & Systems
# Modules: ${entries.map(([name]) => name).join(', ')}
# Generated by UE5/UE6 Game Dev Architect
# ==============================================================================

${entries.map(([name, codeObj]) => codeObj.code).join('\n\n# ------------------------------------------------------------------------------\n\n')}
`;

    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MasterVerseModules.verse`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Run interactive Concurrency simulation
  const runConcurrencySim = (mode: 'sync' | 'race' | 'rush') => {
    setSimMode(mode);
    setSimRunning(true);
    setSimLog([`Initiating UE6 Verse <${mode}> structured concurrency task group...`]);

    if (mode === 'sync') {
      setTimeout(() => setSimLog(prev => [...prev, '[Task A]: Character animation & audio triggered... (running)']), 300);
      setTimeout(() => setSimLog(prev => [...prev, '[Task B]: Network replication transaction dispatched... (running)']), 600);
      setTimeout(() => setSimLog(prev => [...prev, '[Task A]: Completed in 450ms.']), 900);
      setTimeout(() => setSimLog(prev => [...prev, '[Task B]: Completed in 700ms.']), 1300);
      setTimeout(() => {
        setSimLog(prev => [...prev, `SUCCESS: 'sync' block joined successfully. All parallel tasks converged without race conditions.`]);
        setSimRunning(false);
      }, 1500);
    } else if (mode === 'race') {
      setTimeout(() => setSimLog(prev => [...prev, '[Branch 1]: Gameplay input timer (wait 2.0s)...']), 250);
      setTimeout(() => setSimLog(prev => [...prev, '[Branch 2]: Player interrupted with Dash Action!']), 600);
      setTimeout(() => {
        setSimLog(prev => [...prev, `WINNER: Branch 2 resolved first! Branch 1 cancelled instantaneously with zero resource leak.`]);
        setSimRunning(false);
      }, 950);
    } else {
      setTimeout(() => setSimLog(prev => [...prev, '[Worker 1]: Querying navigation mesh pathfinding...']), 200);
      setTimeout(() => setSimLog(prev => [...prev, '[Worker 2]: Raycasting direct line-of-sight...']), 400);
      setTimeout(() => {
        setSimLog(prev => [...prev, `SUCCESS: 'rush' kept the earliest valid solution while remaining workers were halted safely.`]);
        setSimRunning(false);
      }, 800);
    }
  };

  // Run transactional rollback simulation
  const runTransactionalSim = (shouldFail: boolean) => {
    setTxSuccess(null);
    setSimLog([`Starting transactional memory block: <decides><transacts>...`]);
    setTimeout(() => {
      setSimLog(prev => [...prev, `Mutation 1: Player HP decremented by 25.0`]);
      setSimLog(prev => [...prev, `Mutation 2: Inventory slot allocated for loot drop`]);
    }, 300);

    setTimeout(() => {
      if (shouldFail) {
        setSimLog(prev => [
          ...prev, 
          `FAIL CONDITION: Target actor became invalid during transaction!`,
          `ROLLBACK: Verse transactional engine reverted HP to original value and deallocated inventory slot. Zero state corruption.`
        ]);
        setTxSuccess(false);
      } else {
        setSimLog(prev => [
          ...prev, 
          `ASSERTION PASSED: Condition verified. Commit succeeded.`,
          `COMMITTED: All state changes atomically published to simulation.`
        ]);
        setTxSuccess(true);
      }
    }, 900);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-cyan-900/40 bg-slate-900/90 px-4 py-3 backdrop-blur-md gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-lg shadow-cyan-950/50">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-white tracking-wide">
                Unreal Engine 6 · Verse Architecture
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                UE6 Next-Gen
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transform Blueprint graphs into declarative, multi-threaded Verse modules with transactional safety
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('editor')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'editor'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Verse Source</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'audit'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>UE6 Migration Audit</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-900/60 text-cyan-200">
              {audit.overallScore}%
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('concurrency_lab')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'concurrency_lab'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Concurrency Lab</span>
          </button>
          <button
            onClick={() => setActiveSubTab('docs')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'docs'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>UE6 Docs</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBatchConvertAll}
            disabled={isGenerating}
            title="Batch transpile all blueprints into Verse classes"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating && batchProgress ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
            <span>
              {batchProgress
                ? `Transpiling ${batchProgress.current}/${batchProgress.total}...`
                : 'Batch Convert All'}
            </span>
          </button>

          <button
            onClick={handleDownloadProjectZip}
            disabled={isZipping}
            title="Download formatted UE6 / UEFN project folder (.zip)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium shadow-md shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            {isZipping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Package className="w-3.5 h-3.5" />
            )}
            <span>Export UE6 ZIP</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* TAB 1: VERSE CODE EDITOR */}
        {activeSubTab === 'editor' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Asset Selector & Meta Bar */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Target Asset
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {selectedAsset ? `${selectedAsset}.verse` : 'No Asset Selected'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedAsset || 'Select a Blueprint to Transpile'}
                  </h3>
                </div>
              </div>

              {selectedAsset && currentVerseCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    Model: {currentVerseCode.concurrencyModel || 'Cooperative Concurrency'}
                  </span>
                  {currentVerseCode.isPersistable && (
                    <span className="px-2.5 py-1 text-xs rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                      &lt;persistable&gt; Cloud State
                    </span>
                  )}
                  <button
                    onClick={handleSynthesizeVerse}
                    disabled={isGenerating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    )}
                    <span>Synthesize with AI</span>
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSingleVerse}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .verse</span>
                  </button>
                </div>
              )}
            </div>

            {/* If no asset is selected */}
            {!selectedAsset && (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <FileCode2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-300">No Blueprint Selected</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Choose an asset from the left sidebar list or use &quot;Batch Convert All&quot; above to transpile all project assets into Verse modules.
                </p>
              </div>
            )}

            {/* Code Display and Architectural Sidepanel */}
            {selectedAsset && currentVerseCode && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Code Window with Syntax Highlighting and Diagnostics */}
                <div className="lg:col-span-2">
                  <VerseCodeViewer
                    initialCode={currentVerseCode.code}
                    assetName={selectedAsset}
                    onCodeChange={(newCode) => {
                      onBatchUpdateVerseCodes({
                        ...savedVerseCodes,
                        [selectedAsset]: {
                          ...currentVerseCode,
                          code: newCode
                        }
                      });
                    }}
                  />
                </div>

                {/* Architectural Metadata & Inspector */}
                <div className="space-y-4">
                  {/* UE6 Feature Badges */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>UE6 Language Guarantees</span>
                    </h4>
                    <div className="space-y-2">
                      {(currentVerseCode.ue6Features || [
                        'Zero-Null Safety with ?agent optional typing',
                        'Transactional Memory Rollback (<transacts>)',
                        'Tick-less Concurrency Loop (spawn + Sleep)'
                      ]).map((feat, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exposed @editable Variables */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>@editable Properties ({currentVerseCode.exposedProperties?.length || 0})</span>
                      </span>
                    </h4>

                    {(!currentVerseCode.exposedProperties || currentVerseCode.exposedProperties.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">No exposed editor properties defined.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {currentVerseCode.exposedProperties.map((prop, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                            <span className="font-mono text-cyan-300 font-medium">{prop.name}</span>
                            <span className="font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                              {prop.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Explanation card */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300 space-y-2">
                    <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span>Architectural Overview</span>
                    </div>
                    <p className="text-slate-400 leading-normal">
                      {currentVerseCode.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UE6 MIGRATION AUDIT */}
        {activeSubTab === 'audit' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-cyan-900/50 bg-gradient-to-br from-slate-900 to-cyan-950/40 p-4 shadow-lg">
                <div className="text-xs text-cyan-400 font-semibold tracking-wider uppercase mb-1">
                  Overall UE6 Readiness
                </div>
                <div className="text-3xl font-extrabold text-white flex items-baseline space-x-1">
                  <span>{audit.overallScore}%</span>
                  <span className="text-xs text-cyan-400 font-normal">Next-Gen</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${audit.overallScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">
                  Verse Transpilation
                </div>
                <div className="text-3xl font-extrabold text-white flex items-baseline space-x-1">
                  <span>{audit.verseConversionReadiness}%</span>
                  <span className="text-xs text-slate-500 font-normal">Converted</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${audit.verseConversionReadiness}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">
                  Concurrency Modernization
                </div>
                <div className="text-3xl font-extrabold text-white flex items-baseline space-x-1">
                  <span>{audit.concurrencyModernization}%</span>
                  <span className="text-xs text-slate-500 font-normal">Tick-less</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${audit.concurrencyModernization}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">
                  Transactional Memory Safety
                </div>
                <div className="text-3xl font-extrabold text-white flex items-baseline space-x-1">
                  <span>{audit.memorySafetyScore}%</span>
                  <span className="text-xs text-slate-500 font-normal">&lt;transacts&gt;</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${audit.memorySafetyScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Project Recommendations */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>UE6 Architectural Directives</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {audit.ue6ArchitecturalRecommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                    <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Audit Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Asset-by-Asset Readiness Matrix</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comprehensive audit of all {Object.keys(blueprints).length} project assets for Verse compatibility
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadCombinedVerse}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Combined Master .verse</span>
                  </button>
                  <button
                    onClick={handleBatchConvertAll}
                    disabled={isGenerating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Transpile All Missing</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-800/80 overflow-x-auto">
                {audit.assetsAudited.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No blueprint assets defined in current game plan yet.
                  </div>
                ) : (
                  audit.assetsAudited.map((asset, index) => (
                    <div key={index} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${asset.hasVerse ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                          <FileCode2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white font-mono">{asset.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              {asset.type}
                            </span>
                            {asset.hasVerse ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center space-x-1 font-mono">
                                <Check className="w-2.5 h-2.5" />
                                <span>Verse Ready</span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/50 font-mono">
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {asset.migrationNotes}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                        {asset.concurrencyRecommendations.map((rec, rIdx) => (
                          <span key={rIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONCURRENCY LAB */}
        {activeSubTab === 'concurrency_lab' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span>Interactive UE6 Concurrency & Transactional Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Experiment with Verse language primitives: `sync`, `race`, `rush`, and transactional rollback (`&lt;decides&gt;&lt;transacts&gt;`).
                </p>
              </div>

              {/* Concurrency Block Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => runConcurrencySim('sync')}
                  disabled={simRunning}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    simMode === 'sync'
                      ? 'border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-cyan-400 mb-1">sync:</div>
                  <h4 className="text-xs font-bold text-white">Parallel Join Execution</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Runs all parallel tasks simultaneously and waits for EVERY task to finish before proceeding.
                  </p>
                  <div className="mt-3 inline-flex items-center space-x-1 text-xs text-cyan-300 font-medium">
                    <Play className="w-3 h-3" />
                    <span>Run Simulation</span>
                  </div>
                </button>

                <button
                  onClick={() => runConcurrencySim('race')}
                  disabled={simRunning}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    simMode === 'race'
                      ? 'border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-yellow-400 mb-1">race:</div>
                  <h4 className="text-xs font-bold text-white">First-To-Finish Interruption</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Runs all branches; the moment ONE branch finishes, all other branches are cleanly cancelled.
                  </p>
                  <div className="mt-3 inline-flex items-center space-x-1 text-xs text-yellow-300 font-medium">
                    <Play className="w-3 h-3" />
                    <span>Run Simulation</span>
                  </div>
                </button>

                <button
                  onClick={() => runConcurrencySim('rush')}
                  disabled={simRunning}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    simMode === 'rush'
                      ? 'border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-purple-400 mb-1">rush:</div>
                  <h4 className="text-xs font-bold text-white">Earliest Success Non-Blocking</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Advances as soon as any branch succeeds, keeping remaining tasks evaluating in background.
                  </p>
                  <div className="mt-3 inline-flex items-center space-x-1 text-xs text-purple-300 font-medium">
                    <Play className="w-3 h-3" />
                    <span>Run Simulation</span>
                  </div>
                </button>
              </div>

              {/* Transactional Memory Rollback Tester */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">
                      Transactional Memory: &lt;decides&gt;&lt;transacts&gt;
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verse functions marked with &lt;transacts&gt; guarantee that if a &lt;decides&gt; assertion fails, all variable writes revert automatically.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => runTransactionalSim(false)}
                      disabled={simRunning}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      Test Successful Commit
                    </button>
                    <button
                      onClick={() => runTransactionalSim(true)}
                      disabled={simRunning}
                      className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                    >
                      Test Rollback on Failure
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Execution Terminal */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-500 mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>UE6 Simulation Console Log</span>
                  </div>
                  <span>{simRunning ? 'Executing...' : 'Idle'}</span>
                </div>

                <div className="space-y-1.5 min-h-32 text-slate-300">
                  {simLog.map((line, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-slate-600 select-none">&gt;</span>
                      <span className={
                        line.includes('SUCCESS') || line.includes('COMMITTED')
                          ? 'text-emerald-400 font-semibold'
                          : line.includes('FAIL') || line.includes('ROLLBACK')
                          ? 'text-rose-400 font-semibold'
                          : line.includes('WINNER')
                          ? 'text-yellow-400 font-semibold'
                          : 'text-slate-300'
                      }>
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: UE6 & VERSE DOCUMENTATION */}
        {activeSubTab === 'docs' && (
          <div className="space-y-6 max-w-7xl mx-auto text-xs leading-relaxed text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2">
                <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 w-fit">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Why Unreal Engine 6 Uses Verse</h4>
                <p className="text-slate-400">
                  UE6 merges standalone Unreal Engine with UEFN into a single unified runtime. Verse was designed from the ground up by Simon Peyton Jones (Haskell pioneer) and Epic Games to solve multiplayer desync, race conditions, and pointer crashes.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2">
                <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400 w-fit">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Transactional Memory (<span className="font-mono text-purple-300">&lt;transacts&gt;</span>)</h4>
                <p className="text-slate-400">
                  In legacy C++ or Blueprints, a failed action midway through an execution chain leaves variables in corrupted partial states. Verse guarantees ACID transactional rollback: changes only stick if the entire operation succeeds.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2">
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 w-fit">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Tick-less Cooperative Concurrency</h4>
                <p className="text-slate-400">
                  Legacy games waste huge CPU budgets executing &apos;Event Tick&apos; on hundreds of actors. Verse replaces ticks with lightweight cooperative suspension (<span className="font-mono text-emerald-300">spawn&#123; Sleep(dt) &#125;</span>), scaling to tens of thousands of concurrent agents.
                </p>
              </div>
            </div>

            {/* Syntax Cheatsheet */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Verse vs Blueprint Syntax Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold border-b border-slate-800 pb-1">Unreal Engine 5 Blueprint</div>
                  <div>• Boolean variable (IsActive)</div>
                  <div>• Integer variable (Score)</div>
                  <div>• Event Tick node (per-frame loop)</div>
                  <div>• Is Valid? check / Cast To</div>
                  <div>• Sequence node (Then 0, Then 1)</div>
                  <div>• Delay node (latent execution)</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1">Unreal Engine 6 Verse</div>
                  <div>• var IsActive : logic = false</div>
                  <div>• var Score : int = 0</div>
                  <div>• spawn&#123; loop: Sleep(0.016) &#125;</div>
                  <div>• if (Agent?): ... (optional check)</div>
                  <div>• Sequential expressions or sync block</div>
                  <div>• Sleep(Duration) in &lt;suspends&gt; function</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UE6VerseHub;
