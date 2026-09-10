import { GamePlan, Phase, Task, PlanSnapshot, PlanDiffResult, PhaseDiffItem, TaskDiffItem } from '../types';

const SNAPSHOT_STORAGE_PREFIX = 'ue5_plan_snapshots_';
const MAX_SNAPSHOTS = 25;

/**
 * Retrieves all stored snapshots for a specific project
 */
export function getSavedSnapshots(projectIdOrTitle: string): PlanSnapshot[] {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_STORAGE_PREFIX}${projectIdOrTitle}`);
    if (!raw) return [];
    const snapshots: PlanSnapshot[] = JSON.parse(raw);
    return Array.isArray(snapshots) ? snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  } catch (err) {
    console.error(`Failed to load snapshots for project ${projectIdOrTitle}:`, err);
    return [];
  }
}

export const getPlanSnapshots = getSavedSnapshots;

/**
 * Creates and persists a new snapshot of the current game plan
 */
export function saveSnapshot(
  projectIdOrTitle: string,
  arg2: string | GamePlan,
  arg3?: GamePlan | string,
  notes?: string,
  source: 'manual' | 'auto' = 'manual'
): PlanSnapshot {
  const currentSnapshots = getSavedSnapshots(projectIdOrTitle);
  const now = new Date();
  const dateStr = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let name = `Milestone (${dateStr})`;
  let plan: GamePlan;

  if (typeof arg2 === 'string') {
    name = arg2.trim() || name;
    plan = (arg3 as GamePlan) || { title: 'Untitled', summary: '', targetPlatformRecommendations: [], phases: [] };
  } else {
    plan = arg2;
    if (typeof arg3 === 'string') {
      name = arg3.trim() || name;
    }
  }

  const totalTasks = (plan.phases || []).reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const totalPhases = plan.phases?.length || 0;

  const newSnapshot: PlanSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    createdAt: now.toISOString(),
    plan: JSON.parse(JSON.stringify(plan)), // deep clone
    notes: notes?.trim() || `Snapshot with ${totalPhases} phases and ${totalTasks} tasks.`,
    source,
    totalTasks,
    totalPhases
  };

  // Prepend and cap at MAX_SNAPSHOTS
  const updated = [newSnapshot, ...currentSnapshots].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(`${SNAPSHOT_STORAGE_PREFIX}${projectIdOrTitle}`, JSON.stringify(updated));
  } catch (err) {
    console.error(`Failed to store snapshot for ${projectIdOrTitle}:`, err);
  }

  return newSnapshot;
}

export const createPlanSnapshot = saveSnapshot;

/**
 * Deletes a snapshot by ID
 */
export function deleteSnapshot(projectIdOrTitle: string, snapshotId: string): boolean {
  try {
    const current = getSavedSnapshots(projectIdOrTitle);
    const filtered = current.filter(s => s.id !== snapshotId);
    localStorage.setItem(`${SNAPSHOT_STORAGE_PREFIX}${projectIdOrTitle}`, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error(`Failed to delete snapshot ${snapshotId}:`, err);
    return false;
  }
}

export const deletePlanSnapshot = deleteSnapshot;

/**
 * Clears all snapshots for a project
 */
export function clearAllPlanSnapshots(projectIdOrTitle: string): void {
  try {
    localStorage.removeItem(`${SNAPSHOT_STORAGE_PREFIX}${projectIdOrTitle}`);
  } catch (err) {
    console.error(`Failed to clear snapshots for ${projectIdOrTitle}:`, err);
  }
}

/**
 * Compare two tasks and return diff structure
 */
function compareTasks(oldTask?: Task, newTask?: Task): TaskDiffItem {
  if (!oldTask && newTask) {
    return {
      type: 'added',
      title: newTask.title,
      assetName: newTask.assetName,
      description: newTask.description
    };
  }

  if (oldTask && !newTask) {
    return {
      type: 'removed',
      title: oldTask.title,
      assetName: oldTask.assetName,
      description: oldTask.description
    };
  }

  if (oldTask && newTask) {
    const changes: { field: string; oldVal?: string; newVal?: string }[] = [];

    if (oldTask.title !== newTask.title) {
      changes.push({ field: 'Title', oldVal: oldTask.title, newVal: newTask.title });
    }
    if (oldTask.description !== newTask.description) {
      changes.push({ field: 'Description', oldVal: oldTask.description, newVal: newTask.description });
    }
    if (oldTask.assetName !== newTask.assetName) {
      changes.push({ field: 'Target Asset', oldVal: oldTask.assetName, newVal: newTask.assetName });
    }
    if (oldTask.folderPath !== newTask.folderPath) {
      changes.push({ field: 'Folder Path', oldVal: oldTask.folderPath, newVal: newTask.folderPath });
    }

    const isModified = changes.length > 0;

    return {
      type: isModified ? 'modified' : 'unchanged',
      title: newTask.title,
      assetName: newTask.assetName,
      description: newTask.description,
      changes: isModified ? changes : undefined
    };
  }

  return {
    type: 'unchanged',
    title: 'Unknown Task'
  };
}

/**
 * Computes difference between base plan (old) and target plan (new/current)
 */
export function computePlanDiff(
  oldPlan: GamePlan,
  newPlan: GamePlan,
  sourceName = 'Previous Version',
  targetName = 'Current Working Plan'
): PlanDiffResult {
  const oldPhases = oldPlan.phases || [];
  const newPhases = newPlan.phases || [];

  const phaseDiffs: PhaseDiffItem[] = [];

  let phasesAdded = 0;
  let phasesRemoved = 0;
  let phasesModified = 0;
  let phasesUnchanged = 0;

  let tasksAdded = 0;
  let tasksRemoved = 0;
  let tasksModified = 0;
  let tasksUnchanged = 0;

  // Map phases by normalized name
  const oldPhaseMap = new Map<string, Phase>();
  oldPhases.forEach((p, idx) => {
    const key = p.phaseName.toLowerCase().trim() || `phase-${idx}`;
    oldPhaseMap.set(key, p);
  });

  const processedOldPhaseKeys = new Set<string>();

  // Process all new phases
  newPhases.forEach((newP, nIdx) => {
    const key = newP.phaseName.toLowerCase().trim() || `phase-${nIdx}`;
    const oldP = oldPhaseMap.get(key) || (nIdx < oldPhases.length ? oldPhases[nIdx] : undefined);

    if (oldP) {
      processedOldPhaseKeys.add(oldP.phaseName.toLowerCase().trim() || `phase-${nIdx}`);

      // Compare tasks in this phase
      const oldTasks = oldP.tasks || [];
      const newTasks = newP.tasks || [];
      const taskDiffs: TaskDiffItem[] = [];

      const oldTaskMap = new Map<string, Task>();
      oldTasks.forEach((t, tIdx) => {
        const tKey = (t.assetName || t.title).toLowerCase().trim() || `task-${tIdx}`;
        oldTaskMap.set(tKey, t);
      });

      const processedOldTaskKeys = new Set<string>();

      newTasks.forEach((newT, ntIdx) => {
        const tKey = (newT.assetName || newT.title).toLowerCase().trim() || `task-${ntIdx}`;
        const oldT = oldTaskMap.get(tKey) || (ntIdx < oldTasks.length ? oldTasks[ntIdx] : undefined);

        if (oldT) {
          processedOldTaskKeys.add((oldT.assetName || oldT.title).toLowerCase().trim() || `task-${ntIdx}`);
          const diff = compareTasks(oldT, newT);
          if (diff.type === 'modified') tasksModified++;
          else tasksUnchanged++;
          taskDiffs.push(diff);
        } else {
          tasksAdded++;
          taskDiffs.push(compareTasks(undefined, newT));
        }
      });

      // Find removed tasks in old phase
      oldTasks.forEach((oldT, otIdx) => {
        const tKey = (oldT.assetName || oldT.title).toLowerCase().trim() || `task-${otIdx}`;
        if (!processedOldTaskKeys.has(tKey)) {
          tasksRemoved++;
          taskDiffs.push(compareTasks(oldT, undefined));
        }
      });

      const isDurationChanged = oldP.duration !== newP.duration;
      const isGoalChanged = oldP.goal !== newP.goal;
      const hasTaskChanges = taskDiffs.some(td => td.type !== 'unchanged');

      const isPhaseModified = isDurationChanged || isGoalChanged || hasTaskChanges;

      if (isPhaseModified) {
        phasesModified++;
      } else {
        phasesUnchanged++;
      }

      phaseDiffs.push({
        type: isPhaseModified ? 'modified' : 'unchanged',
        phaseName: newP.phaseName,
        oldDuration: oldP.duration,
        newDuration: newP.duration,
        oldGoal: oldP.goal,
        newGoal: newP.goal,
        tasks: taskDiffs
      });
    } else {
      // Entirely new phase added
      phasesAdded++;
      const taskDiffs: TaskDiffItem[] = (newP.tasks || []).map(t => {
        tasksAdded++;
        return compareTasks(undefined, t);
      });

      phaseDiffs.push({
        type: 'added',
        phaseName: newP.phaseName,
        newDuration: newP.duration,
        newGoal: newP.goal,
        tasks: taskDiffs
      });
    }
  });

  // Find removed phases in old plan
  oldPhases.forEach((oldP, oIdx) => {
    const key = oldP.phaseName.toLowerCase().trim() || `phase-${oIdx}`;
    if (!processedOldPhaseKeys.has(key)) {
      phasesRemoved++;
      const taskDiffs: TaskDiffItem[] = (oldP.tasks || []).map(t => {
        tasksRemoved++;
        return compareTasks(t, undefined);
      });

      phaseDiffs.push({
        type: 'removed',
        phaseName: oldP.phaseName,
        oldDuration: oldP.duration,
        oldGoal: oldP.goal,
        tasks: taskDiffs
      });
    }
  });

  // Compare plugins
  const oldPlugins = new Set(oldPlan.requiredPlugins || []);
  const newPlugins = new Set(newPlan.requiredPlugins || []);

  const pluginsAdded = (newPlan.requiredPlugins || []).filter(p => !oldPlugins.has(p));
  const pluginsRemoved = (oldPlan.requiredPlugins || []).filter(p => !newPlugins.has(p));

  // High-level architecture summary change
  const highLevelArchitectureChanged = (oldPlan.summary || '') !== (newPlan.summary || '');

  const totalChanges = phasesAdded + phasesRemoved + phasesModified + tasksAdded + tasksRemoved + tasksModified + pluginsAdded.length + pluginsRemoved.length + (highLevelArchitectureChanged ? 1 : 0);

  return {
    sourceSnapshotName: sourceName,
    targetSnapshotName: targetName,
    timestamp: new Date().toISOString(),
    summary: {
      phasesAdded,
      phasesRemoved,
      phasesModified,
      phasesUnchanged,
      tasksAdded,
      tasksRemoved,
      tasksModified,
      tasksUnchanged,
      pluginsAdded,
      pluginsRemoved,
      totalChanges
    },
    phaseDiffs,
    highLevelArchitectureChanged,
    oldArchitecture: oldPlan.summary,
    newArchitecture: newPlan.summary
  };
}

/**
 * Formats a diff result as a readable Markdown changelog string
 */
export function formatPlanDiffAsMarkdown(diff: PlanDiffResult): string {
  const lines: string[] = [];
  lines.push(`# Architectural Plan Changelog`);
  lines.push(`**Comparison**: \`${diff.sourceSnapshotName}\` → \`${diff.targetSnapshotName}\``);
  lines.push(`**Generated**: ${new Date(diff.timestamp).toLocaleString()}`);
  lines.push(`\n## Summary of Modifications`);
  lines.push(`- **Phases**: +${diff.summary.phasesAdded} Added, -${diff.summary.phasesRemoved} Removed, ~${diff.summary.phasesModified} Modified`);
  lines.push(`- **Tasks**: +${diff.summary.tasksAdded} Added, -${diff.summary.tasksRemoved} Removed, ~${diff.summary.tasksModified} Modified`);
  if (diff.summary.pluginsAdded.length > 0) {
    lines.push(`- **Plugins Added**: ${diff.summary.pluginsAdded.join(', ')}`);
  }
  if (diff.summary.pluginsRemoved.length > 0) {
    lines.push(`- **Plugins Removed**: ${diff.summary.pluginsRemoved.join(', ')}`);
  }

  lines.push(`\n## Detailed Phase Breakdown`);
  diff.phaseDiffs.forEach((pd, idx) => {
    const symbol = pd.type === 'added' ? '[+]' : pd.type === 'removed' ? '[-]' : pd.type === 'modified' ? '[~]' : '[=]';
    lines.push(`\n### ${symbol} Phase ${idx + 1}: ${pd.phaseName}`);
    if (pd.newDuration && pd.newDuration !== pd.oldDuration) {
      lines.push(`- **Duration**: \`${pd.oldDuration || 'N/A'}\` → \`${pd.newDuration}\``);
    }
    if (pd.newGoal && pd.newGoal !== pd.oldGoal) {
      lines.push(`- **Goal**: ${pd.newGoal}`);
    }

    if (pd.tasks && pd.tasks.length > 0) {
      lines.push(`\n#### Tasks`);
      pd.tasks.forEach(td => {
        const tSymbol = td.type === 'added' ? '+' : td.type === 'removed' ? '-' : td.type === 'modified' ? '~' : ' ';
        const assetTag = td.assetName ? ` \`[${td.assetName}]\`` : '';
        lines.push(`- [${tSymbol}] **${td.title}**${assetTag}`);
        if (td.changes) {
          td.changes.forEach(c => {
            lines.push(`  - *${c.field}*: \`${c.oldVal || 'empty'}\` → \`${c.newVal || 'empty'}\``);
          });
        }
      });
    }
  });

  return lines.join('\n');
}
