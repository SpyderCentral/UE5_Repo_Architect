import {
  BlueprintSpec,
  MaterialSpec,
  PcgSpec,
  MetaSoundSpec,
  BehaviorTreeSpec,
  EnhancedInputSpec,
  AssetResourceMetric,
  PlatformBudgetConfig,
  ProjectResourceSummary,
  RevisionTrendPoint
} from '../types';

export const PLATFORM_PRESETS: PlatformBudgetConfig[] = [
  {
    id: 'pc_high_60',
    name: 'PC High / Ultra (60 FPS)',
    targetFps: 60,
    targetFrameTimeMs: 16.67,
    maxCpuBudgetMs: 11.0,
    maxGpuBudgetMs: 13.5,
    maxDrawCalls: 2200,
    maxVramMb: 8192,
    description: 'Target for modern desktop GPUs (RTX 3070 / RX 6700 XT) with Lumen and Nanite enabled.'
  },
  {
    id: 'console_ps5_60',
    name: 'PS5 & Xbox Series X (60 FPS)',
    targetFps: 60,
    targetFrameTimeMs: 16.67,
    maxCpuBudgetMs: 10.0,
    maxGpuBudgetMs: 12.0,
    maxDrawCalls: 1800,
    maxVramMb: 10240,
    description: 'Fixed console target with hardware ray tracing, TSR upscaling, and strict 60Hz VSync lock.'
  },
  {
    id: 'steam_deck_30',
    name: 'Steam Deck / Mid-Range PC (30 FPS)',
    targetFps: 30,
    targetFrameTimeMs: 33.33,
    maxCpuBudgetMs: 20.0,
    maxGpuBudgetMs: 25.0,
    maxDrawCalls: 1100,
    maxVramMb: 4096,
    description: 'Portable handheld budget (APU 15W TDP). Requires aggressive LODs and capped shader complexity.'
  },
  {
    id: 'vr_quest3_90',
    name: 'Meta Quest 3 Native (90 FPS)',
    targetFps: 90,
    targetFrameTimeMs: 11.11,
    maxCpuBudgetMs: 6.5,
    maxGpuBudgetMs: 8.0,
    maxDrawCalls: 450,
    maxVramMb: 2560,
    description: 'Mobile XR budget. Stereo rendering doubles draw call costs; zero dynamic translucency permitted.'
  },
  {
    id: 'mobile_high_60',
    name: 'Mobile High Tier (60 FPS)',
    targetFps: 60,
    targetFrameTimeMs: 16.67,
    maxCpuBudgetMs: 7.5,
    maxGpuBudgetMs: 9.0,
    maxDrawCalls: 650,
    maxVramMb: 3072,
    description: 'High-end iOS/Android Vulkan/Metal pipeline. Strict bandwidth and battery thermals constraint.'
  }
];

export function calculateBlueprintMetric(
  assetName: string,
  spec: BlueprintSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const events = spec.eventGraph || [];
  const functions = spec.functions || [];
  const variables = spec.variables || [];
  const components = spec.components || [];
  const macros = spec.macros || [];

  let totalNodes = 0;
  let hasTick = false;
  let hasLoops = false;
  let dynamicCastsCount = 0;

  events.forEach(evt => {
    const nameLower = evt.eventName.toLowerCase();
    if (nameLower.includes('tick') || nameLower.includes('receivetick')) {
      hasTick = true;
    }
    const nodes = evt.nodes || [];
    totalNodes += nodes.length;
    nodes.forEach(n => {
      const nodeLower = (n.name || '').toLowerCase();
      if (nodeLower.includes('for') || nodeLower.includes('while') || nodeLower.includes('loop')) {
        hasLoops = true;
      }
      if (nodeLower.includes('cast to') || nodeLower.includes('cast')) {
        dynamicCastsCount++;
      }
    });
  });

  // Check component types
  let skeletalMeshCount = 0;
  let staticMeshCount = 0;
  let niagaraCount = 0;
  let lightOrCaptureCount = 0;

  components.forEach(c => {
    const compLower = c.toLowerCase();
    if (compLower.includes('skeletal') || compLower.includes('anim')) skeletalMeshCount++;
    else if (compLower.includes('staticmesh') || compLower.includes('mesh')) staticMeshCount++;
    else if (compLower.includes('niagara') || compLower.includes('particle')) niagaraCount++;
    else if (compLower.includes('capture') || compLower.includes('light') || compLower.includes('pointlight') || compLower.includes('spotlight')) lightOrCaptureCount++;
  });

  // Calculate CPU Game Thread Time (ms)
  // Base actor tick: 0.015ms
  let cpuCost = 0.02 + (totalNodes * 0.003) + (functions.length * 0.01) + (components.length * 0.015);
  if (hasTick) {
    cpuCost += 0.35; // Heavy penalty for Event Tick in Blueprints
    if (hasLoops) cpuCost += 0.45;
  }
  if (dynamicCastsCount > 2) {
    cpuCost += dynamicCastsCount * 0.02;
  }
  if (skeletalMeshCount > 0) {
    cpuCost += skeletalMeshCount * 0.12; // Skeletal mesh skinning & anim evaluation on CPU
  }

  // Calculate GPU Render Cost (ms)
  let gpuCost = 0.01 + (staticMeshCount * 0.03) + (skeletalMeshCount * 0.08) + (niagaraCount * 0.15) + (lightOrCaptureCount * 0.25);

  // Calculate Draw Calls
  let drawCalls = 1 + (staticMeshCount * 2) + (skeletalMeshCount * 4) + (niagaraCount * 3) + (lightOrCaptureCount * 6);

  // Calculate Memory / VRAM (MB)
  let memoryMb = 2.5 + (variables.length * 0.1) + (staticMeshCount * 8) + (skeletalMeshCount * 24) + (niagaraCount * 12);

  // Adjust for platform scale
  const scale = platform.targetFrameTimeMs / 16.67;
  const tickLoad = Math.min(100, Math.round((cpuCost / platform.maxCpuBudgetMs) * 100));

  const warnings: string[] = [];
  const tips: string[] = [];
  const commands: string[] = ['stat unit', 'stat dumpticks', 'dumpticks'];

  if (hasTick) {
    warnings.push(`'${assetName}' runs logic on Event Tick (${(cpuCost).toFixed(2)}ms frame impact).`);
    tips.push('Convert Event Tick to Event Dispatchers, Set Timer by Function Name, or Delegate Subscriptions.');
  }

  if (dynamicCastsCount >= 2) {
    warnings.push(`Detected ${dynamicCastsCount} dynamic Blueprint Casts. Casts create strong hard references in memory.`);
    tips.push('Replace hard Object Casts with Blueprint Interfaces (BPI) to avoid cascading memory package loads.');
    commands.push(`memreport -full`);
  }

  if (hasLoops && hasTick) {
    warnings.push(`Nested loop execution inside Event Tick detected. High risk of frame spikes.`);
    tips.push('Nativize heavy loops to C++ or batch execution with a Time-Sliced Queue.');
  }

  if (skeletalMeshCount > 1) {
    warnings.push(`Multiple Skeletal Mesh components (${skeletalMeshCount}). CPU animation pose blending will increase.`);
    tips.push('Use Leader Pose Component / Mesh Merge utility to unify animation evaluations into a single pass.');
  }

  if (lightOrCaptureCount > 0) {
    warnings.push(`SceneCapture or Dynamic Light attached. Can double shadow map and render pass overhead.`);
    tips.push('Disable "Capture Every Frame" on SceneCapture2D; trigger capture manually only on scene changes.');
    commands.push('profilegpu');
  }

  const nativizationCandidate = hasTick || totalNodes > 40 || functions.length > 5 || dynamicCastsCount > 3;
  if (nativizationCandidate) {
    tips.push('Candidate for C++ nativization. Synthesize C++ header/source in the Architect C++ view.');
  }

  let complexityScore = Math.min(100, Math.round(
    (totalNodes * 1.2) + (functions.length * 4) + (components.length * 5) + (hasTick ? 30 : 0) + (skeletalMeshCount * 15)
  ));

  let status: 'Nominal' | 'Warning' | 'Critical' = 'Nominal';
  if (cpuCost > (platform.maxCpuBudgetMs * 0.25) || hasTick && hasLoops || complexityScore >= 75) {
    status = 'Critical';
  } else if (cpuCost > (platform.maxCpuBudgetMs * 0.12) || hasTick || complexityScore >= 45) {
    status = 'Warning';
  }

  return {
    assetName,
    assetType: 'Blueprint',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    drawCalls: Math.round(drawCalls),
    tickLoadPercent: tickLoad,
    complexityScore,
    status,
    warnings,
    optimizationTips: tips,
    ue5ConsoleCommands: commands,
    nativizationCandidate
  };
}

export function calculateMaterialMetric(
  assetName: string,
  spec: MaterialSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const domain = spec.domain || 'Surface';
  const blendMode = spec.blendMode || 'Opaque';
  const nodes = spec.nodes || [];
  const connections = spec.connections || [];

  const isTranslucent = blendMode.toLowerCase().includes('translucent');
  const isMasked = blendMode.toLowerCase().includes('masked');
  const isPostProcess = domain.toLowerCase().includes('postprocess');

  // Estimate shader instructions
  let baseInstructions = 80;
  if (isTranslucent) baseInstructions += 140; // Translucent forward shading pass
  if (isMasked) baseInstructions += 65; // Early-Z depth prepass discard & overdraw
  if (isPostProcess) baseInstructions += 180;

  const textureSampleNodes = nodes.filter((n: any) => {
    const name = ((n.name || n.title || '') + '').toLowerCase();
    return name.includes('texture') || name.includes('sample') || name.includes('sampler');
  }).length || Math.max(2, Math.floor(nodes.length * 0.3));

  baseInstructions += textureSampleNodes * 22 + (nodes.length * 6);
  const shaderInstructions = Math.max(90, Math.min(850, baseInstructions));

  // GPU frame time in ms based on instruction count and blend mode
  let gpuCost = (shaderInstructions / 280) * 0.18;
  if (isTranslucent) gpuCost *= 2.2; // Fillrate overdraw penalty
  if (isMasked) gpuCost *= 1.4;

  const cpuCost = 0.005; // Materials have minimal CPU tick cost
  const drawCalls = isTranslucent ? 3 : isMasked ? 2 : 1;
  const memoryMb = parseFloat((8.0 + (textureSampleNodes * 12.0)).toFixed(1)); // 2K/4K texture maps

  const warnings: string[] = [];
  const tips: string[] = [];
  const commands: string[] = ['viewmode shadercomplexity', 'profilegpu', 'r.ShaderComplexity.Max 2000'];

  if (isTranslucent) {
    warnings.push(`Material uses Translucent blend mode (${shaderInstructions} instructions). Nanite does not support non-masked translucency in standard passes.`);
    tips.push('Enable "Masked with Dithered Opacity" to leverage Nanite rasterization and Early-Z rejection.');
    tips.push('Set Translucency Lighting Mode to "Volumetric NonDirectional" unless specular highlights are vital.');
  }

  if (textureSampleNodes > 6) {
    warnings.push(`Texture Sample count is high (${textureSampleNodes} samplers). Approaching GPU texture unit limits.`);
    tips.push('Channel-pack Roughness, Metallic, Ambient Occlusion, and Cavity into a single RMA/ORM texture (RGB channels).');
  }

  if (shaderInstructions > 300) {
    warnings.push(`Pixel shader instruction count (${shaderInstructions}) exceeds standard 250 budget.`);
    tips.push('Bake complex procedural noise graphs into runtime Virtual Textures (RVT) or static texture maps.');
  }

  let complexityScore = Math.min(100, Math.round((shaderInstructions / 450) * 100));
  let status: 'Nominal' | 'Warning' | 'Critical' = 'Nominal';
  if (shaderInstructions > 400 || (isTranslucent && shaderInstructions > 250)) {
    status = 'Critical';
  } else if (shaderInstructions > 220 || isTranslucent || textureSampleNodes > 5) {
    status = 'Warning';
  }

  return {
    assetName,
    assetType: 'Material',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb,
    drawCalls,
    tickLoadPercent: Math.round((gpuCost / platform.maxGpuBudgetMs) * 100),
    shaderInstructions,
    complexityScore,
    status,
    warnings,
    optimizationTips: tips,
    ue5ConsoleCommands: commands,
    nativizationCandidate: false
  };
}

export function calculatePcgMetric(
  assetName: string,
  spec: PcgSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const nodes = spec.nodes || [];
  const attributes = spec.attributes || [];
  const logic = (spec.proceduralLogic || '').toLowerCase();

  const isDynamicRuntime = logic.includes('runtime') || logic.includes('dynamic') || logic.includes('per-frame') || logic.includes('infinite');
  const nodeCount = nodes.length || 8;

  let cpuCost = isDynamicRuntime ? 0.85 + (nodeCount * 0.08) : 0.08 + (nodeCount * 0.01);
  let gpuCost = 0.25 + (nodeCount * 0.04);
  let memoryMb = 16.0 + (nodeCount * 4.5);
  let drawCalls = 12 + (nodeCount * 6);

  const warnings: string[] = [];
  const tips: string[] = [];
  const commands: string[] = ['stat pcg', 'pcg.Debug 1', 'pcg.Graph.Execution 1'];

  if (isDynamicRuntime) {
    warnings.push(`PCG graph has runtime dynamic regeneration flags. Generates high CPU Game Thread bursts.`);
    tips.push('Switch generation trigger to "On Level Load / Partition Load" or utilize Hierarchical Generation.');
    tips.push('Apply PCG Distance Culling nodes and Point Extents Bounds to restrict spatial sampling.');
  }

  tips.push('Ensure Spawner node outputs Hierarchical Instanced Static Meshes (HISM) rather than individual actors.');
  tips.push('Enable Nanite on all spawned PCG mesh instances to avoid triangle throughput bottlenecks.');

  let complexityScore = Math.min(100, Math.round((nodeCount * 5) + (isDynamicRuntime ? 40 : 15)));
  let status: 'Nominal' | 'Warning' | 'Critical' = isDynamicRuntime ? 'Critical' : nodeCount > 12 ? 'Warning' : 'Nominal';

  return {
    assetName,
    assetType: 'PCG',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    drawCalls,
    tickLoadPercent: Math.round((cpuCost / platform.maxCpuBudgetMs) * 100),
    complexityScore,
    status,
    warnings,
    optimizationTips: tips,
    ue5ConsoleCommands: commands,
    nativizationCandidate: isDynamicRuntime
  };
}

export function calculateMetaSoundMetric(
  assetName: string,
  spec: MetaSoundSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const nodes = spec.nodes || [];
  const params = spec.parameters || [];
  const dsp = (spec.dspLogic || '').toLowerCase();

  const isGranular = dsp.includes('granular') || dsp.includes('synthesis') || dsp.includes('reverb');
  const nodeCount = nodes.length || 6;

  let cpuCost = isGranular ? 0.28 + (nodeCount * 0.02) : 0.06 + (nodeCount * 0.008);
  let gpuCost = 0.001; // Audio DSP runs on dedicated Audio Render Thread (CPU)
  let memoryMb = 8.0 + (params.length * 0.5);
  let drawCalls = 0;

  const warnings: string[] = [];
  const tips: string[] = [];
  const commands: string[] = ['stat audio', 'au.DumpActiveSounds', 'au.DisableParallelAudioRendering 0'];

  if (isGranular) {
    warnings.push(`DSP graph contains Granular/Convolution nodes. Increases Audio Thread CPU utilization under high concurrency.`);
    tips.push('Configure Concurrency Limit on Sound Cue / MetaSound Asset (Max Voice Count: 4-8).');
    tips.push('Enable Virtualization Mode: "Play when Silent" or "Restart" to cull off-screen audio emitters.');
  } else {
    tips.push('Use Sound Attenuation with aggressive Air Absorption and Spatialization (Binaural / Ambisonics).');
  }

  let complexityScore = Math.min(100, Math.round((nodeCount * 6) + (isGranular ? 35 : 10)));
  let status: 'Nominal' | 'Warning' | 'Critical' = isGranular ? 'Warning' : 'Nominal';

  return {
    assetName,
    assetType: 'MetaSound',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    drawCalls,
    tickLoadPercent: Math.round((cpuCost / platform.maxCpuBudgetMs) * 100),
    complexityScore,
    status,
    warnings,
    optimizationTips: tips,
    ue5ConsoleCommands: commands,
    nativizationCandidate: false
  };
}

export function calculateBehaviorTreeMetric(
  assetName: string,
  spec: BehaviorTreeSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const nodesObj = spec.nodes || {};
  const nodeCount = Object.keys(nodesObj).length || 6;
  const keysCount = (spec.blackboardKeys || []).length || 4;

  let cpuCost = 0.08 + (nodeCount * 0.02) + (keysCount * 0.005);
  let gpuCost = 0.002;
  let memoryMb = 4.0 + (keysCount * 0.4);
  let drawCalls = 0;

  const warnings: string[] = [];
  const tips: string[] = [];
  const commands: string[] = ['stat ai', 'ai.debug.ToggleBT', 'ai.debug.Perception'];

  if (nodeCount > 15) {
    warnings.push(`Behavior tree node density is high (${nodeCount} nodes). Evaluate Subtree modularization.`);
    tips.push('Split sub-behaviors into independent Run Behavior Tree nodes with dedicated Blackboards.');
  }

  tips.push('Ensure BT Services use randomized tick intervals (e.g., Interval 0.5s + Random Deviation 0.1s) to prevent lockstep CPU spikes.');
  tips.push('Use AIPerception Component stimulus triggers rather than polling target distance on tick.');

  let complexityScore = Math.min(100, Math.round((nodeCount * 4) + (keysCount * 3)));
  let status: 'Nominal' | 'Warning' | 'Critical' = nodeCount > 20 ? 'Warning' : 'Nominal';

  return {
    assetName,
    assetType: 'BehaviorTree',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    drawCalls,
    tickLoadPercent: Math.round((cpuCost / platform.maxCpuBudgetMs) * 100),
    complexityScore,
    status,
    warnings,
    optimizationTips: tips,
    ue5ConsoleCommands: commands,
    nativizationCandidate: false
  };
}

export function calculateInputMetric(
  assetName: string,
  spec: EnhancedInputSpec,
  platform: PlatformBudgetConfig
): AssetResourceMetric {
  const actions = spec.actions || [];
  const mappings = spec.mappings || [];

  const cpuCost = 0.015 + (actions.length * 0.004) + (mappings.length * 0.003);
  const gpuCost = 0.0;
  const memoryMb = 1.5 + (actions.length * 0.1);
  const drawCalls = 0;

  const tips = [
    'Use Trigger Events like "Started" or "Triggered" instead of "Ongoing" when polling is not necessary.',
    'Keep Input Action Chord chains localized to avoid evaluation latency on controller sticks.'
  ];

  return {
    assetName,
    assetType: 'EnhancedInput',
    cpuCostMs: parseFloat(cpuCost.toFixed(3)),
    gpuCostMs: parseFloat(gpuCost.toFixed(3)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    drawCalls,
    tickLoadPercent: Math.round((cpuCost / platform.maxCpuBudgetMs) * 100),
    complexityScore: Math.min(100, Math.round(actions.length * 8 + mappings.length * 4)),
    status: 'Nominal',
    warnings: [],
    optimizationTips: tips,
    ue5ConsoleCommands: ['showdebug enhancedinput'],
    nativizationCandidate: false
  };
}

export function calculateProjectResourceSummary(
  assetMetrics: AssetResourceMetric[],
  platform: PlatformBudgetConfig
): ProjectResourceSummary {
  if (assetMetrics.length === 0) {
    return {
      totalCpuMs: 0,
      totalGpuMs: 0,
      totalMemoryMb: 0,
      totalDrawCalls: 0,
      cpuPercent: 0,
      gpuPercent: 0,
      memoryPercent: 0,
      drawCallsPercent: 0,
      healthScore: 100,
      criticalAssetCount: 0,
      warningAssetCount: 0,
      nominalAssetCount: 0,
      topCpuBottlenecks: [],
      topGpuBottlenecks: [],
      topMemoryBottlenecks: []
    };
  }

  // Base engine overhead for UE5 world/viewport
  const engineBaseCpuMs = 2.5; // World tick, physics substep, Slate UI
  const engineBaseGpuMs = 3.2; // Base GBuffer pass, TSR, Post Process, Nanite VisBuffer
  const engineBaseMemoryMb = 850; // Base engine core memory
  const engineBaseDrawCalls = 180; // Sky, shadows, UI

  const totalAssetsCpu = assetMetrics.reduce((acc, m) => acc + m.cpuCostMs, 0);
  const totalAssetsGpu = assetMetrics.reduce((acc, m) => acc + m.gpuCostMs, 0);
  const totalAssetsMemory = assetMetrics.reduce((acc, m) => acc + m.memoryMb, 0);
  const totalAssetsDrawCalls = assetMetrics.reduce((acc, m) => acc + m.drawCalls, 0);

  const totalCpuMs = parseFloat((engineBaseCpuMs + totalAssetsCpu).toFixed(2));
  const totalGpuMs = parseFloat((engineBaseGpuMs + totalAssetsGpu).toFixed(2));
  const totalMemoryMb = Math.round(engineBaseMemoryMb + totalAssetsMemory);
  const totalDrawCalls = Math.round(engineBaseDrawCalls + totalAssetsDrawCalls);

  const cpuPercent = Math.min(150, Math.round((totalCpuMs / platform.maxCpuBudgetMs) * 100));
  const gpuPercent = Math.min(150, Math.round((totalGpuMs / platform.maxGpuBudgetMs) * 100));
  const memoryPercent = Math.min(150, Math.round((totalMemoryMb / platform.maxVramMb) * 100));
  const drawCallsPercent = Math.min(150, Math.round((totalDrawCalls / platform.maxDrawCalls) * 100));

  let criticalCount = 0;
  let warningCount = 0;
  let nominalCount = 0;

  assetMetrics.forEach(m => {
    if (m.status === 'Critical') criticalCount++;
    else if (m.status === 'Warning') warningCount++;
    else nominalCount++;
  });

  // Calculate overall health score (0-100)
  let healthPenalty = (criticalCount * 18) + (warningCount * 6);
  if (cpuPercent > 100) healthPenalty += (cpuPercent - 100) * 1.2;
  if (gpuPercent > 100) healthPenalty += (gpuPercent - 100) * 1.2;
  if (drawCallsPercent > 100) healthPenalty += (drawCallsPercent - 100) * 0.8;
  if (memoryPercent > 100) healthPenalty += (memoryPercent - 100) * 0.8;

  const healthScore = Math.max(10, Math.min(100, Math.round(100 - healthPenalty)));

  // Sorted bottlenecks
  const topCpuBottlenecks = [...assetMetrics]
    .sort((a, b) => b.cpuCostMs - a.cpuCostMs)
    .slice(0, 4);

  const topGpuBottlenecks = [...assetMetrics]
    .sort((a, b) => b.gpuCostMs - a.gpuCostMs)
    .slice(0, 4);

  const topMemoryBottlenecks = [...assetMetrics]
    .sort((a, b) => b.memoryMb - a.memoryMb)
    .slice(0, 4);

  return {
    totalCpuMs,
    totalGpuMs,
    totalMemoryMb,
    totalDrawCalls,
    cpuPercent,
    gpuPercent,
    memoryPercent,
    drawCallsPercent,
    healthScore,
    criticalAssetCount: criticalCount,
    warningAssetCount: warningCount,
    nominalAssetCount: nominalCount,
    topCpuBottlenecks,
    topGpuBottlenecks,
    topMemoryBottlenecks
  };
}

export function generateBlueprintRevisionHistory(
  assetName: string,
  currentMetric?: AssetResourceMetric,
  customSnapshots: RevisionTrendPoint[] = []
): RevisionTrendPoint[] {
  if (customSnapshots && customSnapshots.length > 0) {
    return customSnapshots;
  }

  const baseCpu = currentMetric ? currentMetric.cpuCostMs : 0.45;
  const baseMem = currentMetric ? currentMetric.memoryMb : 22.0;
  const baseGpu = currentMetric ? currentMetric.gpuCostMs : 0.15;
  const baseDraw = currentMetric ? currentMetric.drawCalls : 4;
  const isTickActive = currentMetric?.tickLoadPercent ? currentMetric.tickLoadPercent > 20 : false;

  return [
    {
      revision: 'Rev 1.0',
      revisionNumber: 1,
      timestamp: 'Initial Scaffold',
      assetName,
      cpuCostMs: parseFloat(Math.max(0.05, baseCpu * 0.25).toFixed(2)),
      memoryMb: parseFloat(Math.max(4.0, baseMem * 0.35).toFixed(1)),
      gpuCostMs: parseFloat(Math.max(0.02, baseGpu * 0.3).toFixed(2)),
      drawCalls: Math.max(1, Math.round(baseDraw * 0.4)),
      changeDescription: 'Default class properties, components hierarchy, and initial variable definitions.',
      eventTickActive: false,
      nodeCount: 12
    },
    {
      revision: 'Rev 1.1',
      revisionNumber: 2,
      timestamp: '+1d Feature Logic',
      assetName,
      cpuCostMs: parseFloat((baseCpu * 0.65).toFixed(2)),
      memoryMb: parseFloat((baseMem * 0.6).toFixed(1)),
      gpuCostMs: parseFloat((baseGpu * 0.65).toFixed(2)),
      drawCalls: Math.max(2, Math.round(baseDraw * 0.7)),
      changeDescription: 'Event Graph expansion, Enhanced Input bindings, and dynamic casting branches.',
      eventTickActive: false,
      nodeCount: 38
    },
    {
      revision: 'Rev 1.2',
      revisionNumber: 3,
      timestamp: '+3d Tick & Loops Added',
      assetName,
      cpuCostMs: parseFloat((baseCpu * 1.55 + 0.3).toFixed(2)),
      memoryMb: parseFloat((baseMem * 0.85).toFixed(1)),
      gpuCostMs: parseFloat((baseGpu * 1.1).toFixed(2)),
      drawCalls: Math.max(3, Math.round(baseDraw * 1.2)),
      changeDescription: 'Tick updates enabled, per-frame distance checks and array iterator loops (Peak Load).',
      eventTickActive: true,
      nodeCount: 64
    },
    {
      revision: 'Rev 1.3',
      revisionNumber: 4,
      timestamp: '+5d Optimization Pass',
      assetName,
      cpuCostMs: parseFloat((baseCpu * 1.15).toFixed(2)),
      memoryMb: parseFloat((baseMem * 0.95).toFixed(1)),
      gpuCostMs: parseFloat((baseGpu * 0.95).toFixed(2)),
      drawCalls: Math.max(2, Math.round(baseDraw * 0.9)),
      changeDescription: 'Replaced Event Tick with timer delegates, cached component references, async load.',
      eventTickActive: isTickActive,
      nodeCount: 52
    },
    {
      revision: 'Rev 1.4 (Current)',
      revisionNumber: 5,
      timestamp: 'Current Active Build',
      assetName,
      cpuCostMs: baseCpu,
      memoryMb: baseMem,
      gpuCostMs: baseGpu,
      drawCalls: baseDraw,
      changeDescription: 'Current production profile with active subsystem linkages and material instances.',
      eventTickActive: isTickActive,
      nodeCount: 58
    }
  ];
}

export function generateProjectRevisionTrends(
  summary: ProjectResourceSummary,
  platform: PlatformBudgetConfig
): RevisionTrendPoint[] {
  const curCpu = summary.totalCpuMs;
  const curMem = summary.totalMemoryMb;
  const curGpu = summary.totalGpuMs;
  const curDraw = summary.totalDrawCalls;

  return [
    {
      revision: 'v0.1 Alpha',
      revisionNumber: 1,
      timestamp: 'Week 1 - Core Scaffold',
      assetName: 'Project Aggregate',
      cpuCostMs: parseFloat((curCpu * 0.42).toFixed(2)),
      memoryMb: Math.round(curMem * 0.55),
      gpuCostMs: parseFloat((curGpu * 0.45).toFixed(2)),
      drawCalls: Math.round(curDraw * 0.5),
      changeDescription: 'Basic game mode, player character controller, and greybox geometry pass.',
      eventTickActive: false,
      nodeCount: 140
    },
    {
      revision: 'v0.2 Alpha',
      revisionNumber: 2,
      timestamp: 'Week 2 - Systems Pass',
      assetName: 'Project Aggregate',
      cpuCostMs: parseFloat((curCpu * 0.72).toFixed(2)),
      memoryMb: Math.round(curMem * 0.75),
      gpuCostMs: parseFloat((curGpu * 0.7).toFixed(2)),
      drawCalls: Math.round(curDraw * 0.75),
      changeDescription: 'Added inventory subsystem, enemy AI behaviors, and interactive actors.',
      eventTickActive: true,
      nodeCount: 380
    },
    {
      revision: 'v0.3 Beta',
      revisionNumber: 3,
      timestamp: 'Week 3 - Audio & PCG',
      assetName: 'Project Aggregate',
      cpuCostMs: parseFloat((curCpu * 1.35).toFixed(2)),
      memoryMb: Math.round(curMem * 1.15),
      gpuCostMs: parseFloat((curGpu * 1.25).toFixed(2)),
      drawCalls: Math.round(curDraw * 1.2),
      changeDescription: 'MetaSound dynamic audio graphs, procedural content generation and complex shaders.',
      eventTickActive: true,
      nodeCount: 650
    },
    {
      revision: 'v0.4 Beta',
      revisionNumber: 4,
      timestamp: 'Week 4 - Profiling & Trim',
      assetName: 'Project Aggregate',
      cpuCostMs: parseFloat((curCpu * 1.08).toFixed(2)),
      memoryMb: Math.round(curMem * 0.98),
      gpuCostMs: parseFloat((curGpu * 1.05).toFixed(2)),
      drawCalls: Math.round(curDraw * 0.95),
      changeDescription: 'Disabled unthrottled ticks, pooled particle actors, consolidated dynamic material instances.',
      eventTickActive: false,
      nodeCount: 590
    },
    {
      revision: 'v1.0 RC (Live)',
      revisionNumber: 5,
      timestamp: 'Current Workspace State',
      assetName: 'Project Aggregate',
      cpuCostMs: curCpu,
      memoryMb: curMem,
      gpuCostMs: curGpu,
      drawCalls: curDraw,
      changeDescription: 'Live calculated budget profile based on all workspace blueprints, materials, and audio assets.',
      eventTickActive: false,
      nodeCount: 620
    }
  ];
}

