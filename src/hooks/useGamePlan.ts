
import { useState, useEffect, useCallback } from 'react';
import { UserInput, GamePlan, ChatMessage, BlueprintSpec, MaterialSpec, EnhancedInputSpec, SavedProject, CppCode, VerseCode, UE6ReadinessAudit, VisionImage, VisualPrompt, NarrativeData, Quest, NPC, DialogueScript, LevelLayout, DesignReview, MarketplaceSuggestion, PerformanceAnalysis, MetaSoundSpec, PcgSpec, ConflictAnalysis, DriveSyncStatus, AppStep, BehaviorTreeSpec, OverseerReport, GddDocumentRecord } from '../types';
import { 
  generateGamePlan, 
  chatWithAgent, 
  generateBlueprintSpec, 
  generateMaterialSpec,
  generateEnhancedInputSpec,
  generatePythonScript,
  generateCppCode,
  generateVerseCode,
  generateVisualPrompts,
  generateConceptArtImage,
  generateLevelBlueprintImage,
  generateT3dData,
  generateQuests,
  generateNPCs,
  generateDialogue,
  generateLevelLayoutData,
  searchTutorials,
  generateDesignReview,
  searchMarketplace,
  analyzePerformanceImage,
  generateMetaSoundSpec,
  generatePcgSpec,
  analyzeAssetConflicts,
  generateBehaviorTreeSpec,
  generateOverseerReport,
  analyzeLayoutPerformance
} from '../services/ai/client';
import { 
  saveProjectToStorage, 
  getSavedProjects, 
  deleteProjectFromStorage, 
  getProjectById, 
  loadProjectsAsync, 
  subscribeToProjects 
} from '../services/storage';
import { driveClient } from '../services/driveClient';
import { getPipelineConfig, createNewPipelineRun } from '../services/pipelineService';

export const useGamePlan = () => {
  const [step, setStep] = useState<AppStep>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<GamePlan | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [designReview, setDesignReview] = useState<DesignReview | undefined>(undefined);
  const [overseerReport, setOverseerReport] = useState<OverseerReport | undefined>(undefined);
  
  const [blueprints, setBlueprints] = useState<Record<string, BlueprintSpec>>({});
  const [behaviorTrees, setBehaviorTrees] = useState<Record<string, BehaviorTreeSpec>>({});
  const [materials, setMaterials] = useState<Record<string, MaterialSpec>>({});
  const [inputs, setInputs] = useState<Record<string, EnhancedInputSpec>>({});
  const [metaSounds, setMetaSounds] = useState<Record<string, MetaSoundSpec>>({});
  const [pcgs, setPcgs] = useState<Record<string, PcgSpec>>({});
  const [cppCodes, setCppCodes] = useState<Record<string, CppCode>>({});
  const [verseCodes, setVerseCodes] = useState<Record<string, VerseCode>>({});
  const [ue6Audit, setUe6Audit] = useState<UE6ReadinessAudit | undefined>(undefined);
  const [t3dExports, setT3dExports] = useState<Record<string, string>>({});
  
  const [installedAssets, setInstalledAssets] = useState<MarketplaceSuggestion[]>([]);

  const [visionBoardImages, setVisionBoardImages] = useState<VisionImage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<VisualPrompt[]>([]);
  
  const [narrative, setNarrative] = useState<NarrativeData>({ quests: [], npcs: [], dialogues: {} });
  
  const [levelLayouts, setLevelLayouts] = useState<LevelLayout[]>([]);
  const [performanceReports, setPerformanceReports] = useState<PerformanceAnalysis[]>([]);
  const [gddRecord, setGddRecord] = useState<GddDocumentRecord | undefined>(undefined);

  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [driveStatus, setDriveStatus] = useState<DriveSyncStatus>(DriveSyncStatus.Unlinked);
  const [drivePath, setDrivePath] = useState<string | null>(null);

  useEffect(() => {
    refreshProjects();
    const unsubscribe = subscribeToProjects(() => {
      const syncProjects = getSavedProjects();
      setSavedProjects(syncProjects);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshProjects = async () => {
    try {
      const projects = getSavedProjects();
      setSavedProjects(projects);
      const asyncProjects = await loadProjectsAsync();
      if (asyncProjects && asyncProjects.length > 0) {
        setSavedProjects(asyncProjects);
      }
    } catch (e) {
      console.error("Could not refresh projects", e);
    }
  };

  const getFullProjectState = useCallback((): SavedProject | null => {
      if (!currentProjectId || !userInput || !plan) return null;
      return {
        id: currentProjectId,
        title: plan.title || userInput.gameIdea.slice(0, 20),
        summary: plan.summary,
        genre: userInput.genres.join(' / '),
        createdAt: savedProjects.find(p => p.id === currentProjectId)?.createdAt || Date.now(),
        lastModified: Date.now(),
        input: userInput,
        plan: plan,
        chatHistory: chatHistory,
        installedAssets: installedAssets,
        designReview: designReview,
        overseerReport: overseerReport,
        blueprints: blueprints,
        behaviorTrees: behaviorTrees,
        materials: materials,
        inputs: inputs,
        metaSounds: metaSounds,
        pcgs: pcgs,
        cppCodes: cppCodes,
        verseCodes: verseCodes,
        ue6Audit: ue6Audit,
        visionBoard: visionBoardImages,
        t3dExports: t3dExports,
        narrative: narrative,
        levelLayouts: levelLayouts,
        performanceReports: performanceReports,
        driveSyncPath: drivePath || undefined,
        gddRecord: gddRecord
      };
  }, [currentProjectId, userInput, plan, chatHistory, blueprints, behaviorTrees, materials, inputs, metaSounds, pcgs, cppCodes, verseCodes, ue6Audit, visionBoardImages, t3dExports, narrative, levelLayouts, designReview, overseerReport, performanceReports, installedAssets, drivePath, savedProjects, gddRecord]);

  useEffect(() => {
    const project = getFullProjectState();
    if (!project) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      saveProjectToStorage(project);
      if (driveStatus === DriveSyncStatus.Linked) {
          try {
              await driveClient.syncProject(project);
          } catch (e) {
              setDriveStatus(DriveSyncStatus.Error);
          }
      }
      setLastSavedTime(Date.now());
      setIsSaving(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [getFullProjectState, driveStatus]);

  const linkLocalDrive = async () => {
      if (!driveClient.isSupported()) {
          setError("File System access is not supported by your browser.");
          return;
      }
      try {
          const folderName = await driveClient.requestFolder();
          if (folderName) {
              setDrivePath(folderName);
              setDriveStatus(DriveSyncStatus.Linked);
              const project = getFullProjectState();
              if (project) {
                  setDriveStatus(DriveSyncStatus.Syncing);
                  await driveClient.syncProject(project);
                  setDriveStatus(DriveSyncStatus.Linked);
              }
          }
      } catch (e: any) {
          if (e.message === 'IFRAME_RESTRICTION' || e.name === 'SecurityError') {
              setError("Drive Link Failed: System drive access is blocked inside preview windows.");
          } else {
              setError("Failed to link local drive.");
          }
      }
  };

  const unlinkLocalDrive = () => {
      setDrivePath(null);
      setDriveStatus(DriveSyncStatus.Unlinked);
  };

  const startBuilding = (tier?: 'hobbyist' | 'indie' | 'studio') => {
      setStep('input');
  };

  const generate = async (input: UserInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateGamePlan(input);
      setPlan(result);
      setUserInput(input);
      const initialChat: ChatMessage = {
        role: 'assistant',
        content: `Development plan for your ${input.genres.join(' / ')} concept forged. Check 'Architect' for deep technical blueprints.`,
        timestamp: Date.now()
      };
      setChatHistory([initialChat]);
      const initialLayout: LevelLayout = {
        id: crypto.randomUUID(),
        name: `${result.title || 'Citadel'} - Primary Level`,
        description: `Primary playable level environment for ${result.title}. Balanced zone featuring player spawn, tactical arena, loot caches, and apex boss encounter area.`,
        visualPrompt: `Overhead tactical blueprint layout and aerial environment diorama for ${result.title}, ${input.artStyle || 'stylized'} aesthetic with clear playable paths and POIs.`,
        pointsOfInterest: [
          { id: 'poi-1', name: 'Player Start Spawn', description: 'Initial drop point and spawn pad', type: 'Spawn', x: 20, y: 75 },
          { id: 'poi-2', name: 'Tactical NavMesh AI Zone', description: 'Patrol sector with active AI navigation', type: 'NavMesh', x: 50, y: 50 },
          { id: 'poi-3', name: 'Supply Cache & Loot', description: 'Armament and ammunition cache', type: 'Loot', x: 75, y: 70 },
          { id: 'poi-4', name: 'Citadel Boss Sanctum', description: 'Primary apex objective and boss encounter volume', type: 'Boss', x: 50, y: 20 }
        ]
      };
      const newProjectId = crypto.randomUUID();
      const newProject: SavedProject = { id: newProjectId, title: result.title, summary: result.summary, genre: input.genres.join(' / '), createdAt: Date.now(), lastModified: Date.now(), input, plan: result, chatHistory: [initialChat], blueprints: {}, behaviorTrees: {}, materials: {}, inputs: {}, metaSounds: {}, pcgs: {}, cppCodes: {}, visionBoard: [], narrative: { quests: [], npcs: [], dialogues: {} }, levelLayouts: [initialLayout], performanceReports: [], installedAssets: [] };
      setLevelLayouts([initialLayout]);
      saveProjectToStorage(newProject);
      setCurrentProjectId(newProjectId);
      refreshProjects();
      setLastSavedTime(Date.now());
      setStep('workspace');
    } catch (err) {
      setError("Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  const importProject = (project: SavedProject) => {
    try {
      saveProjectToStorage(project);
      refreshProjects();
    } catch (e) {
      console.error("Import failed", e);
      setError("Failed to import project file.");
    }
  };

  const fetchTutorialsForContext = async (query: string, type: 'task' | 'blueprint', targetId: string) => {
      const context = type === 'blueprint' ? `Unreal Engine 5 asset creation for ${targetId}` : `UE5 task implementation for ${targetId}`;
      const links = await searchTutorials(query, context);
      
      if (type === 'task') {
          setPlan(prev => {
              if (!prev) return prev;
              const newPhases = (prev.phases || []).map(phase => ({
                  ...phase,
                  tasks: (phase.tasks || []).map(task => {
                      if (task.assetName === targetId || task.title === targetId) return { ...task, tutorials: links };
                      return task;
                  })
              }));
              return { ...prev, phases: newPhases };
          });
      } else if (type === 'blueprint') {
          setBlueprints(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
          setBehaviorTrees(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
          setMaterials(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
          setInputs(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
          setMetaSounds(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
          setPcgs(prev => prev[targetId] ? { ...prev, [targetId]: { ...prev[targetId], tutorials: links } } : prev);
      }
      return links;
  };

  const sendMessage = async (message: string) => {
    if (!plan) return;
    const newMessage: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    setChatHistory(prev => [...prev, newMessage]);
    setIsAgentThinking(true);
    try {
      const response = await chatWithAgent(plan, [...chatHistory, newMessage], message);
      if (response.hasPlanUpdates && response.updatedPlan) setPlan(response.updatedPlan);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response.response, timestamp: Date.now() }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Neural link error.", timestamp: Date.now() }]);
    } finally { setIsAgentThinking(false); }
  };

  const fetchBlueprintSpec = async (assetName: string, description: string): Promise<BlueprintSpec> => {
    if (blueprints[assetName]) return blueprints[assetName];
    const context = userInput ? `Engine: ${userInput.ueVersion}, Specs: ${userInput.mechanics.join(', ')}.` : '';
    const spec = await generateBlueprintSpec(assetName, description, context);
    setBlueprints(prev => ({ ...prev, [assetName]: spec }));
    try {
      const cfg = getPipelineConfig();
      if (cfg && cfg.autoBuildOnArchUpdate) {
        createNewPipelineRun(
          'architecture_update',
          `Auto-Trigger: Blueprint [${assetName}] generated`,
          `feat(arch): Generated architectural blueprint [${assetName}]`,
          cfg
        );
      }
    } catch {}
    return spec;
  };

  const registerBlueprintSpec = (assetName: string, spec: BlueprintSpec) => {
    setBlueprints(prev => ({ ...prev, [assetName]: spec }));
    try {
      const cfg = getPipelineConfig();
      if (cfg && cfg.autoBuildOnArchUpdate) {
        createNewPipelineRun(
          'architecture_update',
          `Auto-Trigger: Blueprint spec [${assetName}] instantiated/updated`,
          `feat(arch): Updated blueprint architecture [${assetName}]`,
          cfg
        );
      }
    } catch (e) {
      console.warn('Pipeline trigger error:', e);
    }
  };


  const fetchBehaviorTreeSpec = async (assetName: string, description: string): Promise<BehaviorTreeSpec> => {
    if (behaviorTrees[assetName]) return behaviorTrees[assetName];
    const spec = await generateBehaviorTreeSpec(assetName, description);
    setBehaviorTrees(prev => ({ ...prev, [assetName]: spec }));
    return spec;
  };

  const fetchOverseerReport = async () => {
    if (!plan) return;
    setLoading(true);
    try {
        const existingAssets = [
            ...Object.keys(blueprints),
            ...Object.keys(behaviorTrees),
            ...Object.keys(materials),
            ...Object.keys(inputs),
            ...Object.keys(metaSounds),
            ...Object.keys(pcgs)
        ];
        const report = await generateOverseerReport(plan, existingAssets);
        setOverseerReport(report);
    } catch (e) {
        console.error("Overseer audit failed", e);
    } finally {
        setLoading(false);
    }
  };

  const performLayoutPerformanceAnalysis = async (layout: LevelLayout) => {
      if (!userInput) return;
      setLoading(true);
      try {
          const report = await analyzeLayoutPerformance(layout, userInput);
          setPerformanceReports(prev => [report, ...prev]);
          return report;
      } catch (e) {
          console.error("Layout analysis failed", e);
      } finally {
          setLoading(false);
      }
  };

  const fetchMaterialSpec = async (name: string, desc: string): Promise<MaterialSpec> => { if (materials[name]) return materials[name]; const s = await generateMaterialSpec(name, desc); setMaterials(prev => ({ ...prev, [name]: s })); return s; };
  const fetchInputSpec = async (name: string, desc: string): Promise<EnhancedInputSpec> => { if (inputs[name]) return inputs[name]; const s = await generateEnhancedInputSpec(name, desc); setInputs(prev => ({ ...prev, [name]: s })); return s; };
  const fetchMetaSoundSpec = async (name: string, desc: string): Promise<MetaSoundSpec> => { if (metaSounds[name]) return metaSounds[name]; const s = await generateMetaSoundSpec(name, desc); setMetaSounds(prev => ({ ...prev, [name]: s })); return s; };
  const fetchPcgSpec = async (name: string, desc: string): Promise<PcgSpec> => { if (pcgs[name]) return pcgs[name]; const s = await generatePcgSpec(name, desc); setPcgs(prev => ({ ...prev, [name]: s })); return s; };
  const fetchCppCodeForAsset = async (name: string, spec: BlueprintSpec): Promise<CppCode> => { if (cppCodes[name]) return cppCodes[name]; const c = await generateCppCode(name, spec); setCppCodes(prev => ({ ...prev, [name]: c })); return c; };
  const fetchVerseCodeForAsset = async (name: string, spec: BlueprintSpec): Promise<VerseCode> => { 
    if (verseCodes[name]) return verseCodes[name]; 
    const v = await generateVerseCode(name, spec); 
    setVerseCodes(prev => ({ ...prev, [name]: v })); 
    return v; 
  };
  const batchSetVerseCodes = (codes: Record<string, VerseCode>) => {
    setVerseCodes(prev => ({ ...prev, ...codes }));
  };
  const fetchT3dForAsset = async (name: string, spec: BlueprintSpec): Promise<string> => { if (t3dExports[name]) return t3dExports[name]; const t = await generateT3dData(name, spec); setT3dExports(prev => ({ ...prev, [name]: t })); return t; };

  const manualSave = async () => { refreshProjects(); const p = getFullProjectState(); if (p && driveStatus === DriveSyncStatus.Linked) { setDriveStatus(DriveSyncStatus.Syncing); await driveClient.syncProject(p); setDriveStatus(DriveSyncStatus.Linked); } };
  const reset = () => { setStep('input'); setPlan(null); setChatHistory([]); setBlueprints({}); setBehaviorTrees({}); setMaterials({}); setInputs({}); setMetaSounds({}); setPcgs({}); setCppCodes({}); setVerseCodes({}); setUe6Audit(undefined); setT3dExports({}); setVisionBoardImages([]); setNarrative({ quests: [], npcs: [], dialogues: {} }); setLevelLayouts([]); setPerformanceReports([]); setInstalledAssets([]); setCurrentProjectId(null); setUserInput(null); setDrivePath(null); setDriveStatus(DriveSyncStatus.Unlinked); setOverseerReport(undefined); setGddRecord(undefined); };
  const goToLibrary = () => { refreshProjects(); setStep('library'); };
  const loadProject = (p: SavedProject) => { 
    const full = getProjectById(p.id) || p;
    setCurrentProjectId(full.id); 
    setPlan(full.plan); 
    setChatHistory(full.chatHistory); 
    setInstalledAssets(full.installedAssets || []); 
    setBlueprints(full.blueprints || {}); 
    setBehaviorTrees(full.behaviorTrees || {}); 
    setMaterials(full.materials || {}); 
    setInputs(full.inputs || {}); 
    setMetaSounds(full.metaSounds || {}); 
    setPcgs(full.pcgs || {}); 
    setCppCodes(full.cppCodes || {}); 
    setVerseCodes(full.verseCodes || {});
    setUe6Audit(full.ue6Audit);
    setT3dExports(full.t3dExports || {}); 
    setVisionBoardImages(full.visionBoard || []); 
    setNarrative(full.narrative || { quests: [], npcs: [], dialogues: {} }); 
    setLevelLayouts(full.levelLayouts || []); 
    setPerformanceReports(full.performanceReports || []); 
    setUserInput(full.input); 
    setDrivePath(full.driveSyncPath || null); 
    setDriveStatus(full.driveSyncPath ? DriveSyncStatus.Linked : DriveSyncStatus.Unlinked); 
    setStep('workspace'); 
    setLastSavedTime(full.lastModified); 
    setOverseerReport(full.overseerReport); 
    setGddRecord(full.gddRecord);
  };
  const loadAutonomousGddProject = (project: SavedProject) => {
    saveProjectToStorage(project);
    refreshProjects();
    loadProject(project);
  };
  const deleteProject = (id: string) => { deleteProjectFromStorage(id); refreshProjects(); };

  return {
    step, loading, error, isSaving, plan, chatHistory, designReview, overseerReport, blueprints, behaviorTrees, materials, inputs, metaSounds, pcgs, cppCodes, t3dExports, visionBoardImages, suggestedPrompts, narrative, levelLayouts, performanceReports, installedAssets, driveStatus, drivePath, linkLocalDrive, unlinkLocalDrive,
    gddRecord, setGddRecord, loadAutonomousGddProject,
    createNewLevelLayout: async () => { if (!plan || !userInput) return; const l = await generateLevelLayoutData(plan, userInput.gameIdea); const b = await generateLevelBlueprintImage(l.visualPrompt); setLevelLayouts(prev => [...prev, { ...l, imageBase64: b }]); },
    addLevelLayout: (layout: LevelLayout) => { setLevelLayouts(prev => [...prev, layout]); },
    updatePOIPosition: (lId: string, pId: string, x: number, y: number) => { setLevelLayouts(prev => prev.map(l => l.id !== lId ? l : { ...l, pointsOfInterest: (l.pointsOfInterest || []).map(p => p.id !== pId ? p : { ...p, x, y }) })); },
    performPerformanceAnalysis: async (img: string) => { setLoading(true); try { const a = await analyzePerformanceImage(img); setPerformanceReports(prev => [a, ...prev]); return a; } finally { setLoading(false); } },
    performLayoutPerformanceAnalysis,
    toggleAssetInstallation: (a: MarketplaceSuggestion) => { setInstalledAssets(prev => prev.some(x => x.name === a.name) ? prev.filter(x => x.name !== a.name) : [...prev, a]); },
    performConflictAnalysis: async () => { if (installedAssets.length < 2) return null; setLoading(true); try { return await analyzeAssetConflicts(installedAssets); } finally { setLoading(false); } },
    fetchQuests: async () => { if (!plan || narrative.quests.length > 0) return; const q = await generateQuests(plan); setNarrative(prev => ({ ...prev, quests: q.map(x => ({ ...x, id: crypto.randomUUID() })) })); },
    fetchNPCs: async () => { if (!plan || narrative.npcs.length > 0) return; const n = await generateNPCs(plan); setNarrative(prev => ({ ...prev, npcs: n.map(x => ({ ...x, id: crypto.randomUUID() })) })); },
    fetchDialogue: async (n: NPC) => { if (narrative.dialogues[n.id]) return narrative.dialogues[n.id]; const d = await generateDialogue(n); setNarrative(prev => ({ ...prev, dialogues: { ...prev.dialogues, [n.id]: [d] } })); return [d]; },
    fetchVisualPrompts: async (category?: string) => { 
      if (!plan) return []; 
      const p = await generateVisualPrompts(plan, category); 
      if (p && p.length > 0) {
        setSuggestedPrompts(prev => {
          if (category) {
            const others = (prev || []).filter(item => item.category?.toLowerCase() !== category.toLowerCase());
            return [...others, ...p];
          }
          return p;
        });
      }
      return p;
    },
    generateImageFromPrompt: async (p: string, c: any) => { const b = await generateConceptArtImage(p, c); setVisionBoardImages(prev => [...prev, { id: crypto.randomUUID(), prompt: p, base64: b, category: c, timestamp: Date.now() }]); },
    isAgentThinking, savedProjects, lastSavedTime, currentProjectId, startBuilding, generate, importProject, sendMessage, fetchDesignReview: async () => { if (!plan || !userInput || designReview) return; setLoading(true); try { setDesignReview(await generateDesignReview(plan, userInput)); } finally { setLoading(false); } },
    fetchBlueprintSpec, registerBlueprintSpec, fetchBehaviorTreeSpec, fetchMaterialSpec, fetchInputSpec, fetchMetaSoundSpec, fetchPcgSpec, fetchCppCodeForAsset, fetchVerseCodeForAsset, batchSetVerseCodes, verseCodes, setVerseCodes, ue6Audit, setUe6Audit, fetchT3dForAsset, fetchOverseerReport,
    generateAutomationScript: async () => {
        const project = getFullProjectState();
        return project ? await generatePythonScript(project) : null;
    },
    manualSave, reset, goToLibrary, loadProject, deleteProject, fetchTutorialsForContext,
    fetchMarketplaceAssets: async (q: string, tId: string) => { const a = await searchMarketplace(q); setPlan(prev => prev ? { ...prev, phases: (prev.phases || []).map(p => ({ ...p, tasks: (p.tasks || []).map(t => (t.assetName === tId || t.title === tId) ? { ...t, suggestedMarketAssets: a } : t) })) } : prev); return a; }
  };
};
