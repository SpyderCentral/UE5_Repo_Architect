
import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, Terminal, PlayCircle, Zap, Wifi, WifiOff, Loader2, Info, 
  Download, FolderOpen, HardDrive, GitBranch, Github, UploadCloud, AlertCircle, 
  ExternalLink, Eye, EyeOff, FileText, CheckCircle2 
} from 'lucide-react';
import { useBridge } from '../hooks/useBridge';
import { BridgeStatus } from '../types';
import { getProjectById } from '../services/storage';
import { 
  pushFilesToGitHub, 
  verifyGitHubRepoConvenient, 
  parseRepoString, 
  StagedFile, 
  GitHubPushResult 
} from '../services/githubExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  usageGuide: string;
  isLoading: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, script, usageGuide, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'bridge' | 'disk' | 'github'>('script');
  const [bridgeUrl, setBridgeUrl] = useState('ws://localhost:8866');
  const [pushing, setPushing] = useState(false);
  const { status, connect, pushToEditor, lastPushResult } = useBridge();

  // GitHub Export State
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('ue_github_repo') || 'SpyderCentral/UE5_Repo_Architect');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('ue_github_pat') || '');
  const [githubBranch, setGithubBranch] = useState(() => localStorage.getItem('ue_github_branch') || 'main');
  const [githubCommitMsg, setGithubCommitMsg] = useState('feat(ue5): export automation scaffold and architecture specifications');
  const [showToken, setShowToken] = useState(false);
  const [isVerifyingGitHub, setIsVerifyingGitHub] = useState(false);
  const [isPushingGitHub, setIsPushingGitHub] = useState(false);
  const [githubVerifyStatus, setGithubVerifyStatus] = useState<{ valid: boolean; message: string; defaultBranch?: string } | null>(null);
  const [githubPushResult, setGithubPushResult] = useState<GitHubPushResult | null>(null);
  const [stagedFiles, setStagedFiles] = useState<Record<string, boolean>>({
    scaffoldScript: true,
    projectJson: true,
    scaffoldGuide: true,
    gitignore: true
  });

  if (!isOpen) return null;

  const performCopy = (text: string) => {
    try {
        window.focus();
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error("Fallback copy failed", err);
        return false;
    }
  };

  const handleCopy = async () => {
    try {
        window.focus();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            throw new Error("Clipboard API not available");
        }
    } catch (e) {
        console.warn("Clipboard API failed, using fallback", e);
        if (performCopy(script)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }
  };

  const handlePush = async () => {
    if (status !== BridgeStatus.Connected) return;
    setPushing(true);
    await pushToEditor(script);
    setPushing(false);
  };

  const handleDownloadFullProject = () => {
    const currentProjectId = localStorage.getItem('last_active_project_id');
    if (!currentProjectId) return;
    
    const project = getProjectById(currentProjectId);
    if (!project) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_')}_FullPackage.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // GitHub actions
  const handleVerifyGitHub = async () => {
    if (!githubRepo.trim() || !githubToken.trim()) {
      setGithubVerifyStatus({ valid: false, message: 'Please enter both repository name and Personal Access Token.' });
      return;
    }
    setIsVerifyingGitHub(true);
    setGithubVerifyStatus(null);
    try {
      const result = await verifyGitHubRepoConvenient(githubRepo.trim(), githubToken.trim());
      setGithubVerifyStatus(result);
      if (result.valid) {
        localStorage.setItem('ue_github_repo', githubRepo.trim());
        localStorage.setItem('ue_github_pat', githubToken.trim());
        if (result.defaultBranch && !githubBranch) {
          setGithubBranch(result.defaultBranch);
          localStorage.setItem('ue_github_branch', result.defaultBranch);
        }
      }
    } catch (err: any) {
      setGithubVerifyStatus({ valid: false, message: err?.message || 'Verification failed.' });
    } finally {
      setIsVerifyingGitHub(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!githubRepo.trim() || !githubToken.trim()) {
      setGithubPushResult({ success: false, error: 'GitHub repository and Personal Access Token are required.' });
      return;
    }

    const parsedRepo = parseRepoString(githubRepo.trim());
    if (!parsedRepo) {
      setGithubPushResult({ success: false, error: 'Invalid repository format. Please use "owner/repo" or full GitHub URL.' });
      return;
    }

    setIsPushingGitHub(true);
    setGithubPushResult(null);

    const filesToPush: StagedFile[] = [];

    // 1. Automation script
    if (stagedFiles.scaffoldScript && script) {
      filesToPush.push({
        path: 'Automation/UE_Scaffold.py',
        content: script,
        description: 'Unreal Engine 5 Python automation scaffolding script',
        sizeBytes: new Blob([script]).size,
        selected: true
      });
    }

    // 2. Project JSON
    if (stagedFiles.projectJson) {
      const currentProjectId = localStorage.getItem('last_active_project_id');
      const projectData = currentProjectId ? getProjectById(currentProjectId) : null;
      const jsonContent = projectData ? JSON.stringify(projectData, null, 2) : '{\n  "status": "active"\n}';
      filesToPush.push({
        path: 'Architecture/ProjectPackage.json',
        content: jsonContent,
        description: 'Full architecture specification & asset schemas',
        sizeBytes: new Blob([jsonContent]).size,
        selected: true
      });
    }

    // 3. Scaffolding Guide
    if (stagedFiles.scaffoldGuide && usageGuide) {
      filesToPush.push({
        path: 'Docs/UE5_Scaffolding_Guide.md',
        content: usageGuide,
        description: 'Step-by-step scaffolding execution guide',
        sizeBytes: new Blob([usageGuide]).size,
        selected: true
      });
    }

    // 4. UE5 .gitignore
    if (stagedFiles.gitignore) {
      const gitignoreContent = `# Unreal Engine 5 Recommended .gitignore
Binaries/*
DerivedDataCache/*
Intermediate/*
Saved/*
.vscode/*
.idea/*
*.VC.db
*.opensdf
*.opendb
*.sdf
*.sln
*.suo
*.xcodeproj
*.xcworkspace
`;
      filesToPush.push({
        path: '.gitignore',
        content: gitignoreContent,
        description: 'Standard Unreal Engine 5 repository ignore rules',
        sizeBytes: new Blob([gitignoreContent]).size,
        selected: true
      });
    }

    if (filesToPush.length === 0) {
      setIsPushingGitHub(false);
      setGithubPushResult({ success: false, error: 'Please select at least one file to push.' });
      return;
    }

    try {
      localStorage.setItem('ue_github_repo', githubRepo.trim());
      localStorage.setItem('ue_github_pat', githubToken.trim());
      localStorage.setItem('ue_github_branch', githubBranch.trim() || 'main');

      const result = await pushFilesToGitHub(
        {
          owner: parsedRepo.owner,
          repo: parsedRepo.repo,
          branch: githubBranch.trim() || 'main',
          token: githubToken.trim(),
          commitMessage: githubCommitMsg.trim() || 'feat(ue5): update scaffolding automation and architecture'
        },
        filesToPush
      );

      setGithubPushResult(result);
    } catch (err: any) {
      setGithubPushResult({
        success: false,
        error: err?.message || 'An unexpected error occurred while pushing files to GitHub.'
      });
    } finally {
      setIsPushingGitHub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Terminal className="w-5 h-5 text-blue-400" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white">Project Output</h2>
                <p className="text-xs text-slate-400">Save & Deploy Systems</p>
             </div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 mx-8">
              <button 
                onClick={() => setActiveTab('bridge')}
                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'bridge' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  Live Link
              </button>
              <button 
                onClick={() => setActiveTab('github')}
                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'github' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <Github className="w-3.5 h-3.5 text-slate-300" />
                  <span>GitHub Push</span>
              </button>
              <button 
                onClick={() => setActiveTab('disk')}
                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'disk' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  Save to Disk
              </button>
              <button 
                onClick={() => setActiveTab('script')}
                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'script' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  Full Scaffolding
              </button>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            <div className="w-full md:w-64 bg-slate-900/30 p-5 border-b md:border-b-0 md:border-r border-slate-800 flex-shrink-0 overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> Integration Hub
                </h3>
                
                <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 transition-colors ${
                    status === BridgeStatus.Connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    status === BridgeStatus.Connecting ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                    'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                    {status === BridgeStatus.Connected ? <Wifi className="w-5 h-5" /> : 
                     status === BridgeStatus.Connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                     <WifiOff className="w-5 h-5" />}
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest">Local Engine</div>
                        <div className="text-xs font-bold">{status}</div>
                    </div>
                </div>

                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                    <p className="text-xs text-slate-500 italic">
                        {activeTab === 'bridge' ? "Directly stream architecture data to your active UE5 instance." :
                         activeTab === 'github' ? "Push automation scripts, architecture specs, and documentation directly to your GitHub repository." :
                         activeTab === 'disk' ? "Sync the entire project structure to a physical folder on your system." :
                         "Generates a full Scaffolding script that creates folders and instantiates all architected Blueprints, Materials, and Input Contexts."}
                    </p>
                </div>
            </div>

            <div className="flex-1 bg-[#1e1e1e] relative overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-400 space-y-4">
                        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <span className="font-mono text-sm tracking-widest animate-pulse">SYNTHESIZING SCAFFOLDING...</span>
                    </div>
                ) : activeTab === 'github' ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-950/60 custom-scrollbar">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                                    <Github className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Push to GitHub Repository</h3>
                                    <p className="text-[11px] text-slate-400">Sync automation scripts & project architecture to version control</p>
                                </div>
                            </div>
                            {githubVerifyStatus && (
                                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                                    githubVerifyStatus.valid 
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                    {githubVerifyStatus.valid ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {githubVerifyStatus.message}
                                </span>
                            )}
                        </div>

                        {/* Credentials Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Repository <span className="text-rose-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="owner/repo (e.g. EpicGames/MyProject)"
                                        value={githubRepo}
                                        onChange={(e) => setGithubRepo(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={handleVerifyGitHub}
                                        disabled={isVerifyingGitHub || !githubRepo || !githubToken}
                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
                                        title="Verify repository access with provided token"
                                    >
                                        {isVerifyingGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                                        Verify
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                                    <span>Personal Access Token <span className="text-rose-400">*</span></span>
                                    <span className="text-[10px] text-slate-500 lowercase">needs repo scope</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showToken ? 'text' : 'password'}
                                        placeholder="ghp_xxxxxxxxxxxx or github_pat_..."
                                        value={githubToken}
                                        onChange={(e) => setGithubToken(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Target Branch
                                </label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg">
                                    <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="main"
                                        value={githubBranch}
                                        onChange={(e) => setGithubBranch(e.target.value)}
                                        className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Commit Message
                                </label>
                                <input
                                    type="text"
                                    placeholder="Commit message..."
                                    value={githubCommitMsg}
                                    onChange={(e) => setGithubCommitMsg(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Staged Files Selector */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span>Files to Commit & Push</span>
                                <span className="text-[10px] text-slate-500 font-normal">Select artifacts to sync</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stagedFiles.scaffoldScript}
                                        onChange={(e) => setStagedFiles({ ...stagedFiles, scaffoldScript: e.target.checked })}
                                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                                    />
                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                    <div className="flex-1 truncate">
                                        <div className="font-mono text-[11px] text-slate-200 truncate">Automation/UE_Scaffold.py</div>
                                        <div className="text-[10px] text-slate-500">Python Scaffolding Script</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stagedFiles.projectJson}
                                        onChange={(e) => setStagedFiles({ ...stagedFiles, projectJson: e.target.checked })}
                                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                                    />
                                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                    <div className="flex-1 truncate">
                                        <div className="font-mono text-[11px] text-slate-200 truncate">Architecture/ProjectPackage.json</div>
                                        <div className="text-[10px] text-slate-500">Full Spec & Asset Schemas</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stagedFiles.scaffoldGuide}
                                        onChange={(e) => setStagedFiles({ ...stagedFiles, scaffoldGuide: e.target.checked })}
                                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                                    />
                                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                                    <div className="flex-1 truncate">
                                        <div className="font-mono text-[11px] text-slate-200 truncate">Docs/UE5_Scaffolding_Guide.md</div>
                                        <div className="text-[10px] text-slate-500">Execution Guide</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stagedFiles.gitignore}
                                        onChange={(e) => setStagedFiles({ ...stagedFiles, gitignore: e.target.checked })}
                                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                                    />
                                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                                    <div className="flex-1 truncate">
                                        <div className="font-mono text-[11px] text-slate-200 truncate">.gitignore</div>
                                        <div className="text-[10px] text-slate-500">UE5 Build Artifact Ignores</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Push Result Banner */}
                        {githubPushResult && (
                            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                                githubPushResult.success 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-xs">
                                        {githubPushResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                                        <span>{githubPushResult.success ? 'Successfully pushed to GitHub!' : 'Push Failed'}</span>
                                    </div>
                                    {githubPushResult.commitUrl && (
                                        <a
                                            href={githubPushResult.commitUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[11px] text-emerald-300 hover:underline font-mono"
                                        >
                                            <span>View Commit</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                                {githubPushResult.error && (
                                    <p className="text-xs text-rose-200/90 leading-relaxed">{githubPushResult.error}</p>
                                )}
                                {githubPushResult.committedFiles && (
                                    <div className="text-[11px] text-emerald-200/80 font-mono mt-1">
                                        Pushed {githubPushResult.committedFiles.length} files: {githubPushResult.committedFiles.join(', ')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                Token is stored in your local browser storage for convenience.
                            </p>
                            <button
                                onClick={handlePushToGitHub}
                                disabled={isPushingGitHub || !githubRepo || !githubToken}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
                            >
                                {isPushingGitHub ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                <span>{isPushingGitHub ? 'Pushing to GitHub...' : 'Push to GitHub'}</span>
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'disk' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                            <HardDrive className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-4">Direct File System Access</h3>
                        <p className="text-slate-400 text-sm max-w-sm mb-10 leading-relaxed font-light">
                            You can link a folder on your computer to automatically sync roadmaps, C++ code, and asset specifications directly to your project directory.
                        </p>
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                             <button 
                                onClick={handleDownloadFullProject}
                                className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-3 border border-white/5 transition-all shadow-xl"
                             >
                                <Download className="w-5 h-5 text-indigo-400" />
                                Download Full Bundle
                             </button>
                             <p className="text-[10px] text-slate-500 uppercase tracking-widest">Recommended for iframe/restricted environments</p>
                        </div>
                    </div>
                ) : activeTab === 'bridge' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 transition-all ${
                            status === BridgeStatus.Connected 
                            ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]' 
                            : 'bg-slate-900 border-slate-700 opacity-80'
                        }`}>
                             <Zap className={`w-10 h-10 ${status === BridgeStatus.Connected ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">UE5 Live Link Bridge</h3>
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                            {status === BridgeStatus.Connected 
                                ? "Live Link active. Scripts can be directly pushed to your running Unreal Engine 5 editor."
                                : "Connect to your local Unreal Engine 5 WebSocket listener to push blueprints and scipts directly into the editor."
                            }
                        </p>
                        
                        {status !== BridgeStatus.Connected && (
                          <div className="w-full flex items-center gap-2 mb-6">
                            <input 
                              type="text" 
                              value={bridgeUrl} 
                              onChange={(e) => setBridgeUrl(e.target.value)}
                              placeholder="ws://localhost:8866"
                              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => connect(bridgeUrl)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0"
                            >
                              <Wifi className="w-3.5 h-3.5" />
                              Connect
                            </button>
                          </div>
                        )}

                        <button 
                            onClick={handlePush}
                            disabled={status !== BridgeStatus.Connected || pushing}
                            className={`px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-3 ${
                                status === BridgeStatus.Connected && !pushing
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40 active:scale-95' 
                                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60'
                            }`}
                        >
                            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                            {pushing ? 'Deploying...' : 'Push to UE5 Editor'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-auto p-6 font-mono text-xs md:text-sm leading-6 text-slate-300 whitespace-pre">
                            {script || "# No script generated yet."}
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                             <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg ${
                                    copied 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                             >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'COPIED' : 'COPY SCRIPT'}
                             </button>
                        </div>
                        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                             <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Copy this script and run it in the <strong>Python Command Console</strong> in Unreal Engine. It will create the <code>/Game/_Game</code> folder structure and instantiate all architected Blueprint classes, Materials, and Enhanced Input assets.
                                </p>
                             </div>
                        </div>
                    </>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default ExportModal;
