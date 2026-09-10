
export enum ExperienceLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Expert = 'Expert',
}

export type AppStep = 'landing' | 'input' | 'workspace' | 'library';

export type AssetType = 'Blueprint' | 'Material' | 'Input' | 'Widget' | 'MetaSound' | 'PCG' | 'BehaviorTree' | 'Unknown';

export type GenMode = 'Fast' | 'Default' | 'Large Context' | 'Heavy';

export type UETemplate = 'None' | 'Third Person' | 'First Person' | 'Top Down' | 'Vehicle' | 'Handheld AR' | 'Virtual Reality';
export type MarketAsset = 
  | 'ALS V4 (Advanced Locomotion)' 
  | 'Game Animation Sample (GASP)' 
  | 'Common UI Plugin' 
  | 'PCG Framework' 
  | 'Ultra Dynamic Sky' 
  | 'Electronic Nodes' 
  | 'FluidNinja'
  | 'Lyra Starter Game'
  | 'Gameplay Ability System (GAS)'
  | 'Motion Warping'
  | 'Control Rig'
  | 'Water System'
  | 'Landmass Plugin';

export enum BridgeStatus {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Error = 'Error'
}

export enum DriveSyncStatus {
  Unlinked = 'Unlinked',
  Linked = 'Linked',
  Syncing = 'Syncing',
  Error = 'Error'
}

export interface BlueprintFunction {
  name: string;
  parameters: string[];
  returnType?: string;
  logicDescription: string;
  isPublic?: boolean;
  category?: string;
  implementationTarget?: string; // Explicitly links function to a specific Blueprint asset
}

export interface BlueprintVariable {
  name: string;
  type: string;
  default: string;
  tooltip?: string;
  isExposed?: boolean;
}

export interface BlueprintMacro {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

export interface BlueprintDispatcher {
  name: string;
  parameters: string[];
}

export interface Task {
  title: string;
  description: string;
  folderPath: string;
  assetName: string;
  stepByStepGuide: string[];
  suggestedNodes?: string[];
  requiredFunctions?: BlueprintFunction[];
  blueprintDetails?: {
    variables?: BlueprintVariable[];
    components?: string[];
    propertySettings?: { component: string; property: string; value: string }[];
  };
  tutorials?: TutorialLink[];
  suggestedMarketAssets?: MarketplaceSuggestion[];
}

export type BlueprintArchetype = 
  | 'combat' 
  | 'locomotion' 
  | 'ai' 
  | 'inventory' 
  | 'world' 
  | 'audio' 
  | 'ui' 
  | 'network' 
  | 'vfx' 
  | 'system';

export interface BlueprintThumbnailMetadata {
  blueprintName: string;
  imageUrl: string;
  prompt: string;
  archetype: BlueprintArchetype;
  archetypeLabel: string;
  primaryFunction: string;
  keyNodes: string[];
  colorTheme: string;
  accentHex: string;
  generatedAt: number;
  isAiGenerated: boolean;
  stylePreset?: string;
}

export interface BlueprintSpec {
  assetName: string;
  parentClass: string;
  components: string[];
  variables: BlueprintVariable[];
  functions: BlueprintFunction[];
  macros?: BlueprintMacro[];
  dispatchers?: BlueprintDispatcher[];
  eventGraph: { 
    eventName: string; 
    description: string;
    nodes: NodeData[];
    connections: GraphConnection[];
  }[];
  requiredAssets?: { name: string; sourceType: string; importGuide: string }[];
  validationReport?: BlueprintValidationReport;
  activeMode?: GenMode;
  thumbnailUrl?: string;
  thumbnailMetadata?: BlueprintThumbnailMetadata;
}

export interface GamePlan {
  title: string;
  summary: string;
  targetPlatformRecommendations: string[];
  requiredPlugins?: string[];
  migrationNotes?: string[];
  phases: Phase[];
}

export interface Phase {
  phaseName: string;
  duration: string;
  goal: string;
  tasks: Task[];
  keyConcepts: string[];
  requiredPlugins?: string[];
}

export interface UserInput {
  gameIdea: string;
  level: ExperienceLevel;
  genres: string[];
  platforms: string[];
  mechanics: string[];
  artStyle: string;
  lightingMethod: string;
  ueVersion: string;
  inputSystem: 'Enhanced Input' | 'Legacy Input';
  networking: 'Single Player' | 'Listen Server (Co-op)' | 'Dedicated Server';
  teamSize: number;
  template: UETemplate;
  assets: MarketAsset[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SavedProject {
  id: string;
  title: string;
  summary: string;
  genre: string;
  createdAt: number;
  lastModified: number;
  input: UserInput;
  plan: GamePlan;
  chatHistory: ChatMessage[];
  blueprints?: Record<string, BlueprintSpec>;
  behaviorTrees?: Record<string, BehaviorTreeSpec>;
  materials?: Record<string, MaterialSpec>;
  inputs?: Record<string, EnhancedInputSpec>;
  metaSounds?: Record<string, MetaSoundSpec>;
  pcgs?: Record<string, PcgSpec>;
  cppCodes?: Record<string, CppCode>;
  verseCodes?: Record<string, VerseCode>;
  ue6Audit?: UE6ReadinessAudit;
  t3dExports?: Record<string, string>;
  visionBoard?: VisionImage[];
  narrative?: NarrativeData;
  levelLayouts?: LevelLayout[];
  performanceReports?: PerformanceAnalysis[];
  overseerReport?: OverseerReport;
  driveSyncPath?: string;
  installedAssets?: MarketplaceSuggestion[];
  designReview?: DesignReview;
  gddRecord?: GddDocumentRecord;
}

export interface GddDocumentRecord {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  rawTextPreview?: string;
  wordCount: number;
  estimatedPages: number;
  executiveSummary?: string;
  corePillars?: string[];
  deconstruction?: GddDeconstructionReport;
}

export interface GddDeconstructionReport {
  gameTitle: string;
  logline: string;
  targetAudience: string;
  genres: string[];
  platforms: string[];
  cameraPerspective: 'First Person' | 'Third Person' | 'Top Down' | 'Isometric' | 'Side Scroller' | 'VR';
  multiplayerModel: 'Single Player' | 'Listen Server (Co-op)' | 'Dedicated Server';
  artStyle: string;
  lightingMethod: string;
  recommendedUEVersion: string;
  recommendedTemplate: UETemplate;
  recommendedPlugins: MarketAsset[];
  coreMechanics: string[];
  keyGameplayLoops: string[];
  technicalRequirements: string[];
  suggestedBlueprints: {
    name: string;
    parentClass: string;
    role: string;
    primarySubsystem: string;
    keyFunctions: string[];
  }[];
  worldBiomes: string[];
  narrativeOverview: string;
  riskFactors: string[];
  complianceScore: number;
}

export type GddAgentStageId = 
  | 'ingest' 
  | 'decompose' 
  | 'architect' 
  | 'synthesize_plan' 
  | 'generate_blueprints' 
  | 'weave_world_narrative' 
  | 'audit_overseer' 
  | 'complete';

export interface GddAgentStageStatus {
  id: GddAgentStageId;
  agentName: string;
  title: string;
  status: 'idle' | 'running' | 'done' | 'error';
  progressPercent: number;
  detail: string;
  logs: string[];
  resultSummary?: string;
}

export interface TutorialLink {
  uri: string;
  title: string;
}

export interface MarketplaceSuggestion {
  name: string;
  uri: string;
  price: string;
  compatibility: string;
  description: string;
  category?: string;
  technicalOverlaps?: string[];
}

export interface NodeData {
  id: string;
  name: string;
  type: 'event' | 'function' | 'macro' | 'variable' | 'flow' | 'audio' | 'pcg';
  x: number;
  y: number;
  inputs: { name: string; type: string; value?: string }[];
  outputs: { name: string; type: string }[];
}

export interface GraphConnection {
  fromNode: string;
  fromPin: string;
  toNode: string;
  toPin: string;
}

export interface BlueprintValidationReport {
  technicalAuditor: { status: 'Pass' | 'Fail', findings: string[] };
  logicFlowValidator: { status: 'Pass' | 'Fail', findings: string[] };
  functionalEngineer: { status: 'Pass' | 'Fail', findings: string[] };
  overallScore: number;
}

export interface SubsystemStatus {
  pillar: string;
  score: number;
  status: string;
  details: string;
}

export interface OverseerReport {
  overallReadiness: number;
  summary: string;
  subsystems: SubsystemStatus[];
  missingCriticalAssets: { name: string; type: string; reason: string }[];
  technicalDebtAlerts: string[];
  suggestedNextAction: string;
}

export interface CompatibilityWarning {
  asset: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  issue: string;
  fix: string;
}

export interface AssetCompatibilityReport {
  overallStatus: 'Compatible' | 'Warnings' | 'Critical Issues';
  warnings: CompatibilityWarning[];
  architecturalAdvice: string;
}

export interface BehaviorTreeNode {
  id: string;
  name: string;
  type: 'Composite' | 'Task' | 'Decorator' | 'Service';
  subType?: 'Selector' | 'Sequence';
  description: string;
  children?: string[];
  decorators?: { name: string; condition: string }[];
  services?: { name: string }[];
}

export interface BehaviorTreeSpec {
  assetName: string;
  blackboardAsset: string;
  rootNode: string;
  nodes: Record<string, BehaviorTreeNode>;
  blackboardKeys: { name: string; type: string; description: string }[];
  logicSummary: string;
  validationReport?: BlueprintValidationReport;
}

export interface MaterialSpec {
  assetName: string;
  domain: string;
  blendMode: string;
  nodes: any[];
  connections: any[];
  tutorials?: TutorialLink[];
}

export interface EnhancedInputSpec {
  contextName: string;
  description: string;
  actions: { name: string; description: string; valueType: string }[];
  mappings: { actionName: string; key: string; modifiers: string[]; triggers: string[] }[];
  tutorials?: TutorialLink[];
}

export interface MetaSoundSpec {
  assetName: string;
  description: string;
  nodes: any[];
  connections: any[];
  parameters: any[];
  dspLogic: string;
  tutorials?: TutorialLink[];
}

export interface PcgSpec {
  assetName: string;
  description: string;
  nodes: any[];
  connections: any[];
  attributes: any[];
  proceduralLogic: string;
  tutorials?: TutorialLink[];
}

export interface CppCode {
  header: string;
  source: string;
  explanation: string;
}

export interface VerseCode {
  fileName?: string;
  code: string;
  explanation?: string;
  concurrencyModel?: string;
  exposedProperties?: { name: string; type: string; isEditable: boolean }[];
  verseDevices?: string[];
  ue6Features?: string[];
  isPersistable?: boolean;
}

export interface BlueprintComplexityInfo {
  score: number;
  tier: 'low' | 'moderate' | 'high' | 'critical';
  tierLabel: string;
  color: string;
  badgeClass: string;
  breakdown: {
    nodeCount: number;
    connectionCount: number;
    branchCount: number;
    functionCount: number;
    variableCount: number;
    hasTick: boolean;
    dynamicCasts: number;
    rawComplexity: number;
  };
  recommendations: string[];
}

export interface NodeUsageHeatmapEntry {
  nodeName: string;
  nodeType: 'event' | 'function' | 'macro' | 'variable' | 'flow' | 'audio' | 'pcg' | 'other';
  referenceCount: number;
  totalConnections: number;
  usageIntensity: number;
  intensityTier: 'cool' | 'warm' | 'hot';
  performanceImpact: 'low' | 'medium' | 'high';
  referencedInBlueprints: {
    assetName: string;
    eventName: string;
    occurrences: number;
  }[];
  optimizationTip: string;
}

export interface UE6ReadinessAudit {
  overallScore: number;
  verseConversionReadiness: number;
  concurrencyModernization: number;
  memorySafetyScore: number;
  assetsAudited: {
    name: string;
    type: string;
    hasVerse: boolean;
    concurrencyRecommendations: string[];
    migrationNotes: string;
  }[];
  ue6ArchitecturalRecommendations: string[];
}

export interface VisionImage {
  id: string;
  prompt: string;
  base64: string;
  category: string;
  timestamp: number;
}

export interface VisualPrompt {
  category: string;
  prompt: string;
  title: string;
}

export interface NarrativeData {
  quests: Quest[];
  npcs: NPC[];
  dialogues: Record<string, DialogueScript[]>;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  backstory: string;
  visualDescription: string;
  location: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  objectives: string[];
  rewards: string[];
}

export interface DialogueScript {
  id: string;
  npcId: string;
  context: string;
  lines: { speaker: string; text: string; emotion?: string }[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  description: string;
  type: 'Spawn' | 'Enemy' | 'Boss' | 'Loot' | 'Puzzle' | 'Point' | 'NavMesh' | 'Volume';
  x: number;
  y: number;
  mapUri?: string;
}

export interface LevelLayout {
  id: string;
  name: string;
  description: string;
  visualPrompt: string;
  pointsOfInterest: PointOfInterest[];
  location?: string;
  imageBase64?: string;
}

export interface PerformanceAnalysis {
  id: string;
  timestamp: number;
  image: string;
  summary: string;
  score: number;
  metrics: { label: string; value: string; status: string }[];
  bottlenecks: string[];
  recommendations: { title: string; description: string; complexity: string }[];
}

export interface AgentFeedback {
  summary: string;
  flags: string[];
  recommendations: string[];
  score: number;
}

export interface ProducerFeedback extends AgentFeedback {
  timeToPrototype: string;
  estimatedBudgetRisk: 'Low' | 'Medium' | 'High';
}

export interface DesignReview {
  technicalDirector: AgentFeedback;
  artDirector: AgentFeedback;
  producer: ProducerFeedback;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  provider: string;
  isVerified: boolean;
  studioName?: string;
  primaryRole?: string;
  specialty?: string;
}

export interface ConflictAnalysis {
  summary: string;
  conflicts: {
    affectedAssets: string[];
    conflictingClass: string;
    severity: 'Low' | 'Medium' | 'High';
    reason: string;
  }[];
  patchSteps: string[];
  recommendedPatchAsset: string;
}

export interface AgentResponse {
  response: string;
  hasPlanUpdates: boolean;
  updatedPlan?: GamePlan;
}

export interface RevisionTrendPoint {
  revision: string;
  revisionNumber: number;
  timestamp: string;
  assetName: string;
  cpuCostMs: number;
  memoryMb: number;
  gpuCostMs: number;
  drawCalls: number;
  changeDescription: string;
  eventTickActive: boolean;
  nodeCount: number;
}

export interface AssetResourceMetric {
  assetName: string;
  assetType: 'Blueprint' | 'Material' | 'PCG' | 'MetaSound' | 'BehaviorTree' | 'EnhancedInput';
  cpuCostMs: number; // estimated GameThread / tick time in ms
  gpuCostMs: number; // estimated RenderThread / shader time in ms
  memoryMb: number; // estimated RAM/VRAM footprint in MB
  drawCalls: number; // estimated draw call contribution per frame
  tickLoadPercent: number; // % of CPU tick frame budget
  shaderInstructions?: number;
  complexityScore: number; // 0-100 scale
  status: 'Nominal' | 'Warning' | 'Critical';
  riskLevel?: 'low' | 'medium' | 'high';
  estimatedCpuCostMs?: number;
  estimatedGpuCostMs?: number;
  estimatedMemoryMb?: number;
  estimatedDrawCalls?: number;
  warnings: string[];
  optimizationTips: string[];
  ue5ConsoleCommands: string[];
  nativizationCandidate: boolean;
}

export interface RefactoringStep {
  category: 'Blueprint Graph' | 'Memory / Hard References' | 'Material / Shaders' | 'Audio / DSP' | 'C++ Nativization' | 'Ticking & Timers' | 'Draw Calls & Geometry';
  title: string;
  description: string;
  beforePattern?: string;
  afterPattern?: string;
  priority: 'High' | 'Medium' | 'Low';
  impact: string;
}

export interface AIOptimizeSuggestion {
  assetName: string;
  assetType: 'Blueprint' | 'Material' | 'PCG' | 'MetaSound' | 'BehaviorTree' | 'EnhancedInput';
  summary: string;
  primaryBottleneck: string;
  severity: 'Critical' | 'Warning' | 'Nominal';
  estimatedSavings: {
    cpuMsSaved: number;
    gpuMsSaved: number;
    memoryMbSaved: number;
    drawCallsSaved: number;
    headroomGainPercent: number;
  };
  refactoringSteps: RefactoringStep[];
  recommendedCVars: string[];
  architectActionPrompt?: string;
  codeOrNodeDiff?: {
    language: 'blueprint' | 'hlsl' | 'cpp' | 'json';
    before: string;
    after: string;
    explanation: string;
  };
}

export interface PlatformBudgetConfig {
  id: string;
  name: string;
  targetFps: number;
  targetFrameTimeMs: number;
  maxCpuBudgetMs: number;
  maxGpuBudgetMs: number;
  maxDrawCalls: number;
  maxVramMb: number;
  description: string;
}

export interface ProjectResourceSummary {
  totalCpuMs: number;
  totalGpuMs: number;
  totalMemoryMb: number;
  totalDrawCalls: number;
  cpuPercent: number;
  gpuPercent: number;
  memoryPercent: number;
  drawCallsPercent: number;
  healthScore: number;
  criticalAssetCount: number;
  warningAssetCount: number;
  nominalAssetCount: number;
  topCpuBottlenecks: AssetResourceMetric[];
  topGpuBottlenecks: AssetResourceMetric[];
  topMemoryBottlenecks: AssetResourceMetric[];
}

export type Asset3DCategory = 'Environment' | 'Character' | 'Prop' | 'UI' | 'Level';
export type VisionCategory = 'Environment' | 'Character' | 'Prop' | 'UI' | 'Level';

export type PBRTextureStyle = 
  | 'cyber_armor' 
  | 'brushed_steel' 
  | 'worn_leather' 
  | 'gold_inlay' 
  | 'carbon_fiber' 
  | 'glowing_circuit' 
  | 'weathered_stone' 
  | 'alien_chitin' 
  | 'cloth_weave' 
  | 'crystal_glass';

export type RigType = 'humanoid' | 'quadruped' | 'mech' | 'creature';

export interface Model3DPartSpec {
  name: string;
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'ring' | 'pyramid' | 'wedge';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  wireframe?: boolean;
  textureStyle?: PBRTextureStyle;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export interface Model3DSpec {
  name: string;
  category: Asset3DCategory;
  archetype?: string;
  description: string;
  parts: Model3DPartSpec[];
  rigType?: RigType;
  isRigged?: boolean;
  source2DImage?: string;
  engineImportNotes?: {
    unreal?: string;
    godot?: string;
    unity?: string;
  };
}

export interface PlanSnapshot {
  id: string;
  name: string;
  createdAt: string;
  plan: GamePlan;
  notes?: string;
  source?: 'manual' | 'auto';
  totalTasks?: number;
  totalPhases?: number;
}

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface TaskDiffItem {
  type: DiffChangeType;
  title: string;
  assetName?: string;
  description?: string;
  changes?: {
    field: string;
    oldVal?: string;
    newVal?: string;
  }[];
}

export interface PhaseDiffItem {
  type: DiffChangeType;
  phaseName: string;
  oldDuration?: string;
  newDuration?: string;
  oldGoal?: string;
  newGoal?: string;
  tasks: TaskDiffItem[];
}

export interface PlanDiffResult {
  sourceSnapshotName: string;
  targetSnapshotName: string;
  timestamp: string;
  summary: {
    phasesAdded: number;
    phasesRemoved: number;
    phasesModified: number;
    phasesUnchanged: number;
    tasksAdded: number;
    tasksRemoved: number;
    tasksModified: number;
    tasksUnchanged: number;
    pluginsAdded: string[];
    pluginsRemoved: string[];
    totalChanges: number;
  };
  phaseDiffs: PhaseDiffItem[];
  highLevelArchitectureChanged: boolean;
  oldArchitecture?: string;
  newArchitecture?: string;
}

// ============================================================================
// BUILD PIPELINE & REPOSITORY CI/CD TYPES
// ============================================================================

export type GitProvider = 'github' | 'gitlab';

export type PipelineTrigger = 'architecture_update' | 'manual' | 'git_push' | 'webhook' | 'audit_pass';

export type PipelineStageStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: PipelineStageStatus;
  durationSec?: number;
  logs: string[];
}

export interface PipelineArtifact {
  name: string;
  size: string;
  type: string;
  downloadUrl?: string;
}

export interface PipelineRun {
  id: string;
  runNumber: number;
  commitHash: string;
  commitMessage: string;
  branch: string;
  trigger: PipelineTrigger;
  triggerDetail: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  startedAt: number;
  completedAt?: number;
  stages: PipelineStage[];
  testSummary?: {
    passed: number;
    failed: number;
    total: number;
  };
  artifacts?: PipelineArtifact[];
  ueVersion: string;
}

export interface PipelineConfig {
  provider: GitProvider;
  repoUrl: string;
  branch: string;
  personalAccessToken?: string;
  webhookSecret?: string;
  autoBuildOnArchUpdate: boolean;
  notifyOnFailure: boolean;
  targetPlatform: 'Windows' | 'Linux' | 'Android' | 'PS5';
  buildConfiguration: 'Development' | 'Shipping' | 'Test';
  isConnected: boolean;
  lastWebhookPing?: number;
  lastTriggeredAt?: number;
}

// ============================================================================
// BLUEPRINT TEMPLATE LIBRARY TYPES
// ============================================================================

export type BlueprintTemplateCategory =
  | 'Movement'
  | 'Combat'
  | 'Systems'
  | 'AI'
  | 'Interaction'
  | 'Environment'
  | 'UI'
  | 'Verse'
  | 'General';

export interface BlueprintTemplate {
  id: string;
  title: string;
  description: string;
  category: BlueprintTemplateCategory;
  tags: string[];
  targetClass: string;
  ueVersion: 'UE5' | 'UE6' | 'UE5+UE6';
  spec: BlueprintSpec;
  verseCode?: VerseCode;
  cppCode?: string;
  isBuiltIn?: boolean;
  author?: string;
  createdDate?: string;
  iconName?: string;
}

