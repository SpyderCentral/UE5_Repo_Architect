import React, { useState } from 'react';
import { 
  FileText, 
  Bot, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  AlertTriangle, 
  ChevronRight, 
  FileUp, 
  RefreshCw, 
  ExternalLink,
  BookOpen,
  MapPin,
  Sparkles,
  Award,
  Clock,
  HardDrive
} from 'lucide-react';
import { GddDocumentRecord, GddDeconstructionReport, GamePlan, SavedProject } from '../../types';
import { GddUploadSection } from './GddUploadSection';

interface GddDossierViewProps {
  gddRecord?: GddDocumentRecord;
  plan?: GamePlan | null;
  onNavigateToBlueprint?: (assetName: string) => void;
  onProjectUpdated?: (project: SavedProject) => void;
}

export const GddDossierView: React.FC<GddDossierViewProps> = ({
  gddRecord,
  plan,
  onNavigateToBlueprint,
  onProjectUpdated
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const deconstruction = gddRecord?.deconstruction;

  if (!gddRecord || !deconstruction) {
    return (
      <div className="h-full overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center">
        <div className="max-w-xl mx-auto space-y-6 bg-slate-950/60 border border-slate-800 p-8 sm:p-12 rounded-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-cyan-400" />
          </div>

          <h3 className="text-2xl font-bold text-white">No Game Design Document Attached</h3>
          <p className="text-sm text-slate-300 font-light leading-relaxed">
            This project was initialized via manual configuration or parameter blueprint. Attach your Game Design Document (PDF, DOCX, Markdown) to let autonomous AI deconstruct your mechanics and audit system compliance.
          </p>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
          >
            <FileUp className="w-4 h-4" />
            Upload GDD Document
          </button>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 relative">
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>
              <GddUploadSection
                onProjectGenerated={(p) => {
                  setShowUploadModal(false);
                  if (onProjectUpdated) onProjectUpdated(p);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const score = deconstruction.complianceScore || 92;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 scroll-smooth custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Executive Header Banner */}
        <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  Agentic GDD Ingestion Dossier
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {gddRecord.fileName}
                </span>
                <span className="text-xs text-slate-400">
                  {gddRecord.wordCount} words • ~{gddRecord.estimatedPages} pages
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {deconstruction.gameTitle}
              </h2>

              <p className="text-sm sm:text-base text-slate-300 font-light max-w-3xl leading-relaxed">
                {deconstruction.logline}
              </p>
            </div>

            {/* Compliance Badge & Re-upload Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
              <div className="flex items-center gap-3 bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400">Specification Viability</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {score}<span className="text-sm text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 text-xs font-bold transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Re-Ingest GDD
              </button>
            </div>
          </div>
        </div>

        {/* Engine & Architectural Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Engine Target</span>
            <div className="text-sm font-bold text-white mt-1">UE {deconstruction.recommendedUEVersion}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Base Template</span>
            <div className="text-sm font-bold text-cyan-300 mt-1">{deconstruction.recommendedTemplate}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Perspective</span>
            <div className="text-sm font-bold text-white mt-1">{deconstruction.cameraPerspective}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Network Model</span>
            <div className="text-sm font-bold text-indigo-300 mt-1">{deconstruction.multiplayerModel}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Art Style</span>
            <div className="text-sm font-bold text-emerald-300 mt-1 truncate">{deconstruction.artStyle}</div>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Global Lighting</span>
            <div className="text-sm font-bold text-amber-300 mt-1 truncate">{deconstruction.lightingMethod}</div>
          </div>
        </div>

        {/* Two Column Layout: Core Pillars & Mechanics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Core Gameplay Loops & Pillars */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-white/5">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3>Core Gameplay Loops & Pillars</h3>
            </div>

            <div className="space-y-2.5">
              {deconstruction.keyGameplayLoops.map((loop, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-white/5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-slate-200 leading-relaxed font-light">{loop}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Target Audience</span>
              <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                {deconstruction.targetAudience}
              </p>
            </div>
          </div>

          {/* Right: Core Mechanics & Technical Requirements */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-white/5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3>Deconstructed Mechanics & Plugins</h3>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Primary Mechanics</span>
              <div className="flex flex-wrap gap-1.5">
                {deconstruction.coreMechanics.map((mech, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                    {mech}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Recommended Plugins</span>
              <div className="flex flex-wrap gap-1.5">
                {deconstruction.recommendedPlugins.map((plugin, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                    {plugin}
                  </span>
                ))}
              </div>
            </div>

            {deconstruction.technicalRequirements.length > 0 && (
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Technical Constraints</span>
                <div className="space-y-1.5">
                  {deconstruction.technicalRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Suggested Blueprint Class Hierarchy */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3>Primary Blueprint Class Hierarchy Synthesized from GDD</h3>
            </div>
            <span className="text-xs text-slate-400">
              {deconstruction.suggestedBlueprints.length} Core Subsystem Classes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deconstruction.suggestedBlueprints.map((bp, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-slate-950/70 border border-white/5 hover:border-blue-400/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {bp.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {bp.parentClass}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-3 font-light leading-relaxed">
                  {bp.role}
                </p>

                <div className="space-y-1 mb-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Key Functions:</span>
                  <div className="flex flex-wrap gap-1">
                    {bp.keyFunctions.map((fn, fIdx) => (
                      <span key={fIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono border border-white/5">
                        {fn}
                      </span>
                    ))}
                  </div>
                </div>

                {onNavigateToBlueprint && (
                  <button
                    onClick={() => onNavigateToBlueprint(bp.name)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-medium transition-colors"
                  >
                    <span>Open in Architect</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Risk Audit & World Biomes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h3>World Biomes & Atmosphere</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {deconstruction.worldBiomes.map((biome, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 text-slate-200 text-xs">
                  {biome}
                </span>
              ))}
            </div>
            {deconstruction.narrativeOverview && (
              <p className="text-xs text-slate-300 font-light leading-relaxed pt-2">
                {deconstruction.narrativeOverview}
              </p>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3>Production Risk Factors Identified</h3>
            </div>
            <div className="space-y-2">
              {deconstruction.riskFactors.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Raw Ingested Text Inspector */}
        <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden text-xs">
          <button
            onClick={() => setShowRawText(!showRawText)}
            className="w-full flex items-center justify-between px-5 py-3 text-slate-400 hover:text-white transition-colors"
          >
            <span className="font-mono">Original GDD Text Source ({gddRecord.wordCount} words)</span>
            <span>{showRawText ? 'Hide' : 'Inspect'}</span>
          </button>
          {showRawText && gddRecord.rawTextPreview && (
            <div className="p-5 border-t border-white/5 max-h-72 overflow-y-auto font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
              {gddRecord.rawTextPreview}
            </div>
          )}
        </div>

      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              ✕
            </button>
            <GddUploadSection
              onProjectGenerated={(p) => {
                setShowUploadModal(false);
                if (onProjectUpdated) onProjectUpdated(p);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
