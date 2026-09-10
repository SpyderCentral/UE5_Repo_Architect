import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Bot, 
  Layers, 
  Terminal, 
  Play, 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Zap, 
  RefreshCw,
  FolderArchive,
  ArrowRight,
  Sliders,
  Check
} from 'lucide-react';
import { 
  parseUploadedGddFile, 
  SAMPLE_GDD_TEMPLATES, 
  SampleGddTemplate, 
  ParsedGddFile,
  analyzeDocumentText
} from '../../services/gddParser';
import { executeAutonomousGddPipeline } from '../../services/ai/gddAgent';
import { GddAgentStageStatus, SavedProject } from '../../types';

interface GddUploadSectionProps {
  onProjectGenerated: (project: SavedProject) => void;
  onSwitchToManual?: () => void;
  isGenerating?: boolean;
}

export const GddUploadSection: React.FC<GddUploadSectionProps> = ({
  onProjectGenerated,
  onSwitchToManual,
  isGenerating = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedDoc, setParsedDoc] = useState<ParsedGddFile | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [textInputMode, setTextInputMode] = useState<'upload' | 'paste'>('upload');
  const [selectedSample, setSelectedSample] = useState<SampleGddTemplate | null>(null);
  
  // Settings
  const [autoExecute, setAutoExecute] = useState(true);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  
  // Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<GddAgentStageStatus | null>(null);
  const [stageHistory, setStageHistory] = useState<GddAgentStageStatus[]>([]);
  const [allLogs, setAllLogs] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isCancelledRef = useRef(false);

  // Auto scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allLogs, showLogs]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setPipelineError(null);
    setSelectedFile(file);
    setSelectedSample(null);

    try {
      const parsed = await parseUploadedGddFile(file);
      setParsedDoc(parsed);
      setPastedText(parsed.extractedText);

      // If auto-execute is on, immediately trigger the agentic pipeline
      if (autoExecute) {
        startAgenticPipeline(parsed);
      }
    } catch (err: any) {
      console.error("File parsing error:", err);
      setPipelineError(err.message || 'Failed to read document file.');
    }
  };

  const handleSelectSample = (sample: SampleGddTemplate) => {
    setPipelineError(null);
    setSelectedSample(sample);
    setSelectedFile(null);

    const { wordCount, estimatedPages, detectedHeadings } = analyzeDocumentText(sample.content);
    const parsed: ParsedGddFile = {
      fileName: `${sample.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_gdd.md`,
      fileSize: new Blob([sample.content]).size,
      mimeType: 'text/markdown',
      extractedText: sample.content,
      wordCount,
      estimatedPages,
      detectedHeadings
    };

    setParsedDoc(parsed);
    setPastedText(sample.content);

    if (autoExecute) {
      startAgenticPipeline(parsed);
    }
  };

  const handlePastedTextSubmit = () => {
    if (!pastedText.trim()) return;
    setPipelineError(null);
    setSelectedFile(null);

    const { wordCount, estimatedPages, detectedHeadings } = analyzeDocumentText(pastedText);
    const parsed: ParsedGddFile = {
      fileName: 'custom_game_design_document.md',
      fileSize: new Blob([pastedText]).size,
      mimeType: 'text/markdown',
      extractedText: pastedText,
      wordCount,
      estimatedPages,
      detectedHeadings
    };

    setParsedDoc(parsed);
    startAgenticPipeline(parsed);
  };

  const startAgenticPipeline = async (docToProcess?: ParsedGddFile) => {
    const targetDoc = docToProcess || parsedDoc;
    if (!targetDoc) return;

    setIsProcessing(true);
    setPipelineError(null);
    setStageHistory([]);
    setAllLogs([]);
    isCancelledRef.current = false;

    try {
      const project = await executeAutonomousGddPipeline({
        fileName: targetDoc.fileName,
        fileSize: targetDoc.fileSize,
        extractedText: pastedText || targetDoc.extractedText,
        pdfBase64: targetDoc.pdfBase64,
        wordCount: targetDoc.wordCount,
        estimatedPages: targetDoc.estimatedPages,
        detectedHeadings: targetDoc.detectedHeadings,
        shouldCancel: () => isCancelledRef.current,
        onStageUpdate: (stage) => {
          setCurrentStage(stage);
          setStageHistory(prev => {
            const idx = prev.findIndex(s => s.id === stage.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = stage;
              return updated;
            }
            return [...prev, stage];
          });

          if (stage.logs && stage.logs.length > 0) {
            setAllLogs(prev => {
              const newLogs = stage.logs.filter(l => !prev.includes(l));
              return [...prev, ...newLogs];
            });
          }
        }
      });

      // Brief delay to display complete animation before transitioning
      await new Promise(r => setTimeout(r, 700));
      onProjectGenerated(project);
    } catch (err: any) {
      console.error("GDD Pipeline failed:", err);
      setPipelineError(err.message || "Failed to process GDD document.");
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setPipelineError("Pipeline execution cancelled by user.");
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setParsedDoc(null);
    setPastedText('');
    setSelectedSample(null);
    setPipelineError(null);
    setStageHistory([]);
    setCurrentStage(null);
    setAllLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
          Autonomous GDD Ingestion Engine
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Upload Your GDD. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300">Agentic AI Does the Rest.</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-light">
          Drop any Game Design Document (.PDF, .DOCX, .MD, .TXT). Our autonomous multi-agent studio director deconstructs your game loops, maps UE5 systems, synthesizes Blueprints, and builds your complete production roadmap.
        </p>
      </div>

      {/* Main Upload Box / Execution Console */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Mode Switch Bar (Upload vs Manual Form) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setTextInputMode('upload')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                textInputMode === 'upload'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" /> File Upload
            </button>
            <button
              onClick={() => setTextInputMode('paste')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                textInputMode === 'paste'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Paste / Edit GDD Text
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
              <input
                type="checkbox"
                checked={autoExecute}
                onChange={(e) => setAutoExecute(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Auto-Launch on upload
              </span>
            </label>

            {onSwitchToManual && (
              <button
                onClick={onSwitchToManual}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1"
                title="Switch to manual configuration form"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual Sliders</span>
              </button>
            )}
          </div>
        </div>

        {/* PIPELINE RUNNING OVERLAY / PROGRESS VIEW */}
        {isProcessing && (
          <div className="space-y-6 relative z-10 py-2">
            
            {/* Active Stage Header */}
            <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold uppercase text-cyan-400 tracking-wider">
                        {currentStage?.agentName || 'Agent Orchestrator'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Stage {stageHistory.length} of 7
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {currentStage?.title || 'Initializing Autonomous AI Studio...'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 font-light">
                      {currentStage?.detail || 'Analyzing GDD structure and allocating specialized agents...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right sm:block hidden">
                    <span className="text-xs font-mono text-slate-400">Total Progress</span>
                    <div className="text-xl font-bold text-cyan-400">
                      {currentStage?.progressPercent || 15}%
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  style={{ width: `${currentStage?.progressPercent || 15}%` }}
                />
              </div>
            </div>

            {/* Stages Grid Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'ingest', name: 'Document Ingestion', desc: 'Syntax & Tokens' },
                { id: 'decompose', name: 'Deconstruction', desc: 'Core Loops & Systems' },
                { id: 'synthesize_plan', name: 'Roadmap Synthesis', desc: 'Milestones & Tasks' },
                { id: 'generate_blueprints', name: 'Blueprint Engineering', desc: 'Graphs & Pins' },
                { id: 'weave_world_narrative', name: 'World & Narrative', desc: 'POIs & Quests' },
                { id: 'audit_overseer', name: 'Overseer Audit', desc: 'Risk & Technical Debt' },
                { id: 'complete', name: 'Full Workspace', desc: 'Ready to Launch' }
              ].map((s, idx) => {
                const stageData = stageHistory.find(st => st.id === s.id);
                const isCurrent = currentStage?.id === s.id;
                const isDone = stageData?.status === 'done';

                return (
                  <div 
                    key={s.id}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isDone 
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                        : isCurrent
                        ? 'bg-blue-950/40 border-cyan-400/50 text-cyan-300 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/40 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase">Agent {idx + 1}</span>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                    <div className="text-xs font-bold truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{stageData?.resultSummary || s.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Agent Terminal Logs */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-inner">
              <div 
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-xs">Autonomous Agent Stream Console</span>
                  <span className="text-[10px] text-slate-500">({allLogs.length} events)</span>
                </div>
                {showLogs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {showLogs && (
                <div className="p-4 max-h-52 overflow-y-auto space-y-1.5 text-slate-300 scrollbar-thin">
                  {allLogs.length === 0 ? (
                    <div className="text-slate-500 italic">Awaiting neural stream events...</div>
                  ) : (
                    allLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-cyan-500 select-none">&gt;</span>
                        <span className={i === allLogs.length - 1 ? 'text-white font-medium' : 'text-slate-300'}>
                          {log}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>

          </div>
        )}

        {/* FILE UPLOAD & PREVIEW (WHEN NOT PROCESSING) */}
        {!isProcessing && (
          <>
            {textInputMode === 'upload' ? (
              <div className="space-y-6">
                
                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 relative group ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                      : parsedDoc
                      ? 'border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400'
                      : 'border-slate-700 hover:border-blue-400/60 bg-slate-950/40 hover:bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.json,.rtf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {parsedDoc ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <FileUp className="w-8 h-8 text-cyan-400" />
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {parsedDoc ? parsedDoc.fileName : 'Drag and Drop Your Game Design Document'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-4 font-light">
                    {parsedDoc ? (
                      <span className="text-emerald-300 font-medium">
                        Document ready! {parsedDoc.wordCount} words detected across ~{parsedDoc.estimatedPages} pages.
                      </span>
                    ) : (
                      'Supports .PDF, .DOCX, .MD, .TXT, and .JSON game design specifications.'
                    )}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">.PDF</span>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">.DOCX</span>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">.MD</span>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">.TXT</span>
                  </div>

                  <div className="mt-4 inline-block">
                    <span className="text-xs text-blue-400 hover:text-blue-300 underline font-medium">
                      or click to browse files
                    </span>
                  </div>
                </div>

                {/* Selected Document Details Card */}
                {parsedDoc && (
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{parsedDoc.fileName}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                            {Math.round(parsedDoc.fileSize / 1024)} KB
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                          <span>{parsedDoc.wordCount} Words</span>
                          <span>•</span>
                          <span>~{parsedDoc.estimatedPages} Pages</span>
                          <span>•</span>
                          <span>{parsedDoc.detectedHeadings.length} Headings Found</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                      <button
                        onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/5 transition-all"
                      >
                        {showExtractedPreview ? 'Hide Text' : 'Inspect Text'}
                      </button>
                      
                      <button
                        onClick={resetSelection}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 transition-all"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => startAgenticPipeline()}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Launch Agentic Pipeline
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // DIRECT TEXT INPUT / PASTE
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Paste raw GDD markdown, design brief, or outline below:</span>
                  <span>{pastedText.split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="# GAME DESIGN DOCUMENT: TITLE&#10;&#10;1. Core Vision & Pillars&#10;- Core Gameplay Loop...&#10;&#10;2. Mechanics & Systems&#10;- Combat, Locomotion, Progression...&#10;&#10;3. Technical Engine Specs&#10;- Unreal Engine 5, GAS, Lumen, Multiplayer Model..."
                  rows={12}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all leading-relaxed custom-scrollbar"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Agentic AI will automatically infer genre, UE5 version, template, subsystems, and Blueprints.
                  </span>
                  <button
                    onClick={handlePastedTextSubmit}
                    disabled={pastedText.trim().length < 30}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Launch Agentic Pipeline
                  </button>
                </div>
              </div>
            )}

            {/* EXTRACTED TEXT ACCORDION VIEW */}
            {showExtractedPreview && parsedDoc && (
              <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto space-y-2 animate-in fade-in custom-scrollbar">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                  <span className="font-semibold text-white">Extracted Document Preview</span>
                  <span>{parsedDoc.wordCount} words</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
                  {parsedDoc.extractedText}
                </pre>
              </div>
            )}

            {/* ERROR DISPLAY */}
            {pipelineError && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1 font-medium">{pipelineError}</div>
                <button
                  onClick={() => setPipelineError(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* SAMPLE GDD TEMPLATES CAROUSEL */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Don't have a GDD file handy? Test with a Production Sample GDD:</span>
                </div>
                <span className="text-[10px] text-slate-500">1-click automated ingestion</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SAMPLE_GDD_TEMPLATES.map((sample) => {
                  const isSelected = selectedSample?.id === sample.id;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 group relative ${
                        isSelected
                          ? 'bg-blue-600/20 border-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-cyan-400 truncate">{sample.targetPlatform}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {sample.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-light leading-relaxed">
                        {sample.summary}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {sample.tags.slice(0, 2).map((tag, tIdx) => (
                          <span key={tIdx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </>
        )}

      </div>

    </div>
  );
};
