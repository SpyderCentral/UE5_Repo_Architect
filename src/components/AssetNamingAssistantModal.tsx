import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Download,
  Search,
  Filter,
  Sparkles,
  Terminal,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import {
  INDUSTRY_NAMING_RULES,
  auditProjectNaming,
  AssetNamingAuditItem,
  ProjectNamingReport
} from '../services/namingConventionRules';

interface AssetNamingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectAssets: { name: string; type: string }[];
}

export const AssetNamingAssistantModal: React.FC<AssetNamingAssistantModalProps> = ({
  isOpen,
  onClose,
  projectAssets
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'rules' | 'script'>('audit');
  const [filterStatus, setFilterStatus] = useState<'all' | 'violation' | 'warning' | 'compliant'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Compute naming report
  const report: ProjectNamingReport = useMemo(() => {
    return auditProjectNaming(projectAssets);
  }, [projectAssets]);

  // Filter items
  const filteredItems = useMemo(() => {
    return report.items.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.originalName.toLowerCase().includes(q);
        const matchesSuggested = item.suggestedName.toLowerCase().includes(q);
        const matchesType = item.assetType.toLowerCase().includes(q);
        if (!matchesName && !matchesSuggested && !matchesType) return false;
      }
      return true;
    });
  }, [report.items, filterStatus, searchQuery]);

  if (!isOpen) return null;

  const handleCopySingle = (name: string, id: string) => {
    navigator.clipboard.writeText(name);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(report.pythonRenameScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([report.pythonRenameScript], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UE5_Standardize_Asset_Names.py`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Asset Naming Convention Assistant</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Epic Games Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit, validate, and standardize file names with industry-standard prefixes (BP_, M_, T_, IA_)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'audit' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Project Audit ({report.violationCount} Violations)
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'rules' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Prefix Rulebook
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'script' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python Rename Script
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* TAB 1: AUDIT & STANDARDIZATION */}
          {activeTab === 'audit' && (
            <>
              {/* Score Bar & KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Compliance Score</div>
                    <div className={`text-2xl font-black mt-1 ${
                      report.compliancePercentage >= 90 ? 'text-emerald-400' :
                      report.compliancePercentage >= 70 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {report.compliancePercentage}%
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Audited</div>
                    <div className="text-2xl font-black text-white mt-1">{report.totalAssets}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 text-blue-400 font-mono text-xs font-bold">
                    Assets
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Prefix Violations</div>
                    <div className="text-2xl font-black text-rose-400 mt-1">{report.violationCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Conforming</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{report.compliantCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search asset name or type..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      filterStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({report.totalAssets})
                  </button>
                  <button
                    onClick={() => setFilterStatus('violation')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                      filterStatus === 'violation' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-rose-950/40'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" /> Violations ({report.violationCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('compliant')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                      filterStatus === 'compliant' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-950/40'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Standardized ({report.compliantCount})
                  </button>
                </div>

                {report.violationCount > 0 && (
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied Python Script' : 'Copy Rename Script'}</span>
                  </button>
                )}
              </div>

              {/* Audited Asset Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Current Asset Name</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Target Prefix</th>
                      <th className="py-3 px-4">Recommended Standard Name</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No assets match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-200">
                            {item.originalName}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-sans">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                              {item.assetType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {item.status === 'compliant' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Conforming
                              </span>
                            ) : item.status === 'warning' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertCircle className="w-3 h-3" /> Secondary
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Missing Prefix
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 bg-cyan-950/60 text-cyan-300 rounded border border-cyan-800/40 text-[11px] font-bold">
                              {item.appliedRule.prefix}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'compliant' ? (
                              <span className="text-slate-500">{item.originalName}</span>
                            ) : (
                              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                {item.suggestedName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.status !== 'compliant' && (
                              <button
                                onClick={() => handleCopySingle(item.suggestedName, item.id)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-all inline-flex items-center gap-1"
                              >
                                {copiedItem === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedItem === item.id ? 'Copied' : 'Copy Name'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 2: INDUSTRY PREFIX RULEBOOK */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  These prefix standards follow the official Epic Games recommendations and the industry Unreal Engine Style Guide. Standardized prefixes ensure quick asset filtering in the Content Browser, prevent asset type confusion, and avoid name collisions.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {INDUSTRY_NAMING_RULES.map((rule) => (
                  <div key={rule.prefix} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-black text-xs rounded-lg">
                          {rule.prefix}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800">
                          {rule.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{rule.assetType}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{rule.description}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Canonical:</span>
                      <span className="text-cyan-300 font-bold">{rule.example}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PYTHON RENAME SCRIPT */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Unreal Engine 5 Python Batch Rename Script</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Execute this script directly in the UE5 Output Log Python console to batch-rename all non-conforming assets in /Game/
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-700"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .py</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto max-h-[500px] custom-scrollbar whitespace-pre">
                {report.pythonRenameScript}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Based on Epic Games Standard Asset Naming Specifications
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Close Assistant
          </button>
        </div>

      </div>
    </div>
  );
};
export default AssetNamingAssistantModal;
