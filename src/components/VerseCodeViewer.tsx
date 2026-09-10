import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Code,
  Check,
  Copy,
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wand2,
  Edit3,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';
import {
  validateVerseCode,
  buildHighlightedVerseLines,
  VerseDiagnostic,
  HighlightedLine,
  VerseToken
} from '../services/verseValidator';

interface VerseCodeViewerProps {
  initialCode: string;
  assetName: string;
  onCodeChange?: (updatedCode: string) => void;
  onResetCode?: () => void;
}

export const VerseCodeViewer: React.FC<VerseCodeViewerProps> = ({
  initialCode,
  assetName,
  onCodeChange,
  onResetCode
}) => {
  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<VerseDiagnostic | null>(null);
  const [isProblemsOpen, setIsProblemsOpen] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');
  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Sync when initialCode changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Real-time validation
  const diagnostics = useMemo(() => {
    return validateVerseCode(code);
  }, [code]);

  // Build highlighted line structures
  const highlightedLines: HighlightedLine[] = useMemo(() => {
    return buildHighlightedVerseLines(code, diagnostics);
  }, [code, diagnostics]);

  // Problem counts
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;

  const filteredDiagnostics = useMemo(() => {
    if (severityFilter === 'all') return diagnostics;
    return diagnostics.filter(d => d.severity === severityFilter);
  }, [diagnostics, severityFilter]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${assetName}.verse`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyFix = (diag: VerseDiagnostic) => {
    if (!diag.suggestedFix) return;
    const lines = code.split('\n');
    const targetLineIdx = diag.line - 1;

    if (diag.code === 'V101_MISSING_SUSPENDS') {
      // Find function header line above and append <suspends>
      for (let i = targetLineIdx; i >= 0; i--) {
        if (lines[i].includes('()') || lines[i].includes('):')) {
          lines[i] = lines[i].replace(/\)\s*:/, ')<suspends>:');
          break;
        }
      }
    } else if (diag.code === 'V102_ILLEGAL_MUTATION') {
      lines[targetLineIdx] = diag.suggestedFix.replacement;
    } else if (diag.code === 'V201_RECOMMENDED_IMPORT') {
      lines.unshift('using { /Verse.org/Simulation }');
    } else if (diag.code === 'V002_UNCLOSED_STRING') {
      lines[targetLineIdx] = diag.suggestedFix.replacement;
    }

    const newCode = lines.join('\n');
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
    setSelectedDiagnostic(null);
  };

  const handleJumpToLine = (lineNum: number) => {
    if (!codeContainerRef.current) return;
    const lineElem = codeContainerRef.current.querySelector(`[data-line="${lineNum}"]`);
    if (lineElem) {
      lineElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const renderToken = (token: VerseToken, idx: number) => {
    switch (token.type) {
      case 'keyword':
        return <span key={idx} className="text-pink-400 font-bold">{token.text}</span>;
      case 'specifier':
        return <span key={idx} className="text-purple-300 font-semibold">{token.text}</span>;
      case 'type':
        return <span key={idx} className="text-emerald-300 font-medium">{token.text}</span>;
      case 'string':
        return <span key={idx} className="text-amber-300">{token.text}</span>;
      case 'number':
        return <span key={idx} className="text-cyan-300">{token.text}</span>;
      case 'comment':
        return <span key={idx} className="text-slate-500 italic">{token.text}</span>;
      case 'operator':
        return <span key={idx} className="text-rose-300 font-bold">{token.text}</span>;
      case 'punctuation':
        return <span key={idx} className="text-slate-400">{token.text}</span>;
      case 'identifier':
        return <span key={idx} className="text-slate-200">{token.text}</span>;
      default:
        return <span key={idx} className="text-slate-300">{token.text}</span>;
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#080d1a] overflow-hidden shadow-2xl">
      
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-200">
            {assetName}.verse
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40">
            Verse 1.0 (UE6 Live AST)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Validation Status Pill */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            {errorCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{errorCount} {errorCount === 1 ? 'Error' : 'Errors'}</span>
              </span>
            ) : warningCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{warningCount} Warnings</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Syntax Valid</span>
              </span>
            )}
          </div>

          {/* Edit / View Toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isEditing 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'View Highlighted' : 'Live Edit'}</span>
          </button>

          {onResetCode && (
            <button
              onClick={onResetCode}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset to original transpiled code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="relative flex-1 min-h-[420px] max-h-[560px] overflow-hidden flex flex-col">
        {isEditing ? (
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (onCodeChange) onCodeChange(e.target.value);
            }}
            className="w-full h-full p-4 bg-[#0a0f1d] font-mono text-xs leading-relaxed text-slate-200 resize-none focus:outline-none custom-scrollbar"
            spellCheck={false}
          />
        ) : (
          <div 
            ref={codeContainerRef}
            className="p-4 overflow-auto bg-[#0a0f1d] font-mono text-xs leading-relaxed text-slate-200 custom-scrollbar selection:bg-cyan-500/30 flex-1"
          >
            {highlightedLines.map((line) => {
              const hasError = line.diagnostics.some(d => d.severity === 'error');
              const hasWarning = line.diagnostics.some(d => d.severity === 'warning');

              return (
                <div
                  key={line.lineNumber}
                  data-line={line.lineNumber}
                  className={`flex items-start group hover:bg-slate-900/60 transition-colors py-0.5 px-1 rounded ${
                    hasError ? 'bg-rose-950/20' : hasWarning ? 'bg-amber-950/10' : ''
                  }`}
                >
                  {/* Line Number & Diagnostic Gutter Marker */}
                  <div className="w-12 flex-shrink-0 text-slate-600 select-none text-right pr-3 flex items-center justify-end gap-1">
                    {hasError ? (
                      <button
                        onClick={() => setSelectedDiagnostic(line.diagnostics[0])}
                        className="text-rose-400 hover:scale-110 transition-transform cursor-pointer"
                        title={line.diagnostics[0].message}
                      >
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                      </button>
                    ) : hasWarning ? (
                      <button
                        onClick={() => setSelectedDiagnostic(line.diagnostics[0])}
                        className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        title={line.diagnostics[0].message}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      </button>
                    ) : null}
                    <span className="text-[11px]">{line.lineNumber}</span>
                  </div>

                  {/* Tokenized Content */}
                  <div className="flex-1 whitespace-pre pl-2">
                    <span className={hasError ? 'underline decoration-wavy decoration-rose-500/80' : hasWarning ? 'underline decoration-wavy decoration-amber-500/60' : ''}>
                      {line.tokens.map((token, tIdx) => renderToken(token, tIdx))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Fix / Selected Diagnostic Inspector Flyout */}
      {selectedDiagnostic && (
        <div className="bg-slate-900 border-t border-b border-rose-500/40 p-3 px-4 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Line {selectedDiagnostic.line}:{selectedDiagnostic.column}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                  {selectedDiagnostic.code}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{selectedDiagnostic.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDiagnostic.suggestedFix && (
              <button
                onClick={() => handleApplyFix(selectedDiagnostic)}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Quick Fix</span>
              </button>
            )}
            <button
              onClick={() => setSelectedDiagnostic(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Diagnostics / Real-Time Problems Panel */}
      <div className="border-t border-slate-800 bg-slate-950/90">
        <div 
          onClick={() => setIsProblemsOpen(!isProblemsOpen)}
          className="flex items-center justify-between px-4 py-2 hover:bg-slate-900/50 cursor-pointer text-xs select-none border-b border-slate-800/60"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Verse Real-Time Diagnostics
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className={`flex items-center gap-1 ${errorCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                <AlertCircle className="w-3.5 h-3.5" /> {errorCount}
              </span>
              <span className={`flex items-center gap-1 ${warningCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                <AlertTriangle className="w-3.5 h-3.5" /> {warningCount}
              </span>
              <span className={`flex items-center gap-1 ${infoCount > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                <Info className="w-3.5 h-3.5" /> {infoCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">
              {diagnostics.length === 0 ? 'All checks passing' : `${diagnostics.length} issues detected`}
            </span>
            {isProblemsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isProblemsOpen && (
          <div className="max-h-40 overflow-y-auto p-2 space-y-1 custom-scrollbar text-xs font-mono">
            {diagnostics.length === 0 ? (
              <div className="py-3 text-center text-slate-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero syntax or concurrency errors found. UE6 Verse syntax is clean.</span>
              </div>
            ) : (
              filteredDiagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => {
                    setSelectedDiagnostic(diag);
                    handleJumpToLine(diag.line);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    {diag.severity === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    ) : diag.severity === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                    <span className="text-slate-300 group-hover:text-white transition-colors">
                      {diag.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      Ln {diag.line}, Col {diag.column}
                    </span>
                    {diag.suggestedFix && (
                      <span className="text-emerald-400 text-[10px] font-bold group-hover:underline">
                        Quick Fix Available
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default VerseCodeViewer;
