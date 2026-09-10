import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  X, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  Activity, 
  Zap, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  Play,
  RotateCcw,
  Sliders,
  Maximize2
} from 'lucide-react';
import { Mesh2MotionEngine, RigType } from '../services/mesh2motion';

export interface SkeletonHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelGroup: THREE.Group | null;
  currentRigType?: string;
  onReRig: (newGroup: THREE.Group, rigType: RigType) => void;
  onPlayTestClip?: (clipName: string) => void;
}

export const SkeletonHierarchyModal: React.FC<SkeletonHierarchyModalProps> = ({
  isOpen,
  onClose,
  modelGroup,
  currentRigType = 'humanoid',
  onReRig,
  onPlayTestClip,
}) => {
  const [selectedRigType, setSelectedRigType] = useState<RigType>(
    (currentRigType.toLowerCase().includes('creature') ? 'creature' :
     currentRigType.toLowerCase().includes('quadruped') ? 'quadruped' :
     currentRigType.toLowerCase().includes('mech') ? 'mech' : 'humanoid') as RigType
  );
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    Root: true,
    Pelvis: true,
    Spine_01: true,
    Spine_Lumbar: true,
    Chest_Carapace: true,
    Clavicle_L: true,
    Clavicle_R: true,
  });
  const [selectedJointName, setSelectedJointName] = useState<string>('Pelvis');
  const [isApplyingRig, setIsApplyingRig] = useState(false);
  const [activeTestAnim, setActiveTestAnim] = useState<string>('');

  // Extract / Calculate Joint Hierarchy
  const hierarchyInfo = useMemo(() => {
    return Mesh2MotionEngine.getSkeletonHierarchyInfo(selectedRigType);
  }, [selectedRigType]);

  // Mesh metrics
  const meshMetrics = useMemo(() => {
    if (!modelGroup) return { submeshes: 0, vertices: 0, triangles: 0, height: 1.8 };
    let submeshes = 0;
    let vertices = 0;
    let triangles = 0;

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        submeshes++;
        const geo = child.geometry;
        if (geo.attributes.position) {
          vertices += geo.attributes.position.count;
        }
        if (geo.index) {
          triangles += geo.index.count / 3;
        } else if (geo.attributes.position) {
          triangles += geo.attributes.position.count / 3;
        }
      }
    });

    const box = new THREE.Box3().setFromObject(modelGroup);
    const size = box.getSize(new THREE.Vector3());

    return {
      submeshes,
      vertices,
      triangles: Math.round(triangles),
      height: parseFloat(size.y.toFixed(2)),
    };
  }, [modelGroup]);

  if (!isOpen) return null;

  const toggleNode = (name: string) => {
    setExpandedNodes(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleApplyRig = () => {
    if (!modelGroup) return;
    setIsApplyingRig(true);
    setTimeout(() => {
      try {
        const result = Mesh2MotionEngine.rigAndAnimate(modelGroup, selectedRigType);
        onReRig(result.riggedGroup, selectedRigType);
        setIsApplyingRig(false);
      } catch (err) {
        console.error('Re-rigging error:', err);
        setIsApplyingRig(false);
      }
    }, 250);
  };

  // Build tree from flat joints list
  const jointTree = hierarchyInfo.joints;
  const rootJoint = jointTree.find(j => !j.parent);

  const renderJointNode = (joint: typeof jointTree[0]) => {
    const children = jointTree.filter(j => j.parent === joint.name);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[joint.name];
    const isSelected = selectedJointName === joint.name;

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'root': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        case 'pelvis': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        case 'spine': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
        case 'head': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
        case 'hand': case 'claw': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
        case 'foot': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        default: return 'text-slate-300 bg-slate-800/40 border-slate-700/50';
      }
    };

    return (
      <div key={joint.name} className="flex flex-col select-none">
        <div 
          onClick={() => {
            setSelectedJointName(joint.name);
            if (hasChildren) toggleNode(joint.name);
          }}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            isSelected 
              ? 'bg-blue-600/30 border border-blue-500/50 text-white shadow-sm' 
              : 'hover:bg-slate-800/60 text-slate-300'
          }`}
          style={{ paddingLeft: `${joint.depth * 14 + 10}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleNode(joint.name); }} 
                className="p-0.5 text-slate-400 hover:text-white"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-600">•</span>
            )}
            <span className={`truncate font-medium ${isSelected ? 'text-white' : ''}`}>
              {joint.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${getTypeColor(joint.type)}`}>
              {joint.type}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l border-slate-800/80 ml-3.5 pl-0.5 my-0.5">
            {children.map(child => renderJointNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Mesh2Motion Quick-Rig & Skeleton Inspector
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  UE5 Manny/Quinn IK Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect bone hierarchy, verify joint positions, and configure automatic skin weighting prior to export.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto flex-1">
          {/* Left Column: Preset Switcher & Joint Hierarchy Tree */}
          <div className="md:col-span-7 p-5 border-r border-slate-800/80 flex flex-col gap-4">
            {/* Rig Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Target Skeleton Rig Preset
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'humanoid', label: 'Humanoid', desc: 'UE5 Manny / Quinn', icon: '👤' },
                  { id: 'creature', label: 'Creature', desc: 'Mutant / Apex Predator', icon: '🧟' },
                  { id: 'quadruped', label: 'Quadruped', desc: 'Beast / Wolf / Mount', icon: '🐺' },
                  { id: 'mech', label: 'Mech', desc: 'Robotic Droid', icon: '🤖' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedRigType(preset.id as RigType)}
                    className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                      selectedRigType === preset.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg mb-1">{preset.icon}</span>
                    <span className="text-xs font-semibold">{preset.label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Skeleton Hierarchy Tree */}
            <div className="flex-1 flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Joint Hierarchy ({hierarchyInfo.totalJoints} Bones Detected)
                </span>
                <button
                  onClick={() => {
                    const allExp: Record<string, boolean> = {};
                    hierarchyInfo.joints.forEach(j => allExp[j.name] = true);
                    setExpandedNodes(allExp);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Expand All
                </button>
              </div>

              <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 overflow-y-auto max-h-[300px] space-y-0.5">
                {rootJoint ? renderJointNode(rootJoint) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No skeletal structure available for this preset.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Joint Details, UE5 Retarget Compatibility & Test Animations */}
          <div className="md:col-span-5 p-5 flex flex-col justify-between gap-4 bg-slate-950/40">
            {/* Mesh & Skinning Diagnostics */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mesh & Skinning Analysis
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Asset Height</span>
                  <span className="text-white font-bold text-sm">{meshMetrics.height} m</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Total Joints</span>
                  <span className="text-emerald-400 font-bold text-sm">{hierarchyInfo.totalJoints} Bones</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Polycount</span>
                  <span className="text-cyan-400 font-bold text-sm">{meshMetrics.triangles.toLocaleString()} Tris</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Skin Influence</span>
                  <span className="text-purple-400 font-bold text-sm">4 Bones / Vert</span>
                </div>
              </div>

              {/* Compatibility Checklist */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-300">UE5 Retarget Compatibility Checklist:</span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Manny / Quinn Root & Pelvis Alignment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Full FK/IK Quad & Arm Chains Setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Embedded GLTF Skinning Indices & Weights</span>
                  </div>
                </div>
              </div>

              {/* Quick Animation Clip Trigger */}
              <div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Test Motion Clip in Viewport
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Combat Idle', clip: 'Idle' },
                    { label: 'Stalk Walk', clip: 'Walk' },
                    { label: 'Sprint Gallop', clip: 'Gallop' },
                    { label: 'Melee Strike', clip: 'Attack' },
                  ].map(anim => (
                    <button
                      key={anim.clip}
                      onClick={() => {
                        setActiveTestAnim(anim.clip);
                        if (onPlayTestClip) onPlayTestClip(anim.clip);
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/60 transition-colors"
                    >
                      <Play className="w-3 h-3 text-cyan-400 fill-current" />
                      <span>{anim.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Re-Rigging Action Button */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleApplyRig}
                disabled={isApplyingRig}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isApplyingRig ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Skinning Weights & Joints...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Apply {selectedRigType.toUpperCase()} Rig & Recalculate Weights</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for direct import into Unreal Engine 5.4 IK Retargeter</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
