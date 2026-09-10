import { BlueprintTemplate, BlueprintSpec, VerseCode } from '../types';

export const BUILTIN_TEMPLATES: BlueprintTemplate[] = [
  {
    id: 'tpl-character-controller-enhanced',
    title: 'Enhanced Character Controller',
    description: 'Production-grade character locomotion featuring Enhanced Input mappings, sprint speed interpolation, stamina depletion/regeneration loop, and coyote-time jump buffering.',
    category: 'Movement',
    tags: ['Movement', 'Locomotion', 'Enhanced Input', 'Stamina', 'Player'],
    targetClass: 'Character',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-15',
    iconName: 'User',
    spec: {
      assetName: 'BP_CharacterController_Enhanced',
      parentClass: 'Character',
      components: [
        'CharacterMovementComponent',
        'SpringArmComponent (Length: 380.0, UsePawnControlRotation: true)',
        'CameraComponent (FieldOfView: 90.0)',
        'MotionWarpingComponent'
      ],
      variables: [
        { name: 'MaxWalkSpeed', type: 'Float', default: '600.0', tooltip: 'Base walking speed in cm/s', isExposed: true },
        { name: 'SprintSpeedMultiplier', type: 'Float', default: '1.75', tooltip: 'Speed scalar when sprinting', isExposed: true },
        { name: 'Stamina', type: 'Float', default: '100.0', tooltip: 'Current stamina pool', isExposed: false },
        { name: 'MaxStamina', type: 'Float', default: '100.0', tooltip: 'Maximum stamina pool capacity', isExposed: true },
        { name: 'StaminaDrainRate', type: 'Float', default: '15.0', tooltip: 'Stamina consumed per second sprinting', isExposed: true },
        { name: 'StaminaRegenRate', type: 'Float', default: '20.0', tooltip: 'Stamina recovered per second when idle', isExposed: true },
        { name: 'IsSprinting', type: 'Boolean', default: 'false', tooltip: 'Active sprint toggle flag', isExposed: false },
        { name: 'CoyoteTimeSeconds', type: 'Float', default: '0.15', tooltip: 'Grace period allowed to jump after leaving ledge', isExposed: true }
      ],
      functions: [
        {
          name: 'HandleMoveInput',
          parameters: ['Vector2D ActionValue'],
          logicDescription: 'Decomposes 2D stick/WASD input along camera Forward and Right yaw-projected vectors, then feeds into AddMovementInput.',
          isPublic: true,
          category: 'Locomotion'
        },
        {
          name: 'HandleLookInput',
          parameters: ['Vector2D ActionValue'],
          logicDescription: 'Applies pitch and yaw controller inputs scaled by player sensitivity.',
          isPublic: true,
          category: 'Camera'
        },
        {
          name: 'StartSprint',
          parameters: [],
          logicDescription: 'Verifies Stamina > 10.0, sets IsSprinting to True, and ramps CharacterMovement MaxWalkSpeed to (MaxWalkSpeed * SprintSpeedMultiplier).',
          isPublic: true,
          category: 'Locomotion'
        },
        {
          name: 'StopSprint',
          parameters: [],
          logicDescription: 'Clears IsSprinting flag and resets CharacterMovement MaxWalkSpeed back to base walk velocity.',
          isPublic: true,
          category: 'Locomotion'
        },
        {
          name: 'UpdateStaminaTick',
          parameters: ['Float DeltaSeconds'],
          logicDescription: 'Drains stamina while IsSprinting is active; recovers stamina after 1.5s idle recovery delay clamp between 0 and MaxStamina.',
          isPublic: false,
          category: 'Stamina'
        }
      ],
      dispatchers: [
        { name: 'OnStaminaDepleted', parameters: [] },
        { name: 'OnSprintStateChanged', parameters: ['Boolean NewState'] }
      ],
      eventGraph: [
        {
          eventName: 'EventTick',
          description: 'Ticks stamina drain/regeneration rates and checks coyote jump eligibility buffer.',
          nodes: [],
          connections: []
        }
      ]
    },
    verseCode: {
      fileName: 'character_movement_device.verse',
      code: `using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

# Character Movement & Concurrency Coordinator
character_movement_device := class(creative_device):
    @editable
    BaseWalkSpeed : float = 600.0

    @editable
    SprintMultiplier : float = 1.75

    @editable
    MaxStamina : float = 100.0

    var CurrentStamina : float = 100.0
    var IsSprinting : logic = false

    OnBegin<override>()<suspends>:void =
        Print("Enhanced Character Controller Initialized in Verse")
        spawn{ ConcurrencyTickLoop() }

    ConcurrencyTickLoop()<suspends>:void =
        loop:
            Sleep(0.05)
            if (IsSprinting?):
                set CurrentStamina = Max(0.0, CurrentStamina - 0.75)
                if (CurrentStamina <= 0.0):
                    set IsSprinting = false
            else:
                set CurrentStamina = Min(MaxStamina, CurrentStamina + 1.0)
`
    }
  },
  {
    id: 'tpl-interaction-system-proximity',
    title: 'Proximity Interaction System',
    description: 'Modular trace & sphere detection component. Detects nearby actors implementing BPI_Interactable, provides hold-to-interact timers, screen HUD prompts, and validation raycasts.',
    category: 'Interaction',
    tags: ['Interaction', 'System', 'Component', 'HUD', 'Interface'],
    targetClass: 'ActorComponent',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-16',
    iconName: 'Hand',
    spec: {
      assetName: 'BPC_InteractionManager',
      parentClass: 'ActorComponent',
      components: [
        'SphereComponent (ProximityTrigger, Radius: 250.0)',
        'WidgetComponent (WorldSpacePromptIndicator)'
      ],
      variables: [
        { name: 'InteractionRadius', type: 'Float', default: '250.0', tooltip: 'Sphere detection threshold', isExposed: true },
        { name: 'HoldDurationRequired', type: 'Float', default: '1.2', tooltip: 'Seconds key must be held to complete interaction', isExposed: true },
        { name: 'CurrentHoldTime', type: 'Float', default: '0.0', tooltip: 'Elapsed hold counter', isExposed: false },
        { name: 'CurrentTargetActor', type: 'Actor Object Reference', default: 'None', tooltip: 'Cached target actor in focus', isExposed: false },
        { name: 'IsHoldingKey', type: 'Boolean', default: 'false', tooltip: 'Key held active state', isExposed: false }
      ],
      functions: [
        {
          name: 'DetectBestInteractable',
          parameters: [],
          returnType: 'Actor Object Reference',
          logicDescription: 'Queries overlapping actors within InteractionRadius, filters by interface BPI_Interactable, performs camera line-of-sight raycast, and returns closest hit.',
          isPublic: true,
          category: 'Detection'
        },
        {
          name: 'BeginInteraction',
          parameters: [],
          logicDescription: 'Validates target interactable; if instant, triggers ExecuteInteract immediately. Otherwise begins hold timer accumulation.',
          isPublic: true,
          category: 'Interaction'
        },
        {
          name: 'CancelInteraction',
          parameters: [],
          logicDescription: 'Clears hold timer and resets HUD progress bar fill to zero.',
          isPublic: true,
          category: 'Interaction'
        },
        {
          name: 'CompleteInteraction',
          parameters: [],
          logicDescription: 'Fires BPI_Interactable::OnInteract execution on CurrentTargetActor and broadcasts OnInteractionExecuted.',
          isPublic: true,
          category: 'Interaction'
        }
      ],
      dispatchers: [
        { name: 'OnFocusTargetChanged', parameters: ['Actor NewTarget', 'String PromptMessage'] },
        { name: 'OnHoldProgressUpdated', parameters: ['Float Percent'] },
        { name: 'OnInteractionExecuted', parameters: ['Actor TargetActor'] }
      ],
      eventGraph: [
        {
          eventName: 'EventTick',
          description: 'Updates hold duration calculation and runs camera raycast verification.',
          nodes: [],
          connections: []
        }
      ]
    }
  },
  {
    id: 'tpl-health-damage-system',
    title: 'Modular Health & Shield System',
    description: 'Component managing health pool, regenerative energy shields with custom cooldowns, elemental resistance tags, radial damage falloff, and death ragdoll events.',
    category: 'Combat',
    tags: ['Combat', 'Health', 'Shield', 'Damage', 'Component', 'GAS'],
    targetClass: 'ActorComponent',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-17',
    iconName: 'Shield',
    spec: {
      assetName: 'BPC_HealthComponent',
      parentClass: 'ActorComponent',
      components: [],
      variables: [
        { name: 'CurrentHealth', type: 'Float', default: '100.0', tooltip: 'Active living health', isExposed: true },
        { name: 'MaxHealth', type: 'Float', default: '100.0', tooltip: 'Maximum possible health', isExposed: true },
        { name: 'CurrentShield', type: 'Float', default: '50.0', tooltip: 'Regenerative outer shield pool', isExposed: true },
        { name: 'MaxShield', type: 'Float', default: '50.0', tooltip: 'Maximum shield barrier', isExposed: true },
        { name: 'ShieldRegenDelay', type: 'Float', default: '4.0', tooltip: 'Seconds after taking damage before shield recovers', isExposed: true },
        { name: 'ShieldRegenRate', type: 'Float', default: '12.0', tooltip: 'Shield HP gained per second', isExposed: true },
        { name: 'IsDead', type: 'Boolean', default: 'false', tooltip: 'Whether owning actor is dead', isExposed: false }
      ],
      functions: [
        {
          name: 'TakeDamage',
          parameters: ['Float DamageAmount', 'DamageType DamageTypeClass', 'Controller InstigatedBy', 'Actor DamageCauser'],
          logicDescription: 'Mitigates incoming damage against CurrentShield first. Absorbs remainder into CurrentHealth. Resets shield regen timer. If Health <= 0, triggers Death.',
          isPublic: true,
          category: 'Damage'
        },
        {
          name: 'ApplyHeal',
          parameters: ['Float HealAmount'],
          logicDescription: 'Increases CurrentHealth clamped to MaxHealth. Broadcasts OnHealthChanged.',
          isPublic: true,
          category: 'Healing'
        },
        {
          name: 'ProcessShieldRegeneration',
          parameters: ['Float DeltaSeconds'],
          logicDescription: 'Recharges shield when time since last damage exceeds ShieldRegenDelay.',
          isPublic: false,
          category: 'Shield'
        },
        {
          name: 'TriggerDeath',
          parameters: [],
          logicDescription: 'Sets IsDead flag, disables collision, activates physics ragdoll on skeletal mesh, and broadcasts OnDeath.',
          isPublic: false,
          category: 'LifeCycle'
        }
      ],
      dispatchers: [
        { name: 'OnHealthChanged', parameters: ['Float NewHealth', 'Float MaxHealth', 'Float Delta'] },
        { name: 'OnShieldChanged', parameters: ['Float NewShield', 'Float MaxShield'] },
        { name: 'OnShieldBroken', parameters: [] },
        { name: 'OnDeath', parameters: ['Actor Victim', 'Actor Killer'] }
      ],
      eventGraph: [
        {
          eventName: 'AnyDamage',
          description: 'Listens to native UE damage delegates and routes to TakeDamage calculation.',
          nodes: [],
          connections: []
        }
      ]
    },
    verseCode: {
      fileName: 'health_shield_manager.verse',
      code: `using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

health_shield_manager := class(creative_device):
    @editable MaxHealth : float = 100.0
    @editable MaxShield : float = 50.0

    var CurrentHealth : float = 100.0
    var CurrentShield : float = 50.0
    var IsVulnerable : logic = true

    # Atomic transactional damage application with rollback guarantee
    ApplyDamage<transacts>(Amount: float)<decides>: float =
        if (Amount > 0.0):
            var RemainingDamage : float = Amount
            if (CurrentShield > 0.0):
                if (CurrentShield >= RemainingDamage):
                    set CurrentShield = CurrentShield - RemainingDamage
                    set RemainingDamage = 0.0
                else:
                    set RemainingDamage = RemainingDamage - CurrentShield
                    set CurrentShield = 0.0
            
            set CurrentHealth = Max(0.0, CurrentHealth - RemainingDamage)
            CurrentHealth
        else:
            false? # Fail transaction
`
    }
  },
  {
    id: 'tpl-grid-inventory-system',
    title: 'Modular Grid & Slot Inventory Component',
    description: 'Component providing weight calculation, item slot stacking limits, equipment slot sockets, and drag-and-drop HUD delegate integration.',
    category: 'Systems',
    tags: ['Inventory', 'RPG', 'Component', 'Slots', 'Weight', 'UI'],
    targetClass: 'ActorComponent',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-18',
    iconName: 'Package',
    spec: {
      assetName: 'BPC_InventoryComponent',
      parentClass: 'ActorComponent',
      components: [],
      variables: [
        { name: 'TotalSlots', type: 'Integer', default: '24', tooltip: 'Number of discrete inventory storage slots', isExposed: true },
        { name: 'MaxWeightCapacity', type: 'Float', default: '80.0', tooltip: 'Maximum weight before encumbered', isExposed: true },
        { name: 'CurrentWeight', type: 'Float', default: '0.0', tooltip: 'Cumulative weight of all items', isExposed: false },
        { name: 'InventoryItems', type: 'Array of ItemDefinition DataStructure', default: 'Empty', tooltip: 'Array of item entries with IDs and quantities', isExposed: false }
      ],
      functions: [
        {
          name: 'TryAddItem',
          parameters: ['Name ItemID', 'Integer Quantity', 'Float UnitWeight'],
          returnType: 'Boolean Success',
          logicDescription: 'Checks if item weight fits within MaxWeightCapacity and either stacks into an existing slot or claims an empty slot index.',
          isPublic: true,
          category: 'Inventory'
        },
        {
          name: 'RemoveItem',
          parameters: ['Integer SlotIndex', 'Integer Quantity'],
          returnType: 'Boolean Success',
          logicDescription: 'Decrements count in slot; if count reaches 0, empties slot and recalibrates CurrentWeight.',
          isPublic: true,
          category: 'Inventory'
        },
        {
          name: 'DropItemToWorld',
          parameters: ['Integer SlotIndex', 'Transform SpawnTransform'],
          logicDescription: 'Spawns world pickup actor for the specified item and removes from inventory slots.',
          isPublic: true,
          category: 'Inventory'
        }
      ],
      dispatchers: [
        { name: 'OnInventoryUpdated', parameters: [] },
        { name: 'OnWeightChanged', parameters: ['Float CurrentWeight', 'Float MaxWeight', 'Boolean IsOverencumbered'] }
      ],
      eventGraph: [
        {
          eventName: 'BeginPlay',
          description: 'Allocates initial slot buffer and calculates starting inventory weight.',
          nodes: [],
          connections: []
        }
      ]
    }
  },
  {
    id: 'tpl-ai-perception-patrol',
    title: 'AI Perception & Patrol Controller',
    description: 'Intelligent AI Controller with AIPerception (Sight 90° FOV, Hearing sound stimulus), investigation waypoint blackboard integration, and patrol loops.',
    category: 'AI',
    tags: ['AI', 'Perception', 'BehaviorTree', 'Blackboard', 'Patrol', 'Enemy'],
    targetClass: 'AIController',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-19',
    iconName: 'Brain',
    spec: {
      assetName: 'AIC_PerceptionPatrolController',
      parentClass: 'AIController',
      components: [
        'AIPerceptionComponent (Configured for AISense_Sight and AISense_Hearing)',
        'PathFollowingComponent'
      ],
      variables: [
        { name: 'BehaviorTreeAsset', type: 'BehaviorTree Object Reference', default: 'BT_GuardPatrol', tooltip: 'Assigned behavior tree', isExposed: true },
        { name: 'PatrolRouteRef', type: 'Actor Object Reference', default: 'None', tooltip: 'Actor holding waypoint splines', isExposed: true },
        { name: 'TargetPlayerActor', type: 'Actor Object Reference', default: 'None', tooltip: 'Detected enemy target', isExposed: false },
        { name: 'AlertLevel', type: 'Enum E_AIAlertState', default: 'Patrolling', tooltip: 'Current alertness state', isExposed: false }
      ],
      functions: [
        {
          name: 'OnPerceptionUpdated',
          parameters: ['Array of Actor UpdatedActors'],
          logicDescription: 'Iterates detected stimuli. If Sight stimulus from Player tag is sensed, sets Blackboard TargetEnemy and shifts to Combat. If Hearing, updates InvestigateLocation.',
          isPublic: true,
          category: 'Perception'
        },
        {
          name: 'SelectNextPatrolWaypoint',
          parameters: [],
          logicDescription: 'Pulls next coordinate along PatrolRouteRef and updates Blackboard key "PatrolPoint".',
          isPublic: true,
          category: 'Navigation'
        }
      ],
      dispatchers: [
        { name: 'OnEnemySpotted', parameters: ['Actor Enemy'] },
        { name: 'OnLostTarget', parameters: [] }
      ],
      eventGraph: [
        {
          eventName: 'OnPossess',
          description: 'Initializes Blackboard and runs the assigned BehaviorTree asset.',
          nodes: [],
          connections: []
        }
      ]
    }
  },
  {
    id: 'tpl-day-night-atmosphere',
    title: 'Dynamic Sky & Atmosphere Driver',
    description: 'Actor coordinating Directional Light sun rotation, Rayleigh & Mie atmospheric scattering, dynamic Skylight cubemap capture, and day/night state events.',
    category: 'Environment',
    tags: ['Atmosphere', 'Lighting', 'Sky', 'Environment', 'TimeOfDay', 'Lumen'],
    targetClass: 'Actor',
    ueVersion: 'UE5+UE6',
    isBuiltIn: true,
    author: 'Epic Architecture Team',
    createdDate: '2026-03-20',
    iconName: 'Sun',
    spec: {
      assetName: 'BP_AtmosphereManager',
      parentClass: 'Actor',
      components: [
        'DirectionalLightComponent (SunSource)',
        'SkyAtmosphereComponent',
        'SkyLightComponent (RealTimeCapture: true)',
        'ExponentialHeightFogComponent'
      ],
      variables: [
        { name: 'TimeOfDay', type: 'Float', default: '12.0', tooltip: 'Current military time (0.0 to 24.0)', isExposed: true },
        { name: 'DayLengthMinutes', type: 'Float', default: '30.0', tooltip: 'Real-world minutes for a full 24h cycle', isExposed: true },
        { name: 'SunPitchOffset', type: 'Float', default: '-90.0', tooltip: 'Noon pitch orientation', isExposed: true },
        { name: 'IsDaytime', type: 'Boolean', default: 'true', tooltip: 'Flag denoting sun above horizon', isExposed: false }
      ],
      functions: [
        {
          name: 'UpdateTimeOfDay',
          parameters: ['Float DeltaSeconds'],
          logicDescription: 'Advances TimeOfDay float. Modulos 24.0 and updates sun pitch rotation based on diurnal cycle curve.',
          isPublic: false,
          category: 'Time'
        },
        {
          name: 'UpdateSunAtmosphere',
          parameters: [],
          logicDescription: 'Adjusts light color from warm amber at dawn/dusk to neutral white at zenith. Adjusts exponential fog inscattering color.',
          isPublic: true,
          category: 'Lighting'
        }
      ],
      dispatchers: [
        { name: 'OnDawnBegan', parameters: [] },
        { name: 'OnDuskBegan', parameters: [] }
      ],
      eventGraph: [
        {
          eventName: 'EventTick',
          description: 'Drives TimeOfDay advancement and periodic Skylight recapture.',
          nodes: [],
          connections: []
        }
      ]
    }
  },
  {
    id: 'tpl-verse-concurrency-gameloop',
    title: 'UE6 Verse Concurrency Match Device',
    description: 'Next-generation Verse creative_device executing tickless cooperative concurrency, transactional match rounds, and zero-null agent registration.',
    category: 'Verse',
    tags: ['Verse', 'UE6', 'Concurrency', 'Transactional', 'GameMode', 'Device'],
    targetClass: 'creative_device',
    ueVersion: 'UE6',
    isBuiltIn: true,
    author: 'Verse Architecture Lab',
    createdDate: '2026-03-21',
    iconName: 'Cpu',
    spec: {
      assetName: 'match_coordinator_device',
      parentClass: 'creative_device',
      components: ['PlayerSpawners', 'EliminationZones', 'GameStateDevice'],
      variables: [
        { name: 'RoundDurationSec', type: 'Float', default: '300.0', tooltip: 'Length of round in seconds', isExposed: true },
        { name: 'ScoreToWin', type: 'Integer', default: '50', tooltip: 'Score threshold for victory', isExposed: true }
      ],
      functions: [
        {
          name: 'StartRoundLoop',
          parameters: [],
          logicDescription: 'Spawns cooperative lightweight async loop monitoring player eliminations and countdown timer.',
          isPublic: true,
          category: 'Verse'
        }
      ],
      eventGraph: [
        {
          eventName: 'OnBegin',
          description: 'Verse entry point initializes concurrency threads and event bindings.',
          nodes: [],
          connections: []
        }
      ]
    },
    verseCode: {
      fileName: 'match_coordinator_device.verse',
      code: `using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /Verse.org/Concurrency }

match_coordinator_device := class(creative_device):
    @editable RoundDurationSec : float = 300.0
    @editable ScoreToWin : int = 50

    var ActivePlayers : []agent = array{}
    var CurrentScore : int = 0

    OnBegin<override>()<suspends>:void =
        Print("=== UE6 Verse Match Coordinator Starting ===")
        # Cooperative tickless concurrency using sync construct
        sync:
            CountdownTimerLoop()
            ObjectiveMonitorLoop()

    CountdownTimerLoop()<suspends>:void =
        var Elapsed : float = 0.0
        loop:
            Sleep(1.0)
            set Elapsed += 1.0
            if (Elapsed >= RoundDurationSec):
                Print("Round Time Expired!")
                break

    ObjectiveMonitorLoop()<suspends>:void =
        loop:
            Sleep(0.5)
            if (CurrentScore >= ScoreToWin):
                Print("Victory Threshold Reached!")
                break
`
    }
  }
];

const LOCAL_STORAGE_KEY = 'ue_custom_blueprint_templates_v1';

export const getCustomTemplates = (): BlueprintTemplate[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load custom templates from localStorage:', err);
    return [];
  }
};

export const saveCustomTemplate = (template: BlueprintTemplate): void => {
  try {
    const existing = getCustomTemplates();
    const updated = [template, ...existing.filter(t => t.id !== template.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom template:', err);
  }
};

export const deleteCustomTemplate = (templateId: string): void => {
  try {
    const existing = getCustomTemplates();
    const updated = existing.filter(t => t.id !== templateId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete custom template:', err);
  }
};

export const getAllTemplates = (): BlueprintTemplate[] => {
  const custom = getCustomTemplates();
  return [...custom, ...BUILTIN_TEMPLATES];
};

export const exportTemplatesAsJson = (templates: BlueprintTemplate[]): string => {
  return JSON.stringify(templates, null, 2);
};

export const importTemplatesFromJson = (jsonString: string): { success: boolean; count: number; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Import file must contain a JSON array of templates.');
    }
    const current = getCustomTemplates();
    const validTemplates = parsed.filter(t => t.id && t.title && t.spec);
    if (validTemplates.length === 0) {
      throw new Error('No valid templates found in imported file.');
    }
    const existingIds = new Set(current.map(c => c.id));
    const merged = [...validTemplates.map(t => ({ ...t, isBuiltIn: false })), ...current.filter(c => !validTemplates.some(v => v.id === c.id))];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: validTemplates.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Failed to parse JSON' };
  }
};
