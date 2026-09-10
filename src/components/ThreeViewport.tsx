import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  Eye, 
  Sun, 
  Moon, 
  Compass, 
  Play, 
  Pause, 
  Activity, 
  Sparkles, 
  Film,
  Zap,
  Layers,
  Flame,
  Maximize2,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  Check
} from 'lucide-react';
import { SkeletonHierarchyModal } from './SkeletonHierarchyModal';
import { RigType } from '../services/mesh2motion';
import { 
  CinematicPostProcessingStack, 
  PostProcessingConfig, 
  POST_PROCESSING_PRESETS 
} from '../services/cinematicPostProcessing';

export type AnimationLoopMode = 'repeat' | 'pingpong' | 'once';

export interface ThreeViewportProps {
  modelGroup: THREE.Group | null;
  className?: string;
  selectedClipName?: string;
  playbackSpeed?: number;
  loopMode?: AnimationLoopMode;
  showSkeleton?: boolean;
  autoRotate?: boolean;
  lightingPreset?: 'cyberpunk' | 'daylight' | 'studio';
  isPlaying?: boolean;
  cameraPreset?: 'front' | 'perspective' | 'side' | 'closeUp' | 'top';
  hideBottomBar?: boolean;
  onClipsDetected?: (clips: string[]) => void;
  onActiveClipChange?: (clipName: string) => void;
  onRigDetected?: (info: { isRigged: boolean; rigType: string }) => void;
  onReRig?: (newGroup: THREE.Group, rigType: RigType) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export type ShaderMode = 'pbr' | 'clay' | 'normals';

export const ThreeViewport: React.FC<ThreeViewportProps> = ({ 
  modelGroup, 
  className = '',
  selectedClipName,
  playbackSpeed = 1.0,
  loopMode = 'repeat',
  showSkeleton: externalShowSkeleton,
  autoRotate: externalAutoRotate,
  lightingPreset: externalLightingPreset,
  isPlaying: externalIsPlaying,
  cameraPreset,
  hideBottomBar = false,
  onClipsDetected,
  onActiveClipChange,
  onRigDetected,
  onReRig,
  onTimeUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Group | null>(null);
  const postStackRef = useRef<CinematicPostProcessingStack | null>(null);

  // Animation and Rigging refs
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Material memory map for non-destructive shader mode switching
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  const [isWireframe, setIsWireframe] = useState(false);
  const [shaderMode, setShaderMode] = useState<ShaderMode>('pbr');
  const [showDensityHeatmap, setShowDensityHeatmap] = useState(false);
  const [isRigModalOpen, setIsRigModalOpen] = useState(false);
  const [isPostFxPanelOpen, setIsPostFxPanelOpen] = useState(false);

  // GPU Post-Processing Stack State
  const [postFxConfig, setPostFxConfig] = useState<PostProcessingConfig>({
    enabled: true,
    preset: 'ue5_lumen',
    bloomEnabled: true,
    bloomStrength: 0.95,
    bloomRadius: 0.5,
    bloomThreshold: 0.85,
    dofEnabled: true,
    dofFocus: 4.2,
    dofAperture: 0.012,
    dofMaxBlur: 0.015,
    vignetteStrength: 0.35,
    chromaticAberration: 0.0018,
    saturation: 1.15,
    contrast: 1.1,
    exposure: 1.05,
    fxaaEnabled: true,
  });

  const [internalAutoRotate, setInternalAutoRotate] = useState(true);
  const [internalLightingPreset, setInternalLightingPreset] = useState<'studio' | 'cyberpunk' | 'daylight'>('cyberpunk');
  const [internalShowSkeleton, setInternalShowSkeleton] = useState(false);
  const [availableClips, setAvailableClips] = useState<string[]>([]);
  const [activeClipName, setActiveClipName] = useState<string>('');
  const [internalIsPlayingAnim, setInternalIsPlayingAnim] = useState(true);
  const [isRiggedModel, setIsRiggedModel] = useState(false);
  const [rigTypeName, setRigTypeName] = useState<string>('Rigged');

  const autoRotate = externalAutoRotate !== undefined ? externalAutoRotate : internalAutoRotate;
  const lightingPreset = externalLightingPreset !== undefined ? externalLightingPreset : internalLightingPreset;
  const showSkeleton = externalShowSkeleton !== undefined ? externalShowSkeleton : internalShowSkeleton;
  const isPlayingAnim = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlayingAnim;

  // Key lights refs to adjust color dynamically
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Polygon density metrics
  const densityStats = useMemo(() => {
    if (!modelGroup) return { totalTris: 0, totalVerts: 0, meshCount: 0, avgTrisPerMesh: 0 };
    let totalTris = 0;
    let totalVerts = 0;
    let meshCount = 0;

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        meshCount++;
        const geo = child.geometry;
        if (geo.attributes.position) {
          totalVerts += geo.attributes.position.count;
        }
        if (geo.index) {
          totalTris += geo.index.count / 3;
        } else if (geo.attributes.position) {
          totalTris += geo.attributes.position.count / 3;
        }
      }
    });

    return {
      totalTris: Math.round(totalTris),
      totalVerts,
      meshCount,
      avgTrisPerMesh: meshCount > 0 ? Math.round(totalTris / meshCount) : 0,
    };
  }, [modelGroup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / (container.clientHeight || 1),
      0.1,
      100
    );
    camera.position.set(3.5, 3.0, 4.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 20;
    controls.minDistance = 1;
    controls.target.set(0, 0.8, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // GPU Post-Processing Stack (Lumen Bloom, Bokeh Depth-of-Field, UE5 Cinematic Grading)
    try {
      const postStack = new CinematicPostProcessingStack(
        renderer,
        scene,
        camera,
        container.clientWidth,
        container.clientHeight,
        postFxConfig
      );
      postStackRef.current = postStack;
    } catch (e) {
      console.warn('Failed to initialize post processing stack', e);
    }

    // Lighting (Cinematic Unreal Engine PBR setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(0xffaa00, 1.5);
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Grid Floor
    const grid = new THREE.GridHelper(12, 24, 0x00f0ff, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (postStackRef.current) {
        postStackRef.current.resize(width, height);
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      
      // Update Mesh2Motion Animation Mixer
      if (mixerRef.current && isPlayingAnim) {
        mixerRef.current.update(delta);

        if (currentActionRef.current && onTimeUpdate) {
          const clip = currentActionRef.current.getClip();
          const actionTime = currentActionRef.current.time % clip.duration;
          onTimeUpdate(actionTime, clip.duration);
        }
      }

      controls.update();

      // Render with GPU Post-Processing Stack if active
      if (postStackRef.current && postStackRef.current.isEnabled()) {
        postStackRef.current.render(delta);
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (postStackRef.current) {
        postStackRef.current.dispose();
        postStackRef.current = null;
      }
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Post-Processing configuration dynamically
  const handleUpdatePostFx = (newConfig: Partial<PostProcessingConfig>) => {
    setPostFxConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (postStackRef.current) {
        postStackRef.current.updateConfig(updated);
      }
      return updated;
    });
  };

  const handleApplyPreset = (presetName: string) => {
    const preset = POST_PROCESSING_PRESETS[presetName];
    if (preset) {
      setPostFxConfig((prev) => {
        const updated = { ...prev, ...preset, preset: presetName as any };
        if (postStackRef.current) {
          postStackRef.current.updateConfig(updated);
        }
        return updated;
      });
    }
  };

  // Update Model in Scene & Setup Mesh2Motion Animations
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Cleanup previous model and helpers
    if (skeletonHelperRef.current) {
      scene.remove(skeletonHelperRef.current);
      skeletonHelperRef.current.dispose();
      skeletonHelperRef.current = null;
    }
    if (currentModelRef.current) {
      scene.remove(currentModelRef.current);
      currentModelRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    originalMaterialsRef.current.clear();

    if (modelGroup) {
      currentModelRef.current = modelGroup;
      scene.add(modelGroup);

      // Cache original PBR materials for non-destructive toggling
      modelGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          originalMaterialsRef.current.set(child, child.material);
        }
      });

      // Inspect for Mesh2Motion rigging and animations
      const animations: THREE.AnimationClip[] = (modelGroup as any).animations || [];
      const mesh2motionMeta = (modelGroup as any).__mesh2motion;

      if (animations.length > 0) {
        setIsRiggedModel(true);
        const rigType = mesh2motionMeta?.rigType ? `${mesh2motionMeta.rigType.toUpperCase()} RIG` : 'SKELETAL RIG';
        setRigTypeName(rigType);
        const clipNames = animations.map((c) => c.name);
        setAvailableClips(clipNames);
        if (onClipsDetected) onClipsDetected(clipNames);
        if (onRigDetected) onRigDetected({ isRigged: true, rigType: mesh2motionMeta?.rigType || 'humanoid' });

        // Setup AnimationMixer
        const mixer = new THREE.AnimationMixer(modelGroup);
        mixer.timeScale = playbackSpeed;
        mixerRef.current = mixer;

        // Play target clip or first clip (preferably Idle or first)
        const initialClip = (selectedClipName ? animations.find((c) => c.name === selectedClipName) : null) || 
                            animations.find((c) => c.name.toLowerCase().includes('idle')) || 
                            animations[0];
        if (initialClip) {
          const action = mixer.clipAction(initialClip);
          
          // Apply loop mode
          if (loopMode === 'pingpong') {
            action.setLoop(THREE.LoopPingPong, Infinity);
          } else if (loopMode === 'once') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
          }

          action.play();
          currentActionRef.current = action;
          setActiveClipName(initialClip.name);
          if (onActiveClipChange) onActiveClipChange(initialClip.name);
        }
      } else {
        setIsRiggedModel(false);
        setAvailableClips([]);
        setActiveClipName('');
        if (onClipsDetected) onClipsDetected([]);
        if (onRigDetected) onRigDetected({ isRigged: false, rigType: 'none' });
      }

      // Check if SkinnedMesh exists to attach SkeletonHelper
      let hasBones = false;
      modelGroup.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          hasBones = true;
        }
      });

      if (hasBones) {
        const helper = new THREE.SkeletonHelper(modelGroup);
        helper.visible = showSkeleton;
        (helper.material as THREE.LineBasicMaterial).linewidth = 2;
        (helper.material as THREE.LineBasicMaterial).color = new THREE.Color(0x00f0ff);
        scene.add(helper);
        skeletonHelperRef.current = helper;
      }

      // Fit camera to object bounds nicely
      const box = new THREE.Box3().setFromObject(modelGroup);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
      }
      if (cameraRef.current) {
        cameraRef.current.position.set(center.x + size * 0.9, center.y + size * 0.7, center.z + size * 1.1);
        cameraRef.current.lookAt(center);
      }
    }
  }, [modelGroup]);

  // Apply Shading Mode & Wireframe / Polygon Density Heatmap
  useEffect(() => {
    if (!currentModelRef.current) return;

    currentModelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const origMat = originalMaterialsRef.current.get(child);

        // Case 1: Wireframe Polygon Density Heatmap Mode Active
        if (showDensityHeatmap) {
          let triCount = 0;
          if (child.geometry.index) {
            triCount = child.geometry.index.count / 3;
          } else if (child.geometry.attributes.position) {
            triCount = child.geometry.attributes.position.count / 3;
          }

          // Gradient: Green (Low-poly < 250) -> Yellow (250 - 900) -> Orange (900 - 2000) -> Red (> 2000)
          let heatColor = 0x22c55e; // Green
          if (triCount > 2000) {
            heatColor = 0xef4444; // Red
          } else if (triCount > 900) {
            heatColor = 0xf97316; // Orange
          } else if (triCount > 250) {
            heatColor = 0xeab308; // Yellow
          }

          child.material = new THREE.MeshStandardMaterial({
            color: heatColor,
            roughness: 0.35,
            metalness: 0.1,
            wireframe: true,
            emissive: heatColor,
            emissiveIntensity: 0.25,
          });
          return;
        }

        // Case 2: Surface Normals Mode
        if (shaderMode === 'normals') {
          child.material = new THREE.MeshNormalMaterial({
            wireframe: isWireframe,
          });
          return;
        }

        // Case 3: Studio Clay Mode
        if (shaderMode === 'clay') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc,
            roughness: 0.85,
            metalness: 0.05,
            wireframe: isWireframe,
          });
          return;
        }

        // Case 4: Default PBR Shading Mode
        if (origMat) {
          child.material = origMat;
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => (m.wireframe = isWireframe));
          } else {
            child.material.wireframe = isWireframe;
          }
        }
      }
    });
  }, [shaderMode, showDensityHeatmap, isWireframe]);

  // Switch Animation Clip
  const switchAnimation = (clipName: string) => {
    if (!mixerRef.current || !currentModelRef.current) return;
    const animations: THREE.AnimationClip[] = (currentModelRef.current as any).animations || [];
    const targetClip = animations.find((c) => c.name === clipName);
    if (!targetClip) return;

    const newAction = mixerRef.current.clipAction(targetClip);
    
    // Apply loop mode
    if (loopMode === 'pingpong') {
      newAction.setLoop(THREE.LoopPingPong, Infinity);
    } else if (loopMode === 'once') {
      newAction.setLoop(THREE.LoopOnce, 1);
      newAction.clampWhenFinished = true;
    } else {
      newAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    if (currentActionRef.current && currentActionRef.current !== newAction) {
      currentActionRef.current.fadeOut(0.2);
    }
    newAction.reset().fadeIn(0.2).play();
    currentActionRef.current = newAction;
    setActiveClipName(clipName);
    setInternalIsPlayingAnim(true);
    if (onActiveClipChange) onActiveClipChange(clipName);
  };

  // Sync external selectedClipName
  useEffect(() => {
    if (selectedClipName && selectedClipName !== activeClipName) {
      switchAnimation(selectedClipName);
    }
  }, [selectedClipName]);

  // Sync loop mode to active action
  useEffect(() => {
    if (currentActionRef.current) {
      if (loopMode === 'pingpong') {
        currentActionRef.current.setLoop(THREE.LoopPingPong, Infinity);
      } else if (loopMode === 'once') {
        currentActionRef.current.setLoop(THREE.LoopOnce, 1);
        currentActionRef.current.clampWhenFinished = true;
      } else {
        currentActionRef.current.setLoop(THREE.LoopRepeat, Infinity);
      }
    }
  }, [loopMode]);

  // Sync playback speed
  useEffect(() => {
    if (mixerRef.current) {
      mixerRef.current.timeScale = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync camera presets
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !currentModelRef.current || !cameraPreset) return;
    const box = new THREE.Box3().setFromObject(currentModelRef.current);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    controlsRef.current.target.copy(center);

    if (cameraPreset === 'front') {
      cameraRef.current.position.set(center.x, center.y + size * 0.1, center.z + size * 1.3);
    } else if (cameraPreset === 'side') {
      cameraRef.current.position.set(center.x + size * 1.3, center.y + size * 0.1, center.z);
    } else if (cameraPreset === 'closeUp') {
      cameraRef.current.position.set(center.x, center.y + size * 0.45, center.z + size * 0.65);
    } else if (cameraPreset === 'top') {
      cameraRef.current.position.set(center.x, center.y + size * 1.5, center.z + 0.1);
    } else {
      // perspective
      cameraRef.current.position.set(center.x + size * 0.9, center.y + size * 0.7, center.z + size * 1.1);
    }
    cameraRef.current.lookAt(center);
    controlsRef.current.update();
  }, [cameraPreset]);

  // Toggle Skeleton Helper
  useEffect(() => {
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = showSkeleton;
    }
  }, [showSkeleton]);

  // Update Auto-rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Update Lighting Preset
  useEffect(() => {
    if (!keyLightRef.current || !fillLightRef.current || !rimLightRef.current || !sceneRef.current) return;

    if (lightingPreset === 'cyberpunk') {
      sceneRef.current.background = new THREE.Color(0x080c14);
      keyLightRef.current.color.setHex(0x00f0ff);
      keyLightRef.current.intensity = 1.8;
      fillLightRef.current.color.setHex(0xa855f7);
      fillLightRef.current.intensity = 1.2;
      rimLightRef.current.color.setHex(0xffaa00);
      rimLightRef.current.intensity = 1.5;
    } else if (lightingPreset === 'daylight') {
      sceneRef.current.background = new THREE.Color(0x1a2332);
      keyLightRef.current.color.setHex(0xfff7ed);
      keyLightRef.current.intensity = 2.2;
      fillLightRef.current.color.setHex(0x93c5fd);
      fillLightRef.current.intensity = 1.0;
      rimLightRef.current.color.setHex(0xfef08a);
      rimLightRef.current.intensity = 1.2;
    } else {
      // Studio
      sceneRef.current.background = new THREE.Color(0x111827);
      keyLightRef.current.color.setHex(0xffffff);
      keyLightRef.current.intensity = 1.6;
      fillLightRef.current.color.setHex(0xe2e8f0);
      fillLightRef.current.intensity = 1.0;
      rimLightRef.current.color.setHex(0xffffff);
      rimLightRef.current.intensity = 1.2;
    }
  }, [lightingPreset]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (currentModelRef.current) {
      const box = new THREE.Box3().setFromObject(currentModelRef.current);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(center.x + size * 0.9, center.y + size * 0.7, center.z + size * 1.1);
    } else {
      cameraRef.current.position.set(3.5, 3.0, 4.5);
      controlsRef.current.target.set(0, 0.8, 0);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[320px] overflow-hidden select-none ${className}`}>
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left: Mesh2Motion & PBR Status Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        {/* PBR Mode Toggle Badge / Pill */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30 text-[10px] font-mono shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-semibold">Shader:</span>
          <div className="flex items-center gap-1">
            {(['pbr', 'clay', 'normals'] as ShaderMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setShowDensityHeatmap(false);
                  setShaderMode(mode);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                  shaderMode === mode && !showDensityHeatmap
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Rigging Status & Quick-Rig Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRigModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/40 text-[10px] font-mono text-emerald-400 shadow-lg transition-all hover:scale-105 active:scale-95"
            title="Open Mesh2Motion Quick-Rigging & Skeleton Inspector"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold">Quick Rig: {rigTypeName}</span>
          </button>
        </div>
      </div>

      {/* Top Right: Viewport Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl z-10">
        
        {/* GPU Post-Processing Stack Drawer Button */}
        <button
          onClick={() => setIsPostFxPanelOpen(!isPostFxPanelOpen)}
          className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
            postFxConfig.enabled
              ? 'bg-gradient-to-r from-purple-600/60 to-pink-600/60 text-pink-200 border border-pink-500/50 shadow-lg shadow-pink-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle GPU Post-Processing Stack (Unreal Bloom & Bokeh Depth of Field)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[10px] font-mono font-bold hidden sm:inline">Post-FX</span>
        </button>

        {/* PBR Shader Toggle Button */}
        <button
          onClick={() => {
            const modes: ShaderMode[] = ['pbr', 'clay', 'normals'];
            const nextIdx = (modes.indexOf(shaderMode) + 1) % modes.length;
            setShowDensityHeatmap(false);
            setShaderMode(modes[nextIdx]);
          }}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            shaderMode === 'pbr' && !showDensityHeatmap
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={`Shader Mode: ${shaderMode.toUpperCase()} (Click to cycle PBR / Clay / Normals)`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* Wireframe Heatmap (Green to Red Polygon Density) */}
        <button
          onClick={() => setShowDensityHeatmap(!showDensityHeatmap)}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            showDensityHeatmap
              ? 'bg-gradient-to-r from-emerald-500 to-rose-500 text-white font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Wireframe Heatmap (Green to Red Polygon Density)"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Standard Wireframe */}
        <button
          onClick={() => {
            setShowDensityHeatmap(false);
            setIsWireframe(!isWireframe);
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            isWireframe && !showDensityHeatmap ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Wireframe Mesh"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* 360 Auto-Rotate */}
        <button
          onClick={() => setInternalAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            autoRotate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle 360° Auto-Rotation"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Skeleton Helper */}
        {isRiggedModel && (
          <button
            onClick={() => setInternalShowSkeleton(!showSkeleton)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showSkeleton ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Skeleton / Bone Display (Mesh2Motion)"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Lighting Preset Cycle */}
        <button
          onClick={() => {
            const presets: ('cyberpunk' | 'daylight' | 'studio')[] = ['cyberpunk', 'daylight', 'studio'];
            const nextIdx = (presets.indexOf(lightingPreset) + 1) % presets.length;
            setInternalLightingPreset(presets[nextIdx]);
          }}
          className="p-1.5 rounded-lg text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
          title={`Lighting: ${lightingPreset.toUpperCase()} (Click to cycle)`}
        >
          {lightingPreset === 'cyberpunk' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Reset Camera */}
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset Camera View"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* GPU Post-Processing Stack Control Popover */}
      {isPostFxPanelOpen && (
        <div className="absolute top-16 right-3 w-80 bg-slate-950/95 backdrop-blur-xl p-4 rounded-2xl border border-pink-500/30 shadow-[0_0_40px_rgba(236,72,153,0.15)] z-20 animate-fadeIn text-xs font-mono space-y-3.5 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-400" />
              <span className="font-bold text-white tracking-wide">UE5 Post-Process Stack</span>
            </div>
            <button
              onClick={() => handleUpdatePostFx({ enabled: !postFxConfig.enabled })}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                postFxConfig.enabled
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {postFxConfig.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cinematic Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'ue5_lumen', label: 'UE5 Lumen' },
                { id: 'cyberpunk_neon', label: 'Cyber Neon' },
                { id: 'studio_clean', label: 'Studio Clean' },
                { id: 'cinematic_film', label: 'Film Grain' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                    postFxConfig.preset === p.id
                      ? 'bg-pink-950/80 border-pink-500/50 text-pink-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unreal Bloom Controls */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Unreal Bloom
              </span>
              <input
                type="checkbox"
                checked={postFxConfig.bloomEnabled}
                onChange={(e) => handleUpdatePostFx({ bloomEnabled: e.target.checked })}
                className="rounded accent-pink-500"
              />
            </div>
            
            {postFxConfig.bloomEnabled && (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Strength: {postFxConfig.bloomStrength.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={postFxConfig.bloomStrength}
                    onChange={(e) => handleUpdatePostFx({ bloomStrength: parseFloat(e.target.value) })}
                    className="w-28 accent-cyan-400"
                  />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Radius: {postFxConfig.bloomRadius.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.2"
                    step="0.05"
                    value={postFxConfig.bloomRadius}
                    onChange={(e) => handleUpdatePostFx({ bloomRadius: parseFloat(e.target.value) })}
                    className="w-28 accent-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Depth of Field (Bokeh Pass) */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> Depth of Field (Bokeh)
              </span>
              <input
                type="checkbox"
                checked={postFxConfig.dofEnabled}
                onChange={(e) => handleUpdatePostFx({ dofEnabled: e.target.checked })}
                className="rounded accent-indigo-500"
              />
            </div>

            {postFxConfig.dofEnabled && (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Focus Distance: {postFxConfig.dofFocus.toFixed(1)}m</span>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.2"
                    value={postFxConfig.dofFocus}
                    onChange={(e) => handleUpdatePostFx({ dofFocus: parseFloat(e.target.value) })}
                    className="w-28 accent-indigo-400"
                  />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Aperture Blur: {(postFxConfig.dofAperture * 1000).toFixed(1)}</span>
                  <input
                    type="range"
                    min="0.002"
                    max="0.04"
                    step="0.002"
                    value={postFxConfig.dofAperture}
                    onChange={(e) => handleUpdatePostFx({ dofAperture: parseFloat(e.target.value) })}
                    className="w-28 accent-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cinematic Lens & Grading */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <span className="font-bold text-white block">Lens & Color Grading</span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Vignette: {postFxConfig.vignetteStrength.toFixed(2)}</span>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={postFxConfig.vignetteStrength}
                  onChange={(e) => handleUpdatePostFx({ vignetteStrength: parseFloat(e.target.value) })}
                  className="w-28 accent-pink-400"
                />
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Chromatic Aberration: {(postFxConfig.chromaticAberration * 1000).toFixed(1)}</span>
                <input
                  type="range"
                  min="0"
                  max="0.006"
                  step="0.0005"
                  value={postFxConfig.chromaticAberration}
                  onChange={(e) => handleUpdatePostFx({ chromaticAberration: parseFloat(e.target.value) })}
                  className="w-28 accent-pink-400"
                />
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Saturation: {postFxConfig.saturation.toFixed(2)}</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.05"
                  value={postFxConfig.saturation}
                  onChange={(e) => handleUpdatePostFx({ saturation: parseFloat(e.target.value) })}
                  className="w-28 accent-pink-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wireframe Polygon Density Heatmap HUD Overlay */}
      {showDensityHeatmap && (
        <div className="absolute top-16 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-emerald-500/40 shadow-2xl z-10 flex flex-col gap-2 max-w-xs animate-fadeIn text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Poly Density Heatmap</span>
            </div>
            <span className="text-[10px] text-slate-400">UE5 Nanite</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Total Tris</span>
              <span className="text-white font-bold">{densityStats.totalTris.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Total Verts</span>
              <span className="text-cyan-400 font-bold">{densityStats.totalVerts.toLocaleString()}</span>
            </div>
          </div>

          {/* Color Density Legend */}
          <div className="flex flex-col gap-1 text-[10px] pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300">Low Density</span>
              </div>
              <span className="text-slate-400">&lt; 250 tris</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="text-slate-300">Balanced Joints</span>
              </div>
              <span className="text-slate-400">250 - 900</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-slate-300">Medium Detail</span>
              </div>
              <span className="text-slate-400">900 - 2,000</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-slate-300">High-Poly (Optimize)</span>
              </div>
              <span className="text-rose-400 font-semibold">&gt; 2,000</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Animation Clip Selector (when rigged) */}
      {!hideBottomBar && availableClips.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-2xl z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInternalIsPlayingAnim(!isPlayingAnim)}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center"
              title={isPlayingAnim ? 'Pause Animation' : 'Play Animation'}
            >
              {isPlayingAnim ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clips:</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {availableClips.map((clip) => (
              <button
                key={clip}
                onClick={() => switchAnimation(clip)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all whitespace-nowrap ${
                  activeClipName === clip
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5'
                }`}
              >
                {clip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Hint when not rigged */}
      {!hideBottomBar && availableClips.length === 0 && (
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400 bg-slate-900/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/5 pointer-events-none">
          Left-Click: Rotate • Right-Click: Pan • Scroll: Zoom
        </div>
      )}

      {/* Quick-Rigging Skeleton Hierarchy Inspector Modal */}
      {isRigModalOpen && (
        <SkeletonHierarchyModal
          isOpen={isRigModalOpen}
          onClose={() => setIsRigModalOpen(false)}
          modelGroup={currentModelRef.current}
          currentRigType={rigTypeName}
          onPlayTestClip={(clip) => switchAnimation(clip)}
          onReRig={(newGroup, rigType) => {
            if (onReRig) {
              onReRig(newGroup, rigType);
            }
          }}
        />
      )}
    </div>
  );
};
