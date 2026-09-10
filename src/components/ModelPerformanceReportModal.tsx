import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  Cpu, 
  HardDrive, 
  Layers, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Download, 
  FileText, 
  Copy, 
  Check, 
  BarChart3, 
  Smartphone, 
  Gamepad2, 
  Monitor, 
  Gauge, 
  Sliders
} from 'lucide-react';
import { ModelPerformanceReport } from '../services/modelPerformanceAuditor';

interface ModelPerformanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ModelPerformanceReport | null;
  onConfirmDownload?: () => void;
  downloadButtonLabel?: string;
}

export const ModelPerformanceReportModal: React.FC<ModelPerformanceReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onConfirmDownload,
  downloadButtonLabel = 'Download .GLB Model',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'geometry' | 'vram' | 'drawcalls' | 'platforms'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopyReport = () => {
    const markdown = `# Unreal Engine 5 Performance Audit Report: ${report.modelName}
Generated: ${new Date(report.timestamp).toLocaleString()}

## 📊 Summary Metrics
- **Optimization Health Score:** ${report.overallOptimizationScore}/100 (${report.overallStatus})
- **Total Triangles:** ${report.totalTriangles.toLocaleString()} (${report.geometryDensityRating})
- **Total Vertices:** ${report.totalVertices.toLocaleString()}
- **Submesh Count:** ${report.meshCount} meshes
- **Estimated Draw Calls:** ~${report.estimatedTotalDrawCalls} calls/frame (Base: ${report.estimatedBaseDrawCalls}, Shadows: ${report.estimatedShadowDrawCalls})
- **Texture VRAM Footprint:** ${report.totalVramCompressedMb} MB (BC7/ASTC Compressed) / ${report.totalVramUncompressedMb} MB (Raw RGBA)
- **Rigging:** ${report.isRigged ? `${report.rigType || 'Humanoid'} (${report.boneCount} Bones, 4-influences/vertex)` : 'Static Unskinned Mesh'}

## 🎮 Platform Readiness
${report.platformReadiness.map((p) => `- **${p.platform}**: ${p.status.toUpperCase()} (${p.score}/100) — ${p.notes}`).join('\n')}

## 💡 Proactive Optimization Recommendations
${report.recommendations.map((r) => `### [${r.severity.toUpperCase()}] ${r.title}\n${r.description}\n*Suggested Fix:* ${r.suggestedFix}`).join('\n\n')}
`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadReportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.modelName}_Performance_Audit.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const scoreColor =
    report.overallOptimizationScore >= 80
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : report.overallOptimizationScore >= 60
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-red-400 border-red-500/40 bg-red-500/10';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">Pre-Export Performance Audit</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                  UE5 Real-time Profile
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Asset: <strong className="text-slate-200">{report.modelName}</strong> • {report.meshCount} Submeshes
              </p>
            </div>
          </div>

          {/* Quick Score Badge */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${scoreColor}`}>
              <Zap className="w-4 h-4" />
              <div>
                <div className="text-[9px] uppercase tracking-widest font-black">Optimization Score</div>
                <div className="text-sm font-black font-mono">{report.overallOptimizationScore} / 100</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950 px-5 border-b border-slate-800 overflow-x-auto gap-1">
          {[
            { id: 'overview', label: 'Summary Overview', icon: BarChart3 },
            { id: 'geometry', label: 'Poly & Submeshes', icon: Layers },
            { id: 'vram', label: 'Texture & VRAM', icon: HardDrive },
            { id: 'drawcalls', label: 'Draw Calls & Rig', icon: Cpu },
            { id: 'platforms', label: 'Platform Budgets', icon: Monitor },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW                                           */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Metric Hero Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Triangles */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Triangles</span>
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {report.totalTriangles.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-cyan-300 font-mono mt-1">
                    {report.geometryDensityRating}
                  </div>
                </div>

                {/* VRAM Memory */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Texture VRAM</span>
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {report.totalVramCompressedMb} <span className="text-xs text-slate-400 font-normal">MB</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {report.totalVramUncompressedMb} MB Raw
                  </div>
                </div>

                {/* Draw Calls */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Draw Calls</span>
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    ~{report.estimatedTotalDrawCalls}
                  </div>
                  <div className="text-[10px] text-emerald-300 font-mono mt-1">
                    Base: {report.estimatedBaseDrawCalls} • Shadows: {report.estimatedShadowDrawCalls}
                  </div>
                </div>

                {/* Rigging Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Skeletal Rig</span>
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {report.isRigged ? `${report.boneCount} Bones` : 'Static'}
                  </div>
                  <div className="text-[10px] text-amber-300 font-mono mt-1">
                    {report.isRigged ? '4 Influences / Vert' : 'Rigless Mesh'}
                  </div>
                </div>
              </div>

              {/* Proactive Optimization Recommendations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> Proactive Optimization Recommendations
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {report.recommendations.length} Suggestions
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.recommendations.map((rec, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                        rec.severity === 'action'
                          ? 'bg-red-950/20 border-red-500/40 text-red-200'
                          : rec.severity === 'warning'
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {rec.severity === 'action' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          ) : rec.severity === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <div className="text-xs font-bold text-white">{rec.title}</div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Fix:</span>
                        <span className="text-cyan-300 font-bold">{rec.suggestedFix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Platform Bar */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                  <span>Target Hardware Readiness</span>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-Profiled</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {report.platformReadiness.map((p) => (
                    <div key={p.platform} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-400 truncate font-medium">{p.platform}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs font-mono font-bold ${
                          p.status === 'optimal' ? 'text-emerald-400' : p.status === 'moderate' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {p.score}%
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                          p.status === 'optimal' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: GEOMETRY & SUBMESHES                               */}
          {/* ======================================================== */}
          {activeTab === 'geometry' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Submesh Geometry Topology Breakdown</h3>
                  <p className="text-xs text-slate-400">Individual geometry parts, triangle counts, and vertex density</p>
                </div>
                <div className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  Total: {report.totalTriangles.toLocaleString()} Tris • {report.totalVertices.toLocaleString()} Verts
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Submesh Name</th>
                      <th className="p-3">Triangles</th>
                      <th className="p-3">Vertices</th>
                      <th className="p-3">Material Slot</th>
                      <th className="p-3">Skinning</th>
                      <th className="p-3 text-right">Draw Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {report.submeshes.map((sub, i) => (
                      <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          {sub.name}
                        </td>
                        <td className="p-3 text-cyan-300 font-bold">{sub.triangles.toLocaleString()}</td>
                        <td className="p-3 text-slate-400">{sub.vertices.toLocaleString()}</td>
                        <td className="p-3 text-slate-400 truncate max-w-[150px]">{sub.materialName}</td>
                        <td className="p-3">
                          {sub.hasSkinning ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              4-Bone Skinned
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                              Rigid Static
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-200">{sub.estimatedDrawCalls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <strong>Nanite vs. Standard Mesh Strategy:</strong> In Unreal Engine 5.4+, static submeshes can be flagged for Nanite cluster rendering. Skinned character submeshes automatically stream through GPU Skin Cache with zero CPU bottleneck.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: TEXTURE & VRAM MEMORY FOOTPRINT                     */}
          {/* ======================================================== */}
          {activeTab === 'vram' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Texture Memory Footprint Estimation</h3>
                  <p className="text-xs text-slate-400">PBR texture maps, compression ratios, and VRAM consumption</p>
                </div>
                <div className="text-xs font-mono text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                  Total Compressed VRAM: {report.totalVramCompressedMb} MB
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.textures.map((tex, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                        {tex.channel}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                        {tex.resolution}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Uncompressed RGBA8:</span>
                        <span className="text-slate-300">{(tex.uncompressedBytes / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between text-indigo-300 font-bold">
                        <span>BC7 Compressed (PC/DX12):</span>
                        <span>{(tex.compressedBc7Bytes / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>ASTC 6x6 (Mobile):</span>
                        <span>{(tex.compressedAstcBytes / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Mipmap Chain (+33%):</span>
                      <span className="text-emerald-400 font-bold">Included</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <strong>Channel Packing Optimization:</strong> Storing Ambient Occlusion in Red, Roughness in Green, and Metallic in Blue into a single <code>_ORM.png</code> texture reduces sampler count from 3 down to 1 in UE5 Material Graphs, cutting texture memory by 66%.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: DRAW CALLS & SKELETAL RIG                          */}
          {/* ======================================================== */}
          {activeTab === 'drawcalls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Draw Call Budget & Rig Diagnostics</h3>
                  <p className="text-xs text-slate-400">GPU pipeline passes and skeletal animation evaluation metrics</p>
                </div>
                <div className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Estimated ~{report.estimatedTotalDrawCalls} Draw Calls/Frame
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Draw Call Breakdown Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> GPU Render Passes
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Base Pass (GBuffer):</span>
                      <strong className="text-white">{report.estimatedBaseDrawCalls} calls</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Directional Shadow Map Passes:</span>
                      <strong className="text-white">{report.estimatedShadowDrawCalls} calls</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Depth Pre-Pass:</span>
                      <strong className="text-white">{report.meshCount} calls</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold">
                      <span>Total Frame Overhead:</span>
                      <span>~{report.estimatedTotalDrawCalls} calls</span>
                    </div>
                  </div>
                </div>

                {/* Rigging & Kinematics Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" /> Skeletal Rig Kinematics
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Hierarchy Format:</span>
                      <strong className="text-white">{report.isRigged ? report.rigType : 'Unrigged'}</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Total Bone Deformers:</span>
                      <strong className="text-white">{report.boneCount} joints</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-900 text-slate-300">
                      <span>Vertex Weight Limit:</span>
                      <strong className="text-emerald-400">4 Influences / Vertex</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold">
                      <span>CPU Skinning Time (approx):</span>
                      <span>{report.estimatedSkinCpuOverheadMs} ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <strong>Batching Efficiency:</strong> Keeping unique material instances to <strong>{report.uniqueMaterialsCount}</strong> allows Unreal Engine's Automatic Instancing and PSO (Pipeline State Object) cache to batch character draw calls seamlessly.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PLATFORM BUDGETS                                   */}
          {/* ======================================================== */}
          {activeTab === 'platforms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Target Hardware Performance Simulation</h3>
                  <p className="text-xs text-slate-400">Compatibility index across Mobile, Console, Handheld, and High-End PC</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {report.platformReadiness.map((p) => {
                  let icon = <Monitor className="w-4 h-4 text-cyan-400" />;
                  if (p.platform.includes('Mobile')) icon = <Smartphone className="w-4 h-4 text-pink-400" />;
                  if (p.platform.includes('Switch') || p.platform.includes('Deck') || p.platform.includes('PS5')) {
                    icon = <Gamepad2 className="w-4 h-4 text-purple-400" />;
                  }

                  return (
                    <div key={p.platform} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                          {icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{p.platform}</div>
                          <div className="text-[11px] text-slate-400">{p.notes}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Progress Bar */}
                        <div className="w-24 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              p.score >= 80 ? 'bg-emerald-500' : p.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${p.score}%` }}
                          />
                        </div>

                        <span className="font-mono text-xs font-black text-white w-10 text-right">
                          {p.score}%
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          p.status === 'optimal'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Audit Summary'}</span>
            </button>

            <button
              onClick={handleDownloadReportJson}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Audit JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              Close
            </button>

            {onConfirmDownload && (
              <button
                onClick={() => {
                  onConfirmDownload();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 fill-current" />
                <span>{downloadButtonLabel}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
