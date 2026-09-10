import { AssetResourceMetric, PlatformBudgetConfig, AIOptimizeSuggestion, RefactoringStep } from '../types';

/**
 * Intelligent UE5 Asset Refactoring & Optimization Engine
 * Generates tailored, actionable Blueprint, Material, and Subsystem refactoring recipes
 * to aggressively lower CPU GameThread times, GPU shader overhead, memory footprint, and draw calls.
 */

export function generateAIOptimizeSuggestions(
  asset: AssetResourceMetric,
  platform: PlatformBudgetConfig
): AIOptimizeSuggestion {
  const isBlueprint = asset.assetType === 'Blueprint';
  const isMaterial = asset.assetType === 'Material';
  const isMetaSound = asset.assetType === 'MetaSound';
  const isPCG = asset.assetType === 'PCG';
  const isBehaviorTree = asset.assetType === 'BehaviorTree';
  const isInput = asset.assetType === 'EnhancedInput';

  const refactoringSteps: RefactoringStep[] = [];
  let summary = '';
  let primaryBottleneck = '';
  let beforeCode = '';
  let afterCode = '';
  let codeLanguage: 'blueprint' | 'hlsl' | 'cpp' | 'json' = 'blueprint';
  let explanation = '';

  // Calculate potential savings based on asset metrics and platform budgets
  let cpuMsSaved = 0;
  let gpuMsSaved = 0;
  let memoryMbSaved = 0;
  let drawCallsSaved = 0;

  if (isBlueprint) {
    codeLanguage = 'blueprint';
    if (asset.tickLoadPercent > 0 || asset.cpuCostMs > 0.15) {
      primaryBottleneck = 'Per-Frame GameThread Execution & Dynamic Casting';
      summary = `${asset.assetName} consumes ${asset.cpuCostMs.toFixed(2)} ms of GameThread budget. Eliminating Event Tick in favor of event-driven timers and caching component references will reclaim significant frame headroom.`;
      
      cpuMsSaved = parseFloat((asset.cpuCostMs * 0.65).toFixed(2));
      memoryMbSaved = parseFloat((asset.memoryMb * 0.25).toFixed(1));
      drawCallsSaved = Math.max(1, Math.round(asset.drawCalls * 0.2));

      refactoringSteps.push({
        category: 'Ticking & Timers',
        title: 'Replace Event Tick with Set Timer by Event (Interval 0.1s - 0.25s)',
        description: 'Move continuous per-frame polling logic from Event Tick to a looping Timer Delegate. Stagger intervals to prevent all actors ticking on identical frames.',
        beforePattern: 'Event Tick (DeltaSeconds) ──> [Branch] ──> [Cast to BP_Player] ──> UpdateHUD()',
        afterPattern: 'Event BeginPlay ──> SetTimerByEvent (Time: 0.15s, Looping) ──> [Custom Event: OnStaggeredUpdate] ──> UpdateCachedState()',
        priority: 'High',
        impact: `Reclaims ~${(asset.cpuCostMs * 0.45).toFixed(2)} ms CPU per frame`
      });

      refactoringSteps.push({
        category: 'Blueprint Graph',
        title: 'Cache Component References in BeginPlay to Avoid Repeated Dynamic Casts',
        description: 'Dynamic casting ("Cast To BP_...") in execution hot-paths forces runtime RTTI checks and forms hard references that load dependent assets into memory at boot time.',
        beforePattern: '[Any Event] ──> Cast to BP_GameMode ──> Get CurrentScore ──> Print',
        afterPattern: 'BeginPlay ──> Cast to BP_GameMode ──> [Set CachedGameModeRef] ──> ... [Any Event] ──> Read CachedGameModeRef',
        priority: 'High',
        impact: `Eliminates ~${(asset.cpuCostMs * 0.2).toFixed(2)} ms RTTI overhead & lowers memory by ~${(asset.memoryMb * 0.15).toFixed(1)} MB`
      });

      beforeCode = `// [BEFORE] Inefficient Per-Frame Blueprint Execution
Event Tick(DeltaSeconds)
  ├── Cast To BP_PlayerCharacter (Dynamic RTTI check every frame)
  ├── GetAllActorsOfClass(BP_Enemy) -> ForEachLoop
  └── SetActorLocationAndRotation(InterpTo(...))`;

      afterCode = `// [AFTER] Event-Driven & Cached Architecture
Event BeginPlay
  ├── CachedPlayer = Cast To BP_PlayerCharacter(GetPlayerPawn(0))
  └── SetTimerByEvent(TimerDelegate: OnTickThrottle, Time: 0.15s, Looping: true)

Event OnTickThrottle
  └── InterpToUsingCachedTransforms() // Event-driven update`;

      explanation = 'Replaces unconditional 60/120Hz polling with a 6.6Hz decoupled timer and cached pointer references.';
    } else {
      primaryBottleneck = 'Hard Asset Dependencies & Struct Parsing';
      summary = `${asset.assetName} runs within nominal tick margins but holds unoptimized object references that bloat initial spawn latency.`;
      
      cpuMsSaved = parseFloat((asset.cpuCostMs * 0.3).toFixed(2));
      memoryMbSaved = parseFloat((asset.memoryMb * 0.35).toFixed(1));

      refactoringSteps.push({
        category: 'Memory / Hard References',
        title: 'Convert Hard Object References to TSoftObjectPtr / Soft Class References',
        description: 'Direct variable references to heavy Static Meshes, Skeletal Meshes, or Niagara Systems force Unreal Engine to synchronously load them into RAM when this Blueprint spawns.',
        beforePattern: 'Variable "BossWeaponMesh" of type StaticMeshObject (Hard Reference)',
        afterPattern: 'Variable "BossWeaponMesh" of type SoftObjectPath -> Async Load Asset node before equip',
        priority: 'Medium',
        impact: `Reduces asset load footprint by ~${(asset.memoryMb * 0.35).toFixed(1)} MB`
      });
    }

    if (asset.nativizationCandidate || asset.complexityScore > 50) {
      refactoringSteps.push({
        category: 'C++ Nativization',
        title: 'Extract Core Math & Collision Raycasts to C++ Base Class',
        description: 'Extract heavy loops and procedural transform calculation to a native C++ UObject/AActor parent class. Expose clean BlueprintImplementableEvents for designer hooks.',
        beforePattern: 'Nested ForEach loops calculating pathfinding vectors across 40 iterations',
        afterPattern: 'UFUNCTION(BlueprintCallable, Category="Optimization") void SolveVectorFieldNative();',
        priority: 'High',
        impact: 'Up to 8x - 12x CPU execution speedup on GameThread'
      });
    }
  } else if (isMaterial) {
    codeLanguage = 'hlsl';
    primaryBottleneck = 'Pixel Shader Texture Fetch Overdraw & Sampler Pressure';
    summary = `${asset.assetName} incurs high GPU RenderThread overhead (${asset.gpuCostMs.toFixed(2)} ms). Packing textures into ORM channels and offloading UV math to vertex interpolation will improve raster performance.`;
    
    gpuMsSaved = parseFloat((asset.gpuCostMs * 0.55).toFixed(2));
    memoryMbSaved = parseFloat((asset.memoryMb * 0.4).toFixed(1));
    drawCallsSaved = 0;

    refactoringSteps.push({
      category: 'Material / Shaders',
      title: 'Consolidate Textures into Packed ORM Map (Occlusion, Roughness, Metallic)',
      description: 'Replace three separate 2K/4K grayscale texture samplers with a single RGB texture. Channel R = Ambient Occlusion, Channel G = Roughness, Channel B = Metallic.',
      beforePattern: 'Sampler 1 (AO Texture) + Sampler 2 (Roughness Texture) + Sampler 3 (Metallic Texture) = 3 Texture Fetches',
      afterPattern: 'Single ORM Sampler (RGB) ──> Split Components: R to AO, G to Roughness, B to Metallic = 1 Texture Fetch',
      priority: 'High',
      impact: `Saves ~${(asset.memoryMb * 0.4).toFixed(1)} MB VRAM and lowers texture sampler latency by 60%`
    });

    refactoringSteps.push({
      category: 'Material / Shaders',
      title: 'Move Complex UV Calculations to Vertex Shader (CustomizedUVs)',
      description: 'Procedural noise, Panner, and Rotator nodes computed in the Pixel Shader evaluate on millions of fragments per frame. Moving them to CustomizedUVs calculates them once per vertex and interpolates cheaply.',
      beforePattern: 'TexCoord ──> Panner ──> Multiply ──> TextureSample (Evaluated per pixel)',
      afterPattern: 'CustomizedUV0 input ──> Panner ──> TextureSample (Evaluated per vertex)',
      priority: 'High',
      impact: `Reduces shader ALU instruction count by ~${Math.round((asset.shaderInstructions || 160) * 0.25)} instructions`
    });

    refactoringSteps.push({
      category: 'Material / Shaders',
      title: 'Convert Dynamic Parameter Math to Static Switch Parameters',
      description: 'Dynamic branch conditions force shader compilation to evaluate both sides or execute expensive dynamic branching. Static Switch Parameters compile specialized shader permutations for each variant.',
      beforePattern: 'If (bUseDetailNormal) { BlendNormals() } else { BaseNormal() } (Evaluated at runtime)',
      afterPattern: 'StaticSwitchParameter: "bUseDetailNormal" (Evaluated at compile-time)',
      priority: 'Medium',
      impact: 'Eliminates runtime branch evaluation cost on GPU'
    });

    beforeCode = `// [BEFORE] High Pixel Shader ALU & Multiple Texture Fetches
float4 AO = Texture2DSample(AOMap, Sampler, UV);
float4 Rough = Texture2DSample(RoughMap, Sampler, UV);
float4 Metal = Texture2DSample(MetalMap, Sampler, UV);
float2 PannedUV = UV + float2(Time * 0.1, 0.0); // Computed per pixel`;

    afterCode = `// [AFTER] ORM Packed Texture & Vertex Interpolation
// In Vertex Shader:
CustomizedUV0 = InUV + float2(Time * 0.1, 0.0); // Computed once per vertex

// In Pixel Shader:
float3 ORM = Texture2DSample(PackedORM, Sampler, CustomizedUV0).rgb;
float AO = ORM.r;
float Roughness = ORM.g;
float Metallic = ORM.b;`;

    explanation = 'Reduces 3 separate VRAM texture reads down to 1 packed read and offloads coordinate animation to vertex hardware.';
  } else if (isMetaSound) {
    codeLanguage = 'blueprint';
    primaryBottleneck = 'Uncapped Active DSP Voices & Buffer Allocation';
    summary = `${asset.assetName} utilizes ${asset.cpuCostMs.toFixed(2)} ms of audio DSP time. Setting concurrency rules and lowering buffer processing rates recovers audio thread performance.`;
    
    cpuMsSaved = parseFloat((asset.cpuCostMs * 0.5).toFixed(2));
    memoryMbSaved = parseFloat((asset.memoryMb * 0.35).toFixed(1));

    refactoringSteps.push({
      category: 'Audio / DSP',
      title: 'Assign Audio Concurrency Object with Max Voice Limit (e.g. 4 - 8)',
      description: 'Without strict concurrency limits, multiple rapid sound triggers spawn dozens of active MetaSound graphs simultaneously, causing audio thread spikes and buffer under-runs.',
      beforePattern: 'Play Sound at Location (No Concurrency, Unlimited Voices)',
      afterPattern: 'Play Sound (Concurrency: "AC_CombatSFX_Max4", Resolution: Stop Quietest)',
      priority: 'High',
      impact: `Reduces DSP thread spikes by ~${(asset.cpuCostMs * 0.4).toFixed(2)} ms`
    });

    refactoringSteps.push({
      category: 'Audio / DSP',
      title: 'Switch High-Frequency Ambient Filters from Per-Block to Trigger-Based',
      description: 'Trigger-based envelopes calculate parameter transitions only upon activation instead of continuously evaluating mathematical waves on silent channels.',
      beforePattern: 'Continuous Sine Generator multiplying Master Output',
      afterPattern: 'Trigger Envelope node with ADSR trigger latch',
      priority: 'Medium',
      impact: 'Cuts active idle DSP load to near zero'
    });

    beforeCode = `// [BEFORE] Uncapped Concurrent Instancing
SpawnAudioAttached(MetaSound_Explosion, Component) 
// 12 explosions = 12 simultaneous multi-band DSP graphs executing`;

    afterCode = `// [AFTER] Concurrency & Voice Virtualization
SpawnAudioAttached(MetaSound_Explosion, Component, 
  ConcurrencySettings = Concurrency_Explosion_Max3,
  VolumeConcurrency = DuckOldestInstance
);`;

    explanation = 'Prevents sound spawning overload and virtualizes off-screen instances.';
  } else if (isPCG) {
    codeLanguage = 'blueprint';
    primaryBottleneck = 'Dense Point Sampler Spatial Grids & Missing Distance Culling';
    summary = `${asset.assetName} generates excessive procedural geometry and draw passes (${asset.drawCalls} calls). Adding spatial partitioning and distance culling bounds stabilizes frame time.`;
    
    cpuMsSaved = parseFloat((asset.cpuCostMs * 0.5).toFixed(2));
    gpuMsSaved = parseFloat((asset.gpuCostMs * 0.45).toFixed(2));
    drawCallsSaved = Math.max(2, Math.round(asset.drawCalls * 0.5));
    memoryMbSaved = parseFloat((asset.memoryMb * 0.4).toFixed(1));

    refactoringSteps.push({
      category: 'Draw Calls & Geometry',
      title: 'Implement Distance Culling & Hierarchical ISM Spawning in PCG Graph',
      description: 'Replace raw Static Mesh spawners with Hierarchical Instanced Static Mesh (HISM) components with explicit cull distances set between 5000 and 15000 units.',
      beforePattern: 'PCG Mesh Spawner ──> Default Static Mesh Spawner (No Cull Distance)',
      afterPattern: 'PCG Mesh Spawner ──> HISM Spawner (Min Cull: 4000, Max Cull: 12000, WPO Distance Disabled)',
      priority: 'High',
      impact: `Eliminates ~${drawCallsSaved} draw calls in dense scenes`
    });

    refactoringSteps.push({
      category: 'Blueprint Graph',
      title: 'Partition Point Generation by Player Camera Frustum / Grid Bounds',
      description: 'Filter points using the Player Camera View Angle and World Partition Grid boundaries instead of generating points across the entire global landscape.',
      beforePattern: 'Surface Sampler (Points per SQM: 0.1, Global Extents)',
      afterPattern: 'Distance Filter node + Camera Projection Cull before Mesh Spawning',
      priority: 'High',
      impact: `Cuts generation memory by ~${memoryMbSaved} MB`
    });
  } else if (isBehaviorTree) {
    codeLanguage = 'blueprint';
    primaryBottleneck = 'High-Frequency BT Service Ticking & Redundant Blackboard Lookups';
    summary = `${asset.assetName} executes continuous AI decisions on the GameThread. Event-driven blackboard decorators reduce AI cycle consumption.`;
    
    cpuMsSaved = parseFloat((asset.cpuCostMs * 0.6).toFixed(2));

    refactoringSteps.push({
      category: 'Ticking & Timers',
      title: 'Increase Service Tick Intervals from 0.05s to 0.25s with 0.05s Random Deviation',
      description: 'AI perception and target evaluation do not require 20Hz update rates. Adding random deviation prevents multiple AI agents ticking in synchronization.',
      beforePattern: 'BT Service: FindNearestTarget (Interval: 0.05s, Deviation: 0.0s)',
      afterPattern: 'BT Service: FindNearestTarget (Interval: 0.3s, Deviation: 0.08s)',
      priority: 'High',
      impact: `Reclaims ~${(asset.cpuCostMs * 0.45).toFixed(2)} ms CPU across agent groups`
    });
  } else {
    // EnhancedInput or generic
    primaryBottleneck = 'Continuous Input Mapping Evaluation';
    summary = `${asset.assetName} processes chorded actions and modifiers. Consolidating trigger conditions reduces input dispatcher overhead.`;
    cpuMsSaved = parseFloat((asset.cpuCostMs * 0.4).toFixed(2));

    refactoringSteps.push({
      category: 'Blueprint Graph',
      title: 'Use Trigger Events (Started, Triggered, Completed) Selectively',
      description: 'Bind heavy logic to Trigger Event "Started" or "Completed" rather than continuous "Triggered" states for one-off button presses.',
      priority: 'Medium',
      impact: 'Reduces unnecessary per-frame input event dispatches'
    });
  }

  // Ensure minimum positive numbers for savings display
  cpuMsSaved = Math.max(0.01, cpuMsSaved);
  gpuMsSaved = Math.max(0.0, gpuMsSaved);
  memoryMbSaved = Math.max(0.5, memoryMbSaved);
  drawCallsSaved = Math.max(0, drawCallsSaved);

  const targetFrameTime = platform.targetFrameTimeMs || 16.6;
  const headroomGainPercent = Math.min(35, Math.max(2, Math.round(((cpuMsSaved + gpuMsSaved) / targetFrameTime) * 100)));

  return {
    assetName: asset.assetName,
    assetType: asset.assetType,
    summary,
    primaryBottleneck,
    severity: asset.status,
    estimatedSavings: {
      cpuMsSaved,
      gpuMsSaved,
      memoryMbSaved,
      drawCallsSaved,
      headroomGainPercent
    },
    refactoringSteps,
    recommendedCVars: asset.ue5ConsoleCommands.length > 0 ? asset.ue5ConsoleCommands : ['stat unit', 'stat game', 'stat rhi'],
    architectActionPrompt: `Architect, please apply optimization refactoring to ${asset.assetName}: eliminate per-frame ticking, cache component pointers, and resolve ${primaryBottleneck}.`,
    codeOrNodeDiff: beforeCode && afterCode ? {
      language: codeLanguage,
      before: beforeCode,
      after: afterCode,
      explanation
    } : undefined
  };
}
