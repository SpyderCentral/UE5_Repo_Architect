import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BlueprintSpec, NodeData, GraphConnection } from '../../types';
import {
  GitFork,
  Zap,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Eye,
  Activity,
  Layers,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  ChevronDown,
  FileCode
} from 'lucide-react';

interface NodeExecutionFlowChartProps {
  blueprintName: string;
  spec: BlueprintSpec;
  onSelectNode?: (nodeId: string) => void;
  onBackToSpec?: () => void;
}

export interface ExecutionPath {
  id: string;
  name: string;
  eventName: string;
  nodeIds: string[];
  nodes: NodeData[];
  branchDecisions: string[];
  estimatedCost: 'Low' | 'Medium' | 'High' | 'Critical';
  hazards: string[];
  length: number;
}

interface LayoutNode extends NodeData {
  flowX: number;
  flowY: number;
  depth: number;
  isEventRoot: boolean;
  isBranchPoint: boolean;
  isCast: boolean;
  isLatent: boolean;
}

export const NodeExecutionFlowChart: React.FC<NodeExecutionFlowChartProps> = ({
  blueprintName,
  spec,
  onSelectNode,
  onBackToSpec
}) => {
  // Viewport / Zoom State
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 60, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Filter & Display toggles
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  const [showDataDependencies, setShowDataDependencies] = useState(false);
  const [highlightCriticalPaths, setHighlightCriticalPaths] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Simulation Stepper State
  const [activePathIndex, setActivePathIndex] = useState(0);
  const [simStep, setSimStep] = useState<number>(-1); // -1 = idle/full path highlighted
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step

  // Flatten all nodes & connections across eventGraphs
  const { allNodes, allConnections, eventGraphNames } = useMemo(() => {
    const nodes: NodeData[] = [];
    const conns: GraphConnection[] = [];
    const eventNames: string[] = [];

    (spec.eventGraph || []).forEach(eg => {
      if (eg.eventName && !eventNames.includes(eg.eventName)) {
        eventNames.push(eg.eventName);
      }
      (eg.nodes || []).forEach(n => {
        if (!nodes.some(existing => existing.id === n.id)) {
          nodes.push(n);
        }
      });
      (eg.connections || []).forEach(c => {
        conns.push(c);
      });
    });

    return { allNodes: nodes, allConnections: conns, eventGraphNames: eventNames };
  }, [spec.eventGraph]);

  // Distinguish Exec vs Data connections
  const { execConnections, dataConnections } = useMemo(() => {
    const exec: GraphConnection[] = [];
    const data: GraphConnection[] = [];

    allConnections.forEach(c => {
      const fromNode = allNodes.find(n => n.id === c.fromNode);
      const outPin = fromNode?.outputs.find(p => p.name === c.fromPin);
      const pinType = outPin?.type?.toLowerCase() || '';

      const isExec = pinType === 'exec' || 
                     c.fromPin.toLowerCase() === 'then' || 
                     c.fromPin.toLowerCase() === 'exec' ||
                     c.fromPin.toLowerCase() === 'true' || 
                     c.fromPin.toLowerCase() === 'false' ||
                     c.fromPin.toLowerCase() === 'completed' ||
                     c.fromPin.toLowerCase() === 'loop body';

      if (isExec) {
        exec.push(c);
      } else {
        data.push(c);
      }
    });

    return { execConnections: exec, dataConnections: data };
  }, [allConnections, allNodes]);

  // Discover and Compute Execution Paths
  const executionPaths: ExecutionPath[] = useMemo(() => {
    // Identify root entry nodes (event nodes or nodes without incoming exec)
    const incomingExecNodes = new Set(execConnections.map(c => c.toNode));
    const rootNodes = allNodes.filter(n => {
      if (n.type === 'event' || n.name.toLowerCase().includes('event') || n.name.toLowerCase().includes('inputaction')) {
        return true;
      }
      return !incomingExecNodes.has(n.id) && execConnections.some(c => c.fromNode === n.id);
    });

    const paths: ExecutionPath[] = [];

    // Helper: DFS path finder
    const trace = (
      currentNode: NodeData,
      currentPath: string[],
      currentDecisions: string[],
      visited: Set<string>
    ) => {
      if (visited.has(currentNode.id) || currentPath.length > 20) {
        return; // prevent infinite loops/cycles
      }

      const nextVisited = new Set(visited).add(currentNode.id);
      const nextPath = [...currentPath, currentNode.id];

      // Find outgoing exec connections
      const outgoing = execConnections.filter(c => c.fromNode === currentNode.id);

      if (outgoing.length === 0) {
        // Terminal node reached!
        const pathNodes = nextPath.map(id => allNodes.find(n => n.id === id)!).filter(Boolean);
        const rootNode = pathNodes[0];
        const eventName = rootNode?.name || 'Execution Event';

        // Evaluate hazards
        const hazards: string[] = [];
        const isTick = eventName.toLowerCase().includes('tick') || pathNodes.some(n => n.name.toLowerCase().includes('tick'));
        if (isTick) {
          hazards.push('Runs on Event Tick (High CPU game-thread cost)');
        }
        if (pathNodes.some(n => n.name.toLowerCase().includes('cast to'))) {
          hazards.push('Contains hard Cast (Hard reference memory coupling)');
        }
        if (pathNodes.some(n => n.name.toLowerCase().includes('delay') || n.name.toLowerCase().includes('timer'))) {
          hazards.push('Latent async execution path');
        }
        if (pathNodes.length >= 8) {
          hazards.push('Deep branch chain (>7 sequential nodes)');
        }

        let cost: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
        if (isTick && pathNodes.length > 4) cost = 'Critical';
        else if (isTick || pathNodes.length > 7) cost = 'High';
        else if (pathNodes.length > 4) cost = 'Medium';

        const lastNode = pathNodes[pathNodes.length - 1];
        const pathSummary = `${eventName} ➔ ${lastNode?.name || 'End'}`;

        paths.push({
          id: `path_${paths.length + 1}`,
          name: pathSummary,
          eventName,
          nodeIds: nextPath,
          nodes: pathNodes,
          branchDecisions: currentDecisions,
          estimatedCost: cost,
          hazards,
          length: pathNodes.length
        });
        return;
      }

      // Recurse down each exec branch
      outgoing.forEach(outConn => {
        const nextNode = allNodes.find(n => n.id === outConn.toNode);
        if (nextNode) {
          const decision = outConn.fromPin !== 'then' && outConn.fromPin !== 'exec'
            ? `${currentNode.name} (${outConn.fromPin})`
            : '';
          const newDecisions = decision ? [...currentDecisions, decision] : currentDecisions;
          trace(nextNode, nextPath, newDecisions, nextVisited);
        }
      });
    };

    rootNodes.forEach(root => {
      trace(root, [], [], new Set());
    });

    // Fallback if no full exec chains found
    if (paths.length === 0 && allNodes.length > 0) {
      paths.push({
        id: 'path_fallback',
        name: `${allNodes[0].name} (Single Graph)`,
        eventName: allNodes[0].name,
        nodeIds: allNodes.map(n => n.id),
        nodes: allNodes,
        branchDecisions: [],
        estimatedCost: 'Low',
        hazards: [],
        length: allNodes.length
      });
    }

    return paths;
  }, [allNodes, execConnections]);

  // Filter paths by event
  const filteredPaths = useMemo(() => {
    if (selectedEventFilter === 'ALL') return executionPaths;
    return executionPaths.filter(p => p.eventName.toLowerCase().includes(selectedEventFilter.toLowerCase()));
  }, [executionPaths, selectedEventFilter]);

  // Active path
  const currentPath: ExecutionPath | undefined = filteredPaths[activePathIndex] || filteredPaths[0];

  // Automated layout positioning of nodes in flow chart
  const layoutNodes: LayoutNode[] = useMemo(() => {
    const CARD_WIDTH = 240;
    const CARD_HEIGHT = 120;
    const HORIZONTAL_GAP = 90;
    const VERTICAL_GAP = 50;

    // Determine node depths via BFS from root nodes
    const depths = new Map<string, number>();
    const roots = allNodes.filter(n => {
      const isRoot = n.type === 'event' || !execConnections.some(c => c.toNode === n.id);
      return isRoot;
    });

    const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r.id, depth: 0 }));
    roots.forEach(r => depths.set(r.id, 0));

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const children = execConnections.filter(c => c.fromNode === id);
      children.forEach(c => {
        const currentBest = depths.get(c.toNode);
        if (currentBest === undefined || depth + 1 > currentBest) {
          depths.set(c.toNode, depth + 1);
          queue.push({ id: c.toNode, depth: depth + 1 });
        }
      });
    }

    // Group nodes by depth column
    const columns = new Map<number, string[]>();
    allNodes.forEach(n => {
      const d = depths.get(n.id) || 0;
      const list = columns.get(d) || [];
      list.push(n.id);
      columns.set(d, list);
    });

    // Assign X and Y coordinates
    const layoutMap: LayoutNode[] = [];
    columns.forEach((nodeIds, depth) => {
      nodeIds.forEach((id, rowIdx) => {
        const node = allNodes.find(n => n.id === id);
        if (!node) return;

        const x = depth * (CARD_WIDTH + HORIZONTAL_GAP) + 80;
        const totalColHeight = nodeIds.length * (CARD_HEIGHT + VERTICAL_GAP);
        const y = (rowIdx * (CARD_HEIGHT + VERTICAL_GAP)) - (totalColHeight / 2) + 300;

        const isEventRoot = node.type === 'event' || node.name.toLowerCase().includes('event') || node.name.toLowerCase().includes('inputaction');
        const isBranchPoint = node.name.toLowerCase().includes('branch') || node.outputs.some(p => p.name.toLowerCase() === 'true' || p.name.toLowerCase() === 'false');
        const isCast = node.name.toLowerCase().includes('cast to');
        const isLatent = node.name.toLowerCase().includes('delay') || node.name.toLowerCase().includes('timer') || node.name.toLowerCase().includes('timeline');

        layoutMap.push({
          ...node,
          flowX: x,
          flowY: y,
          depth,
          isEventRoot,
          isBranchPoint,
          isCast,
          isLatent
        });
      });
    });

    return layoutMap;
  }, [allNodes, execConnections]);

  // Stepper playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && currentPath) {
      timer = setInterval(() => {
        setSimStep(prev => {
          if (prev + 1 >= currentPath.nodeIds.length) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentPath, playbackSpeed]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = -e.deltaY * 0.001;
    setZoom(prev => Math.min(Math.max(prev + scaleFactor, 0.25), 2.5));
  };

  const handleFitView = () => {
    setZoom(0.85);
    setPan({ x: 60, y: 100 });
  };

  const activeStepNodeId = currentPath && simStep >= 0 ? currentPath.nodeIds[simStep] : null;

  return (
    <div className="flex flex-col h-full bg-[#070b14] text-slate-100 rounded-2xl border border-slate-800/80 overflow-hidden select-none">
      
      {/* Top Header & Interactive Playback Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        
        {/* Left Title & Path Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Execution Path Flow Chart
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Interactive Graph
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trace execution branches, evaluate game-thread latency, and inspect node dependencies
            </p>
          </div>
        </div>

        {/* Center Simulation Controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              if (currentPath) {
                setSimStep(prev => Math.max(prev - 1, 0));
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (simStep === -1) setSimStep(0);
              setIsPlaying(!isPlaying);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isPlaying ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Flow' : 'Step-Through'}</span>
          </button>

          <button
            onClick={() => {
              if (currentPath) {
                setSimStep(prev => (prev + 1 < currentPath.nodeIds.length ? prev + 1 : 0));
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStep(-1);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {currentPath && simStep >= 0 && (
            <span className="text-[11px] font-mono text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
              Step {simStep + 1} / {currentPath.nodeIds.length}
            </span>
          )}
        </div>

        {/* Right View Controls & Toggles */}
        <div className="flex items-center gap-2">
          {/* Data Wires Toggle */}
          <button
            onClick={() => setShowDataDependencies(!showDataDependencies)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showDataDependencies
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle data pin dependencies (floats, vectors, objects)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Data Wires</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.25))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitView}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded ml-1"
              title="Reset View / Fit Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Interactive Stage & Side Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Execution Path Drawer */}
        <div className="w-72 bg-slate-950/95 border-r border-slate-800/80 flex flex-col z-20 shadow-xl flex-shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Discovered Paths ({executionPaths.length})</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              Auto-Traced
            </span>
          </div>

          {/* Event Filter Pills */}
          <div className="p-2 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto custom-scrollbar text-[10px] font-mono">
            <button
              onClick={() => setSelectedEventFilter('ALL')}
              className={`px-2 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                selectedEventFilter === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              All Events
            </button>
            {eventGraphNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedEventFilter(name)}
                className={`px-2 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                  selectedEventFilter === name ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Paths List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredPaths.map((path, idx) => {
              const isSelected = idx === activePathIndex;
              return (
                <div
                  key={path.id}
                  onClick={() => {
                    setActivePathIndex(idx);
                    setSimStep(-1);
                    setIsPlaying(false);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/60 shadow-lg text-white'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white font-mono text-[11px] truncate max-w-[150px]">
                      {path.eventName}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                      path.estimatedCost === 'Critical' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                      path.estimatedCost === 'High' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      path.estimatedCost === 'Medium' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                      'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {path.estimatedCost} Cost
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{path.length} sequential nodes</span>
                    {path.hazards.length > 0 && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {path.hazards.length} Hazard
                      </span>
                    )}
                  </div>

                  {path.branchDecisions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1">
                      {path.branchDecisions.map((bd, bi) => (
                        <span key={bi} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 border border-slate-800">
                          {bd}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Path Hazard Summary Footer */}
          {currentPath && currentPath.hazards.length > 0 && (
            <div className="p-3 bg-rose-950/30 border-t border-rose-900/50 space-y-1.5">
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Performance & Latency Audit
              </div>
              {currentPath.hazards.map((h, i) => (
                <div key={i} className="text-[11px] text-rose-300/90 leading-tight">
                  • {h}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas / SVG Flow Chart Stage */}
        <div
          className="flex-1 h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#0a0f1d]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* SVG Execution & Data Wires */}
            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none w-[5000px] h-[3000px]">
              <defs>
                <marker
                  id="arrow-exec"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24" />
                </marker>
                <marker
                  id="arrow-data"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <linearGradient id="execActiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>

              {/* Render Exec Wires */}
              {execConnections.map((conn, idx) => {
                const from = layoutNodes.find(n => n.id === conn.fromNode);
                const to = layoutNodes.find(n => n.id === conn.toNode);
                if (!from || !to) return null;

                const startX = from.flowX + 240;
                const startY = from.flowY + 60;
                const endX = to.flowX;
                const endY = to.flowY + 60;

                const deltaX = Math.abs(endX - startX) * 0.5;
                const d = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;

                // Check if this connection is part of the currently active path
                const isPathActive = currentPath && 
                  currentPath.nodeIds.includes(conn.fromNode) && 
                  currentPath.nodeIds.includes(conn.toNode);

                const isCurrentStep = activeStepNodeId === conn.toNode && currentPath?.nodeIds[simStep - 1] === conn.fromNode;

                return (
                  <g key={`exec_${idx}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={isCurrentStep ? '#f59e0b' : isPathActive ? '#fbbf24' : '#475569'}
                      strokeWidth={isCurrentStep ? 4 : isPathActive ? 3 : 1.5}
                      strokeDasharray={isPathActive ? '8 4' : undefined}
                      className={isPathActive ? 'animate-[dash_1.5s_linear_infinite]' : ''}
                      markerEnd="url(#arrow-exec)"
                      opacity={isPathActive ? 1 : 0.4}
                    />
                  </g>
                );
              })}

              {/* Optional: Render Data Wires */}
              {showDataDependencies && dataConnections.map((conn, idx) => {
                const from = layoutNodes.find(n => n.id === conn.fromNode);
                const to = layoutNodes.find(n => n.id === conn.toNode);
                if (!from || !to) return null;

                const startX = from.flowX + 240;
                const startY = from.flowY + 90;
                const endX = to.flowX;
                const endY = to.flowY + 90;

                const deltaX = Math.abs(endX - startX) * 0.5;
                const d = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;

                return (
                  <path
                    key={`data_${idx}`}
                    d={d}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    opacity={0.6}
                    markerEnd="url(#arrow-data)"
                  />
                );
              })}
            </svg>

            {/* Render Flow Chart Nodes */}
            {layoutNodes.map(node => {
              const isInActivePath = currentPath?.nodeIds.includes(node.id);
              const isCurrentStep = activeStepNodeId === node.id;
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                    if (onSelectNode) onSelectNode(node.id);
                  }}
                  className={`absolute w-60 rounded-xl border p-3.5 shadow-2xl transition-all cursor-pointer select-none ${
                    isCurrentStep
                      ? 'bg-amber-950/90 border-amber-400 ring-4 ring-amber-500/50 scale-105 z-30'
                      : isSelected
                      ? 'bg-blue-950/90 border-blue-400 ring-2 ring-blue-500/50 z-20'
                      : isInActivePath
                      ? 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/40 z-10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 opacity-75'
                  }`}
                  style={{
                    left: `${node.flowX}px`,
                    top: `${node.flowY}px`
                  }}
                >
                  {/* Node Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {node.isEventRoot ? (
                        <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : node.isBranchPoint ? (
                        <GitFork className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : node.isCast ? (
                        <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      ) : node.isLatent ? (
                        <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      ) : (
                        <FileCode className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-xs text-white truncate">
                        {node.name}
                      </span>
                    </div>

                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {node.type}
                    </span>
                  </div>

                  {/* Pin summary */}
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] text-slate-500 uppercase">Exec:</span>
                      <span className="text-amber-300">
                        {node.outputs.find(p => p.type === 'exec' || p.name === 'then')?.name || 'then'}
                      </span>
                    </div>

                    {node.outputs.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-800/40">
                        {node.outputs.filter(p => p.type !== 'exec').slice(0, 3).map((p, pi) => (
                          <span key={pi} className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Simulation Badge */}
                  {isCurrentStep && (
                    <div className="mt-2.5 pt-2 border-t border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center justify-between animate-pulse">
                      <span>EXECUTING STEP</span>
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Detail Inspector Drawer (When node is clicked) */}
        {selectedNodeId && (
          <div className="w-80 bg-slate-950/95 border-l border-slate-800/80 p-4 flex flex-col z-20 shadow-2xl animate-in slide-in-from-right-4">
            {(() => {
              const node = layoutNodes.find(n => n.id === selectedNodeId);
              if (!node) return null;

              const incoming = allConnections.filter(c => c.toNode === node.id);
              const outgoing = allConnections.filter(c => c.fromNode === node.id);

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Node Inspector</span>
                      <h3 className="text-sm font-bold text-white">{node.name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>

                  {/* Pin breakdown */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Inputs ({node.inputs.length})
                      </div>
                      <div className="space-y-1 font-mono text-xs">
                        {node.inputs.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-300">{p.name}</span>
                            <span className="text-[10px] text-slate-500">{p.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Outputs ({node.outputs.length})
                      </div>
                      <div className="space-y-1 font-mono text-xs">
                        {node.outputs.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-amber-300">{p.name}</span>
                            <span className="text-[10px] text-slate-500">{p.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Inbound & Outbound Connections */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Dependency Links
                      </div>
                      <div className="text-xs space-y-1 text-slate-400 font-mono">
                        <div>Inbound Links: <span className="text-white font-bold">{incoming.length}</span></div>
                        <div>Outbound Links: <span className="text-white font-bold">{outgoing.length}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>

    </div>
  );
};

export default NodeExecutionFlowChart;
