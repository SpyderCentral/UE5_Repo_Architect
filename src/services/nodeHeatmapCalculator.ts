import { BlueprintSpec, NodeUsageHeatmapEntry, NodeData } from '../types';

export interface HeatmapAnalysisSummary {
  totalNodesScanned: number;
  uniqueNodeTypes: number;
  hotCount: number;
  warmCount: number;
  coolCount: number;
  tickBoundNodesCount: number;
  heavyTraceCount: number;
  hardCastCount: number;
  overallHealthScore: number; // 0 - 100
  entries: NodeUsageHeatmapEntry[];
}

/**
 * Categorizes node type and assigns performance impact weight
 */
function evaluateNodePerformance(nodeName: string, nodeType: string): {
  impact: 'low' | 'medium' | 'high';
  weight: number;
  tip: string;
} {
  const nameLower = nodeName.toLowerCase();

  // 1. Critical Performance Hotspots
  if (nameLower.includes('tick') || nameLower.includes('receivetick')) {
    return {
      impact: 'high',
      weight: 10,
      tip: 'EventTick executes every frame. High CPU game-thread impact; replace with Timers, Event Dispatchers, or async loops.'
    };
  }
  if (nameLower.includes('trace') || nameLower.includes('raycast') || nameLower.includes('sweep')) {
    return {
      impact: 'high',
      weight: 8,
      tip: 'Physics scene queries block game thread if un-batched. Cache results or use Async Physics Traces.'
    };
  }
  if (nameLower.includes('spawnactor') || nameLower.includes('spawn actor')) {
    return {
      impact: 'high',
      weight: 7.5,
      tip: 'Dynamic Actor spawning causes GC hitches and allocation spikes. Utilize Actor Pooling for high-frequency objects.'
    };
  }
  if (nameLower.includes('cast to') || (nodeType === 'flow' && nameLower.includes('cast'))) {
    return {
      impact: 'high',
      weight: 7,
      tip: 'Dynamic hard casting creates strong package references and loads dependent assets into memory. Prefer Blueprint Interfaces.'
    };
  }
  if (nameLower.includes('while') || nameLower.includes('for loop with break') || nameLower.includes('forloop')) {
    return {
      impact: 'medium',
      weight: 6,
      tip: 'Looping constructs can block the thread if iterating large collections. Time-slice over multiple frames if heavy.'
    };
  }
  if (nameLower.includes('getallactorsofclass') || nameLower.includes('get all actors')) {
    return {
      impact: 'high',
      weight: 9,
      tip: 'GetAllActorsOfClass walks entire UWorld actor array (O(N)). Maintain a registered gameplay tag subsystem or manager array.'
    };
  }

  // 2. Moderate Flow & Transform Nodes
  if (nameLower.includes('branch') || nameLower.includes('switch') || nameLower.includes('gate') || nameLower.includes('sequence')) {
    return {
      impact: 'medium',
      weight: 4.5,
      tip: 'Execution branching increases cyclomatic complexity. Keep flow trees flat to ease readability and compiler optimization.'
    };
  }
  if (nameLower.includes('timeline')) {
    return {
      impact: 'medium',
      weight: 5,
      tip: 'Timelines register internal tick components. Ensure timelines are paused or stopped when offscreen.'
    };
  }
  if (nameLower.includes('playsound') || nameLower.includes('play sound') || nameLower.includes('niagara')) {
    return {
      impact: 'medium',
      weight: 4,
      tip: 'Audio and VFX triggers. Prefer pooled MetaSounds and Niagara components over fire-and-forget spawns.'
    };
  }
  if (nameLower.includes('setactorlocation') || nameLower.includes('setactorrotation') || nameLower.includes('set transform')) {
    return {
      impact: 'medium',
      weight: 3.5,
      tip: 'Transform mutations trigger spatial tree invalidations in the PhysX/Chaos scene. Batch transform updates when possible.'
    };
  }

  // 3. Cool / Optimized Nodes (Pure math, getters, interface calls)
  if (nameLower.includes('getactorlocation') || nameLower.includes('getactorrotation') || nameLower.includes('get transform')) {
    return {
      impact: 'low',
      weight: 2,
      tip: 'Standard pure getter. Lightweight memory read from cached actor transform.'
    };
  }
  if (nameLower.startsWith('make ') || nameLower.startsWith('break ') || nameLower.includes('vector') || nameLower.includes('math') || nameLower.includes('+') || nameLower.includes('*')) {
    return {
      impact: 'low',
      weight: 1.5,
      tip: 'Pure mathematical operator. Inlined directly into bytecode with zero overhead.'
    };
  }
  if (nameLower.includes('is valid') || nameLower.includes('isvalid')) {
    return {
      impact: 'low',
      weight: 1.8,
      tip: 'Pointer null-safety guard. Best practice before dereferencing UObject references.'
    };
  }

  // Default fallback based on nodeType
  if (nodeType === 'event') {
    return {
      impact: 'medium',
      weight: 4,
      tip: 'Event execution trigger point. Ensure listeners unsubscribe when destroyed.'
    };
  }

  return {
    impact: 'low',
    weight: 2,
    tip: 'Standard Blueprint function node.'
  };
}

/**
 * Calculates usage intensity heatmap for a single blueprint or all blueprints
 */
export function calculateNodeHeatmap(
  blueprintsMap: Record<string, BlueprintSpec>,
  selectedBlueprintName?: string
): HeatmapAnalysisSummary {
  // Filter target blueprints
  const targetBlueprints: { name: string; spec: BlueprintSpec }[] = [];

  if (selectedBlueprintName && blueprintsMap[selectedBlueprintName]) {
    targetBlueprints.push({
      name: selectedBlueprintName,
      spec: blueprintsMap[selectedBlueprintName]
    });
  } else {
    Object.entries(blueprintsMap).forEach(([name, spec]) => {
      if (spec && spec.eventGraph) {
        targetBlueprints.push({ name, spec });
      }
    });
  }

  const nodeStats = new Map<
    string,
    {
      name: string;
      type: NodeData['type'];
      count: number;
      totalWires: number;
      weight: number;
      impact: 'low' | 'medium' | 'high';
      tip: string;
      blueprints: Map<string, { eventName: string; occurrences: number }>;
    }
  >();

  let totalNodesScanned = 0;
  let tickBoundNodesCount = 0;
  let heavyTraceCount = 0;
  let hardCastCount = 0;

  targetBlueprints.forEach(({ name: bpName, spec }) => {
    (spec.eventGraph || []).forEach(graph => {
      const eventName = graph.eventName || 'EventGraph';
      const nodes = graph.nodes || [];
      const connections = graph.connections || [];

      // Calculate wire connections per node
      const wireCounts = new Map<string, number>();
      connections.forEach(c => {
        wireCounts.set(c.fromNode, (wireCounts.get(c.fromNode) || 0) + 1);
        wireCounts.set(c.toNode, (wireCounts.get(c.toNode) || 0) + 1);
      });

      nodes.forEach(node => {
        totalNodesScanned++;
        const nodeName = node.name || 'UnnamedNode';
        const nodeType = node.type || 'function';

        const nameLower = nodeName.toLowerCase();
        if (nameLower.includes('tick')) tickBoundNodesCount++;
        if (nameLower.includes('trace') || nameLower.includes('sweep')) heavyTraceCount++;
        if (nameLower.includes('cast to')) hardCastCount++;

        const { impact, weight, tip } = evaluateNodePerformance(nodeName, nodeType);
        const wires = wireCounts.get(node.id) || (node.inputs?.length || 0) + (node.outputs?.length || 0);

        if (!nodeStats.has(nodeName)) {
          nodeStats.set(nodeName, {
            name: nodeName,
            type: nodeType,
            count: 0,
            totalWires: 0,
            weight,
            impact,
            tip,
            blueprints: new Map()
          });
        }

        const stat = nodeStats.get(nodeName)!;
        stat.count += 1;
        stat.totalWires += wires;

        const bpEntry = stat.blueprints.get(bpName) || { eventName, occurrences: 0 };
        bpEntry.occurrences += 1;
        stat.blueprints.set(bpName, bpEntry);
      });
    });
  });

  // Calculate maximum scores to normalize intensity (0 - 100)
  let maxRawScore = 1;
  const rawList: { name: string; rawScore: number }[] = [];

  nodeStats.forEach(stat => {
    // Usage intensity formula combines:
    // (Reference Frequency * 3.5) + (Average Wires * 1.5) + (Performance Hazard Weight * 4)
    const avgWires = stat.totalWires / Math.max(stat.count, 1);
    const rawScore = stat.count * 3.5 + avgWires * 1.5 + stat.weight * 4;
    rawList.push({ name: stat.name, rawScore });
    if (rawScore > maxRawScore) {
      maxRawScore = rawScore;
    }
  });

  let hotCount = 0;
  let warmCount = 0;
  let coolCount = 0;

  const entries: NodeUsageHeatmapEntry[] = Array.from(nodeStats.values()).map(stat => {
    const raw = rawList.find(r => r.name === stat.name)?.rawScore || 1;
    // Normalized intensity between 5 and 100
    const usageIntensity = Math.min(100, Math.max(10, Math.round((raw / maxRawScore) * 100)));

    let intensityTier: 'cool' | 'warm' | 'hot' = 'cool';
    if (usageIntensity >= 70 || stat.impact === 'high' && stat.count > 1) {
      intensityTier = 'hot';
      hotCount++;
    } else if (usageIntensity >= 40 || stat.impact === 'medium') {
      intensityTier = 'warm';
      warmCount++;
    } else {
      intensityTier = 'cool';
      coolCount++;
    }

    const referencedInBlueprints = Array.from(stat.blueprints.entries()).map(([bpName, info]) => ({
      assetName: bpName,
      eventName: info.eventName,
      occurrences: info.occurrences
    }));

    return {
      nodeName: stat.name,
      nodeType: stat.type as any,
      referenceCount: stat.count,
      totalConnections: stat.totalWires,
      usageIntensity,
      intensityTier,
      performanceImpact: stat.impact,
      referencedInBlueprints,
      optimizationTip: stat.tip
    };
  });

  // Sort descending by usage intensity
  entries.sort((a, b) => b.usageIntensity - a.usageIntensity || b.referenceCount - a.referenceCount);

  // Overall health score: penalty for hot nodes and tick nodes
  let healthPenalty = (tickBoundNodesCount * 15) + (hardCastCount * 5) + (heavyTraceCount * 6) + (hotCount * 3);
  const overallHealthScore = Math.max(20, Math.min(100, Math.round(100 - healthPenalty)));

  return {
    totalNodesScanned,
    uniqueNodeTypes: entries.length,
    hotCount,
    warmCount,
    coolCount,
    tickBoundNodesCount,
    heavyTraceCount,
    hardCastCount,
    overallHealthScore,
    entries
  };
}
