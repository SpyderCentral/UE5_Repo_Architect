import React, { useState, useEffect, useRef } from 'react';
import {
  PipelineConfig,
  PipelineRun,
  PipelineStage,
  GamePlan,
  BlueprintSpec,
  VerseCode
} from '../types';
import {
  getPipelineConfig,
  savePipelineConfig,
  getPipelineRuns,
  savePipelineRuns,
  createNewPipelineRun,
  generateGitHubWorkflowYml,
  generateGitLabCiYml
} from '../services/pipelineService';
import {
  GitBranch,
  GitCommit,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Download,
  Copy,
  Check,
  Settings2,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Layers,
  Cpu,
  Zap,
  Activity,
  AlertTriangle,
  FolderGit2,
  Sparkles,
  Link2,
  Radio,
  Sliders,
  ChevronRight,
  Package
} from 'lucide-react';

interface BuildPipelineDashboardProps {
  plan?: GamePlan | null;
  blueprints?: Record<string, BlueprintSpec>;
  verseCodes?: Record<string, VerseCode>;
  onTriggerSimulatedArchUpdate?: () => void;
}

export const BuildPipelineDashboard: React.FC<BuildPipelineDashboardProps> = ({
  plan,
  blueprints = {},
  verseCodes = {},
  onTriggerSimulatedArchUpdate
}) => {
  const [config, setConfig] = useState<PipelineConfig>(getPipelineConfig());
  const [runs, setRuns] = useState<PipelineRun[]>(getPipelineRuns());
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id || '');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  
  // Modals & Drawers
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  
  // Transient states
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'success' | 'running' | 'failed'>('ALL');
  
  // Manual trigger inputs
  const [manualBranch, setManualBranch] = useState(config.branch);
  const [manualConfig, setManualConfig] = useState(config.buildConfiguration);
  const [manualCommitMsg, setManualCommitMsg] = useState('manual: On-demand production build triggered from Overseer');

  // Logs terminal ref
  const terminalRef = useRef<HTMLDivElement>(null);

  // Selected run reference
  const currentRun = runs.find(r => r.id === selectedRunId) || runs[0];

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Simulate active run progression if a run is 'running'
  useEffect(() => {
    const runningRun = runs.find(r => r.status === 'running');
    if (!runningRun) return;

    const interval = setInterval(() => {
      setRuns(prevRuns => {
        const runIdx = prevRuns.findIndex(r => r.id === runningRun.id);
        if (runIdx === -1) return prevRuns;

        const run = { ...prevRuns[runIdx] };
        const stages = [...run.stages];
        const runningStageIdx = stages.findIndex(s => s.status === 'running');

        if (runningStageIdx !== -1) {
          const stage = { ...stages[runningStageIdx] };
          stage.durationSec = (stage.durationSec || 0) + 2;

          // Add simulated log line
          const progressLogs: Record<string, string[]> = {
            'stage-checkout': [
              '[00:03] Git submodules fetched cleanly (Plugins/UnrealVerse, Plugins/CommonUI)',
              '[00:06] Validating Unreal Build Tool environment variables...',
              '[00:08] Environment initialized successfully.'
            ],
            'stage-verse-cpp': [
              '[00:04] Verse AST verification completed with 0 errors',
              '[00:09] Transactional rollback barriers validated across 8 routines',
              '[00:15] C++ Clang compilation successful for Win64 Development'
            ],
            'stage-blueprint-audit': [
              '[00:05] Checking circular references in Blueprint dependency matrix',
              '[00:11] All function pin signatures verified against parent classes',
              '[00:18] Blueprint audit passed: 0 warnings, 0 fatal errors.'
            ],
            'stage-automated-tests': [
              '[00:07] Running Gauntlet Test: CharacterMovement_CoyoteJumpBuffer -> PASSED',
              '[00:14] Running Gauntlet Test: HealthComponent_ShieldAtomicRollback -> PASSED',
              '[00:22] Automation spec suite finished: 24/24 passed.'
            ],
            'stage-cook-package': [
              '[00:09] Cooking packages for Windows Target Platform...',
              '[00:16] Writing Cooked Asset DDC Cache (48 assets)',
              '[00:24] Compressing artifact: Windows-Development-Client.zip'
            ]
          };

          const possibleLogs = progressLogs[stage.id] || [];
          if (possibleLogs.length > stage.logs.length) {
            stage.logs = [...stage.logs, possibleLogs[stage.logs.length]];
          }

          // Advance to next stage if this stage reaches duration threshold
          if (stage.durationSec >= 8) {
            stage.status = 'success';
            stages[runningStageIdx] = stage;

            if (runningStageIdx + 1 < stages.length) {
              stages[runningStageIdx + 1] = {
                ...stages[runningStageIdx + 1],
                status: 'running',
                durationSec: 1,
                logs: [`[00:01] Starting stage: ${stages[runningStageIdx + 1].name}...`]
              };
            } else {
              // Run finished!
              run.status = 'success';
              run.completedAt = Date.now();
              run.testSummary = { passed: 24, failed: 0, total: 24 };
              run.artifacts = [
                { name: `${plan?.title || 'UE-Game'}-Windows-${config.buildConfiguration}.zip`, size: '254.2 MB', type: 'Archive' },
                { name: 'GauntletTestReport.json', size: '380 KB', type: 'Report' },
                { name: 'BuildLog_Full.txt', size: '1.4 MB', type: 'Log' }
              ];
            }
          } else {
            stages[runningStageIdx] = stage;
          }

          run.stages = stages;
          const updated = [...prevRuns];
          updated[runIdx] = run;
          savePipelineRuns(updated);
          return updated;
        }

        return prevRuns;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [runs, plan?.title, config.buildConfiguration]);

  // Handle manual trigger dispatch
  const handleTriggerBuild = () => {
    const newRun = createNewPipelineRun(
      'manual',
      'Manual Dispatch via Overseer Dashboard',
      manualCommitMsg,
      {
        ...config,
        branch: manualBranch,
        buildConfiguration: manualConfig
      }
    );
    setRuns(getPipelineRuns());
    setSelectedRunId(newRun.id);
    setIsTriggerModalOpen(false);
  };

  // Handle simulated architecture update trigger
  const handleSimulateArchUpdate = () => {
    const bpNames = Object.keys(blueprints);
    const targetAsset = bpNames.length > 0 
      ? bpNames[Math.floor(Math.random() * bpNames.length)] 
      : 'BP_CharacterController';

    const commitMsg = `feat(arch): Automated sync for modified architecture asset [${targetAsset}]`;
    const newRun = createNewPipelineRun(
      'architecture_update',
      `Auto-Trigger: Architecture asset [${targetAsset}] updated`,
      commitMsg,
      config
    );
    setRuns(getPipelineRuns());
    setSelectedRunId(newRun.id);
    if (onTriggerSimulatedArchUpdate) {
      onTriggerSimulatedArchUpdate();
    }
  };

  // Webhook ping test
  const handlePingWebhook = () => {
    setIsPingingWebhook(true);
    setPingSuccess(null);
    setTimeout(() => {
      setIsPingingWebhook(false);
      setPingSuccess(true);
      const updatedConfig = { ...config, lastWebhookPing: Date.now() };
      setConfig(updatedConfig);
      savePipelineConfig(updatedConfig);
    }, 1400);
  };

  // Toggle auto-build
  const handleToggleAutoBuild = () => {
    const updated = { ...config, autoBuildOnArchUpdate: !config.autoBuildOnArchUpdate };
    setConfig(updated);
    savePipelineConfig(updated);
  };

  // Filtered runs
  const filteredRuns = runs.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  // Calculate statistics
  const totalRuns = runs.length;
  const successRuns = runs.filter(r => r.status === 'success').length;
  const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : '100';

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Top Header Card: Repository Connection & Pipeline Health */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              config.provider === 'github' 
                ? 'bg-slate-950 border-slate-700 text-white shadow-lg' 
                : 'bg-orange-950/40 border-orange-700/50 text-orange-400 shadow-lg'
            }`}>
              <FolderGit2 className="w-8 h-8" />
            </div>
            
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Unreal CI/CD Build Pipeline
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  config.isConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {config.isConnected ? 'Connected & Listening' : 'Not Connected'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                  {config.provider.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400 font-mono">
                <a 
                  href={config.repoUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {config.repoUrl.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  branch: <strong className="text-white">{config.branch}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  target: <strong className="text-white">{config.targetPlatform} ({config.buildConfiguration})</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Success Rate</span>
                <span className="text-sm font-bold text-emerald-400">{successRate}%</span>
              </div>
              <div className="w-px h-7 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Runs</span>
                <span className="text-sm font-bold text-white">{totalRuns}</span>
              </div>
            </div>

            <button
              onClick={() => setIsTriggerModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Trigger Build
            </button>

            <button
              onClick={handleSimulateArchUpdate}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              title="Simulates modifying an architecture asset to test auto-build triggering"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Simulate Arch Change
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Configure Repository & Webhooks"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="View & Export CI/CD Workflow YAML"
            >
              <FileCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auto-Trigger Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAutoBuild}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.autoBuildOnArchUpdate ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.autoBuildOnArchUpdate ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-slate-300 font-medium">
              Auto-trigger build whenever Blueprint, Verse, or Roadmap architecture updates
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
              Active Hook
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            {config.lastTriggeredAt && (
              <span>Last trigger: {new Date(config.lastTriggeredAt).toLocaleTimeString()}</span>
            )}
            <button
              onClick={handlePingWebhook}
              disabled={isPingingWebhook}
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Radio className={`w-3 h-3 ${isPingingWebhook ? 'animate-pulse text-amber-400' : ''}`} />
              {isPingingWebhook ? 'Pinging Webhook...' : 'Ping Webhook Health'}
            </button>
            {pingSuccess && <span className="text-emerald-400 font-bold">● OK</span>}
          </div>
        </div>
      </div>

      {/* Main Grid: Active/Selected Run Details (Left) + Pipeline History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Column: Active Run Inspector & Stage Pipeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {currentRun && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-5">
              {/* Run Summary Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-black text-white font-mono">
                      Build #{currentRun.runNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase flex items-center gap-1.5 border ${
                      currentRun.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : currentRun.status === 'running'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {currentRun.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {currentRun.status === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {currentRun.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                      {currentRun.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {currentRun.ueVersion}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-200 leading-snug">
                    {currentRun.commitMessage}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <GitCommit className="w-3.5 h-3.5 text-blue-400" />
                      {currentRun.commitHash}
                    </span>
                    <span>•</span>
                    <span className="text-purple-300">{currentRun.branch}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-semibold">{currentRun.triggerDetail}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Duration</div>
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {currentRun.completedAt
                      ? `${Math.round((currentRun.completedAt - currentRun.startedAt) / 1000)}s`
                      : 'Running...'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {new Date(currentRun.startedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Visual Pipeline Stages */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Pipeline Stages Execution
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {currentRun.stages.map((stage, idx) => {
                    const isSelected = selectedStageId === stage.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStageId(isSelected ? null : stage.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          stage.status === 'success'
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                            : stage.status === 'running'
                            ? 'bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-600/10 animate-pulse'
                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            0{idx + 1}
                          </span>
                          {stage.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {stage.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                          {stage.status === 'queued' && <Clock className="w-3.5 h-3.5 text-slate-600" />}
                          {stage.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1 mb-0.5">
                            {stage.name.split(' ')[0]}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {stage.durationSec ? `${stage.durationSec}s` : stage.status}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Stage Console Logs Viewer */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col h-64 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Live Unreal Build Console</span>
                    {selectedStageId && (
                      <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-700/50 rounded text-[10px]">
                        Filtered: {currentRun.stages.find(s => s.id === selectedStageId)?.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedStageId && (
                      <button
                        onClick={() => setSelectedStageId(null)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        Show All
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const allLogs = currentRun.stages.flatMap(s => s.logs).join('\n');
                        handleCopy(allLogs, 'logs');
                      }}
                      className="p-1 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copy Console Logs"
                    >
                      {copiedText === 'logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div 
                  ref={terminalRef} 
                  className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 pr-2 custom-scrollbar text-slate-300"
                >
                  {(selectedStageId 
                    ? currentRun.stages.filter(s => s.id === selectedStageId) 
                    : currentRun.stages
                  ).flatMap(s => s.logs).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-600 italic">
                      Waiting for stage execution stream...
                    </div>
                  ) : (
                    (selectedStageId 
                      ? currentRun.stages.filter(s => s.id === selectedStageId) 
                      : currentRun.stages
                    ).flatMap(s => s.logs).map((log, i) => (
                      <div key={i} className="leading-relaxed font-mono">
                        {log.includes('PASSED') || log.includes('OK') || log.includes('Success') || log.includes('success') ? (
                          <span className="text-emerald-400 font-semibold">{log}</span>
                        ) : log.includes('Verse') || log.includes('transactional') ? (
                          <span className="text-cyan-300">{log}</span>
                        ) : log.includes('Warning') ? (
                          <span className="text-amber-400">{log}</span>
                        ) : log.includes('Error') || log.includes('Failed') ? (
                          <span className="text-red-400 font-bold">{log}</span>
                        ) : (
                          <span className="text-slate-400">{log}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Artifacts & Test Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Test Summary */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Gauntlet Spec Test Results
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-1 text-center">
                      <span className="text-lg font-black block">{currentRun.testSummary?.passed || 24}</span>
                      <span className="text-[10px] uppercase">Passed</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex-1 text-center">
                      <span className="text-lg font-black block">{currentRun.testSummary?.failed || 0}</span>
                      <span className="text-[10px] uppercase">Failed</span>
                    </div>
                  </div>
                </div>

                {/* Staged Artifacts */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    Packaged Build Artifacts
                  </div>
                  <div className="space-y-1.5 max-h-20 overflow-y-auto">
                    {(currentRun.artifacts || [
                      { name: 'Windows-Development-Client.zip', size: '248.4 MB', type: 'Archive' },
                      { name: 'GauntletTestReport.json', size: '340 KB', type: 'Report' }
                    ]).map((art, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-slate-300 font-mono truncate">{art.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">{art.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Build History Runs List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Build Pipeline History
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Showing {filteredRuns.length} of {runs.length} runs
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
              {(['ALL', 'success', 'running'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    filterStatus === st ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredRuns.map(run => {
              const isSelected = run.id === selectedRunId;
              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-900/20'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white font-mono">
                        #{run.runNumber}
                      </span>
                      <span className={`px-2 py-0.2 text-[9px] font-mono font-bold rounded uppercase border ${
                        run.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : run.status === 'running'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {run.status}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                    {run.commitMessage}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">{run.commitHash}</span>
                      <span>•</span>
                      <span className="text-purple-300">{run.branch}</span>
                    </div>
                    <span className="text-cyan-400 truncate max-w-[140px]">{run.triggerDetail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Connect Repository & Webhook Settings */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Repository CI/CD Configuration</h3>
                  <p className="text-xs text-slate-400">Connect GitHub or GitLab for automated build triggers</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Provider Radio */}
              <div>
                <label className="text-slate-400 block mb-1.5 uppercase font-bold">Git Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfig({ ...config, provider: 'github' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      config.provider === 'github'
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <FolderGit2 className="w-4 h-4 text-white" />
                    <span>GitHub Actions</span>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, provider: 'gitlab' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      config.provider === 'gitlab'
                        ? 'bg-orange-600/20 border-orange-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <GitBranch className="w-4 h-4 text-orange-400" />
                    <span>GitLab CI/CD</span>
                  </button>
                </div>
              </div>

              {/* Repo URL */}
              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Repository Clone URL</label>
                <input
                  type="text"
                  value={config.repoUrl}
                  onChange={(e) => setConfig({ ...config, repoUrl: e.target.value })}
                  placeholder="https://github.com/my-studio/unreal-game-project"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Branch & Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase font-bold">Production Branch</label>
                  <input
                    type="text"
                    value={config.branch}
                    onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 uppercase font-bold">Target Platform</label>
                  <select
                    value={config.targetPlatform}
                    onChange={(e: any) => setConfig({ ...config, targetPlatform: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="Windows">Windows (Win64)</option>
                    <option value="Linux">Linux (Server / Client)</option>
                    <option value="Android">Android (Quest / Mobile)</option>
                    <option value="PS5">PlayStation 5</option>
                  </select>
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Webhook Listener URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://api.ue5architect.dev/v1/webhooks/${config.provider}?project=${plan?.id || 'ue-studio'}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 outline-none text-[11px]"
                  />
                  <button
                    onClick={() => handleCopy(`https://api.ue5architect.dev/v1/webhooks/${config.provider}?project=${plan?.id || 'ue-studio'}`, 'webhook')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    {copiedText === 'webhook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  savePipelineConfig(config);
                  setIsConfigModalOpen(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View CI/CD Workflow YAML */}
      {isWorkflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {config.provider === 'github' ? '.github/workflows/unreal-engine.yml' : '.gitlab-ci.yml'}
                  </h3>
                  <p className="text-xs text-slate-400">Production-ready CI/CD configuration tailored for your project</p>
                </div>
              </div>
              <button
                onClick={() => setIsWorkflowModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-300 h-80 overflow-y-auto custom-scrollbar leading-relaxed">
                {config.provider === 'github' 
                  ? generateGitHubWorkflowYml(config, plan?.title || 'UEGame') 
                  : generateGitLabCiYml(config, plan?.title || 'UEGame')}
              </pre>

              <button
                onClick={() => {
                  const yml = config.provider === 'github' 
                    ? generateGitHubWorkflowYml(config, plan?.title || 'UEGame') 
                    : generateGitLabCiYml(config, plan?.title || 'UEGame');
                  handleCopy(yml, 'workflow');
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                {copiedText === 'workflow' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy YAML</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Includes Verse validation, Blueprint compilation gate, and Gauntlet spec tests.</span>
              <button
                onClick={() => {
                  const yml = config.provider === 'github' 
                    ? generateGitHubWorkflowYml(config, plan?.title || 'UEGame') 
                    : generateGitLabCiYml(config, plan?.title || 'UEGame');
                  const blob = new Blob([yml], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = config.provider === 'github' ? 'unreal-engine.yml' : '.gitlab-ci.yml';
                  link.click();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Trigger Dispatch */}
      {isTriggerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Manual Build Dispatch</h3>
                  <p className="text-xs text-slate-400">Launch an on-demand Unreal Engine build pipeline run</p>
                </div>
              </div>
              <button
                onClick={() => setIsTriggerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Branch</label>
                <input
                  type="text"
                  value={manualBranch}
                  onChange={(e) => setManualBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Build Configuration</label>
                <select
                  value={manualConfig}
                  onChange={(e: any) => setManualConfig(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="Development">Development (Symbols & Profiling)</option>
                  <option value="Shipping">Shipping (Stripped & Optimized)</option>
                  <option value="Test">Test (Gauntlet Automation Suite)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Dispatch Message / Reason</label>
                <input
                  type="text"
                  value={manualCommitMsg}
                  onChange={(e) => setManualCommitMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsTriggerModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerBuild}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Dispatch Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
