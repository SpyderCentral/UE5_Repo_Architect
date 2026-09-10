import React, { useEffect, useState, useMemo } from 'react';
import { GamePlan, VisionImage, VisualPrompt, LevelLayout } from '../types';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  Download, 
  Maximize2, 
  X, 
  RefreshCw, 
  Check, 
  Layers, 
  User, 
  Box, 
  LayoutGrid, 
  SlidersHorizontal,
  Copy,
  BoxSelect,
  Package,
  ChevronDown,
  Wand2,
  Cpu,
  Globe,
  Map,
  CheckCircle2,
  Upload,
  Activity,
  FileCode
} from 'lucide-react';
import { ThreeViewport } from './ThreeViewport';
import { 
  generate3DAsset, 
  buildMeshFrom3DSpec,
  exportToGLB, 
  exportToOBJ, 
  generateOBJMaterialFile,
  generateUE5T3DScript, 
  generateUE5PythonImporter,
  generateGodotScene, 
  generateGodotScript,
  generateUnityPrefabManifest, 
  generateUnityCSharpScript,
  exportToThreeJSON,
  downloadFile,
  generateMesh2MotionUE5Script,
  type Asset3DCategory,
  type Generated3DAsset 
} from '../services/model3dGenerator';
import { generateAI3DModelSpec, convert2DArtTo3DModelSpec } from '../services/ai/client';

export type VisionCategory = 'Environment' | 'Character' | 'Prop' | 'UI';

interface VisionBoardProps {
  plan: GamePlan;
  images: VisionImage[];
  suggestedPrompts: VisualPrompt[];
  levelLayouts?: LevelLayout[];
  selectedLayout?: LevelLayout | null;
  onFetchPrompts: (category?: string) => Promise<any> | void;
  onGenerateImage: (prompt: string, category: VisionCategory) => Promise<void>;
  onNavigateToWorld?: () => void;
  onAddLevelLayout?: (layout: LevelLayout) => void;
}

interface CategoryMeta {
  id: VisionCategory;
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  activeBtnClass: string;
  accentBorder: string;
  description: string;
}

const CATEGORY_CONFIG: Record<VisionCategory, CategoryMeta> = {
  Environment: {
    id: 'Environment',
    label: 'Environment',
    icon: Layers,
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    activeBtnClass: 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30',
    accentBorder: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
    description: 'Level biomes, vistas, volumetric fog & Lumen lighting'
  },
  Character: {
    id: 'Character',
    label: 'Character',
    icon: User,
    badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
    activeBtnClass: 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30',
    accentBorder: 'hover:border-purple-500/50 hover:bg-purple-950/20',
    description: 'Protagonists, bosses, NPCs & MetaHuman silhouettes'
  },
  Prop: {
    id: 'Prop',
    label: 'Prop',
    icon: Box,
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    activeBtnClass: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/30',
    accentBorder: 'hover:border-amber-500/50 hover:bg-amber-950/20',
    description: 'Gameplay weapons, artifacts, terminals & Nanite meshes'
  },
  UI: {
    id: 'UI',
    label: 'UI',
    icon: LayoutGrid,
    badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
    activeBtnClass: 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/30',
    accentBorder: 'hover:border-cyan-500/50 hover:bg-cyan-950/20',
    description: 'Diegetic HUDs, tactical gauges, codex & inventory frames'
  }
};

const ARCHETYPE_PRESETS: Record<VisionCategory, { name: string; prompt: string; desc: string }[]> = {
  Character: [
    { name: 'Tactical Pointman', prompt: 'Full-body tactical portrait of a battle-hardened squad pointman equipped with modular ceramic ballistic plates, integrated communications headset, and quad-tube panoramic night vision goggles flipped up.', desc: 'Tier 1 tactical operator' },
    { name: 'Knight Paladin', prompt: 'Heavy armored medieval knight paladin with ornate fluted steel cuirass, greathelm with visor, gold trim, broadsword and heraldic kite shield.', desc: 'High fantasy armored guardian' },
    { name: 'Mage / Wizard', prompt: 'Mystic wizard in star-embroidered draped robes with pointed conical hat, holding a tall arcane wooden staff topped with a radiant glowing crystal orb.', desc: 'Spellcasting mystic' },
    { name: 'Dragon Beast', prompt: 'Menacing red dragon beast with curved horns, glowing eyes, massive bat wings, muscular talons, and a barbed spiked tail.', desc: 'Fierce winged creature' },
  ],
  Prop: [
    { name: 'Tactical Sniper', prompt: 'Precision tactical sniper rifle with fluted long barrel, muzzle brake, high-magnification illuminated optic scope, and skeletonized adjustable stock.', desc: 'Anti-materiel firearm' },
    { name: 'Legendary Sword', prompt: 'Ornate fantasy broadsword with glowing cyan runic blood fuller, golden crossguard, leather wrapped grip, and engraved pommel.', desc: 'Ancient runic blade' },
    { name: 'Healing Potion', prompt: 'Glass alchemical round potion flask filled with bubbling radiant red healing liquid, fitted with wooden cork and golden sealing ring.', desc: 'Glowing consumable vial' },
    { name: 'Hover Speeder', prompt: 'High-speed cyberpunk aerodynamic racing hovercraft speeder with twin glowing jet thrusters and vector wings.', desc: 'Futuristic vehicle' },
    { name: 'Treasure Chest', prompt: 'Classic dungeon treasure chest with curved domed wooden lid, heavy iron reinforcing bands, and golden padlock clasp.', desc: 'Loot vault container' },
  ],
  Environment: [
    { name: 'Floating Sky Island', prompt: 'Tiered floating celestial sky island with downward tapering rock stalactites, lush moss, ancient ruined archway, and levitating crystals.', desc: 'Fantasy aerial realm' },
    { name: 'Cyberpunk Metropolis', prompt: 'Diorama of a neon-drenched cyberpunk city intersection with towering skyscrapers, glowing cyan and magenta billboards, and elevated skybridges.', desc: 'Futuristic urban block' },
  ],
  UI: [
    { name: 'Tactical Holo Visor', prompt: 'Curved futuristic 3D holographic combat HUD with targeting reticle, elevation angle ladder, radar disc, and energy status bar.', desc: 'Sci-fi diegetic overlay' },
    { name: 'Fantasy RPG Orbs', prompt: 'Diegetic fantasy RPG status interface with golden sculpted pedestals holding twin glowing Red Health and Blue Mana glass orbs.', desc: 'Classic RPG orbs' },
  ]
};

const VisionBoard: React.FC<VisionBoardProps> = ({ 
  plan, 
  images = [], 
  suggestedPrompts = [], 
  levelLayouts = [],
  selectedLayout = null,
  onFetchPrompts, 
  onGenerateImage,
  onNavigateToWorld,
  onAddLevelLayout
}) => {
  const [activePrompt, setActivePrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<VisionCategory>('Environment');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingCategory, setIsFetchingCategory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<VisionImage | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<'All' | VisionCategory>('All');
  
  // Studio View Mode: '2d' (Concept Art) or '3d' (3D Asset Forge)
  const [studioMode, setStudioMode] = useState<'2d' | '3d'>('2d');

  // 3D Asset Studio State
  const [generated3DAssets, setGenerated3DAssets] = useState<Generated3DAsset[]>([]);
  const [active3DAssetId, setActive3DAssetId] = useState<string | null>(null);
  const [isForging3D, setIsForging3D] = useState(false);
  const [forgeStatusText, setForgeStatusText] = useState('Forging 3D Mesh...');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Initial load: fetch suggestions for default category
  useEffect(() => {
    if ((suggestedPrompts || []).length === 0) {
      handleFetchCategoryPrompts('Environment');
    }
  }, []);

  // When a layout is selected or synced from World / Cartographer
  useEffect(() => {
    if (selectedLayout) {
      setActiveCategory('Environment');
      setActivePrompt(selectedLayout.visualPrompt || selectedLayout.description || selectedLayout.name);
      handleForge3D(selectedLayout.visualPrompt || selectedLayout.name, 'Level', false, selectedLayout);
    }
  }, [selectedLayout]);

  // Filter AI suggestions by the currently selected category
  const categorySuggestions = useMemo(() => {
    return (suggestedPrompts || []).filter(p => {
      const pCat = (p.category || '').trim().toLowerCase();
      const targetCat = activeCategory.toLowerCase();
      return pCat === targetCat;
    });
  }, [suggestedPrompts, activeCategory]);

  const handleFetchCategoryPrompts = async (cat: VisionCategory) => {
    setIsFetchingCategory(true);
    try {
      await onFetchPrompts(cat);
    } catch (e) {
      console.error('Failed to fetch visual prompts for category', cat, e);
    } finally {
      setIsFetchingCategory(false);
    }
  };

  const handleCategoryChange = (cat: VisionCategory) => {
    setActiveCategory(cat);
    const hasPrompts = (suggestedPrompts || []).some(
      p => (p.category || '').trim().toLowerCase() === cat.toLowerCase()
    );
    if (!hasPrompts) {
      handleFetchCategoryPrompts(cat);
    }
  };

  const handleGenerate2D = async () => {
    if (!activePrompt || isGenerating) return;
    setIsGenerating(true);
    try {
      await onGenerateImage(activePrompt, activeCategory);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate 3D Asset procedure (AI Spec Decomposition with Procedural Three.js Fallback)
  const handleForge3D = async (
    promptToUse?: string, 
    categoryToUse?: VisionCategory | 'Level', 
    forceProcedural = false,
    layoutToUse?: LevelLayout,
    imageB64?: string
  ) => {
    const category = (categoryToUse || activeCategory) as Asset3DCategory;
    const prompt = (promptToUse || activePrompt || `${category} asset for ${plan.title}`).trim();

    setIsForging3D(true);
    setStudioMode('3d');

    try {
      let sceneGroup: any;
      let assetName = `${category} Asset`;
      let archetypeDesc = '';
      let rigType: any = undefined;
      let isRigged = false;
      let modelClips: any[] = [];

      if (category === 'Level' || layoutToUse) {
        setForgeStatusText('Compiling 3D World Level Blockout matching Cartographer...');
        const targetLayout = layoutToUse || (levelLayouts || []).find(l => 
          l.name.toLowerCase().includes(prompt.toLowerCase()) || 
          prompt.toLowerCase().includes(l.name.toLowerCase())
        ) || (levelLayouts || [])[0];

        sceneGroup = generate3DAsset('Level', prompt, targetLayout, targetLayout?.id || `level-${Date.now()}`);
        assetName = targetLayout ? targetLayout.name : 'World Level Blockout';
        archetypeDesc = targetLayout 
          ? `World Map Synchronized (${targetLayout.pointsOfInterest?.length || 0} POIs)`
          : 'World Level Blockout';
      } else if (imageB64) {
        setForgeStatusText('GPT-6 Astra Vision: Analyzing 2D Art silhouette, muscle fibers, bone carapace & glowing nodes...');
        try {
          const spec = await convert2DArtTo3DModelSpec(imageB64, category, prompt, plan.title);
          setForgeStatusText('Synthesizing Unreal Engine 5 Nanite/Lumen PBR Materials & Mesh2Motion Rig...');
          sceneGroup = buildMeshFrom3DSpec(spec);
          assetName = spec.name || `${spec.category || category} (2D Reconstructed)`;
          archetypeDesc = spec.description || spec.archetype || 'GPT-6 Astra Vision 2D-to-3D Spatial Reconstruction';
          rigType = spec.rigType || (spec.category === 'Character' || category === 'Character' ? 'humanoid' : undefined);
          isRigged = !!rigType || spec.category === 'Character' || category === 'Character';
        } catch (visionErr) {
          console.warn('Astra 2D-to-3D failed, falling back to procedural engine:', visionErr);
          setForgeStatusText('Compiling Three.js Procedural Meshes...');
          const fallbackCat = (prompt.toLowerCase().includes('zombie') || prompt.toLowerCase().includes('character') || prompt.toLowerCase().includes('mutant') || prompt.toLowerCase().includes('monster')) ? 'Character' : category;
          sceneGroup = generate3DAsset(fallbackCat, prompt);
        }
      } else if (!forceProcedural) {
        setForgeStatusText('GPT-6 Astra: Synthesizing Unreal Engine 5 Geometry & PBR Shaders...');
        try {
          const spec = await generateAI3DModelSpec(category, prompt, plan.title);
          if (spec && spec.parts && spec.parts.length > 0) {
            sceneGroup = buildMeshFrom3DSpec(spec);
            assetName = spec.name || `${category} Model`;
            archetypeDesc = spec.archetype || spec.description || '';
            rigType = spec.rigType;
            isRigged = !!spec.rigType || category === 'Character';
          } else {
            setForgeStatusText('Compiling Three.js Procedural Meshes...');
            sceneGroup = generate3DAsset(category, prompt);
          }
        } catch (aiErr) {
          console.warn('AI 3D Synthesis fallback to procedural engine', aiErr);
          setForgeStatusText('Compiling Three.js Procedural Meshes...');
          sceneGroup = generate3DAsset(category, prompt);
        }
      } else {
        setForgeStatusText('Generating Procedural Three.js Meshes...');
        sceneGroup = generate3DAsset(category, prompt);
      }

      // Read Mesh2Motion rig and animations metadata if generated
      const mesh2meta = (sceneGroup as any)?.__mesh2motion;
      if (mesh2meta) {
        modelClips = mesh2meta.clips || [];
        isRigged = true;
        rigType = mesh2meta.rigType || rigType;
      }

      const newAsset: Generated3DAsset = {
        id: `asset-3d-${Date.now()}`,
        name: assetName,
        category: category,
        prompt: prompt,
        archetype: archetypeDesc,
        scene: sceneGroup,
        createdAt: Date.now(),
        source2DImage: imageB64,
        rigType: rigType,
        animations: modelClips,
        isRigged: isRigged
      };

      setGenerated3DAssets(prev => [newAsset, ...prev]);
      setActive3DAssetId(newAsset.id);
      notifyExport(imageB64 
        ? `Reconstructed realistic 3D ${category} from 2D Art with Mesh2Motion Rigging!` 
        : `Created dynamic 3D ${category} Asset! Ready for engine export.`
      );
    } catch (err) {
      console.error('Failed to build 3D asset', err);
      notifyExport('Failed to forge 3D asset. Please try again.');
    } finally {
      setIsForging3D(false);
      setForgeStatusText('Forging 3D Mesh...');
    }
  };

  const handleUpload2DArt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').trim();
    const promptToUse = (activePrompt && activePrompt.trim().length > 3 && !activePrompt.includes('Generate')) 
      ? activePrompt 
      : (cleanFileName || `${activeCategory} 2D concept art`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        handleForge3D(
          promptToUse,
          activeCategory,
          false,
          undefined,
          base64
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave3DEnvironmentToWorld = (asset: Generated3DAsset) => {
    if (!onAddLevelLayout) return;
    const newLayout: LevelLayout = {
      id: crypto.randomUUID(),
      name: asset.name.includes('Environment') ? `${plan.title} - ${asset.name}` : asset.name,
      description: `3D Environment created in Vision Studio. ${asset.archetype || asset.prompt}`,
      visualPrompt: asset.prompt,
      pointsOfInterest: [
        { id: 'poi-start', name: 'Player Drop Point', description: 'Initial spawn point', type: 'Spawn', x: 20, y: 75 },
        { id: 'poi-zone', name: 'Exploration Center', description: 'Core focal landmark', type: 'NavMesh', x: 50, y: 50 },
        { id: 'poi-cache', name: 'Asset Stash', description: 'Loot & resource cache', type: 'Loot', x: 75, y: 70 },
        { id: 'poi-boss', name: 'Apex Boss Arena', description: 'Encounter zone', type: 'Boss', x: 50, y: 25 }
      ]
    };
    onAddLevelLayout(newLayout);
    notifyExport(`Saved "${newLayout.name}" as an active World Map in Cartographer!`);
  };

  const active3DAsset = generated3DAssets.find(a => a.id === active3DAssetId) || generated3DAssets[0] || null;

  const notifyExport = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Multi-engine asset export handlers
  const handleExportGLB = async () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const glbData = await exportToGLB(active3DAsset.scene);
      const safeName = `${active3DAsset.category}_${Date.now()}`;
      downloadFile(glbData, `${safeName}.glb`, 'model/gltf-binary');
      notifyExport(`Exported ${safeName}.glb (glTF 2.0 Universal)`);
    } catch (err) {
      console.error('Export GLB failed', err);
    }
  };

  const handleExportMesh2MotionUE5 = async () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const safeName = `${active3DAsset.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Mesh2Motion`;
      const glbFileName = `${safeName}.glb`;
      const retargeterPy = generateMesh2MotionUE5Script(safeName, active3DAsset.rigType || 'humanoid');
      const pyImporter = generateUE5PythonImporter(safeName, glbFileName, active3DAsset.category);
      const glbData = await exportToGLB(active3DAsset.scene);

      downloadFile(retargeterPy, `${safeName}_IKRetargeter.py`, 'text/plain');
      downloadFile(pyImporter, `import_${safeName}.py`, 'text/plain');
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported UE5 Mesh2Motion Character Rig (.glb + IK Retargeter script + py importer)!`);
    } catch (err) {
      console.error('Mesh2Motion UE5 export failed', err);
    }
  };

  const handleExportOBJ = () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    const safeName = `${active3DAsset.category}_${Date.now()}`;
    const objData = exportToOBJ(active3DAsset.scene);
    const mtlData = generateOBJMaterialFile(safeName);
    downloadFile(objData, `${safeName}.obj`, 'text/plain');
    downloadFile(mtlData, `${safeName}.mtl`, 'text/plain');
    notifyExport(`Exported ${safeName}.obj + .mtl (Wavefront 3D)`);
  };

  const handleExportUE5 = async () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const safeName = `${active3DAsset.category}_Asset`;
      const glbFileName = `${safeName}_Mesh.glb`;
      const t3dScript = generateUE5T3DScript(safeName, active3DAsset.category);
      const pyImporter = generateUE5PythonImporter(safeName, glbFileName);
      const glbData = await exportToGLB(active3DAsset.scene);
      
      downloadFile(t3dScript, `${safeName}_Actor.t3d`, 'text/plain');
      downloadFile(pyImporter, `import_${safeName}.py`, 'text/plain');
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported Unreal Engine 5 Asset Pack (.t3d + .py + .glb)`);
    } catch (err) {
      console.error('UE5 export failed', err);
    }
  };

  const handleExportGodot = async () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const safeName = `${active3DAsset.category}_Asset`;
      const glbFileName = `${safeName}_Mesh.glb`;
      const tscnData = generateGodotScene(safeName, glbFileName, active3DAsset.category);
      const gdScript = generateGodotScript(safeName, active3DAsset.category);
      const glbData = await exportToGLB(active3DAsset.scene);
      
      downloadFile(tscnData, `${safeName}_Scene.tscn`, 'text/plain');
      downloadFile(gdScript, `${safeName}_Controller.gd`, 'text/plain');
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported Godot 4 Asset Pack (.tscn + .gd + .glb)`);
    } catch (err) {
      console.error('Godot export failed', err);
    }
  };

  const handleExportUnity = async () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const safeName = `${active3DAsset.category}_Asset`;
      const glbFileName = `${safeName}_Mesh.glb`;
      const prefabData = generateUnityPrefabManifest(safeName, glbFileName, active3DAsset.category);
      const csScript = generateUnityCSharpScript(safeName, active3DAsset.category);
      const glbData = await exportToGLB(active3DAsset.scene);
      
      downloadFile(prefabData, `${safeName}_Prefab.json`, 'application/json');
      downloadFile(csScript, `${safeName}Controller.cs`, 'text/plain');
      downloadFile(glbData, glbFileName, 'model/gltf-binary');
      notifyExport(`Exported Unity Asset Pack (.prefab + .cs + .glb)`);
    } catch (err) {
      console.error('Unity export failed', err);
    }
  };

  const handleExportThreeJSON = () => {
    if (!active3DAsset) return;
    setShowExportMenu(false);
    try {
      const safeName = `${active3DAsset.category}_Asset`;
      const jsonContent = exportToThreeJSON(active3DAsset.scene);
      downloadFile(jsonContent, `${safeName}_Scene.json`, 'application/json');
      notifyExport(`Exported Three.js Scene JSON (.json)`);
    } catch (err) {
      console.error('Three.js JSON export failed', err);
    }
  };

  const handleUseSuggestion = (p: VisualPrompt) => {
    setActivePrompt(p.prompt);
    const matchedCategory = (['Environment', 'Character', 'Prop', 'UI'] as const).find(
      c => c.toLowerCase() === (p.category || '').toLowerCase()
    );
    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent, promptText: string, idx: number) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(promptText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filter gallery images
  const filteredGalleryImages = useMemo(() => {
    if (galleryFilter === 'All') return images || [];
    return (images || []).filter(
      img => (img.category || '').toLowerCase() === galleryFilter.toLowerCase()
    );
  }, [images, galleryFilter]);

  const currentConfig = CATEGORY_CONFIG[activeCategory];
  const ActiveIcon = currentConfig.icon;

  return (
    <div className="flex h-full relative">
      {/* Toast Notification */}
      {exportNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400" />
          {exportNotice}
        </div>
      )}

      {/* Left Sidebar: Studio Controls */}
      <div className="w-88 xl:w-96 border-r border-slate-800 bg-slate-900/60 flex flex-col p-5 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> Art & Asset Studio
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
            Multi-Engine 3D & 2D
          </span>
        </div>
        
        {/* Custom Generator */}
        <div className="space-y-4 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-300 font-bold block">
                Category
              </label>
              <span className="text-[10px] text-slate-500 italic">
                {currentConfig.description}
              </span>
            </div>

            {/* Category Selectors */}
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as VisionCategory[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                const isSelected = activeCategory === cat;
                const count = (suggestedPrompts || []).filter(
                  p => (p.category || '').toLowerCase() === cat.toLowerCase()
                ).length;

                return (
                  <button
                    key={cat}
                    id={`vision-category-btn-${cat.toLowerCase()}`}
                    onClick={() => handleCategoryChange(cat)}
                    className={`text-xs font-semibold py-2 px-3 rounded-lg border flex items-center justify-between transition-all ${
                      isSelected 
                        ? cfg.activeBtnClass 
                        : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {cfg.label}
                    </span>
                    {count > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Archetype Quick Presets */}
          {ARCHETYPE_PRESETS[activeCategory] && ARCHETYPE_PRESETS[activeCategory].length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Quick Archetypes
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">Dynamic 3D</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPE_PRESETS[activeCategory].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setActivePrompt(preset.prompt)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md bg-slate-800/80 hover:bg-cyan-950/80 text-slate-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/50 transition-all text-left"
                    title={preset.desc}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Synchronized World Maps & Level Layouts */}
          {levelLayouts && levelLayouts.length > 0 && activeCategory === 'Environment' && (
            <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Cartographer World Maps ({levelLayouts.length})
                </span>
                {onNavigateToWorld && (
                  <button
                    type="button"
                    onClick={onNavigateToWorld}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    title="Open Cartographer tab"
                  >
                    <span>World Tab</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Directly linked to World Cartographer. Generating 3D greybox will match spatial landmarks, POIs, and player spawn points with zero discrepancy.
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {levelLayouts.map((layout) => (
                  <div 
                    key={layout.id}
                    className="p-2 rounded-lg bg-slate-950/80 border border-emerald-900/40 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate max-w-[170px]">
                        {layout.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                        {layout.pointsOfInterest?.length || 0} POIs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mb-2">{layout.description}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleForge3D(layout.visualPrompt || layout.name, 'Level', false, layout)}
                        className="flex-1 py-1 px-2 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
                        title="Forge matching 3D Greybox Level Mesh with Three.js preview and multi-engine export"
                      >
                        <BoxSelect className="w-3 h-3" />
                        <span>Forge 3D Level</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePrompt(layout.visualPrompt || layout.description);
                          setActiveCategory('Environment');
                        }}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors border border-slate-700"
                        title="Copy prompt for 2D Concept Art"
                      >
                        Prompt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-bold block">Prompt</label>
              {activePrompt && (
                <button 
                  onClick={() => setActivePrompt('')}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea 
              value={activePrompt}
              onChange={(e) => setActivePrompt(e.target.value)}
              placeholder={`Describe your vision for ${plan.title} (${activeCategory})...`}
              className="w-full h-24 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Multi-Generation Actions: 2D Art & 3D Models */}
          <div className="space-y-2">
            <button
              id="vision-generate-art-button"
              onClick={handleGenerate2D}
              disabled={isGenerating || !activePrompt.trim()}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                isGenerating || !activePrompt.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Rendering 2D Concept...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate 2D {activeCategory} Art</span>
                </>
              )}
            </button>

            {/* AI 3D Spec Model Generator */}
            <button
              id="vision-generate-3d-ai-button"
              onClick={() => handleForge3D(undefined, undefined, false)}
              disabled={isForging3D}
              className="w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-950/30 active:scale-[0.99] disabled:opacity-60"
            >
              {isForging3D ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                  <span className="truncate">{forgeStatusText}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-cyan-200" />
                  <span>Forge 3D Asset (Astra + PBR + Rig)</span>
                </>
              )}
            </button>

            {/* Upload 2D Art to Reconstruct 3D with Astra Vision */}
            <label
              className={`w-full py-2 px-3 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer bg-slate-900/90 hover:bg-slate-800 text-purple-300 hover:text-purple-100 border border-purple-800/50 hover:border-purple-500/70 active:scale-[0.99] ${
                isForging3D ? 'opacity-50 pointer-events-none' : ''
              }`}
              title="Upload any 2D concept art image and reconstruct it into realistic 3D with GPT-6 Astra Vision, PBR materials, and Mesh2Motion rigging"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Upload 2D Art → Reconstruct 3D</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload2DArt}
                className="hidden"
                disabled={isForging3D}
              />
            </label>

            {/* Fast Procedural 3D Generator */}
            <button
              id="vision-generate-3d-procedural-button"
              onClick={() => handleForge3D(undefined, undefined, true)}
              disabled={isForging3D}
              className="w-full py-2 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-2 transition-all bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-cyan-100 border border-cyan-800/50 hover:border-cyan-500/70 active:scale-[0.99] disabled:opacity-50"
              title="Instant Three.js procedural generation based on prompt keywords"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Procedural 3D Forge</span>
            </button>
          </div>
        </div>

        {/* Category AI Suggestions Section */}
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ActiveIcon className="w-3.5 h-3.5 text-purple-400" />
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {activeCategory} AI Suggestions
              </h4>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${currentConfig.badgeClass}`}>
                {categorySuggestions.length}
              </span>
            </div>

            <button
              id="vision-refresh-category-btn"
              onClick={() => handleFetchCategoryPrompts(activeCategory)}
              disabled={isFetchingCategory}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-purple-300 px-2 py-1 rounded-md hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition-all disabled:opacity-50"
              title={`Ask AI to generate fresh ${activeCategory} prompts`}
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingCategory ? 'animate-spin text-purple-400' : ''}`} />
              <span>{isFetchingCategory ? 'Generating...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Suggestions List */}
          {isFetchingCategory && categorySuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center space-y-2.5">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              <div className="text-xs font-semibold text-slate-300">
                Crafting {activeCategory} Prompts
              </div>
              <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                Analyzing {plan.title} aesthetic for {activeCategory.toLowerCase()} concepts...
              </p>
            </div>
          ) : categorySuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3">
              <p className="text-xs text-slate-400">
                No {activeCategory} suggestions found yet.
              </p>
              <button
                id="vision-fetch-category-empty-btn"
                onClick={() => handleFetchCategoryPrompts(activeCategory)}
                disabled={isFetchingCategory}
                className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate {activeCategory} Prompts
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {categorySuggestions.map((p, i) => {
                const isSelectedPrompt = activePrompt === p.prompt;
                return (
                  <div 
                    key={i}
                    onClick={() => handleUseSuggestion(p)}
                    className={`group cursor-pointer rounded-xl p-3 border transition-all relative ${
                      isSelectedPrompt
                        ? 'bg-purple-950/30 border-purple-500/80 shadow-md shadow-purple-950/40'
                        : `bg-slate-950/60 border-slate-800/80 ${currentConfig.accentBorder}`
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${currentConfig.badgeClass}`}>
                          {p.category}
                        </span>
                        {isSelectedPrompt && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyPrompt(e, p.prompt, i)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                          title="Copy prompt"
                        >
                          {copiedIndex === i ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <ArrowRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5 ${
                          isSelectedPrompt ? 'text-purple-400' : ''
                        }`} />
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-200 group-hover:text-white mb-1 transition-colors">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                      {p.prompt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Studio View Area: 2D Concept Art OR 3D Asset Studio */}
      <div className="flex-1 bg-[#0b0f19] p-6 lg:p-8 overflow-y-auto flex flex-col min-h-0">
        <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col">
          {/* Studio Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {studioMode === '2d' ? 'Concept Art Studio' : '3D Game Asset Forge'}
                </h2>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    id="vision-tab-2d"
                    onClick={() => setStudioMode('2d')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      studioMode === '2d'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    2D Art ({images.length})
                  </button>

                  <button
                    id="vision-tab-3d"
                    onClick={() => {
                      if (generated3DAssets.length === 0) {
                        handleForge3D();
                      } else {
                        setStudioMode('3d');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      studioMode === '3d'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BoxSelect className="w-3.5 h-3.5" />
                    3D Assets ({generated3DAssets.length})
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm">
                Generating world biomes, character models, props, and UI for <span className="text-slate-200 font-semibold">{plan.title}</span>
              </p>
            </div>

            {/* In 2D Mode: Category Filter */}
            {studioMode === '2d' ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </span>
                {(['All', 'Environment', 'Character', 'Prop', 'UI'] as const).map((tab) => {
                  const isSelected = galleryFilter === tab;
                  const count = tab === 'All' 
                    ? images.length 
                    : images.filter(img => (img.category || '').toLowerCase() === tab.toLowerCase()).length;

                  return (
                    <button
                      key={tab}
                      id={`gallery-filter-${tab.toLowerCase()}`}
                      onClick={() => setGalleryFilter(tab)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500/80 text-purple-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>{tab}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-purple-900/60 text-purple-200' : 'bg-black/40 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* In 3D Mode: Multi-Engine Export Menu */
              <div className="relative">
                <button
                  id="vision-export-3d-dropdown"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95"
                >
                  <Package className="w-4 h-4" />
                  <span>Export 3D Model Assets</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl z-50 p-2 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                      Engine Export Formats
                    </div>
                    
                    <button
                      onClick={handleExportGLB}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-mono font-bold">GLB</span>
                        Universal Binary glTF
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">UE5 / Godot / Unity</span>
                    </button>

                    <button
                      onClick={handleExportOBJ}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-mono font-bold">OBJ</span>
                        Wavefront Mesh (.OBJ)
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Blender / Max</span>
                    </button>

                    <button
                      onClick={handleExportUE5}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[10px] font-mono font-bold">UE5</span>
                        Unreal Engine 5 Package
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.T3D + .GLB</span>
                    </button>

                    <button
                      onClick={handleExportMesh2MotionUE5}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono font-bold">M2M</span>
                        UE5 Mesh2Motion Rig
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">IK Retargeter + .GLB</span>
                    </button>

                    <button
                      onClick={handleExportGodot}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 text-[10px] font-mono font-bold">GD4</span>
                        Godot 4 Node3D Scene
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.TSCN + .GLB</span>
                    </button>

                    <button
                      onClick={handleExportUnity}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono font-bold">UNT</span>
                        Unity 3D Prefab
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.Prefab + .GLB</span>
                    </button>

                    <button
                      onClick={handleExportThreeJSON}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px] font-mono font-bold">JS</span>
                        Three.js Scene JSON
                      </span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">.JSON WebGL</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- 2D CONCEPT ART MODE ---------------- */}
          {studioMode === '2d' && (
            <>
              {/* Empty Gallery State */}
              {images.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 text-center px-4">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-700/60">
                    <ImageIcon className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-300 mb-1">Your concept canvas is empty</h3>
                  <p className="text-slate-500 max-w-md text-xs leading-relaxed mb-4">
                    Select a category on the left, pick an AI suggestion or write a custom prompt, and generate 2D art or 3D models for your game.
                  </p>
                  <button
                    onClick={() => {
                      if (categorySuggestions.length > 0) {
                        handleUseSuggestion(categorySuggestions[0]);
                      }
                    }}
                    className="text-xs px-4 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white font-medium flex items-center gap-2 transition-all shadow-md shadow-purple-950/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Try First AI Suggestion
                  </button>
                </div>
              )}

              {/* Filtered Empty State */}
              {images.length > 0 && filteredGalleryImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 text-center px-4">
                  <p className="text-slate-400 text-xs mb-2">
                    No concepts generated yet in the <span className="font-semibold text-white">{galleryFilter}</span> category.
                  </p>
                  <button
                    onClick={() => {
                      setActiveCategory(galleryFilter as VisionCategory);
                      setGalleryFilter('All');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
                  >
                    Switch Art Director to {galleryFilter} or view All
                  </button>
                </div>
              )}

              {/* Image Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredGalleryImages.map((img) => {
                  const catConfig = CATEGORY_CONFIG[img.category as VisionCategory] || CATEGORY_CONFIG.Environment;
                  return (
                    <div 
                      key={img.id} 
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-2xl hover:border-slate-600 transition-all cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img 
                        src={img.base64} 
                        alt={img.prompt} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border backdrop-blur-md ${catConfig.badgeClass}`}>
                            {img.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForge3D(img.prompt, img.category as VisionCategory, false, undefined, img.base64);
                              }}
                              className="px-2.5 py-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all shadow-md active:scale-95"
                              title="Reconstruct realistic 3D Model with GPT-6 Astra Vision, PBR Materials & Mesh2Motion Rigging"
                            >
                              <Wand2 className="w-3 h-3 text-cyan-200" /> Astra 3D
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(img);
                              }}
                              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
                              title="Enlarge"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {img.prompt}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ---------------- 3D ASSET STUDIO MODE ---------------- */}
          {studioMode === '3d' && (
            <div className="flex-1 flex flex-col gap-4 min-h-[500px]">
              {/* 3D Viewport Box */}
              <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative flex flex-col min-h-[420px]">
                {active3DAsset ? (
                  <>
                    <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2 max-w-[85%] shadow-lg">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        (CATEGORY_CONFIG[active3DAsset.category as VisionCategory] || CATEGORY_CONFIG.Environment).badgeClass
                      }`}>
                        {active3DAsset.category}
                      </span>
                      <span className="font-bold text-white shrink-0">{active3DAsset.name}</span>
                      {active3DAsset.archetype && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 truncate hidden sm:inline">
                          {active3DAsset.archetype}
                        </span>
                      )}
                      {active3DAsset.isRigged && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 shrink-0">
                          <Activity className="w-3 h-3 text-emerald-400" />
                          Mesh2Motion {active3DAsset.rigType ? `${active3DAsset.rigType.toUpperCase()} Rig` : 'Rigged'}
                        </span>
                      )}
                      {active3DAsset.source2DImage && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-200 text-[10px] font-bold shrink-0">
                          <img 
                            src={active3DAsset.source2DImage} 
                            alt="Source 2D Art" 
                            className="w-4 h-4 rounded object-cover border border-purple-400/50" 
                          />
                          <span className="hidden md:inline">2D Astra Reconstructed</span>
                        </div>
                      )}
                      {(active3DAsset.category === 'Level' || active3DAsset.archetype?.includes('World Map') || active3DAsset.category === 'Environment') && (
                        <div className="flex items-center gap-1.5 ml-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Cartographer Synced
                          </span>
                          {onNavigateToWorld && (
                            <button
                              type="button"
                              onClick={onNavigateToWorld}
                              className="text-[10px] text-cyan-300 hover:text-cyan-100 hover:underline flex items-center gap-0.5 ml-1"
                              title="Open in World Cartographer"
                            >
                              <span>World Tab</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <span className="truncate max-w-[200px] text-slate-400 text-[11px] hidden lg:inline">{active3DAsset.prompt}</span>
                    </div>

                    {/* Top right quick actions for 3D environment */}
                    {onAddLevelLayout && (active3DAsset.category === 'Environment' || active3DAsset.category === 'Level') && (
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          type="button"
                          onClick={() => handleSave3DEnvironmentToWorld(active3DAsset)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 border border-emerald-500/40 shadow-lg backdrop-blur-md transition-all active:scale-95"
                          title="Register this 3D Environment as an active playable level layout in the World Cartographer"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Sync to World Cartographer</span>
                        </button>
                      </div>
                    )}

                    <ThreeViewport 
                      modelGroup={active3DAsset.scene} 
                      className="flex-1 w-full h-full" 
                      onReRig={(newGroup, rigType) => {
                        setGenerated3DAssets(prev => prev.map(a => {
                          if (a.id === active3DAsset.id) {
                            return { ...a, scene: newGroup, rigType };
                          }
                          return a;
                        }));
                        notifyExport(`Applied ${rigType.toUpperCase()} Rig & Skeleton Hierarchy!`);
                      }}
                    />
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <BoxSelect className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Click "Generate 3D Model" on the left to forge your first 3D asset</p>
                  </div>
                )}
              </div>

              {/* 3D Asset Library Strip */}
              {generated3DAssets.length > 0 && (
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Generated 3D Assets ({generated3DAssets.length})</span>
                    <span>Click to inspect & export</span>
                  </div>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {generated3DAssets.map((asset) => {
                      const isSelected = active3DAsset?.id === asset.id;
                      const isWorldLinked = asset.category === 'Level' || asset.archetype?.includes('World Map') || asset.category === 'Environment';
                      return (
                        <div
                          key={asset.id}
                          className={`flex items-center gap-1.5 p-1 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                              : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActive3DAssetId(asset.id)}
                            className="flex items-center gap-2 px-2 py-1 text-left"
                          >
                            <BoxSelect className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold truncate max-w-[120px]">{asset.name}</span>
                                {isWorldLinked && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                    World
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate max-w-[120px]">{asset.prompt}</div>
                            </div>
                          </button>
                          {onAddLevelLayout && isWorldLinked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave3DEnvironmentToWorld(asset);
                              }}
                              title="Register as playable World Map in Cartographer"
                              className="p-1 rounded hover:bg-emerald-800/50 text-slate-400 hover:text-emerald-300 transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-5xl w-full flex flex-col items-center justify-center gap-6">
            <img 
              src={selectedImage.base64} 
              alt={selectedImage.prompt} 
              className="max-h-[70vh] w-auto rounded-xl shadow-2xl border border-white/10 object-contain"
            />
            <div className="text-center max-w-2xl">
              <span className={`inline-block text-xs font-bold border px-3 py-1 rounded-full mb-3 ${
                (CATEGORY_CONFIG[selectedImage.category as VisionCategory] || CATEGORY_CONFIG.Environment).badgeClass
              }`}>
                {selectedImage.category}
              </span>
              <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
                {selectedImage.prompt}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setActivePrompt(selectedImage.prompt);
                    if (['Environment', 'Character', 'Prop', 'UI'].includes(selectedImage.category)) {
                      setActiveCategory(selectedImage.category as VisionCategory);
                    }
                    setSelectedImage(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-full border border-slate-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Use Prompt in Studio
                </button>

                <button
                  onClick={() => {
                    const prompt = selectedImage.prompt;
                    const cat = selectedImage.category as VisionCategory;
                    const b64 = selectedImage.base64;
                    setSelectedImage(null);
                    handleForge3D(prompt, cat, false, undefined, b64);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-full shadow-lg transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5 text-cyan-200" /> Reconstruct Realistic 3D (Astra + PBR + Rig)
                </button>

                <a 
                  href={selectedImage.base64} 
                  download={`concept-${(selectedImage.category || 'art').toLowerCase()}-${selectedImage.timestamp || Date.now()}.png`}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-slate-200 transition-colors shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" /> Download 2D PNG
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionBoard;
