import { BlueprintSpec, BlueprintComplexityInfo } from '../types';

/**
 * Calculates a comprehensive Complexity Score (0 - 100+) for a Blueprint specification.
 * Evaluates:
 * - Node count across all event graphs
 * - Connection count (wire density)
 * - Cyclomatic branching density (Branch, Switch, Gate, MultiGate, Sequence)
 * - Tick penalty (per-frame logic introduces high maintenance & runtime latency)
 * - Hard casting density (CastTo coupling)
 * - Internal state complexity (variable & function count)
 */
export function calculateBlueprintComplexity(
  assetName: string,
  spec?: BlueprintSpec,
  parentClass?: string
): BlueprintComplexityInfo {
  if (!spec) {
    // Return baseline for pending/un-generated blueprint
    return {
      score: 10,
      tier: 'low',
      tierLabel: 'Minimal / Uncompiled',
      color: 'text-slate-400',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      breakdown: {
        nodeCount: 0,
        connectionCount: 0,
        branchCount: 0,
        functionCount: 0,
        variableCount: 0,
        hasTick: false,
        dynamicCasts: 0,
        rawComplexity: 10
      },
      recommendations: ['Select or generate blueprint logic to evaluate runtime complexity.']
    };
  }

  const events = spec.eventGraph || [];
  const functions = spec.functions || [];
  const variables = spec.variables || [];
  const dispatchers = spec.dispatchers || [];

  let nodeCount = 0;
  let connectionCount = 0;
  let branchCount = 0;
  let hasTick = false;
  let dynamicCasts = 0;

  events.forEach(graph => {
    const eventLower = (graph.eventName || '').toLowerCase();
    if (eventLower.includes('tick') || eventLower.includes('receivetick')) {
      hasTick = true;
    }

    const nodes = graph.nodes || [];
    nodeCount += nodes.length;

    const connections = graph.connections || [];
    connectionCount += connections.length;

    nodes.forEach(node => {
      const nameLower = (node.name || '').toLowerCase();
      // Branching / cyclomatic divergence nodes
      if (
        nameLower.includes('branch') ||
        nameLower.includes('switch') ||
        nameLower.includes('gate') ||
        nameLower.includes('multigate') ||
        nameLower.includes('sequence') ||
        nameLower.includes('select') ||
        nameLower.includes('while') ||
        nameLower.includes('for')
      ) {
        branchCount++;
      }

      if (nameLower.includes('cast to') || (node.type === 'flow' && nameLower.includes('cast'))) {
        dynamicCasts++;
      }
    });
  });

  // Calculate weighted complexity components
  // Base weights:
  // Node weight: 1.6 pts each
  // Connection weight: 1.4 pts each
  // Branch / Cyclomatic: 3.5 pts each
  // Function: 1.5 pts each
  // Variable: 0.8 pts each
  // Event Tick: +18 pts (strong refactoring incentive)
  // Dynamic Casts: +4.0 pts each (memory coupling)
  const nodePoints = nodeCount * 1.6;
  const connectionPoints = connectionCount * 1.4;
  const branchPoints = branchCount * 3.5;
  const functionPoints = functions.length * 1.5;
  const variablePoints = variables.length * 0.8;
  const dispatcherDiscount = Math.min(dispatchers.length * 2.0, 10); // Dispatchers decouple logic, reducing complexity!
  const tickPenalty = hasTick ? 18 : 0;
  const castPenalty = dynamicCasts * 4.0;

  const raw = 
    nodePoints +
    connectionPoints +
    branchPoints +
    functionPoints +
    variablePoints +
    tickPenalty +
    castPenalty -
    dispatcherDiscount;

  // Normalized to 0 - 100+ scale (capped visual max at 100 for percentage bars, but score can exceed)
  const score = Math.max(5, Math.round(raw));

  let tier: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let tierLabel = 'Low (Optimal)';
  let color = 'text-emerald-400';
  let badgeClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';

  if (score >= 85) {
    tier = 'critical';
    tierLabel = 'Critical (Refactor Needed)';
    color = 'text-rose-400';
    badgeClass = 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/50';
  } else if (score >= 60) {
    tier = 'high';
    tierLabel = 'High Complexity';
    color = 'text-orange-400';
    badgeClass = 'bg-orange-950/60 text-orange-300 border-orange-500/40';
  } else if (score >= 35) {
    tier = 'moderate';
    tierLabel = 'Moderate';
    color = 'text-amber-400';
    badgeClass = 'bg-amber-950/50 text-amber-300 border-amber-500/30';
  }

  // Generate targeted, actionable refactoring tips
  const recommendations: string[] = [];

  if (hasTick) {
    recommendations.push(
      'EventTick detected (+18 complexity). Replace per-frame ticking with SetTimerByEvent, async Timeline, or delegate subscriptions.'
    );
  }

  if (dynamicCasts >= 2) {
    recommendations.push(
      `Detected ${dynamicCasts} dynamic hard Casts. Replace with Blueprint Interfaces (BPI) to decouple package dependencies and lower cyclic references.`
    );
  }

  if (branchCount > 3) {
    recommendations.push(
      `High cyclomatic branching (${branchCount} branch/switch nodes). Decompose nested branches into a State Machine pattern or pure helper functions.`
    );
  }

  if (connectionCount > 20 && connectionCount / Math.max(nodeCount, 1) > 1.8) {
    recommendations.push(
      'High wire density ratio (>1.8 connections/node). Spaghetti routing detected—group related execution chains into Blueprint Macros or Subroutines.'
    );
  }

  if (nodeCount > 25) {
    recommendations.push(
      `Sprawling node count (${nodeCount} nodes). Consider breaking this actor into decoupled ActorComponents (BPC_) or migrating performance-critical loops to C++ or Verse.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Logic structure is clean, modular, and within optimal maintainability thresholds.');
  }

  return {
    score,
    tier,
    tierLabel,
    color,
    badgeClass,
    breakdown: {
      nodeCount,
      connectionCount,
      branchCount,
      functionCount: functions.length,
      variableCount: variables.length,
      hasTick,
      dynamicCasts,
      rawComplexity: Math.round(raw)
    },
    recommendations
  };
}
