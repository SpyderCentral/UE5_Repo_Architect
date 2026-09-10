import { BlueprintSpec, BlueprintArchetype, BlueprintThumbnailMetadata } from '../types';
import { generateBlueprintThumbnailImage } from './ai/client';

export type BlueprintIconStylePreset = 
  | 'ue5-realistic' 
  | 'cyberpunk-neon' 
  | 'minimalist-vector' 
  | 'holographic-hud' 
  | 'fantasy-sigil';

export interface StylePresetOption {
  id: BlueprintIconStylePreset;
  label: string;
  description: string;
  badgeClass: string;
}

export const STYLE_PRESET_OPTIONS: StylePresetOption[] = [
  {
    id: 'ue5-realistic',
    label: 'UE5 Production PBR',
    description: 'Metallic Nanite chassis, Lumen lighting, studio rim highlights',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  {
    id: 'cyberpunk-neon',
    label: 'Cyberpunk Neon',
    description: 'Electric cyan/magenta circuit traces, dark carbon fiber chassis',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'minimalist-vector',
    label: 'Modern Flat Vector',
    description: 'Clean high-contrast vector silhouette with vivid gradient fill',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'holographic-hud',
    label: 'Holographic HUD',
    description: 'Sci-fi diegetic UI wireframes, tactical reticle brackets',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
  },
  {
    id: 'fantasy-sigil',
    label: 'Arcane Runestone',
    description: 'Carved obsidian stone, glowing runic channels, gold inlays',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
];

export interface BlueprintAnalysisResult {
  blueprintName: string;
  archetype: BlueprintArchetype;
  archetypeLabel: string;
  primaryFunction: string;
  keyNodes: string[];
  accentHex: string;
  secondaryHex: string;
  bgGradient: [string, string];
  glyphType: string;
  glyphDescription: string;
}

/**
 * Deeply inspects blueprint metadata, parent class, variable types, functions,
 * and event graph node types to classify its archetype and primary gameplay function.
 */
export function analyzeBlueprintFunctionAndNodes(
  blueprint: Partial<BlueprintSpec> & { name?: string; desc?: string; assetName?: string }
): BlueprintAnalysisResult {
  const name = blueprint.assetName || blueprint.name || 'BP_Unknown';
  const nameLower = name.toLowerCase();
  const descLower = (blueprint.desc || '').toLowerCase();
  const parentClass = (blueprint.parentClass || '').toLowerCase();
  
  // Collect all node names and types across event graphs
  const allNodes = (blueprint.eventGraph || []).flatMap(g => g.nodes || []);
  const nodeNames = allNodes.map(n => n.name.toLowerCase());
  const functionNames = (blueprint.functions || []).map(f => f.name.toLowerCase());
  const variableNames = (blueprint.variables || []).map(v => v.name.toLowerCase());
  const componentNames = (blueprint.components || []).map(c => c.toLowerCase());

  // Helper matching tests
  const matchesAny = (words: string[]) => {
    return words.some(w => 
      nameLower.includes(w) || 
      descLower.includes(w) || 
      nodeNames.some(n => n.includes(w)) || 
      functionNames.some(f => f.includes(w)) ||
      variableNames.some(v => v.includes(w))
    );
  };

  // 1. COMBAT & WEAPONS
  if (
    matchesAny(['damage', 'weapon', 'sword', 'gun', 'projectile', 'shoot', 'attack', 'melee', 'bullet', 'ammo', 'hitbox', 'combat', 'shield', 'health', 'armor']) ||
    nodeNames.some(n => n.includes('applydamage') || n.includes('takedamage') || n.includes('spawnpickup') || n.includes('linetrace'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['ApplyDamage', 'OnTakeAnyDamage', 'LineTraceByChannel', 'PlayAnimMontage', 'SpawnActorFromClass']);
    return {
      blueprintName: name,
      archetype: 'combat',
      archetypeLabel: 'Combat & Weapons',
      primaryFunction: 'Offensive attacks, projectile physics, damage mitigation, and combat telemetry',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['ApplyDamage', 'TakeDamage', 'LineTraceByChannel'],
      accentHex: '#f43f5e',
      secondaryHex: '#fb7185',
      bgGradient: ['#3b0716', '#090d16'],
      glyphType: 'swords',
      glyphDescription: 'two crossed high-tech broadswords surrounded by energetic sparks and a sharp red glow'
    };
  }

  // 2. LOCOMOTION & MOVEMENT
  if (
    matchesAny(['movement', 'locomotion', 'jump', 'sprint', 'dash', 'parkour', 'velocity', 'climb', 'fly', 'swim', 'character', 'pawn', 'hero', 'player', 'vehicle', 'wheel']) ||
    componentNames.some(c => c.includes('movement') || c.includes('springarm')) ||
    parentClass.includes('character') ||
    parentClass.includes('pawn') ||
    parentClass.includes('wheeledvehicle')
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['AddMovementInput', 'AddControllerPitchInput', 'Jump', 'LaunchCharacter', 'SetVelocity']);
    return {
      blueprintName: name,
      archetype: 'locomotion',
      archetypeLabel: 'Locomotion & Physics',
      primaryFunction: 'Kinetic propulsion, velocity inputs, ground collision, and spatial movement',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['AddMovementInput', 'Jump', 'LaunchCharacter'],
      accentHex: '#06b6d4',
      secondaryHex: '#38bdf8',
      bgGradient: ['#082f49', '#090d16'],
      glyphType: 'locomotion',
      glyphDescription: 'an aerodynamic cybernetic winged runner boot leaving cyan kinetic energy streaks'
    };
  }

  // 3. AI & BEHAVIOR
  if (
    matchesAny(['ai', 'bot', 'behavior', 'patrol', 'enemy', 'boss', 'aggro', 'perception', 'sight', 'hearing', 'chase', 'flee', 'npc', 'blackboard']) ||
    parentClass.includes('aicontroller') ||
    componentNames.some(c => c.includes('perception')) ||
    nodeNames.some(n => n.includes('aimoveto') || n.includes('behaviortree') || n.includes('blackboard'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['AIMoveTo', 'RunBehaviorTree', 'SetBlackboardValue', 'PerceptionUpdated', 'SetFocus']);
    return {
      blueprintName: name,
      archetype: 'ai',
      archetypeLabel: 'Neural AI & Behavior',
      primaryFunction: 'Autonomous sensory perception, tactical decision tree, and target navigation',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['AIMoveTo', 'RunBehaviorTree', 'SetBlackboardValue'],
      accentHex: '#a855f7',
      secondaryHex: '#c084fc',
      bgGradient: ['#3b0764', '#090d16'],
      glyphType: 'ai',
      glyphDescription: 'a cybernetic brain nexus with glowing purple neural nodes and interconnected circuit synapses'
    };
  }

  // 4. INVENTORY & ECONOMY
  if (
    matchesAny(['inventory', 'item', 'loot', 'chest', 'bag', 'slot', 'pickup', 'gold', 'currency', 'craft', 'shop', 'vendor', 'consumable']) ||
    nodeNames.some(n => n.includes('additem') || n.includes('removeitem') || n.includes('equip'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['AddItem', 'RemoveItem', 'EquipItem', 'SpawnPickup', 'GetItemData']);
    return {
      blueprintName: name,
      archetype: 'inventory',
      archetypeLabel: 'Inventory & Economy',
      primaryFunction: 'Item serialization, storage container caching, equipment slots, and currency transactions',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['AddItem', 'RemoveItem', 'SpawnPickup'],
      accentHex: '#eab308',
      secondaryHex: '#facc15',
      bgGradient: ['#422006', '#090d16'],
      glyphType: 'inventory',
      glyphDescription: 'a futuristic hexagonal vault container with an illuminated golden power core'
    };
  }

  // 5. TACTICAL HUD & USER INTERFACE
  if (
    name.startsWith('WBP_') ||
    parentClass.includes('userwidget') ||
    matchesAny(['widget', 'hud', 'ui', 'menu', 'screen', 'reticle', 'crosshair', 'bar', 'dialogue', 'radial', 'journal']) ||
    nodeNames.some(n => n.includes('createwidget') || n.includes('addtoviewport') || n.includes('setpercent'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['CreateWidget', 'AddToViewport', 'SetPercent', 'PlayAnimation', 'SetVisibility']);
    return {
      blueprintName: name,
      archetype: 'ui',
      archetypeLabel: 'Tactical HUD & UI',
      primaryFunction: 'Diegetic screen rendering, interactive widget controls, and state event bindings',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['CreateWidget', 'AddToViewport', 'SetPercent'],
      accentHex: '#38bdf8',
      secondaryHex: '#7dd3fc',
      bgGradient: ['#0c4a6e', '#090d16'],
      glyphType: 'ui',
      glyphDescription: 'a high-tech holographic HUD reticle with geometric targeting brackets and power gauge arcs'
    };
  }

  // 6. WORLD & INTERACTION
  if (
    matchesAny(['door', 'lever', 'switch', 'trigger', 'platform', 'elevator', 'gate', 'portal', 'puzzle', 'interactable', 'chest', 'spawner', 'shrine']) ||
    nodeNames.some(n => n.includes('overlap') || n.includes('timeline') || n.includes('setactorlocation'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['OnComponentBeginOverlap', 'PlayTimeline', 'SetActorLocation', 'SetActorRotation', 'ToggleActive']);
    return {
      blueprintName: name,
      archetype: 'world',
      archetypeLabel: 'World & Interaction',
      primaryFunction: 'Environmental triggers, motorized kinetics, overlap detection, and state machines',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['OnComponentBeginOverlap', 'PlayTimeline', 'SetActorLocation'],
      accentHex: '#10b981',
      secondaryHex: '#34d399',
      bgGradient: ['#064e3b', '#090d16'],
      glyphType: 'world',
      glyphDescription: 'an illuminated stone portal archway with an emerald swirling energy vortex'
    };
  }

  // 7. VFX & SPELLCASTING
  if (
    matchesAny(['vfx', 'effect', 'particle', 'niagara', 'spell', 'magic', 'fireball', 'lightning', 'aura', 'buff', 'explosion', 'emitter']) ||
    componentNames.some(c => c.includes('niagara') || c.includes('particle')) ||
    nodeNames.some(n => n.includes('niagara') || n.includes('emitter'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['SpawnSystemAtLocation', 'SetNiagaraVariable', 'SpawnEmitterAtLocation', 'ActivateFX']);
    return {
      blueprintName: name,
      archetype: 'vfx',
      archetypeLabel: 'VFX & Spellcasting',
      primaryFunction: 'Niagara particulate simulation, dynamic material shaders, and elemental burst emitters',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['SpawnSystemAtLocation', 'SetNiagaraVariable', 'SpawnEmitterAtLocation'],
      accentHex: '#ec4899',
      secondaryHex: '#f472b6',
      bgGradient: ['#500724', '#090d16'],
      glyphType: 'vfx',
      glyphDescription: 'a radiant arcane starburst rune with orbiting elemental plasma particles in vivid magenta'
    };
  }

  // 8. AUDIO & SOUND
  if (
    matchesAny(['audio', 'sound', 'metasound', 'music', 'sfx', 'footstep', 'voice', 'ambient', 'dsp', 'reverb']) ||
    componentNames.some(c => c.includes('audio')) ||
    nodeNames.some(n => n.includes('playsound') || n.includes('audio'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['PlaySoundAtLocation', 'PlaySound2D', 'SpawnSoundAttached', 'SetVolumeMultiplier']);
    return {
      blueprintName: name,
      archetype: 'audio',
      archetypeLabel: 'Audio & MetaSound',
      primaryFunction: 'Dynamic acoustic spatialization, procedural DSP synthesis, and footstep dispatchers',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['PlaySoundAtLocation', 'SpawnSoundAttached', 'SetVolumeMultiplier'],
      accentHex: '#f97316',
      secondaryHex: '#fb923c',
      bgGradient: ['#431407', '#090d16'],
      glyphType: 'audio',
      glyphDescription: 'a pulsing sonic frequency equalizer core with concentric amber resonance waves'
    };
  }

  // 9. NETWORK & MULTIPLAYER
  if (
    name.startsWith('GM_') ||
    name.startsWith('GS_') ||
    name.startsWith('PC_') ||
    matchesAny(['server', 'client', 'network', 'replicate', 'multicast', 'rpc', 'lobby', 'match', 'session', 'authority', 'gamemode', 'gamestate']) ||
    nodeNames.some(n => n.includes('authority') || n.includes('replicated') || n.includes('rpc'))
  ) {
    const keyNodes = extractKeyNodes(allNodes, ['SwitchHasAuthority', 'ServerRPC', 'ClientRPC', 'MulticastBroadcast', 'OnRep_Variable']);
    return {
      blueprintName: name,
      archetype: 'network',
      archetypeLabel: 'Multiplayer & Network',
      primaryFunction: 'Authoritative server validation, state replication channels, and client synchronization',
      keyNodes: keyNodes.length > 0 ? keyNodes : ['SwitchHasAuthority', 'ServerRPC', 'OnRep_Variable'],
      accentHex: '#6366f1',
      secondaryHex: '#818cf8',
      bgGradient: ['#1e1b4b', '#090d16'],
      glyphType: 'network',
      glyphDescription: 'two synchronized geometric data cubes linked by glowing bi-directional indigo laser relays'
    };
  }

  // 10. SYSTEM & SUBSYSTEM (DEFAULT)
  const defaultKeyNodes = extractKeyNodes(allNodes, ['EventBeginPlay', 'EventTick', 'SetTimerByEvent', 'GetGameInstance', 'Branch']);
  return {
    blueprintName: name,
    archetype: 'system',
    archetypeLabel: 'System Subsystem',
    primaryFunction: 'Core lifecycle management, state caching, timer ticking, and subsystem dispatching',
    keyNodes: defaultKeyNodes.length > 0 ? defaultKeyNodes : ['EventBeginPlay', 'EventTick', 'Branch'],
    accentHex: '#64748b',
    secondaryHex: '#94a3b8',
    bgGradient: ['#0f172a', '#090d16'],
    glyphType: 'system',
    glyphDescription: 'a precision interlocked gear mechanism with a glowing central microchip processor core'
  };
}

function extractKeyNodes(allNodes: any[], priorityList: string[]): string[] {
  const found: string[] = [];
  for (const p of priorityList) {
    const hit = allNodes.find(n => n.name.toLowerCase().includes(p.toLowerCase()));
    if (hit && !found.includes(hit.name)) {
      found.push(hit.name);
    }
  }
  // If fewer than 2, fill with first available nodes
  for (const n of allNodes) {
    if (found.length >= 3) break;
    if (!found.includes(n.name)) found.push(n.name);
  }
  return found;
}

/**
 * Procedural Vector SVG Icon Generator.
 * Generates an SVG data URL with detailed geometric vector art,
 * glowing circuit traces, pin connection ports, and an archetype hero glyph.
 * Guaranteed instant rendering with zero network latency.
 */
export function generateProceduralVectorThumbnail(
  blueprintName: string,
  analysis: BlueprintAnalysisResult,
  stylePreset: BlueprintIconStylePreset = 'ue5-realistic'
): string {
  const { archetype, accentHex, secondaryHex, bgGradient, primaryFunction } = analysis;
  
  // Extract a 2-3 letter monogram for the corner badge
  let prefix = 'BP';
  if (blueprintName.startsWith('WBP_')) prefix = 'WBP';
  else if (blueprintName.startsWith('ABP_')) prefix = 'ABP';
  else if (blueprintName.startsWith('BPC_')) prefix = 'BPC';
  else if (blueprintName.startsWith('GM_')) prefix = 'GM';
  else if (blueprintName.startsWith('PC_')) prefix = 'PC';

  // SVG hero glyph drawing based on archetype
  const glyphPaths = getArchetypeGlyphSvg(archetype, accentHex, secondaryHex);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${bgGradient[0]}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${bgGradient[1]}" stop-opacity="1" />
    </radialGradient>

    <!-- Bevel Border Gradient -->
    <linearGradient id="bevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#334155" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${secondaryHex}" stop-opacity="0.8" />
    </linearGradient>

    <!-- Glowing Core Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Circuit Grid Pattern -->
    <pattern id="techGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" stroke-width="0.75" stroke-opacity="0.25" />
    </pattern>
  </defs>

  <!-- Outer Rounded Chassis Base -->
  <rect x="8" y="8" width="240" height="240" rx="36" fill="url(#bgGrad)" stroke="url(#bevelGrad)" stroke-width="3" />
  
  <!-- Subtle Blueprint Tech Grid Background -->
  <rect x="12" y="12" width="232" height="232" rx="32" fill="url(#techGrid)" />

  <!-- Ambient Glow Center Backing -->
  <circle cx="128" cy="122" r="64" fill="${accentHex}" opacity="0.16" filter="url(#glow)" />

  <!-- Circuit Trace Wiring Lines -->
  <g stroke="${accentHex}" stroke-opacity="0.35" stroke-width="1.5" stroke-linecap="round" fill="none">
    <path d="M 28 80 L 60 80 L 85 105" />
    <path d="M 28 176 L 60 176 L 85 151" />
    <path d="M 228 80 L 196 80 L 171 105" />
    <path d="M 228 176 L 196 176 L 171 151" />
    <circle cx="85" cy="105" r="2.5" fill="${accentHex}" />
    <circle cx="85" cy="151" r="2.5" fill="${accentHex}" />
    <circle cx="171" cy="105" r="2.5" fill="${secondaryHex}" />
    <circle cx="171" cy="151" r="2.5" fill="${secondaryHex}" />
  </g>

  <!-- Left Pin Ports (Unreal Engine Input Pins) -->
  <!-- Exec Pin (White Pentagon) -->
  <polygon points="12,74 22,74 27,80 22,86 12,86" fill="#f8fafc" stroke="#334155" stroke-width="1" />
  <!-- Data Pin (Colored Pill) -->
  <circle cx="16" cy="176" r="4.5" fill="${accentHex}" stroke="#0f172a" stroke-width="1.5" />

  <!-- Right Pin Ports (Unreal Engine Output Pins) -->
  <!-- Exec Pin (White Pentagon) -->
  <polygon points="234,74 244,74 249,80 244,86 234,86" fill="#f8fafc" stroke="#334155" stroke-width="1" />
  <!-- Data Pin (Colored Pill) -->
  <circle cx="240" cy="176" r="4.5" fill="${secondaryHex}" stroke="#0f172a" stroke-width="1.5" />

  <!-- Center Hero Glyph Frame -->
  <circle cx="128" cy="122" r="54" fill="#090d16" stroke="${accentHex}" stroke-width="2" stroke-opacity="0.75" />
  <circle cx="128" cy="122" r="50" fill="none" stroke="${secondaryHex}" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.4" />

  <!-- Archetype-Specific Vector Hero Glyph -->
  <g transform="translate(128, 122)" filter="url(#softGlow)">
    ${glyphPaths}
  </g>

  <!-- Top Left Asset Monogram Pill Badge -->
  <g transform="translate(24, 24)">
    <rect x="0" y="0" width="${prefix.length * 9 + 18}" height="18" rx="5" fill="#0f172a" stroke="${accentHex}" stroke-width="1" stroke-opacity="0.8" />
    <text x="${(prefix.length * 9 + 18) / 2}" y="12.5" fill="#f8fafc" font-family="monospace" font-size="9.5" font-weight="900" text-anchor="middle" letter-spacing="1">${prefix}</text>
  </g>

  <!-- Top Right Node Indicator Count Pill -->
  <g transform="translate(186, 24)">
    <rect x="0" y="0" width="46" height="18" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <circle cx="10" cy="9" r="3" fill="${accentHex}" />
    <text x="27" y="12.5" fill="#94a3b8" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">SPEC</text>
  </g>

  <!-- Bottom Blueprint Function & Archetype Label Bar -->
  <g transform="translate(24, 206)">
    <rect x="0" y="0" width="208" height="26" rx="8" fill="#090d16" stroke="#1e293b" stroke-width="1" />
    <text x="104" y="16.5" fill="${secondaryHex}" font-family="sans-serif" font-size="9.5" font-weight="800" text-anchor="middle" letter-spacing="1" text-transform="uppercase">
      ${analysis.archetypeLabel}
    </text>
  </g>
</svg>
`.trim();

  // Return crisp SVG Data URL
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns tailored SVG vector paths for each blueprint archetype.
 */
function getArchetypeGlyphSvg(archetype: BlueprintArchetype, accent: string, secondary: string): string {
  switch (archetype) {
    case 'combat':
      // Crossed high-tech blades with glowing edges and impact spark
      return `
        <g stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Blade 1 -->
          <line x1="-24" y1="24" x2="24" y2="-24" stroke="${accent}" stroke-width="3.5" />
          <path d="M 12 -24 L 24 -24 L 24 -12" fill="${secondary}" />
          <!-- Crossguard 1 -->
          <line x1="-12" y1="12" x2="-4" y2="20" stroke="${secondary}" stroke-width="2.5" />
          
          <!-- Blade 2 -->
          <line x1="24" y1="24" x2="-24" y2="-24" stroke="${accent}" stroke-width="3.5" />
          <path d="M -12 -24 L -24 -24 L -24 -12" fill="${secondary}" />
          <!-- Crossguard 2 -->
          <line x1="12" y1="12" x2="4" y2="20" stroke="${secondary}" stroke-width="2.5" />
        </g>
        <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="${accent}" stroke-width="2" />
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#ffffff" stroke-width="1.5" />
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#ffffff" stroke-width="1.5" />
      `;

    case 'locomotion':
      // Kinetic Winged Runner Boot with speed streaks
      return `
        <g stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Boot Chassis -->
          <path d="M -16 -18 L 4 -18 L 8 -4 L 22 4 L 20 16 L -16 16 Z" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2.5" />
          <path d="M -16 16 L 20 16 L 24 10" stroke="${secondary}" stroke-width="3" />
          <!-- Wing Struts -->
          <path d="M -14 -14 L -28 -20 L -22 -10 L -30 -6 L -16 -2" fill="${secondary}" fill-opacity="0.3" stroke="${secondary}" stroke-width="2" />
          <!-- Kinetic Speed Streaks -->
          <line x1="-26" y1="6" x2="-14" y2="6" stroke="#ffffff" stroke-width="2" />
          <line x1="-22" y1="12" x2="-10" y2="12" stroke="${secondary}" stroke-width="1.5" />
        </g>
      `;

    case 'ai':
      // Cybernetic Brain Nexus with glowing neural synaptic nodes
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none">
          <!-- Central Core -->
          <polygon points="0,-16 15,-6 15,12 0,22 -15,12 -15,-6" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2" />
          <!-- Neural nodes -->
          <circle cx="0" cy="-24" r="3.5" fill="#ffffff" />
          <circle cx="22" cy="-10" r="3" fill="${secondary}" />
          <circle cx="22" cy="14" r="3" fill="${secondary}" />
          <circle cx="0" cy="28" r="3" fill="${secondary}" />
          <circle cx="-22" cy="14" r="3" fill="${secondary}" />
          <circle cx="-22" cy="-10" r="3" fill="${secondary}" />
          <!-- Synapse Connections -->
          <line x1="0" y1="-16" x2="0" y2="-24" stroke="${secondary}" />
          <line x1="15" y1="-6" x2="22" y2="-10" stroke="${secondary}" />
          <line x1="15" y1="12" x2="22" y2="14" stroke="${secondary}" />
          <line x1="0" y1="22" x2="0" y2="28" stroke="${secondary}" />
          <line x1="-15" y1="12" x2="-22" y2="14" stroke="${secondary}" />
          <line x1="-15" y1="-6" x2="-22" y2="-10" stroke="${secondary}" />
          <circle cx="0" cy="3" r="5" fill="#ffffff" />
        </g>
      `;

    case 'inventory':
      // Futuristic Hexagonal Vault Chest with floating power crystal
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Hexagonal Chest Body -->
          <polygon points="0,-22 22,-10 22,14 0,26 -22,14 -22,-10" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2.5" />
          <!-- Inner Rim -->
          <polygon points="0,-14 14,-6 14,8 0,16 -14,8 -14,-6" stroke="${secondary}" stroke-width="1.5" />
          <!-- Floating Gemstone / Key Core -->
          <polygon points="0,-8 6,0 0,8 -6,0" fill="#ffffff" stroke="${accent}" stroke-width="1.5" />
          <line x1="-22" y1="-10" x2="-14" y2="-6" stroke="${secondary}" />
          <line x1="22" y1="-10" x2="14" y2="-6" stroke="${secondary}" />
          <line x1="0" y1="26" x2="0" y2="16" stroke="${secondary}" />
        </g>
      `;

    case 'ui':
      // Holographic Targeting Reticle with brackets and progress arc
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none">
          <!-- Outer Brackets -->
          <path d="M -20 -10 L -20 -20 L -10 -20" stroke="${secondary}" stroke-width="2.5" />
          <path d="M 20 -10 L 20 -20 L 10 -20" stroke="${secondary}" stroke-width="2.5" />
          <path d="M -20 10 L -20 20 L -10 20" stroke="${secondary}" stroke-width="2.5" />
          <path d="M 20 10 L 20 20 L 10 20" stroke="${secondary}" stroke-width="2.5" />
          <!-- Inner Circular Crosshair -->
          <circle cx="0" cy="0" r="14" stroke="${accent}" stroke-width="2" stroke-dasharray="8,4" />
          <line x1="-18" y1="0" x2="-6" y2="0" stroke="#ffffff" stroke-width="1.5" />
          <line x1="6" y1="0" x2="18" y2="0" stroke="#ffffff" stroke-width="1.5" />
          <line x1="0" y1="-18" x2="0" y2="-6" stroke="#ffffff" stroke-width="1.5" />
          <line x1="0" y1="6" x2="0" y2="18" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>
      `;

    case 'world':
      // Architectural Dimensional Portal with energy vortex
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Stone Archway Pillars -->
          <path d="M -18 24 L -18 -8 Q -18 -24 0 -24 Q 18 -24 18 -8 L 18 24" stroke="${accent}" stroke-width="3" />
          <path d="M -24 24 L 24 24" stroke="${secondary}" stroke-width="3" />
          <!-- Inner Portal Vortex -->
          <ellipse cx="0" cy="2" rx="10" ry="16" fill="${accent}" fill-opacity="0.25" stroke="${secondary}" stroke-width="1.5" />
          <!-- Glowing Core -->
          <circle cx="0" cy="2" r="4" fill="#ffffff" />
          <line x1="0" y1="-12" x2="0" y2="16" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2,2" />
        </g>
      `;

    case 'vfx':
      // Arcane Starburst Rune with orbiting elemental plasma
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- 8-Pointed Starburst -->
          <path d="M 0 -24 L 6 -8 L 22 -8 L 10 2 L 15 18 L 0 8 L -15 18 L -10 2 L -22 -8 L -6 -8 Z" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2" />
          <!-- Orbiting rings -->
          <ellipse cx="0" cy="0" rx="20" ry="8" stroke="${secondary}" stroke-width="1.5" transform="rotate(30)" />
          <ellipse cx="0" cy="0" rx="20" ry="8" stroke="${secondary}" stroke-width="1.5" transform="rotate(-30)" />
          <circle cx="0" cy="0" r="4" fill="#ffffff" />
        </g>
      `;

    case 'audio':
      // Soundwave frequency bars with resonance rings
      return `
        <g stroke="${accent}" stroke-linecap="round" fill="${accent}">
          <!-- Frequency Bars -->
          <line x1="-16" y1="4" x2="-16" y2="-4" stroke="${secondary}" stroke-width="3.5" />
          <line x1="-10" y1="12" x2="-10" y2="-12" stroke="${accent}" stroke-width="3.5" />
          <line x1="-4" y1="18" x2="-4" y2="-18" stroke="#ffffff" stroke-width="3.5" />
          <line x1="2" y1="10" x2="2" y2="-10" stroke="${accent}" stroke-width="3.5" />
          <line x1="8" y1="16" x2="8" y2="-16" stroke="#ffffff" stroke-width="3.5" />
          <line x1="14" y1="6" x2="14" y2="-6" stroke="${secondary}" stroke-width="3.5" />
          <!-- Concentric Resonance Arcs -->
          <path d="M 18 -12 A 16 16 0 0 1 18 12" fill="none" stroke="${secondary}" stroke-width="1.5" />
          <path d="M 23 -18 A 24 24 0 0 1 23 18" fill="none" stroke="${accent}" stroke-width="1" />
        </g>
      `;

    case 'network':
      // Dual synchronized data cubes with sync signal beams
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Server Cube 1 -->
          <polygon points="-12,-16 0,-22 0,-10 -12,-4" fill="${accent}" fill-opacity="0.3" stroke="${accent}" />
          <polygon points="0,-22 12,-16 12,-4 0,-10" fill="${secondary}" fill-opacity="0.2" stroke="${secondary}" />
          <!-- Client Cube 2 -->
          <polygon points="-12,12 0,6 0,18 -12,24" fill="${accent}" fill-opacity="0.3" stroke="${accent}" />
          <polygon points="0,6 12,12 12,24 0,18" fill="${secondary}" fill-opacity="0.2" stroke="${secondary}" />
          <!-- Bi-directional sync beam -->
          <line x1="0" y1="-4" x2="0" y2="6" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="2,2" />
          <circle cx="0" cy="1" r="2.5" fill="#ffffff" />
        </g>
      `;

    case 'system':
    default:
      // Precision Gear mechanism with central microchip core
      return `
        <g stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <!-- Outer Gear Body -->
          <circle cx="0" cy="0" r="16" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2.5" />
          <!-- Gear Teeth -->
          <line x1="0" y1="-22" x2="0" y2="-16" stroke="${secondary}" stroke-width="3.5" />
          <line x1="0" y1="16" x2="0" y2="22" stroke="${secondary}" stroke-width="3.5" />
          <line x1="-22" y1="0" x2="-16" y2="0" stroke="${secondary}" stroke-width="3.5" />
          <line x1="16" y1="0" x2="22" y2="0" stroke="${secondary}" stroke-width="3.5" />
          <line x1="-15" y1="-15" x2="-11" y2="-11" stroke="${secondary}" stroke-width="3" />
          <line x1="11" y1="11" x2="15" y2="15" stroke="${secondary}" stroke-width="3" />
          <line x1="15" y1="-15" x2="11" y2="-11" stroke="${secondary}" stroke-width="3" />
          <line x1="-11" y1="11" x2="-15" y2="15" stroke="${secondary}" stroke-width="3" />
          <!-- Center Microchip Core -->
          <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#ffffff" stroke="${accent}" stroke-width="1.5" />
        </g>
      `;
  }
}

/**
 * Builds the engineered AI prompt for generating a unique, recognizable
 * icon thumbnail with Gemini Flash Image model.
 */
export function buildBlueprintThumbnailPrompt(
  analysis: BlueprintAnalysisResult,
  stylePreset: BlueprintIconStylePreset = 'ue5-realistic'
): string {
  const styleDescriptions: Record<BlueprintIconStylePreset, string> = {
    'ue5-realistic': 'Photorealistic Unreal Engine 5 production asset icon, Nanite geometry, Lumen global illumination, brushed dark titanium chassis, sharp three-point studio rim lighting, octane render 3D quality',
    'cyberpunk-neon': 'Futuristic cyberpunk neon game icon, glowing electric cyan and magenta circuit traces, high-contrast dark carbon chassis, holographic energy aura',
    'minimalist-vector': 'Modern flat vector game asset icon, bold geometric silhouette, clean bevel contour, vivid accent colors, minimalist UI asset badge',
    'holographic-hud': 'Diegetic sci-fi holographic tactical HUD icon, precision glowing wireframe geometry, targeting reticles, status bracket elements',
    'fantasy-sigil': 'Arcane high-fantasy runestone emblem, etched obsidian stone, glowing magical runic channels with gold filigree inlays'
  };

  const styleText = styleDescriptions[stylePreset] || styleDescriptions['ue5-realistic'];

  return [
    `Unreal Engine 5 Content Browser asset thumbnail icon badge for blueprint "${analysis.blueprintName}".`,
    `Primary Function: ${analysis.primaryFunction}.`,
    `Core Graph Nodes: ${analysis.keyNodes.join(', ')}.`,
    `Visual Style: ${styleText}.`,
    `Focal Element: Centered iconic 3D hero emblem showing ${analysis.glyphDescription}.`,
    `Composition: Centered square 1:1 format, isolated on dark technical slate-black chassis (#0f172a) with glowing ${analysis.accentHex} neon circuit traces and energy aura, subtle hexagonal border frame, sharp studio lighting, high contrast, clean vector render, no text, no watermark, 4k game icon.`
  ].join(' ');
}

/**
 * Automated Generation orchestrator:
 * 1. Analyzes blueprint primary function & node types.
 * 2. Attempts AI synthesis with Gemini flash image model.
 * 3. If AI fails, falls back seamlessly to procedural high-fidelity vector thumbnail.
 */
export async function generateBlueprintThumbnail(
  blueprint: Partial<BlueprintSpec> & { name?: string; desc?: string; assetName?: string },
  stylePreset: BlueprintIconStylePreset = 'ue5-realistic',
  customPromptOverride?: string
): Promise<BlueprintThumbnailMetadata> {
  const analysis = analyzeBlueprintFunctionAndNodes(blueprint);
  const prompt = customPromptOverride || buildBlueprintThumbnailPrompt(analysis, stylePreset);

  try {
    // Attempt AI Generation via Gemini image endpoint
    const aiImageUrl = await generateBlueprintThumbnailImage(prompt);

    return {
      blueprintName: analysis.blueprintName,
      imageUrl: aiImageUrl,
      prompt,
      archetype: analysis.archetype,
      archetypeLabel: analysis.archetypeLabel,
      primaryFunction: analysis.primaryFunction,
      keyNodes: analysis.keyNodes,
      colorTheme: analysis.accentHex,
      accentHex: analysis.accentHex,
      generatedAt: Date.now(),
      isAiGenerated: true,
      stylePreset
    };
  } catch (err) {
    console.warn(`AI thumbnail generation fallback to procedural vector for ${analysis.blueprintName}:`, err);
    
    // Seamless procedural vector fallback
    const proceduralSvgUrl = generateProceduralVectorThumbnail(analysis.blueprintName, analysis, stylePreset);

    return {
      blueprintName: analysis.blueprintName,
      imageUrl: proceduralSvgUrl,
      prompt,
      archetype: analysis.archetype,
      archetypeLabel: analysis.archetypeLabel,
      primaryFunction: analysis.primaryFunction,
      keyNodes: analysis.keyNodes,
      colorTheme: analysis.accentHex,
      accentHex: analysis.accentHex,
      generatedAt: Date.now(),
      isAiGenerated: false,
      stylePreset
    };
  }
}

// -------------------------------------------------------------
// Storage & Project Persistence Helpers
// -------------------------------------------------------------

export function getProjectThumbnailStorageKey(projectId: string): string {
  return `ue5_bp_thumbnails_${projectId}`;
}

export function getAllStoredThumbnails(projectId: string): Record<string, BlueprintThumbnailMetadata> {
  try {
    const raw = localStorage.getItem(getProjectThumbnailStorageKey(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStoredThumbnail(projectId: string, blueprintName: string): BlueprintThumbnailMetadata | null {
  const all = getAllStoredThumbnails(projectId);
  return all[blueprintName] || null;
}

export function saveStoredThumbnail(projectId: string, metadata: BlueprintThumbnailMetadata): void {
  try {
    const all = getAllStoredThumbnails(projectId);
    all[metadata.blueprintName] = metadata;
    localStorage.setItem(getProjectThumbnailStorageKey(projectId), JSON.stringify(all));
  } catch (e) {
    console.error("Failed to save blueprint thumbnail to local storage", e);
  }
}

export function batchSaveThumbnails(projectId: string, batch: Record<string, BlueprintThumbnailMetadata>): void {
  try {
    const all = getAllStoredThumbnails(projectId);
    const updated = { ...all, ...batch };
    localStorage.setItem(getProjectThumbnailStorageKey(projectId), JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to batch save blueprint thumbnails", e);
  }
}

export function deleteStoredThumbnail(projectId: string, blueprintName: string): void {
  try {
    const all = getAllStoredThumbnails(projectId);
    delete all[blueprintName];
    localStorage.setItem(getProjectThumbnailStorageKey(projectId), JSON.stringify(all));
  } catch (e) {
    console.error("Failed to delete blueprint thumbnail", e);
  }
}
