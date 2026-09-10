import { GamePlan, BlueprintSpec, AssetType } from '../types';
import { getAssetTags } from './blueprintTags';

export type DependencyType = 
  | 'inheritance' 
  | 'component' 
  | 'variable' 
  | 'cast' 
  | 'interface' 
  | 'input' 
  | 'ai' 
  | 'reference';

export interface GraphNode {
  id: string;
  name: string;
  type: AssetType;
  parentClass: string;
  folder: string;
  tags: string[];
  inDegree: number;
  outDegree: number;
  dependencies: string[]; // Target asset names that this node depends on
  dependents: string[];   // Source asset names that depend on this node
  hasCircularDep: boolean;
  depth: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string; // From asset
  target: string; // To asset (dependency)
  type: DependencyType;
  label: string;
  isCircular: boolean;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  criticalNodes: string[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    cycleCount: number;
    maxDepth: number;
    decouplingScore: number; // 0-100%
  };
}

/**
 * Builds a dependency graph between all blueprints and assets
 */
export function buildDependencyGraph(
  plan?: GamePlan,
  savedBlueprints: Record<string, BlueprintSpec> = {},
  savedBehaviorTrees: Record<string, any> = {},
  savedInputs: Record<string, any> = {},
  savedMaterials: Record<string, any> = {},
  savedMetaSounds: Record<string, any> = {},
  savedPcgs: Record<string, any> = {},
  projectId = 'default_project'
): DependencyGraphData {
  const assetMap = new Map<string, { name: string; folder: string; type: AssetType; parentClass?: string }>();

  // 1. Gather all assets from GamePlan tasks
  (plan?.phases || []).forEach(phase => {
    (phase.tasks || []).forEach(t => {
      if (t.assetName && t.assetName.length > 2) {
        let type: AssetType = 'Blueprint';
        const n = t.assetName;
        if (n.startsWith('WBP_')) type = 'Widget';
        else if (n.startsWith('M_') || n.startsWith('MI_')) type = 'Material';
        else if (n.startsWith('IA_') || n.startsWith('IMC_')) type = 'Input';
        else if (n.startsWith('MS_')) type = 'MetaSound';
        else if (n.startsWith('PCG_')) type = 'PCG';
        else if (n.startsWith('BT_') || n.startsWith('BB_')) type = 'BehaviorTree';

        assetMap.set(n, {
          name: n,
          folder: t.folderPath || '/Game/Blueprints',
          type,
          parentClass: savedBlueprints[n]?.parentClass || 'Actor'
        });
      }
    });
  });

  // 2. Gather from all saved caches
  Object.keys(savedBlueprints).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, {
        name,
        folder: '/Game/Blueprints',
        type: name.startsWith('WBP_') ? 'Widget' : 'Blueprint',
        parentClass: savedBlueprints[name].parentClass || 'Actor'
      });
    }
  });

  Object.keys(savedBehaviorTrees).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, { name, folder: '/Game/AI', type: 'BehaviorTree' });
    }
  });

  Object.keys(savedInputs).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, { name, folder: '/Game/Input', type: 'Input' });
    }
  });

  Object.keys(savedMaterials).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, { name, folder: '/Game/Materials', type: 'Material' });
    }
  });

  Object.keys(savedMetaSounds).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, { name, folder: '/Game/Audio', type: 'MetaSound' });
    }
  });

  Object.keys(savedPcgs).forEach(name => {
    if (!assetMap.has(name)) {
      assetMap.set(name, { name, folder: '/Game/PCG', type: 'PCG' });
    }
  });

  const allAssetNames = Array.from(assetMap.keys());
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (source: string, target: string, type: DependencyType, label: string) => {
    if (source === target || !assetMap.has(target)) return;
    const key = `${source}->${target}:${type}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `edge_${source}_${target}_${edges.length}`,
        source,
        target,
        type,
        label,
        isCircular: false
      });
    }
  };

  // 3. Discover Dependencies
  allAssetNames.forEach(assetName => {
    const asset = assetMap.get(assetName)!;
    const spec = savedBlueprints[assetName];

    // Check Inheritance
    if (spec?.parentClass && assetMap.has(spec.parentClass)) {
      addEdge(assetName, spec.parentClass, 'inheritance', 'Extends / Inherits');
    }

    // Check Components
    (spec?.components || []).forEach(compStr => {
      allAssetNames.forEach(otherName => {
        if (compStr.includes(otherName)) {
          addEdge(assetName, otherName, 'component', 'Contains Component');
        }
      });
    });

    // Check Variables
    (spec?.variables || []).forEach(v => {
      allAssetNames.forEach(otherName => {
        if (v.type.includes(otherName) || (v.tooltip && v.tooltip.includes(otherName))) {
          addEdge(assetName, otherName, 'variable', `Variable: ${v.name}`);
        }
      });
    });

    // Check Functions
    (spec?.functions || []).forEach(fn => {
      allAssetNames.forEach(otherName => {
        if (
          (fn.returnType && fn.returnType.includes(otherName)) ||
          (fn.parameters || []).some(p => p.includes(otherName)) ||
          fn.logicDescription.includes(otherName)
        ) {
          addEdge(assetName, otherName, 'cast', `API Call: ${fn.name}`);
        }
      });
    });

    // Check Event Graphs
    (spec?.eventGraph || []).forEach(graph => {
      allAssetNames.forEach(otherName => {
        if (graph.description.includes(otherName) || graph.eventName.includes(otherName)) {
          addEdge(assetName, otherName, 'reference', 'Event Graph Reference');
        }
      });
    });

    // Implicit UE Conventions & Subsystem Links
    // Player Character -> Input contexts & actions
    if (assetName.includes('Player') || assetName.includes('Character') || assetName.startsWith('BP_Player')) {
      allAssetNames.forEach(otherName => {
        if (otherName.startsWith('IMC_') || otherName.startsWith('IA_')) {
          addEdge(assetName, otherName, 'input', 'Enhanced Input Binding');
        }
        if (otherName.startsWith('WBP_') && (otherName.includes('HUD') || otherName.includes('Health'))) {
          addEdge(otherName, assetName, 'cast', 'Reads Player State');
        }
      });
    }

    // AI Behavior Trees -> Enemy Pawns & Blackboards
    if (asset.type === 'BehaviorTree' || assetName.startsWith('BT_')) {
      allAssetNames.forEach(otherName => {
        if (otherName.startsWith('BB_') || (otherName.startsWith('BP_') && otherName.includes('Enemy'))) {
          addEdge(assetName, otherName, 'ai', 'AI Controller / Pawn Target');
        }
      });
    }

    // GameMode -> Player Character & Controller
    if (assetName.startsWith('GM_') || assetName.includes('GameMode')) {
      allAssetNames.forEach(otherName => {
        if (otherName.startsWith('BP_Player') || otherName.startsWith('PC_') || otherName.startsWith('WBP_')) {
          addEdge(assetName, otherName, 'reference', 'Default Pawn / HUD Class');
        }
      });
    }
  });

  // 4. Cycle Detection (Tarjan / DFS)
  const adjacency = new Map<string, string[]>();
  allAssetNames.forEach(name => adjacency.set(name, []));
  edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target);
  });

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  const detectCycles = (node: string) => {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCycles(neighbor);
      } else if (recStack.has(neighbor)) {
        // Cycle found
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex).concat(neighbor);
          cycles.push(cycle);
        }
      }
    }

    recStack.delete(node);
    path.pop();
  };

  allAssetNames.forEach(node => {
    if (!visited.has(node)) {
      detectCycles(node);
    }
  });

  // Mark circular edges
  const circularPairSet = new Set<string>();
  cycles.forEach(cycle => {
    for (let i = 0; i < cycle.length - 1; i++) {
      circularPairSet.add(`${cycle[i]}->${cycle[i + 1]}`);
    }
  });

  edges.forEach(edge => {
    if (circularPairSet.has(`${edge.source}->${edge.target}`)) {
      edge.isCircular = true;
    }
  });

  const circularNodesSet = new Set<string>();
  cycles.forEach(c => c.forEach(n => circularNodesSet.add(n)));

  // 5. Calculate In/Out Degrees and Depths
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();
  const depMap = new Map<string, string[]>();
  const dependentMap = new Map<string, string[]>();

  allAssetNames.forEach(name => {
    inDegreeMap.set(name, 0);
    outDegreeMap.set(name, 0);
    depMap.set(name, []);
    dependentMap.set(name, []);
  });

  edges.forEach(e => {
    outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
    depMap.get(e.source)?.push(e.target);
    dependentMap.get(e.target)?.push(e.source);
  });

  // Calculate Node Depths (Topological / Level Assignment)
  const depthMap = new Map<string, number>();
  const calculateDepth = (nodeId: string, currentDepth: number, seen: Set<string>): number => {
    if (seen.has(nodeId)) return currentDepth;
    seen.add(nodeId);
    const deps = depMap.get(nodeId) || [];
    if (deps.length === 0) return currentDepth;
    let maxChildDepth = currentDepth;
    deps.forEach(child => {
      const childD = calculateDepth(child, currentDepth + 1, new Set(seen));
      if (childD > maxChildDepth) maxChildDepth = childD;
    });
    return maxChildDepth;
  };

  allAssetNames.forEach(name => {
    depthMap.set(name, calculateDepth(name, 0, new Set()));
  });

  // 6. Compute Node Layout Coordinates (Layered Horizontal / Vertical Graph Grid)
  const layerGroups: Record<number, string[]> = {};
  allAssetNames.forEach(name => {
    const d = depthMap.get(name) || 0;
    if (!layerGroups[d]) layerGroups[d] = [];
    layerGroups[d].push(name);
  });

  const nodePositions = new Map<string, { x: number; y: number }>();
  const layerXSpacing = 320;
  const nodeYSpacing = 140;

  Object.entries(layerGroups).forEach(([depthStr, names]) => {
    const depth = parseInt(depthStr, 10);
    const totalHeight = names.length * nodeYSpacing;
    const startY = 80;

    names.forEach((name, idx) => {
      const x = 80 + depth * layerXSpacing;
      const y = startY + idx * nodeYSpacing;
      nodePositions.set(name, { x, y });
    });
  });

  // Build Final Graph Nodes
  const nodes: GraphNode[] = allAssetNames.map(name => {
    const asset = assetMap.get(name)!;
    const pos = nodePositions.get(name) || { x: 100, y: 100 };
    const tags = getAssetTags(projectId, name, asset.type);

    return {
      id: name,
      name,
      type: asset.type,
      parentClass: asset.parentClass || (specParentMap(name) ?? 'Actor'),
      folder: asset.folder,
      tags,
      inDegree: inDegreeMap.get(name) || 0,
      outDegree: outDegreeMap.get(name) || 0,
      dependencies: depMap.get(name) || [],
      dependents: dependentMap.get(name) || [],
      hasCircularDep: circularNodesSet.has(name),
      depth: depthMap.get(name) || 0,
      x: pos.x,
      y: pos.y
    };
  });

  // Critical nodes: top 3 nodes with highest connectivity
  const criticalNodes = [...nodes]
    .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
    .slice(0, 3)
    .map(n => n.id);

  const maxDepth = Math.max(...nodes.map(n => n.depth), 0);
  const cyclePenalty = cycles.length * 15;
  const decouplingScore = Math.max(10, Math.min(100, Math.round(100 - cyclePenalty - (edges.length / (nodes.length || 1)) * 5)));

  return {
    nodes,
    edges,
    cycles,
    criticalNodes,
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      cycleCount: cycles.length,
      maxDepth,
      decouplingScore
    }
  };
}

function specParentMap(name: string): string {
  if (name.startsWith('GM_')) return 'GameModeBase';
  if (name.startsWith('PC_')) return 'PlayerController';
  if (name.startsWith('ABP_')) return 'AnimInstance';
  if (name.startsWith('WBP_')) return 'UserWidget';
  if (name.startsWith('BPC_')) return 'ActorComponent';
  if (name.startsWith('BT_')) return 'BehaviorTree';
  if (name.startsWith('BB_')) return 'BlackboardData';
  if (name.includes('Character')) return 'Character';
  if (name.includes('Pawn')) return 'Pawn';
  return 'Actor';
}
