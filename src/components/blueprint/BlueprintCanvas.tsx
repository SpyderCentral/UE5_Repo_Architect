
import React, { useMemo, useState, useRef, useEffect } from 'react';
import BlueprintNode from './BlueprintNode';
import { NodeData } from '../../types';
import { ZoomIn, ZoomOut, Move, Grid, Flame } from 'lucide-react';

interface BlueprintCanvasProps {
  eventName: string;
  steps?: string[]; // Deprecated, kept for backward compatibility if any
  initialNodes?: NodeData[];
  initialConnections?: { fromNode: string; fromPin: string; toNode: string; toPin: string }[];
  mode?: 'blueprint' | 'material' | 'audio' | 'pcg';
}

interface Connection {
    fromNode: string;
    fromPin: string;
    toNode: string;
    toPin: string;
}

// CONSTANTS for Layout Calculation
const NODE_WIDTH = 280; 
const HEADER_HEIGHT = 41; 
const PADDING_TOP = 12; 
const PIN_HEIGHT = 20; 
const PIN_GAP = 16; 
const HORIZONTAL_SPACING = 380; 
const VERTICAL_SPACING = 150;

// Helper to calculate exact pin Y offset relative to node top
const getPinOffsetY = (pinIndex: number) => {
    return HEADER_HEIGHT + PADDING_TOP + (pinIndex * (PIN_HEIGHT + PIN_GAP)) + (PIN_HEIGHT / 2);
};

const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({ eventName, initialNodes, initialConnections, mode = 'blueprint' }) => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(0.8);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute node usage intensity for Heatmap Mode
  const heatmapMap = useMemo(() => {
    if (!isHeatmapMode) return new Map<string, { intensity: number; tier: 'cool' | 'warm' | 'hot' }>();
    const map = new Map<string, { intensity: number; tier: 'cool' | 'warm' | 'hot' }>();
    const wireCounts = new Map<string, number>();
    connections.forEach(c => {
      wireCounts.set(c.fromNode, (wireCounts.get(c.fromNode) || 0) + 1);
      wireCounts.set(c.toNode, (wireCounts.get(c.toNode) || 0) + 1);
    });

    let maxScore = 1;
    const scores = nodes.map(n => {
      const name = (n.name || '').toLowerCase();
      let weight = 2;
      if (name.includes('tick')) weight = 10;
      else if (name.includes('trace') || name.includes('sweep')) weight = 8;
      else if (name.includes('cast to')) weight = 7.5;
      else if (name.includes('spawnactor')) weight = 7;
      else if (name.includes('branch') || name.includes('sequence')) weight = 5;
      else if (n.type === 'event') weight = 4.5;
      
      const wires = wireCounts.get(n.id) || (n.inputs.length + n.outputs.length);
      const score = (wires * 2) + (weight * 4);
      if (score > maxScore) maxScore = score;
      return { id: n.id, score, weight };
    });

    scores.forEach(({ id, score, weight }) => {
      const intensity = Math.min(100, Math.max(15, Math.round((score / maxScore) * 100)));
      let tier: 'cool' | 'warm' | 'hot' = 'cool';
      if (intensity >= 70 || weight >= 8) tier = 'hot';
      else if (intensity >= 40 || weight >= 4.5) tier = 'warm';
      map.set(id, { intensity, tier });
    });

    return map;
  }, [nodes, connections, isHeatmapMode]);

  // Layout Algorithm: Basic Linear with Branching Support
  useEffect(() => {
    if (!initialNodes) return;

    // 1. Process Nodes and assign logical positions if they don't have them
    const processedNodes = [...initialNodes];
    const processedConnections = initialConnections || [];

    // Simple auto-layout: Find Root (nodes with no exec inputs or Event nodes)
    const roots = processedNodes.filter(n => n.type === 'event' || !n.inputs.some(p => p.type === 'exec'));
    
    // Recursive or Wavefront layout
    const positionedIds = new Set<string>();
    const layoutQueue: { id: string, x: number, y: number }[] = roots.map((r, i) => ({ id: r.id, x: 50, y: 100 + (i * 400) }));

    while (layoutQueue.length > 0) {
        const { id, x, y } = layoutQueue.shift()!;
        if (positionedIds.has(id)) continue;

        const node = processedNodes.find(n => n.id === id);
        if (!node) continue;

        node.x = x;
        node.y = y;
        positionedIds.add(id);

        // Find children (nodes this node connects to)
        const children = processedConnections
            .filter(c => c.fromNode === id)
            .map(c => ({ 
                conn: c, 
                targetId: c.toNode 
            }));

        children.forEach(({ conn, targetId }, index) => {
            if (positionedIds.has(targetId)) return;
            
            // Layout children to the right
            // If multiple branches, shift Y
            const yShift = (index - (children.length / 2)) * VERTICAL_SPACING;
            layoutQueue.push({ 
                id: targetId, 
                x: x + HORIZONTAL_SPACING, 
                y: y + yShift 
            });
        });
    }

    // Assign fallback positions for orphans
    processedNodes.forEach((n, i) => {
        if (!positionedIds.has(n.id)) {
            n.x = 50;
            n.y = 800 + (i * 200);
        }
    });

    setNodes(processedNodes);
    setConnections(processedConnections);
    setPan({ x: 50, y: 50 });
  }, [initialNodes, initialConnections]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDraggingCanvas(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleNodeDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDraggedNodeId(id);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (draggedNodeId) {
        setNodes(prev => prev.map(n => {
            if (n.id !== draggedNodeId) return n;
            return { ...n, x: n.x + deltaX / zoom, y: n.y + deltaY / zoom };
        }));
    } else if (isDraggingCanvas) {
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  };

  const handleMouseUp = () => {
      setIsDraggingCanvas(false);
      setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      const scaleAmount = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(zoom + scaleAmount, 0.1), 3);
      setZoom(newZoom);
  };

  const getPinCoordinates = (nodeId: string, pinName: string, side: 'input' | 'output') => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return null;

      const pinIndex = side === 'input' 
          ? node.inputs.findIndex(p => p.name === pinName)
          : node.outputs.findIndex(p => p.name === pinName);
      
      if (pinIndex === -1) return null;

      const yOffset = getPinOffsetY(pinIndex);
      const x = side === 'input' ? node.x : node.x + NODE_WIDTH;
      const y = node.y + yOffset;

      return { x, y, node };
  };

  const connectedPins = useMemo(() => {
     const map = new Map<string, Set<string>>();
     connections.forEach(conn => {
         if (!map.has(conn.fromNode)) map.set(conn.fromNode, new Set());
         map.get(conn.fromNode)?.add(`${conn.fromPin}-output`);
         if (!map.has(conn.toNode)) map.set(conn.toNode, new Set());
         map.get(conn.toNode)?.add(`${conn.toPin}-input`);
     });
     return map;
  }, [connections]);

  const getWireColor = (pinType: string) => {
      switch(pinType) {
          case 'exec': return '#FFFFFF';
          case 'bool': return '#8A0000';
          case 'float': return '#35D048';
          case 'integer': return '#00E5CC';
          case 'vector': return '#FFC600';
          case 'object': return '#00A8FF';
          case 'string': return '#FF00D4';
          case 'rotator': return '#9933ff';
          case 'transform': return '#ff6600';
          default: return '#00A8FF';
      }
  };

  const wires = useMemo(() => {
      const paths: React.ReactElement[] = [];
      connections.forEach((conn, i) => {
          const start = getPinCoordinates(conn.fromNode, conn.fromPin, 'output');
          const end = getPinCoordinates(conn.toNode, conn.toPin, 'input');

          if (start && end) {
              const startX = start.x;
              const startY = start.y;
              const endX = end.x;
              const endY = end.y;

              const dist = Math.abs(endX - startX) * 0.5;
              const cp1x = startX + dist;
              const cp2x = endX - dist;

              const sourcePin = start.node.outputs.find(p => p.name === conn.fromPin);
              const pinType = sourcePin?.type || 'exec';
              const color = mode === 'material' ? '#ffffff' : getWireColor(pinType);
              const strokeWidth = pinType === 'exec' ? 3 : 2;

              const d = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
              paths.push(
                  <path 
                    key={`wire-${i}`} 
                    d={d} 
                    stroke={color} 
                    strokeWidth={strokeWidth} 
                    fill="none" 
                    className={`drop-shadow-md transition-all duration-75 ${pinType === 'exec' ? 'opacity-100' : 'opacity-80'}`} 
                  />
              );
          }
      });
      return paths;
  }, [nodes, connections, mode]);

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full min-h-[600px] bg-[#1a1a1a] rounded-xl overflow-hidden shadow-inner group select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDraggingCanvas ? 'grabbing' : 'grab' }}
    >
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
            <div className="flex bg-slate-800/90 rounded-lg border border-white/10 overflow-hidden shadow-xl">
                <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-2 hover:bg-white/10 text-white"><ZoomIn className="w-4 h-4" /></button>
                <div className="w-px bg-white/10"></div>
                <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} className="p-2 hover:bg-white/10 text-white"><ZoomOut className="w-4 h-4" /></button>
                <div className="w-px bg-white/10"></div>
                <div className="px-3 py-2 text-xs font-mono text-slate-400 min-w-[60px] text-center">{Math.round(zoom * 100)}%</div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsHeatmapMode(!isHeatmapMode)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                        isHeatmapMode
                            ? 'bg-rose-600 text-white border-rose-400 shadow-rose-950/50'
                            : 'bg-slate-800/90 text-slate-300 border-white/10 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Toggle execution intensity heatmap overlay on graph nodes"
                >
                    <Flame className={`w-3.5 h-3.5 ${isHeatmapMode ? 'text-rose-200 fill-rose-200 animate-pulse' : 'text-rose-400'}`} />
                    <span>Heatmap {isHeatmapMode ? 'ON' : 'OFF'}</span>
                </button>

                <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] text-slate-400 font-medium flex items-center gap-2 w-fit">
                    <Move className="w-3 h-3" /> Drag Canvas
                </div>
            </div>
        </div>

        <div className="absolute inset-0 pointer-events-none" 
             style={{ 
                backgroundColor: '#111',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
             }} 
        />
        
        <div className="absolute inset-0 transform origin-top-left will-change-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {wires}
            </svg>
            {nodes.map(node => (
                <BlueprintNode 
                    key={node.id} 
                    data={node} 
                    connectedPins={connectedPins.get(node.id)}
                    onNodeDown={handleNodeDown}
                    heatmapIntensity={heatmapMap.get(node.id)}
                />
            ))}
        </div>

        <div className="absolute top-4 right-4 text-[10px] text-white/30 font-bold uppercase border border-white/10 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
            {mode.toUpperCase()} Graph View
        </div>
    </div>
  );
};

export default BlueprintCanvas;
