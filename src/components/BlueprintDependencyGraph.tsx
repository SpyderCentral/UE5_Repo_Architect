import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GraphNode, 
  GraphEdge, 
  DependencyGraphData, 
  DependencyType 
} from '../services/blueprintDependencyGraph';
import { getTagStyle } from '../services/blueprintTags';
import { 
  Layers, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Maximize2, 
  Sparkles, 
  Box, 
  Cpu, 
  ShieldAlert, 
  Activity, 
  Layout, 
  Brain, 
  Gamepad2, 
  Filter, 
  ExternalLink,
  ChevronRight,
  GitFork,
  Link2
} from 'lucide-react';

interface BlueprintDependencyGraphProps {
  graphData: DependencyGraphData;
  selectedAsset: string | null;
  onSelectAsset: (assetName: string) => void;
  onOpenAssetSpec?: (assetName: string) => void;
}

export const BlueprintDependencyGraph: React.FC<BlueprintDependencyGraphProps> = ({
  graphData,
  selectedAsset,
  onSelectAsset,
  onOpenAssetSpec,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEdgeType, setSelectedEdgeType] = useState<'ALL' | DependencyType>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'ALL' | string>('ALL');
  const [highlightCyclesOnly, setHighlightCyclesOnly] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(selectedAsset || null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when selectedAsset prop changes
  useEffect(() => {
    if (selectedAsset) {
      setFocusedNodeId(selectedAsset);
    }
  }, [selectedAsset]);

  // Unique tags across graph nodes
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    graphData.nodes.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [graphData.nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(node => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = node.name.toLowerCase().includes(q);
        const matchParent = node.parentClass.toLowerCase().includes(q);
        const matchTag = (node.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchParent && !matchTag) return false;
      }

      if (selectedTagFilter !== 'ALL') {
        if (!node.tags || !node.tags.includes(selectedTagFilter)) return false;
      }

      if (highlightCyclesOnly && !node.hasCircularDep) {
        return false;
      }

      return true;
    });
  }, [graphData.nodes, searchQuery, selectedTagFilter, highlightCyclesOnly]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return graphData.edges.filter(edge => {
      if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) {
        return false;
      }

      if (selectedEdgeType !== 'ALL' && edge.type !== selectedEdgeType) {
        return false;
      }

      if (highlightCyclesOnly && !edge.isCircular) {
        return false;
      }

      return true;
    });
  }, [graphData.edges, filteredNodeIds, selectedEdgeType, highlightCyclesOnly]);

  // Focus node and its adjacent connections
  const focusedNode = useMemo(() => {
    return graphData.nodes.find(n => n.id === focusedNodeId) || null;
  }, [graphData.nodes, focusedNodeId]);

  const adjacentNodeIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>();
    const ids = new Set<string>([focusedNodeId]);
    graphData.edges.forEach(e => {
      if (e.source === focusedNodeId) ids.add(e.target);
      if (e.target === focusedNodeId) ids.add(e.source);
    });
    return ids;
  }, [graphData.edges, focusedNodeId]);

  // Pan and drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.graph-node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(z => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z - 0.15));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 40 });
  };

  const fitToScreen = () => {
    if (graphData.nodes.length === 0) return;
    const minX = Math.min(...graphData.nodes.map(n => n.x));
    const maxX = Math.max(...graphData.nodes.map(n => n.x));
    const minY = Math.min(...graphData.nodes.map(n => n.y));
    const maxY = Math.max(...graphData.nodes.map(n => n.y));

    const width = maxX - minX + 340;
    const height = maxY - minY + 200;
    const containerW = containerRef.current?.clientWidth || 900;
    const containerH = containerRef.current?.clientHeight || 600;

    const scale = Math.min(containerW / width, containerH / height, 1);
    setZoom(Math.max(0.5, scale * 0.9));
    setPan({
      x: Math.max(20, (containerW - width * scale) / 2),
      y: Math.max(20, (containerH - height * scale) / 2)
    });
  };

  const handleNodeClick = (node: GraphNode) => {
    setFocusedNodeId(node.id);
    onSelectAsset(node.id);
  };

  const getEdgeColor = (edge: GraphEdge, isFocused: boolean) => {
    if (edge.isCircular) return '#f43f5e'; // Rose / Red glowing
    if (isFocused) return '#38bdf8'; // Sky highlight
    switch (edge.type) {
      case 'inheritance': return '#3b82f6'; // Blue
      case 'component': return '#06b6d4'; // Cyan
      case 'variable': return '#a855f7'; // Purple
      case 'cast': return '#10b981'; // Emerald
      case 'input': return '#f59e0b'; // Amber
      case 'ai': return '#8b5cf6'; // Violet
      default: return '#64748b'; // Slate
    }
  };

  const getNodeIcon = (type: string, name: string) => {
    if (name.startsWith('WBP_')) return <Layout className="w-3.5 h-3.5 text-sky-400" />;
    if (name.startsWith('BT_') || name.startsWith('BB_')) return <Brain className="w-3.5 h-3.5 text-purple-400" />;
    if (name.startsWith('IA_') || name.startsWith('IMC_')) return <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />;
    if (name.startsWith('BPC_')) return <Box className="w-3.5 h-3.5 text-cyan-400" />;
    return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
      
      {/* Top Controls Toolbar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Blueprint Dependency Graph</h3>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 uppercase tracking-widest ${
                graphData.cycles.length > 0
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {graphData.cycles.length > 0 ? (
                  <>
                    <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                    {graphData.cycles.length} Circular Dependencies
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Clean Decoupled Flow
                  </>
                )}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {filteredNodes.length} Subsystems • {filteredEdges.length} Reference Links • Decoupling Score: {graphData.metrics.decouplingScore}%
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter graph nodes..."
              className="bg-slate-950/80 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700/80 focus:border-blue-500 focus:outline-none w-44 font-mono placeholder:text-slate-500"
            />
          </div>

          {/* Edge Filter Dropdown */}
          <select
            value={selectedEdgeType}
            onChange={(e) => setSelectedEdgeType(e.target.value as any)}
            className="bg-slate-950/80 text-slate-300 text-[11px] font-mono border border-slate-700/80 rounded-xl px-2.5 py-1.5 focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Reference Types</option>
            <option value="inheritance">Inheritance (Extends)</option>
            <option value="component">Component Subobjects</option>
            <option value="variable">Variable Types</option>
            <option value="cast">API / Direct Casts</option>
            <option value="input">Enhanced Input Links</option>
            <option value="ai">AI & Behavior Links</option>
          </select>

          {/* Tag Filter Dropdown */}
          {availableTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="bg-slate-950/80 text-slate-300 text-[11px] font-mono border border-slate-700/80 rounded-xl px-2.5 py-1.5 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Category Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>Tag: {tag}</option>
              ))}
            </select>
          )}

          {/* Circular Dep Toggle */}
          {graphData.cycles.length > 0 && (
            <button
              onClick={() => setHighlightCyclesOnly(!highlightCyclesOnly)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all flex items-center gap-1.5 cursor-pointer ${
                highlightCyclesOnly
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{highlightCyclesOnly ? 'Showing Cycles Only' : 'Highlight Cycles'}</span>
            </button>
          )}

          {/* Zoom / View Buttons */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToScreen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Workspace + Inspector */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Interactive Graph Canvas */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 h-full relative overflow-hidden select-none bg-[#0a0d14] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        >
          {/* Legend Banner */}
          <div className="absolute left-4 bottom-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[10px] space-y-1.5 shadow-xl">
            <div className="font-bold text-slate-300 uppercase tracking-widest text-[9px] mb-1">Relationship Legend</div>
            <div className="flex items-center gap-2 text-slate-400 font-mono">
              <span className="w-3 h-0.5 bg-blue-500 inline-block rounded"></span>
              <span>Inheritance / Extends</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono">
              <span className="w-3 h-0.5 bg-cyan-500 inline-block rounded"></span>
              <span>Component Subobject</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono">
              <span className="w-3 h-0.5 bg-purple-500 inline-block rounded"></span>
              <span>Variable Reference</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded"></span>
              <span>Direct Cast / Call</span>
            </div>
            <div className="flex items-center gap-2 text-rose-400 font-mono font-bold">
              <span className="w-3 h-0.5 bg-rose-500 inline-block rounded"></span>
              <span>Circular Dependency</span>
            </div>
          </div>

          {/* SVG & Node Layer */}
          <div
            className="absolute transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {/* SVG Connecting Curves */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              style={{ width: '4000px', height: '4000px' }}
            >
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrow-circular"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
              </defs>

              {filteredEdges.map(edge => {
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const startX = sourceNode.x + 240; // Right side of source card
                const startY = sourceNode.y + 45;  // Center Y of source card
                const endX = targetNode.x;         // Left side of target card
                const endY = targetNode.y + 45;    // Center Y of target card

                const isConnectedToFocused = 
                  focusedNodeId && (edge.source === focusedNodeId || edge.target === focusedNodeId);
                const isDimmed = focusedNodeId && !isConnectedToFocused;

                const dx = Math.abs(endX - startX) * 0.5;
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
                const color = getEdgeColor(edge, !!isConnectedToFocused);

                return (
                  <g key={edge.id} opacity={isDimmed ? 0.15 : 1}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={color}
                      strokeWidth={edge.isCircular ? 2.5 : isConnectedToFocused ? 2 : 1.4}
                      strokeDasharray={edge.isCircular ? '5,4' : undefined}
                      markerEnd={
                        edge.isCircular 
                          ? 'url(#arrow-circular)' 
                          : isConnectedToFocused 
                            ? 'url(#arrow-active)' 
                            : 'url(#arrow-default)'
                      }
                      className={edge.isCircular ? 'animate-pulse' : ''}
                    />
                    {/* Interactive label on hover / focus */}
                    {isConnectedToFocused && (
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 8}
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="bg-slate-900"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes Render Layer */}
            {filteredNodes.map(node => {
              const isSelected = focusedNodeId === node.id;
              const isAdjacent = adjacentNodeIds.has(node.id);
              const isDimmed = focusedNodeId && !isSelected && !isAdjacent;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`graph-node-card absolute w-60 p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xl ${
                    node.hasCircularDep
                      ? 'border-rose-500/60 bg-slate-900/90 ring-1 ring-rose-500/40'
                      : isSelected
                        ? 'border-blue-400 bg-slate-900/95 ring-2 ring-blue-500/50 shadow-blue-500/20'
                        : isAdjacent
                          ? 'border-slate-600 bg-slate-900/80 hover:border-slate-500'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                >
                  {/* Top Bar: Icon + Parent Class / Circular Badge */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex-shrink-0">
                        {getNodeIcon(node.type, node.name)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {node.parentClass}
                      </span>
                    </div>

                    {node.hasCircularDep && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 uppercase tracking-wider flex-shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Cycle
                      </span>
                    )}
                  </div>

                  {/* Asset Name */}
                  <h4 className="font-mono text-xs font-bold text-white truncate mb-2">
                    {node.name}
                  </h4>

                  {/* Tags Pill Row */}
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {node.tags.slice(0, 2).map(tag => {
                        const style = getTagStyle(tag);
                        return (
                          <span
                            key={tag}
                            className={`px-1.5 py-0.2 rounded-md text-[8px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                      {node.tags.length > 2 && (
                        <span className="text-[8px] font-mono text-slate-500 self-center">
                          +{node.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Stats: In / Out References */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1" title={`${node.inDegree} blueprints depend on this`}>
                      <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                      In: <strong className="text-white">{node.inDegree}</strong>
                    </span>
                    <span className="flex items-center gap-1" title={`Depends on ${node.outDegree} other assets`}>
                      <ArrowUpRight className="w-2.5 h-2.5 text-blue-400" />
                      Out: <strong className="text-white">{node.outDegree}</strong>
                    </span>
                    <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 bg-slate-950 rounded text-slate-500">
                      {node.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Drawer: Selected Node Dependency Details */}
        {focusedNode ? (
          <div className="w-80 lg:w-96 border-l border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between overflow-y-auto z-20 backdrop-blur-md shadow-2xl">
            <div className="space-y-6">
              
              {/* Node Title & Action */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold uppercase border border-blue-500/30">
                    {focusedNode.parentClass}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Level {focusedNode.depth}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white font-mono break-all mb-2">
                  {focusedNode.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {focusedNode.folder}
                </p>

                {/* Tags */}
                {focusedNode.tags && focusedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {focusedNode.tags.map(tag => {
                      const style = getTagStyle(tag);
                      return (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Circular Dependency Warning Alert */}
              {focusedNode.hasCircularDep && (
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Circular Reference Detected</span>
                  </div>
                  <p className="text-[10px] text-rose-200/80 leading-relaxed">
                    This blueprint participates in a cyclic dependency loop with other assets.
                    In UE5, circular blueprint references cause hard asset preloading, slow packaging, and potential memory leaks.
                  </p>
                  <div className="text-[9px] font-mono text-rose-400 pt-1 border-t border-rose-500/20">
                    Recommendation: Decouple via BPI Blueprint Interfaces or Event Dispatchers.
                  </div>
                </div>
              )}

              {/* Dependencies: Outgoing ("Depends On") */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  Depends On ({focusedNode.dependencies.length})
                </h4>
                {focusedNode.dependencies.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No outgoing blueprint dependencies (Root asset).</p>
                ) : (
                  <div className="space-y-1.5">
                    {focusedNode.dependencies.map(targetId => {
                      const targetNode = graphData.nodes.find(n => n.id === targetId);
                      return (
                        <button
                          key={targetId}
                          onClick={() => {
                            setFocusedNodeId(targetId);
                            onSelectAsset(targetId);
                          }}
                          className="w-full p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            <span className="font-mono text-white truncate text-[11px]">{targetId}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase font-mono group-hover:text-slate-300">
                            {targetNode?.type || 'Blueprint'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dependents: Incoming ("Depended On By") */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  Depended On By ({focusedNode.dependents.length})
                </h4>
                {focusedNode.dependents.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No other blueprints depend on this directly (Leaf asset).</p>
                ) : (
                  <div className="space-y-1.5">
                    {focusedNode.dependents.map(sourceId => {
                      const sourceNode = graphData.nodes.find(n => n.id === sourceId);
                      return (
                        <button
                          key={sourceId}
                          onClick={() => {
                            setFocusedNodeId(sourceId);
                            onSelectAsset(sourceId);
                          }}
                          className="w-full p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="font-mono text-white truncate text-[11px]">{sourceId}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase font-mono group-hover:text-slate-300">
                            {sourceNode?.type || 'Blueprint'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action: Open Full Specification */}
            <div className="pt-6 border-t border-slate-800">
              <button
                onClick={() => {
                  if (onOpenAssetSpec) {
                    onOpenAssetSpec(focusedNode.name);
                  } else {
                    onSelectAsset(focusedNode.name);
                  }
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer uppercase tracking-wider"
              >
                <span>View Full Spec Graph</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-80 lg:w-96 border-l border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center text-slate-500">
            <Link2 className="w-10 h-10 mb-3 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select A Node</h4>
            <p className="text-[11px] text-slate-600 max-w-[200px]">
              Click any blueprint node on the canvas to inspect its incoming and outgoing dependency chains.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function ArrowDownLeft(props: any) {
  return <ArrowLeft {...props} />;
}

function ArrowUpRight(props: any) {
  return <ArrowRight {...props} />;
}

export default BlueprintDependencyGraph;
