import JSZip from 'jszip';
import { GddDocumentRecord } from '../types';

export interface ParsedGddFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText: string;
  pdfBase64?: string;
  wordCount: number;
  estimatedPages: number;
  detectedHeadings: string[];
}

/**
 * Extracts plain text from a Word (.docx) file by reading word/document.xml
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Invalid .docx file: word/document.xml missing');
    }

    // Parse XML tags: paragraph breaks and text nodes
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
    
    // Extract paragraphs
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const textLines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textNodes = p.getElementsByTagName('w:t');
      let line = '';
      for (let j = 0; j < textNodes.length; j++) {
        line += textNodes[j].textContent || '';
      }
      if (line.trim().length > 0) {
        textLines.push(line.trim());
      }
    }

    return textLines.join('\n\n');
  } catch (error) {
    console.error('Error extracting text from docx:', error);
    throw new Error('Failed to parse .docx file. Please check file integrity or use .txt / .md format.');
  }
}

/**
 * Converts File to Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const res = reader.result as string;
      const base64Data = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Reads plain text from a File
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = error => reject(error);
  });
}

/**
 * Analyzes raw text for headings, word counts, and page approximations
 */
export function analyzeDocumentText(text: string): { wordCount: number; estimatedPages: number; detectedHeadings: string[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  // Standard manuscript average: ~300 words per page
  const estimatedPages = Math.max(1, Math.round(wordCount / 300));

  // Detect common GDD headings (# Heading, HEADING:, 1.0 Heading, etc.)
  const lines = text.split('\n');
  const detectedHeadings: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    
    // Markdown headers
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      if (heading.length < 80) detectedHeadings.push(heading);
    }
    // Numbered headers (e.g. "1.0 Core Mechanics" or "Section 2:")
    else if (/^(?:\d+\.|\d+\.\d+|section\s+\d+:?)/i.test(line) && line.length < 80) {
      detectedHeadings.push(line);
    }
    // UPPERCASE HEADER LINES
    else if (line.length > 3 && line.length < 60 && line === line.toUpperCase() && !line.includes('.')) {
      detectedHeadings.push(line);
    }

    if (detectedHeadings.length >= 15) break;
  }

  return {
    wordCount,
    estimatedPages,
    detectedHeadings: detectedHeadings.length > 0 ? detectedHeadings : ['Core Overview', 'Gameplay Mechanics', 'Technical Architecture']
  };
}

/**
 * High-level parser that accepts any uploaded File object
 */
export async function parseUploadedGddFile(file: File): Promise<ParsedGddFile> {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type || '';
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));

  let extractedText = '';
  let pdfBase64: string | undefined = undefined;

  if (ext === '.docx' || ext === '.doc') {
    const arrayBuffer = await file.arrayBuffer();
    extractedText = await extractTextFromDocx(arrayBuffer);
  } else if (ext === '.pdf') {
    pdfBase64 = await fileToBase64(file);
    // Also attempt basic ASCII string extraction as a quick preview fallback
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let ascii = '';
      for (let i = 0; i < Math.min(uint8.length, 50000); i++) {
        const c = uint8[i];
        if ((c >= 32 && c <= 126) || c === 10 || c === 13) {
          ascii += String.fromCharCode(c);
        }
      }
      extractedText = ascii.length > 200 ? ascii.slice(0, 8000) : `[Binary PDF Document: ${fileName} (${Math.round(fileSize / 1024)} KB) loaded for Neural Multimodal Processing]`;
    } catch {
      extractedText = `[Binary PDF Document: ${fileName} loaded for Neural Processing]`;
    }
  } else {
    // .txt, .md, .json, .rtf, or general text
    extractedText = await readFileAsText(file);
  }

  const { wordCount, estimatedPages, detectedHeadings } = analyzeDocumentText(extractedText);

  return {
    fileName,
    fileSize,
    mimeType: ext === '.pdf' ? 'application/pdf' : mimeType || 'text/plain',
    extractedText,
    pdfBase64,
    wordCount,
    estimatedPages,
    detectedHeadings
  };
}

/**
 * Curated, production-grade Sample Game Design Documents
 */
export interface SampleGddTemplate {
  id: string;
  title: string;
  genre: string;
  targetPlatform: string;
  summary: string;
  content: string;
  tags: string[];
}

export const SAMPLE_GDD_TEMPLATES: SampleGddTemplate[] = [
  {
    id: 'valkyrie-protocol',
    title: 'Valkyrie Protocol: Reclamation',
    genre: 'Tactical Cyberpunk Co-op Extraction Shooter',
    targetPlatform: 'PC & PS5 (Unreal Engine 5.5)',
    summary: 'A squad-based 3-player extraction shooter set in the flooded neon megalopolis of Neo-Cascade. High-stakes salvage raids, modular weapon tuning, and adaptive enemy AI.',
    tags: ['Cyberpunk', 'Multiplayer', 'Extraction', 'PCG Levels', 'GAS'],
    content: `# GAME DESIGN DOCUMENT: VALKYRIE PROTOCOL - RECLAMATION
Version: 1.4.0 (Production Draft)
Target Engine: Unreal Engine 5.5
Target Platforms: PC, PlayStation 5, Xbox Series X
Networking: Dedicated Server Authority with Client Prediction (3-Player Co-op)
Camera Perspective: Third Person Over-the-Shoulder Tactical Combat

================================================================================
1. EXECUTIVE SUMMARY & DESIGN PILLARS
================================================================================
Logline: In the submerged, corporate-quarantined megalopolis of Neo-Cascade, 
mercenary strike teams (Valkyries) drop from sub-orbital pods to breach 
corporate research citadels, secure classified neuromorphic blueprints, 
and extract before orbital clean-up strikes wipe the sector.

Core Design Pillars:
1. High-Stakes Tactical Pacing: Every bullet counts. Tactical positioning, cover navigation, and gadget coordination surpass twitch reactions.
2. Dynamic Procedural Extraction Zones: Urban corporate ruins generated via Unreal Engine PCG Framework with dynamic barricades, drone flight lanes, and flood hazard volumes.
3. Modular Neuromorphic Augmentations: Custom Gameplay Ability System (GAS) granting players thermal scanners, kinetic dash, EMP tripwires, and deployable hard-light shields.
4. Atmospheric Cyber-Noir Audio-Visuals: Lumen dynamic global illumination casting neon reflections on rain-slicked concrete, scored by dynamic MetaSound combat stems.

================================================================================
2. CORE GAMEPLAY MECHANICS & SYSTEMS
================================================================================
2.1 Enhanced Locomotion & Combat
- Movement Model: ALS V4 style fluid tactical locomotion. Sprinting, slide-to-cover, vaulting, and ledge mantle.
- Weapon Ballistics: Deterministic line-trace ballistics with physical bullet drop, projectile speed, and material surface penetration (wood, metal, reinforced blast doors).
- Recoil & Sway: Dynamic camera recoil driven by curve assets; stamina depletion induces aim sway.

2.2 Inventory & Extraction Economy
- Grid-Based Tactical Rig: Limited weight and volumetric capacity. Players must balance ammunition, medical stims, hacking keys, and high-value research data-cores.
- Extraction Beacon: Launching an extraction beacon activates a 90-second survival countdown, drawing corporate security drones and rival hunter teams.

2.3 AI Factions & Squad Tactics
- Corporate Security "Aegis Unit": Squad coordinated through Unreal Engine Behavior Trees and Environmental Query System (EQS).
- Vanguard Breach Mechs: Heavily armored automatons with destructible armor plates and exposed plasma cooling vents.
- Stalker Infiltrators: Cloaked recon units using ceiling-mounted patrol paths and EMP snipers.

================================================================================
3. TECHNICAL ARCHITECTURE & ASSET HIERARCHY
================================================================================
Primary Blueprints & Subsystems:
- BP_ValkyrieCharacter: Core playable pawn inheriting from Modular Character, integrating GAS AbilitySystemComponent and Enhanced Input Mapping Context.
- BP_WeaponBase: Modular firearm master actor with swappable Barrel, Receiver, Scope, and Magazine components.
- BP_ExtractionBeacon: Network-replicated interactive world objective with state machine managing beacon warm-up, radio beacon ping, and extraction helicopter docking.
- BP_GameMode_Extraction: Server-authoritative game loop handling drop-pod deployment, match timer, procedural seed generation, and squad wipe fail-states.
- BP_Aegis_EnemyController: Advanced AI controller leveraging Perception Component (Sight, Hearing, Damage) and EQS queries for cover evaluation.

Unreal Engine Plugins:
- Gameplay Ability System (GAS)
- Enhanced Input System
- Common UI Plugin for cross-platform HUD and Inventory navigation
- PCG Framework (Procedural Content Generation)
- MetaSound Studio for adaptive audio mixing
- Motion Warping for melee finish moves and vaulting
`
  },
  {
    id: 'eldritch-sun',
    title: 'Eldritch Sun: The Bleeding Dawn',
    genre: 'Dark Fantasy Action-RPG & Soulslike Metroidvania',
    targetPlatform: 'PC & Next-Gen Consoles (Unreal Engine 5.4)',
    summary: 'A somber soulslike set in a cursed realm where a dying eclipse star drips molten gold. Fluid swordplay, stance transitions, interconnected seamless world streaming.',
    tags: ['Soulslike', 'Dark Fantasy', 'Melee Combat', 'World Partition', 'Lumen'],
    content: `# GAME DESIGN DOCUMENT: ELDRITCH SUN - THE BLEEDING DAWN
Version: 2.1.0 (Lead Architecture Spec)
Target Engine: Unreal Engine 5.4
Target Platforms: PC, PlayStation 5, Xbox Series X
Networking: Single Player with Asynchronous Player Phantoms & Messages
Camera Perspective: Third Person Action Lock-On Camera

================================================================================
1. CORE VISION & WORLD LORE
================================================================================
Logline: You awaken as an Ashen Herald in the petrified kingdom of Sol-Kael, 
where an immortal solar god has fractured into nine cursed avatars. 
Master fluid posture-based sword combat, absorb sun-shards, and navigate a 
massive interconnected fortress-cathedral.

Key Pillars:
1. Deliberate, Weighted Melee Combat: Posture and stamina management. Parries, directional deflects, and poise breaks.
2. Interconnected Metroidvania World Design: Seamless vertical exploration leveraging UE5 World Partition and Level Streaming.
3. Gothic Solar Decadence: Crumbling golden cathedrals, petrified ash forests, and obsidian crypts illuminated by Lumen dynamic sun shafts.
4. Adaptive Enemy Boss Encounters: Multi-phase boss fights that dynamically morph the surrounding arena geometry using Chaos Physics destruction.

================================================================================
2. GAMEPLAY SYSTEMS SPECIFICATION
================================================================================
2.1 Combat System
- Stance & Posture Engine: Both player and enemies possess Health and Posture gauges. Consecutive parries deplete enemy posture, enabling devastating visceral strikes.
- Weapon Types: Greatswords, Curved Sabers, Sun-Gilded Halberds, and Caster Relics.
- Dodge & Roll: Iframes tuned to exact animation notify windows; weight classes (Light, Medium, Heavy) affect recovery frames.

2.2 World Exploration & Progression
- Rest Sanctuaries (Solar Crucibles): Replenish healing vials, reset world enemies, level up attributes, and allocate Sun-Stigmata perks.
- Shortcut Loops: Interlocking elevators, iron portcullises, and crumbling aqueducts that unlock interconnected routes back to central hubs.
- Dynamic Time of Eclipse: World lighting shifts from Pale Dawn to Molten Eclipse, revealing hidden spectral pathways and elite minibosses.

================================================================================
3. UE5 TECHNICAL SPECIFICATIONS
================================================================================
Primary Subsystems:
- BP_Herald_Character: Player pawn with custom Motion Warping notify states for sword strikes, root-motion roll animations, and TargetLockOnComponent.
- BP_CombatManager_Component: Centralized damage calculation, poise damage calculation, and elemental resistance mitigation.
- BP_SolarCrucible_Checkpoint: World save anchor with fast-travel registry and respawn coordinates.
- BP_Boss_SolarAvatar: Multi-stage boss with Blackboard-driven phase logic, animated spell telegraphs, and destructible pillars.
- BP_World_ElevatorSystem: Spline-based mechanical elevator actor with interlocking call-switches and physics safety triggers.
`
  },
  {
    id: 'aetheria-skies',
    title: 'Aetheria: Skies of Ruin',
    genre: 'Open-World Airship Survival & Aerial Exploration',
    targetPlatform: 'PC & Steam Deck (Unreal Engine 5.5)',
    summary: 'Design, build, and pilot modular steam-powered airships across floating skyland archipelagos. Harvest cloud resources, survive storms, and battle sky pirates.',
    tags: ['Survival Craft', 'Airship Physics', 'Open World', 'Co-op', 'Procedural'],
    content: `# GAME DESIGN DOCUMENT: AETHERIA - SKIES OF RUIN
Target Engine: Unreal Engine 5.5
Target Platforms: PC, Steam Deck, Consoles
Networking: Listen Server (1-4 Players Co-op)
Camera Perspective: First Person / Third Person Toggle

================================================================================
1. DESIGN STATEMENT & GAMEPLAY LOOP
================================================================================
Core Loop:
Scavenge Floating Islands -> Gather Wood, Copper, and Aether Crystals -> 
Construct & Upgrade Modular Airship -> Navigate Turbulent Storm Fronts -> 
Defend Against Sky Wyrms & Pirate Skiffs -> Discover Ancient Cloud Spires.

Core Features:
1. Physics-Driven Airship Construction: Players snap hull frames, steam boilers, lift balloons, sails, and directional rudders onto an interactive physics grid.
2. Atmospheric Volumetric Weather: Dense cloud layers generated with Unreal Engine Volumetric Cloud Component; lightning storms threaten hull integrity.
3. Co-op Crew Station Gameplay: One player pilots the helm while others fire cannons, repair boiler steam leaks, and trim sails.
4. Vertical Archipelago Exploration: Grappling hook and glider mechanics allowing agile traversal across floating sky islands.

================================================================================
2. TECHNICAL ARCHITECTURAL BLUEPRINTS
================================================================================
- BP_Airship_Master: Physics-simulated parent vessel actor with localized gravity volume allowing players to walk freely across the deck while the ship moves through 3D space.
- BP_ModularGridComponent: High-performance instanced static mesh building system for ship walls, decks, and turrets.
- BP_SteamEngine_Subsystem: Manages coal fuel consumption, heat levels, steam pressure, and propeller thrust vectors.
- BP_IslandGenerator_PCG: Procedurally populates floating sky islands with ore deposits, ruins, and native fauna.
- BP_PlayerPilotPawn: Enhanced input mapping with dual flight stick support, grappling rope physics constraint, and glider wingsuit mode.
`
  },
  {
    id: 'neon-ronin',
    title: 'Neon Ronin: Zero Stance',
    genre: 'Stylized Cyber-Samurai Hack & Slash Roguelite',
    targetPlatform: 'PC, Nintendo Switch 2, PS5 (Unreal Engine 5.4)',
    summary: 'High-speed rhythm-adjacent katana combat in a neon-drenched dystopian Tokyo. Instant death combat, bullet deflection, and procedural synthwave cyber-dungeons.',
    tags: ['Action Roguelite', 'Stylized Shaders', 'Fast Paced', 'Motion Warping', 'Custom HLSL'],
    content: `# GAME DESIGN DOCUMENT: NEON RONIN - ZERO STANCE
Target Engine: Unreal Engine 5.4
Target Platforms: PC, Nintendo Switch 2, PlayStation 5
Networking: Single Player High-Performance (Locked 60/120 FPS Target)
Camera Perspective: Isometric / Dynamic 2.5D Cinematic Action Camera

================================================================================
1. CORE GAMEPLAY PHILOSOPHY
================================================================================
Premise: You are an augmented ronin whose cybernetic chronometer gives you 
300 seconds to assassinate the 5 Syndicate Zaibatsu Lords. Every kill resets 
your death timer.

Key Mechanics:
- One-Hit Lethality: Unarmored strikes kill immediately. Flawless timing, dash cancels, and katana blade parries are mandatory.
- Bullet Slicing: Projectiles can be slashed out of the air or reflected back toward shooters using directional stick flicks.
- Time Dilation (Chrono-Focus): Slashing while in mid-air initiates a 0.25x slow-motion aim window to chain blade dashes across multiple foes.
- Stylized Cel-Shaded Art: High-contrast ink outlines, halftone print shadows, and vibrant cyber-neon emissives rendered via post-process materials.

================================================================================
2. BLUEPRINT COMPONENT PIPELINE
================================================================================
- BP_Ronin_PlayerCharacter: Hyper-responsive pawn with zero input latency, sub-frame collision queries, and anim-montage combo branches.
- BP_ChronoDilation_Manager: Game state time dilation controller handling selective actor slow-motion without stuttering camera audio.
- BP_Katana_DamageVolume: Swept-sphere collision detector checking exact blade trajectory against enemy weak points.
- BP_DungeonRoom_Assembler: Rapid procedural arena assembler generating randomized enemy waves, hazard lasers, and reward consoles.
`
  }
];
