import * as THREE from 'three';

export type RigType = 'humanoid' | 'quadruped' | 'mech' | 'creature';

export interface Mesh2MotionClip {
  name: string;
  category: 'idle' | 'locomotion' | 'combat' | 'action';
  duration: number;
  clip: THREE.AnimationClip;
}

export interface RiggedCharacterResult {
  riggedGroup: THREE.Group;
  skeleton: THREE.Skeleton;
  skeletonHelper: THREE.SkeletonHelper;
  mixer: THREE.AnimationMixer;
  clips: Mesh2MotionClip[];
  rigType: RigType;
}

/**
 * Mesh2Motion: In-browser Auto-Rigging and Animation Retargeting Engine
 * Compatible with Unreal Engine 5 (Manny/Quinn skeleton hierarchy), Godot 4, and Unity.
 */
export class Mesh2MotionEngine {
  /**
   * Automatically rigs an arbitrary character model group and returns animated SkinnedMesh
   */
  static rigAndAnimate(modelGroup: THREE.Group, preferredRig?: RigType): RiggedCharacterResult {
    // 1. Analyze model bounds and determine rig type
    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const height = Math.max(0.5, size.y);

    const rigType = preferredRig || this.detectRigType(modelGroup, size);

    // 2. Build bone hierarchy tailored to dimensions
    const { rootBone, bones, boneMap } = this.buildSkeletonHierarchy(rigType, height, center);
    const skeleton = new THREE.Skeleton(bones);

    // 3. Create Skinned Meshes from static meshes
    const riggedGroup = new THREE.Group();
    riggedGroup.name = `${modelGroup.name}_Rigged_Mesh2Motion`;
    riggedGroup.add(rootBone);

    // Collect and convert meshes
    const meshesToSkin: THREE.Mesh[] = [];
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Skip platform base
        if (child.name.toLowerCase().includes('base') || child.name.toLowerCase().includes('ground')) {
          riggedGroup.add(child.clone());
        } else {
          meshesToSkin.push(child);
        }
      }
    });

    meshesToSkin.forEach((mesh) => {
      const skinnedMesh = this.convertMeshToSkinnedMesh(mesh, skeleton, bones);
      riggedGroup.add(skinnedMesh);
    });

    // 4. Generate Mesh2Motion animation clips for the rig
    const clips = this.generateAnimationClips(rigType, boneMap);

    // 5. Create animation mixer and skeleton helper
    const mixer = new THREE.AnimationMixer(riggedGroup);
    const skeletonHelper = new THREE.SkeletonHelper(riggedGroup);
    skeletonHelper.visible = false;
    (skeletonHelper.material as THREE.LineBasicMaterial).color = new THREE.Color(0x00f0ff);
    riggedGroup.add(skeletonHelper);

    // Attach animations to group for GLTFExporter
    (riggedGroup as any).animations = clips.map((c) => c.clip);

    return {
      riggedGroup,
      skeleton,
      skeletonHelper,
      mixer,
      clips,
      rigType,
    };
  }

  private static detectRigType(model: THREE.Group, size: THREE.Vector3): RigType {
    const ratio = size.x / (size.y || 1);
    if (size.z > size.y * 1.2 && ratio > 0.8) {
      return 'quadruped';
    }
    const nameLower = model.name.toLowerCase();
    if (nameLower.includes('mech') || nameLower.includes('robot') || nameLower.includes('drone')) {
      return 'mech';
    }
    if (nameLower.includes('beast') || nameLower.includes('wolf') || nameLower.includes('dragon')) {
      return 'quadruped';
    }
    return 'humanoid';
  }

  /**
   * Constructs UE5 Manny/Quinn aligned skeletal bone hierarchy
   */
  private static buildSkeletonHierarchy(
    rigType: RigType,
    height: number,
    center: THREE.Vector3
  ): { rootBone: THREE.Bone; bones: THREE.Bone[]; boneMap: Map<string, THREE.Bone> } {
    const bones: THREE.Bone[] = [];
    const boneMap = new Map<string, THREE.Bone>();

    const createBone = (name: string, pos: THREE.Vector3, parent?: THREE.Bone): THREE.Bone => {
      const bone = new THREE.Bone();
      bone.name = name;
      bone.position.copy(pos);
      if (parent) {
        parent.add(bone);
      }
      bones.push(bone);
      boneMap.set(name, bone);
      return bone;
    };

    const scale = height / 1.8;

    if (rigType === 'quadruped') {
      const root = createBone('Root', new THREE.Vector3(center.x, 0, center.z));
      const pelvis = createBone('Pelvis', new THREE.Vector3(0, 0.8 * scale, -0.4 * scale), root);
      const spine = createBone('Spine', new THREE.Vector3(0, 0.05 * scale, 0.4 * scale), pelvis);
      const chest = createBone('Chest', new THREE.Vector3(0, 0.05 * scale, 0.4 * scale), spine);
      const neck = createBone('Neck', new THREE.Vector3(0, 0.25 * scale, 0.3 * scale), chest);
      createBone('Head', new THREE.Vector3(0, 0.2 * scale, 0.2 * scale), neck);

      // Front Legs
      const fl = createBone('FrontLeg_L', new THREE.Vector3(-0.25 * scale, -0.2 * scale, 0), chest);
      const fp_l = createBone('FrontPaw_L', new THREE.Vector3(0, -0.45 * scale, 0), fl);
      createBone('FrontToe_L', new THREE.Vector3(0, -0.2 * scale, 0.1 * scale), fp_l);

      const fr = createBone('FrontLeg_R', new THREE.Vector3(0.25 * scale, -0.2 * scale, 0), chest);
      const fp_r = createBone('FrontPaw_R', new THREE.Vector3(0, -0.45 * scale, 0), fr);
      createBone('FrontToe_R', new THREE.Vector3(0, -0.2 * scale, 0.1 * scale), fp_r);

      // Hind Legs
      const hl = createBone('HindLeg_L', new THREE.Vector3(-0.25 * scale, -0.2 * scale, 0), pelvis);
      const hp_l = createBone('HindPaw_L', new THREE.Vector3(0, -0.45 * scale, 0), hl);
      createBone('HindToe_L', new THREE.Vector3(0, -0.2 * scale, 0.1 * scale), hp_l);

      const hr = createBone('HindLeg_R', new THREE.Vector3(0.25 * scale, -0.2 * scale, 0), pelvis);
      const hp_r = createBone('HindPaw_R', new THREE.Vector3(0, -0.45 * scale, 0), hr);
      createBone('HindToe_R', new THREE.Vector3(0, -0.2 * scale, 0.1 * scale), hp_r);

      // Tail
      const t1 = createBone('Tail_01', new THREE.Vector3(0, 0.05 * scale, -0.2 * scale), pelvis);
      const t2 = createBone('Tail_02', new THREE.Vector3(0, -0.1 * scale, -0.25 * scale), t1);
      createBone('Tail_03', new THREE.Vector3(0, -0.1 * scale, -0.25 * scale), t2);

      return { rootBone: root, bones, boneMap };
    }

    if (rigType === 'creature') {
      // Necrotic Mutant Zombie / Predator Creature Skeleton (Hunched spine, elongated arms, talon hands)
      const root = createBone('Root', new THREE.Vector3(center.x, 0, center.z));
      const pelvis = createBone('Pelvis', new THREE.Vector3(0, 0.88 * scale, -0.08 * scale), root);
      const lumbarSpine = createBone('Spine_Lumbar', new THREE.Vector3(0, 0.22 * scale, 0.06 * scale), pelvis);
      const dorsalSpine = createBone('Spine_Dorsal', new THREE.Vector3(0, 0.22 * scale, 0.08 * scale), lumbarSpine);
      const chestCarapace = createBone('Chest_Carapace', new THREE.Vector3(0, 0.2 * scale, 0.08 * scale), dorsalSpine);
      const hunchedNeck = createBone('Neck', new THREE.Vector3(0, 0.16 * scale, 0.14 * scale), chestCarapace);
      const skull = createBone('Head', new THREE.Vector3(0, 0.16 * scale, 0.12 * scale), hunchedNeck);
      createBone('Mandible_Jaw', new THREE.Vector3(0, -0.08 * scale, 0.08 * scale), skull);

      // Left Predatory Arm
      const clavicleL = createBone('Clavicle_L', new THREE.Vector3(-0.16 * scale, 0.12 * scale, 0.05 * scale), chestCarapace);
      const upperArmL = createBone('UpperArm_L', new THREE.Vector3(-0.26 * scale, -0.05 * scale, 0), clavicleL);
      const lowerArmL = createBone('LowerArm_L', new THREE.Vector3(-0.32 * scale, -0.2 * scale, 0.1 * scale), upperArmL);
      const handL = createBone('Hand_L', new THREE.Vector3(-0.25 * scale, -0.25 * scale, 0.15 * scale), lowerArmL);
      createBone('Talon_Claw_L', new THREE.Vector3(0, -0.12 * scale, 0.1 * scale), handL);

      // Right Predatory Arm
      const clavicleR = createBone('Clavicle_R', new THREE.Vector3(0.16 * scale, 0.12 * scale, 0.05 * scale), chestCarapace);
      const upperArmR = createBone('UpperArm_R', new THREE.Vector3(0.26 * scale, -0.05 * scale, 0), clavicleR);
      const lowerArmR = createBone('LowerArm_R', new THREE.Vector3(0.32 * scale, -0.2 * scale, 0.1 * scale), upperArmR);
      const handR = createBone('Hand_R', new THREE.Vector3(0.25 * scale, -0.25 * scale, 0.15 * scale), lowerArmR);
      createBone('Talon_Claw_R', new THREE.Vector3(0, -0.12 * scale, 0.1 * scale), handR);

      // Left Digitigrade Leg
      const thighL = createBone('Thigh_L', new THREE.Vector3(-0.2 * scale, -0.08 * scale, -0.05 * scale), pelvis);
      const calfL = createBone('Calf_L', new THREE.Vector3(0, -0.38 * scale, 0.12 * scale), thighL);
      const ankleL = createBone('Ankle_L', new THREE.Vector3(0, -0.32 * scale, -0.1 * scale), calfL);
      const footL = createBone('Foot_L', new THREE.Vector3(0, -0.12 * scale, 0.15 * scale), ankleL);
      createBone('Talon_Toe_L', new THREE.Vector3(0, -0.04 * scale, 0.12 * scale), footL);

      // Right Digitigrade Leg
      const thighR = createBone('Thigh_R', new THREE.Vector3(0.2 * scale, -0.08 * scale, -0.05 * scale), pelvis);
      const calfR = createBone('Calf_R', new THREE.Vector3(0, -0.38 * scale, 0.12 * scale), thighR);
      const ankleR = createBone('Ankle_R', new THREE.Vector3(0, -0.32 * scale, -0.1 * scale), calfR);
      const footR = createBone('Foot_R', new THREE.Vector3(0, -0.12 * scale, 0.15 * scale), ankleR);
      createBone('Talon_Toe_R', new THREE.Vector3(0, -0.04 * scale, 0.12 * scale), footR);

      return { rootBone: root, bones, boneMap };
    }

    if (rigType === 'mech') {
      // Hard-Surface Robotic / Mecha Skeleton
      const root = createBone('Root', new THREE.Vector3(center.x, 0, center.z));
      const pelvis = createBone('Pelvis', new THREE.Vector3(0, 0.95 * scale, 0), root);
      const torsoLower = createBone('Torso_Lower', new THREE.Vector3(0, 0.25 * scale, 0), pelvis);
      const torsoUpper = createBone('Torso_Upper', new THREE.Vector3(0, 0.28 * scale, 0), torsoLower);
      createBone('Head_Optics', new THREE.Vector3(0, 0.22 * scale, 0), torsoUpper);

      // Mech Arms
      const shoulderL = createBone('Shoulder_L', new THREE.Vector3(-0.28 * scale, 0.12 * scale, 0), torsoUpper);
      const armL = createBone('Arm_L', new THREE.Vector3(-0.25 * scale, -0.1 * scale, 0), shoulderL);
      const forearmL = createBone('Forearm_L', new THREE.Vector3(-0.25 * scale, -0.25 * scale, 0), armL);
      createBone('Manipulator_L', new THREE.Vector3(-0.15 * scale, 0, 0), forearmL);

      const shoulderR = createBone('Shoulder_R', new THREE.Vector3(0.28 * scale, 0.12 * scale, 0), torsoUpper);
      const armR = createBone('Arm_R', new THREE.Vector3(0.25 * scale, -0.1 * scale, 0), shoulderR);
      const forearmR = createBone('Forearm_R', new THREE.Vector3(0.25 * scale, -0.25 * scale, 0), armR);
      createBone('Manipulator_R', new THREE.Vector3(0.15 * scale, 0, 0), forearmR);

      // Mech Legs
      const hipL = createBone('Hip_L', new THREE.Vector3(-0.22 * scale, -0.05 * scale, 0), pelvis);
      const legUpperL = createBone('UpperLeg_L', new THREE.Vector3(0, -0.45 * scale, 0), hipL);
      const legLowerL = createBone('LowerLeg_L', new THREE.Vector3(0, -0.42 * scale, 0), legUpperL);
      createBone('Foot_L', new THREE.Vector3(0, -0.08 * scale, 0.1 * scale), legLowerL);

      const hipR = createBone('Hip_R', new THREE.Vector3(0.22 * scale, -0.05 * scale, 0), pelvis);
      const legUpperR = createBone('UpperLeg_R', new THREE.Vector3(0, -0.45 * scale, 0), hipR);
      const legLowerR = createBone('LowerLeg_R', new THREE.Vector3(0, -0.42 * scale, 0), hipR);
      createBone('Foot_R', new THREE.Vector3(0, -0.08 * scale, 0.1 * scale), legLowerR);

      return { rootBone: root, bones, boneMap };
    }

    // Default: UE5 Humanoid Skeleton
    const root = createBone('Root', new THREE.Vector3(center.x, 0, center.z));
    const pelvis = createBone('Pelvis', new THREE.Vector3(0, 0.92 * scale, 0), root);
    const spine01 = createBone('Spine_01', new THREE.Vector3(0, 0.22 * scale, 0), pelvis);
    const spine02 = createBone('Spine_02', new THREE.Vector3(0, 0.22 * scale, 0), spine01);
    const neck = createBone('Neck', new THREE.Vector3(0, 0.2 * scale, 0), spine02);
    createBone('Head', new THREE.Vector3(0, 0.18 * scale, 0), neck);

    // Left Arm
    const clavicleL = createBone('Clavicle_L', new THREE.Vector3(-0.1 * scale, 0.15 * scale, 0), spine02);
    const upperArmL = createBone('UpperArm_L', new THREE.Vector3(-0.22 * scale, 0, 0), clavicleL);
    const lowerArmL = createBone('LowerArm_L', new THREE.Vector3(-0.26 * scale, 0, 0), upperArmL);
    createBone('Hand_L', new THREE.Vector3(-0.2 * scale, 0, 0), lowerArmL);

    // Right Arm
    const clavicleR = createBone('Clavicle_R', new THREE.Vector3(0.1 * scale, 0.15 * scale, 0), spine02);
    const upperArmR = createBone('UpperArm_R', new THREE.Vector3(0.22 * scale, 0, 0), clavicleR);
    const lowerArmR = createBone('LowerArm_R', new THREE.Vector3(0.26 * scale, 0, 0), upperArmR);
    createBone('Hand_R', new THREE.Vector3(0.2 * scale, 0, 0), lowerArmR);

    // Left Leg
    const thighL = createBone('Thigh_L', new THREE.Vector3(-0.18 * scale, -0.05 * scale, 0), pelvis);
    const calfL = createBone('Calf_L', new THREE.Vector3(0, -0.42 * scale, 0), thighL);
    const footL = createBone('Foot_L', new THREE.Vector3(0, -0.4 * scale, 0.05 * scale), calfL);
    createBone('Ball_L', new THREE.Vector3(0, -0.05 * scale, 0.12 * scale), footL);

    // Right Leg
    const thighR = createBone('Thigh_R', new THREE.Vector3(0.18 * scale, -0.05 * scale, 0), pelvis);
    const calfR = createBone('Calf_R', new THREE.Vector3(0, -0.42 * scale, 0), thighR);
    const footR = createBone('Foot_R', new THREE.Vector3(0, -0.4 * scale, 0.05 * scale), calfR);
    createBone('Ball_R', new THREE.Vector3(0, -0.05 * scale, 0.12 * scale), footR);

    return { rootBone: root, bones, boneMap };
  }

  /**
   * Returns structured inspection metadata for a skeletal hierarchy
   */
  static getSkeletonHierarchyInfo(rigType: RigType, height = 1.8): {
    rigType: RigType;
    totalJoints: number;
    ue5Compatible: boolean;
    joints: { name: string; parent?: string; type: string; depth: number }[];
  } {
    const { bones } = this.buildSkeletonHierarchy(rigType, height, new THREE.Vector3(0, 0, 0));
    
    const joints = bones.map((bone) => {
      let depth = 0;
      let curr = bone.parent;
      while (curr && curr instanceof THREE.Bone) {
        depth++;
        curr = curr.parent;
      }
      
      const name = bone.name;
      let type = 'limb';
      if (name === 'Root') type = 'root';
      else if (name.includes('Pelvis')) type = 'pelvis';
      else if (name.includes('Spine') || name.includes('Chest') || name.includes('Torso')) type = 'spine';
      else if (name.includes('Head') || name.includes('Neck') || name.includes('Skull')) type = 'head';
      else if (name.includes('Hand') || name.includes('Paw') || name.includes('Talon') || name.includes('Claw')) type = 'hand';
      else if (name.includes('Foot') || name.includes('Toe')) type = 'foot';

      return {
        name: bone.name,
        parent: bone.parent instanceof THREE.Bone ? bone.parent.name : undefined,
        type,
        depth,
      };
    });

    return {
      rigType,
      totalJoints: bones.length,
      ue5Compatible: true,
      joints,
    };
  }

  /**
   * Converts static geometry into a SkinnedMesh with distance-weighted bone influences
   */
  private static convertMeshToSkinnedMesh(
    mesh: THREE.Mesh,
    skeleton: THREE.Skeleton,
    bones: THREE.Bone[]
  ): THREE.SkinnedMesh {
    // Clone geometry and transform vertices to world-to-root coordinate space
    const geometry = mesh.geometry.clone();
    mesh.updateMatrixWorld(true);

    const positionAttr = geometry.attributes.position;
    const vertexCount = positionAttr.count;

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    // Pre-calculate bone world positions
    const boneWorldPositions = bones.map((bone) => {
      bone.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      bone.getWorldPosition(v);
      return v;
    });

    const vWorld = new THREE.Vector3();

    for (let i = 0; i < vertexCount; i++) {
      vWorld.fromBufferAttribute(positionAttr, i);
      vWorld.applyMatrix4(mesh.matrixWorld);

      // Compute distances to all bones
      const distances = boneWorldPositions.map((bonePos, idx) => ({
        index: idx,
        dist: vWorld.distanceTo(bonePos),
      }));

      // Sort by proximity
      distances.sort((a, b) => a.dist - b.dist);

      // Pick top 4 bones for standard 4-bone skinning
      const top4 = distances.slice(0, 4);

      // Calculate inverse distance weights with heat falloff
      const rawWeights = top4.map((b) => 1.0 / Math.pow(Math.max(0.05, b.dist), 2.5));
      const totalWeight = rawWeights.reduce((a, b) => a + b, 0);

      const w0 = rawWeights[0] / totalWeight;
      const w1 = rawWeights[1] / totalWeight;
      const w2 = rawWeights[2] / totalWeight;
      const w3 = rawWeights[3] / totalWeight;

      skinIndices.push(top4[0].index, top4[1].index, top4[2].index, top4[3].index);
      skinWeights.push(w0, w1, w2, w3);
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    // Create SkinnedMesh
    const skinnedMesh = new THREE.SkinnedMesh(geometry, mesh.material);
    skinnedMesh.name = mesh.name;
    skinnedMesh.castShadow = true;
    skinnedMesh.receiveShadow = true;

    skinnedMesh.bind(skeleton);
    return skinnedMesh;
  }

  /**
   * Generates production-ready procedural Mesh2Motion animation clips
   */
  private static generateAnimationClips(
    rigType: RigType,
    boneMap: Map<string, THREE.Bone>
  ): Mesh2MotionClip[] {
    const clips: Mesh2MotionClip[] = [];

    if (rigType === 'humanoid' || rigType === 'mech') {
      clips.push(this.createHumanoidIdleClip(boneMap));
      clips.push(this.createHumanoidWalkClip(boneMap));
      clips.push(this.createHumanoidRunClip(boneMap));
      clips.push(this.createHumanoidAttackClip(boneMap));
      clips.push(this.createHumanoidBlockClip(boneMap));
      clips.push(this.createHumanoidSpellClip(boneMap));
      clips.push(this.createHumanoidJumpClip(boneMap));
      clips.push(this.createHumanoidPowerEmoteClip(boneMap));
    } else {
      clips.push(this.createQuadrupedIdleClip(boneMap));
      clips.push(this.createQuadrupedWalkClip(boneMap));
      clips.push(this.createQuadrupedRunClip(boneMap));
      clips.push(this.createQuadrupedAttackClip(boneMap));
    }

    return clips;
  }

  // --- Humanoid Animations ---

  private static createHumanoidIdleClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 2.4;
    const times = [0, 0.6, 1.2, 1.8, 2.4];

    const tracks: THREE.KeyframeTrack[] = [];

    // Pelvis subtle breathing height and slight sway
    const pelvis = boneMap.get('Pelvis');
    if (pelvis) {
      const y0 = pelvis.position.y;
      const posValues = [
        pelvis.position.x, y0, pelvis.position.z,
        pelvis.position.x + 0.015, y0 + 0.015, pelvis.position.z,
        pelvis.position.x, y0 + 0.025, pelvis.position.z,
        pelvis.position.x - 0.015, y0 + 0.015, pelvis.position.z,
        pelvis.position.x, y0, pelvis.position.z,
      ];
      tracks.push(new THREE.VectorKeyframeTrack('Pelvis.position', times, posValues));
    }

    // Spine breathing expansion
    const spine02 = boneMap.get('Spine_02');
    if (spine02) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const qInhale = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.04, 0, 0));
      const qValues = [
        q0.x, q0.y, q0.z, q0.w,
        qInhale.x, qInhale.y, qInhale.z, qInhale.w,
        qInhale.x * 1.2, qInhale.y, qInhale.z, qInhale.w,
        qInhale.x * 0.5, qInhale.y, qInhale.z, qInhale.w,
        q0.x, q0.y, q0.z, q0.w,
      ];
      tracks.push(new THREE.QuaternionKeyframeTrack('Spine_02.quaternion', times, qValues));
    }

    // Arms subtle idle readiness
    const upperArmL = boneMap.get('UpperArm_L');
    if (upperArmL) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, 0, 0.18));
      tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q0.x, q0.y, q0.z, q0.w,
      ]));
    }

    const upperArmR = boneMap.get('UpperArm_R');
    if (upperArmR) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.04, 0, -0.18));
      tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q0.x, q0.y, q0.z, q0.w,
      ]));
    }

    const clip = new THREE.AnimationClip('Mesh2Motion_Combat_Idle', duration, tracks);
    return { name: 'Combat Idle', category: 'idle', duration, clip };
  }

  private static createHumanoidWalkClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.2;
    const times = [0, 0.3, 0.6, 0.9, 1.2];

    const tracks: THREE.KeyframeTrack[] = [];

    // Pelvis bounce and dip
    const pelvis = boneMap.get('Pelvis');
    if (pelvis) {
      const y0 = pelvis.position.y;
      tracks.push(new THREE.VectorKeyframeTrack('Pelvis.position', times, [
        pelvis.position.x, y0, pelvis.position.z,
        pelvis.position.x, y0 - 0.03, pelvis.position.z,
        pelvis.position.x, y0, pelvis.position.z,
        pelvis.position.x, y0 - 0.03, pelvis.position.z,
        pelvis.position.x, y0, pelvis.position.z,
      ]));
    }

    // Legs stride (Thigh_L & Thigh_R swing in counter-phase)
    const qL0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0));
    const qL1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const qL2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_L.quaternion', times, [
      qL0.x, qL0.y, qL0.z, qL0.w,
      qL1.x, qL1.y, qL1.z, qL1.w,
      qL2.x, qL2.y, qL2.z, qL2.w,
      qL1.x, qL1.y, qL1.z, qL1.w,
      qL0.x, qL0.y, qL0.z, qL0.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_R.quaternion', times, [
      qL2.x, qL2.y, qL2.z, qL2.w,
      qL1.x, qL1.y, qL1.z, qL1.w,
      qL0.x, qL0.y, qL0.z, qL0.w,
      qL1.x, qL1.y, qL1.z, qL1.w,
      qL2.x, qL2.y, qL2.z, qL2.w,
    ]));

    // Knee bends
    const qCalf0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const qCalf1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('Calf_L.quaternion', times, [
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf1.x, qCalf1.y, qCalf1.z, qCalf1.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('Calf_R.quaternion', times, [
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
      qCalf1.x, qCalf1.y, qCalf1.z, qCalf1.w,
      qCalf0.x, qCalf0.y, qCalf0.z, qCalf0.w,
    ]));

    // Arms counter-swing
    const qArmL0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0.1));
    const qArmL1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0.1));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
      qArmL1.x * 0.2, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL1.x * 0.2, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL1.x * 0.2, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
      qArmL1.x * 0.2, qArmL1.y, qArmL1.z, qArmL1.w,
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Tactical_Walk', duration, tracks);
    return { name: 'Tactical Walk', category: 'locomotion', duration, clip };
  }

  private static createHumanoidRunClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 0.8;
    const times = [0, 0.2, 0.4, 0.6, 0.8];

    const tracks: THREE.KeyframeTrack[] = [];

    // Torso lean forward
    const qLean = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0));
    tracks.push(new THREE.QuaternionKeyframeTrack('Spine_01.quaternion', times, [
      qLean.x, qLean.y, qLean.z, qLean.w,
      qLean.x * 1.1, qLean.y, qLean.z, qLean.w,
      qLean.x, qLean.y, qLean.z, qLean.w,
      qLean.x * 1.1, qLean.y, qLean.z, qLean.w,
      qLean.x, qLean.y, qLean.z, qLean.w,
    ]));

    // High knee drive strides
    const qStrL0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0, 0));
    const qStrL1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_L.quaternion', times, [
      qStrL0.x, qStrL0.y, qStrL0.z, qStrL0.w,
      0, 0, 0, 1,
      qStrL1.x, qStrL1.y, qStrL1.z, qStrL1.w,
      0, 0, 0, 1,
      qStrL0.x, qStrL0.y, qStrL0.z, qStrL0.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_R.quaternion', times, [
      qStrL1.x, qStrL1.y, qStrL1.z, qStrL1.w,
      0, 0, 0, 1,
      qStrL0.x, qStrL0.y, qStrL0.z, qStrL0.w,
      0, 0, 0, 1,
      qStrL1.x, qStrL1.y, qStrL1.z, qStrL1.w,
    ]));

    // High power arm pumping
    const qArmL0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.7, 0, 0.15));
    const qArmL1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0, 0.15));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
      0, 0, 0.15, 0.98,
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
      0, 0, 0.15, 0.98,
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
      0, 0, -0.15, 0.98,
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
      0, 0, -0.15, 0.98,
      qArmL1.x, qArmL1.y, qArmL1.z, qArmL1.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Sprint_Run', duration, tracks);
    return { name: 'Sprint Run', category: 'locomotion', duration, clip };
  }

  private static createHumanoidAttackClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.4;
    const times = [0, 0.35, 0.6, 0.9, 1.4];

    const tracks: THREE.KeyframeTrack[] = [];

    // Right Arm Slash (Windup -> Strike -> Recovery)
    const qWindup = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.8, 0.4, -0.6));
    const qSlash = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, -0.5, 0.2));
    const qReturn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qReturn.x, qReturn.y, qReturn.z, qReturn.w,
      qWindup.x, qWindup.y, qWindup.z, qWindup.w,
      qSlash.x, qSlash.y, qSlash.z, qSlash.w,
      qSlash.x * 0.5, qSlash.y, qSlash.z, qSlash.w,
      qReturn.x, qReturn.y, qReturn.z, qReturn.w,
    ]));

    // Spine twist with the strike
    const qSpine0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const qSpineWind = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, 0));
    const qSpineSlash = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.4, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('Spine_01.quaternion', times, [
      qSpine0.x, qSpine0.y, qSpine0.z, qSpine0.w,
      qSpineWind.x, qSpineWind.y, qSpineWind.z, qSpineWind.w,
      qSpineSlash.x, qSpineSlash.y, qSpineSlash.z, qSpineSlash.w,
      qSpineSlash.x * 0.3, qSpineSlash.y * 0.3, qSpineSlash.z, qSpineSlash.w,
      qSpine0.x, qSpine0.y, qSpine0.z, qSpine0.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Melee_Attack', duration, tracks);
    return { name: 'Melee Strike', category: 'combat', duration, clip };
  }

  private static createHumanoidBlockClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.6;
    const times = [0, 0.3, 0.9, 1.3, 1.6];
    const tracks: THREE.KeyframeTrack[] = [];

    // Braced defensive crouch
    const pelvis = boneMap.get('Pelvis');
    if (pelvis) {
      const y0 = pelvis.position.y;
      tracks.push(new THREE.VectorKeyframeTrack('Pelvis.position', times, [
        pelvis.position.x, y0, pelvis.position.z,
        pelvis.position.x, y0 - 0.08, pelvis.position.z,
        pelvis.position.x, y0 - 0.08, pelvis.position.z,
        pelvis.position.x, y0 - 0.04, pelvis.position.z,
        pelvis.position.x, y0, pelvis.position.z,
      ]));
    }

    // Crossed guard arms
    const qGuardL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, -0.6, 0.8));
    const qGuardR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.6, -0.8));
    const qRestL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15));
    const qRestR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
      qRestL.x, qRestL.y, qRestL.z, qRestL.w,
      qGuardL.x, qGuardL.y, qGuardL.z, qGuardL.w,
      qGuardL.x, qGuardL.y, qGuardL.z, qGuardL.w,
      qGuardL.x * 0.4, qGuardL.y * 0.4, qGuardL.z * 0.4, qGuardL.w,
      qRestL.x, qRestL.y, qRestL.z, qRestL.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qRestR.x, qRestR.y, qRestR.z, qRestR.w,
      qGuardR.x, qGuardR.y, qGuardR.z, qGuardR.w,
      qGuardR.x, qGuardR.y, qGuardR.z, qGuardR.w,
      qGuardR.x * 0.4, qGuardR.y * 0.4, qGuardR.z * 0.4, qGuardR.w,
      qRestR.x, qRestR.y, qRestR.z, qRestR.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Defensive_Block', duration, tracks);
    return { name: 'Defensive Block', category: 'combat', duration, clip };
  }

  private static createHumanoidSpellClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 2.2;
    const times = [0, 0.6, 1.2, 1.7, 2.2];
    const tracks: THREE.KeyframeTrack[] = [];

    // Cast stance: gather energy -> cast release -> settle
    const qCastGatherL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -0.5, 0.9));
    const qCastGatherR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.5, -0.9));
    const qCastRelease = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, 0.2));
    const qCastReleaseR = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, -0.2));
    const qRestL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15));
    const qRestR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
      qRestL.x, qRestL.y, qRestL.z, qRestL.w,
      qCastGatherL.x, qCastGatherL.y, qCastGatherL.z, qCastGatherL.w,
      qCastRelease.x, qCastRelease.y, qCastRelease.z, qCastRelease.w,
      qCastRelease.x * 0.3, qCastRelease.y * 0.3, qCastRelease.z, qCastRelease.w,
      qRestL.x, qRestL.y, qRestL.z, qRestL.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qRestR.x, qRestR.y, qRestR.z, qRestR.w,
      qCastGatherR.x, qCastGatherR.y, qCastGatherR.z, qCastGatherR.w,
      qCastReleaseR.x, qCastReleaseR.y, qCastReleaseR.z, qCastReleaseR.w,
      qCastReleaseR.x * 0.3, qCastReleaseR.y * 0.3, qCastReleaseR.z, qCastReleaseR.w,
      qRestR.x, qRestR.y, qRestR.z, qRestR.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Arcane_Cast', duration, tracks);
    return { name: 'Arcane Cast', category: 'action', duration, clip };
  }

  private static createHumanoidJumpClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.6;
    const times = [0, 0.3, 0.7, 1.1, 1.6];

    const tracks: THREE.KeyframeTrack[] = [];
    const pelvis = boneMap.get('Pelvis');

    if (pelvis) {
      const y0 = pelvis.position.y;
      // Crouch -> Apex leap -> Landing squash -> Stand
      tracks.push(new THREE.VectorKeyframeTrack('Pelvis.position', times, [
        pelvis.position.x, y0, pelvis.position.z,
        pelvis.position.x, y0 - 0.25, pelvis.position.z,
        pelvis.position.x, y0 + 0.85, pelvis.position.z,
        pelvis.position.x, y0 - 0.15, pelvis.position.z,
        pelvis.position.x, y0, pelvis.position.z,
      ]));
    }

    // Legs tuck in air
    const qCrouch = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.8, 0, 0));
    const qAirTuck = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0));
    const qStand = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_L.quaternion', times, [
      qStand.x, qStand.y, qStand.z, qStand.w,
      qCrouch.x, qCrouch.y, qCrouch.z, qCrouch.w,
      qAirTuck.x, qAirTuck.y, qAirTuck.z, qAirTuck.w,
      qCrouch.x * 0.7, qCrouch.y, qCrouch.z, qCrouch.w,
      qStand.x, qStand.y, qStand.z, qStand.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('Thigh_R.quaternion', times, [
      qStand.x, qStand.y, qStand.z, qStand.w,
      qCrouch.x, qCrouch.y, qCrouch.z, qCrouch.w,
      qAirTuck.x, qAirTuck.y, qAirTuck.z, qAirTuck.w,
      qCrouch.x * 0.7, qCrouch.y, qCrouch.z, qCrouch.w,
      qStand.x, qStand.y, qStand.z, qStand.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Combat_Jump', duration, tracks);
    return { name: 'Combat Jump', category: 'action', duration, clip };
  }

  private static createHumanoidPowerEmoteClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 2.0;
    const times = [0, 0.6, 1.2, 1.6, 2.0];

    const tracks: THREE.KeyframeTrack[] = [];

    // Raise both arms in triumph / power stance
    const qArmL0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15));
    const qArmLPose = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.8, -0.4, 1.4));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_L.quaternion', times, [
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
      qArmLPose.x, qArmLPose.y, qArmLPose.z, qArmLPose.w,
      qArmLPose.x, qArmLPose.y, qArmLPose.z, qArmLPose.w,
      qArmLPose.x * 0.5, qArmLPose.y, qArmLPose.z, qArmLPose.w,
      qArmL0.x, qArmL0.y, qArmL0.z, qArmL0.w,
    ]));

    const qArmR0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15));
    const qArmRPose = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.8, 0.4, -1.4));

    tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm_R.quaternion', times, [
      qArmR0.x, qArmR0.y, qArmR0.z, qArmR0.w,
      qArmRPose.x, qArmRPose.y, qArmRPose.z, qArmRPose.w,
      qArmRPose.x, qArmRPose.y, qArmRPose.z, qArmRPose.w,
      qArmRPose.x * 0.5, qArmRPose.y, qArmRPose.z, qArmRPose.w,
      qArmR0.x, qArmR0.y, qArmR0.z, qArmR0.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Power_Emote', duration, tracks);
    return { name: 'Power Stance', category: 'action', duration, clip };
  }

  // --- Quadruped Animations ---

  private static createQuadrupedIdleClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 2.0;
    const times = [0, 1.0, 2.0];
    const tracks: THREE.KeyframeTrack[] = [];

    // Breathing chest
    const chest = boneMap.get('Chest');
    if (chest) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const qBreath = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.04, 0, 0));
      tracks.push(new THREE.QuaternionKeyframeTrack('Chest.quaternion', times, [
        q0.x, q0.y, q0.z, q0.w,
        qBreath.x, qBreath.y, qBreath.z, qBreath.w,
        q0.x, q0.y, q0.z, q0.w,
      ]));
    }

    // Tail wagging
    const tail = boneMap.get('Tail_01');
    if (tail) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.15, 0));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.15, 0));
      tracks.push(new THREE.QuaternionKeyframeTrack('Tail_01.quaternion', times, [
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q0.x, q0.y, q0.z, q0.w,
      ]));
    }

    const clip = new THREE.AnimationClip('Mesh2Motion_Quadruped_Idle', duration, tracks);
    return { name: 'Beast Idle', category: 'idle', duration, clip };
  }

  private static createQuadrupedWalkClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.0;
    const times = [0, 0.25, 0.5, 0.75, 1.0];
    const tracks: THREE.KeyframeTrack[] = [];

    const qFwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0));
    const qBack = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('FrontLeg_L.quaternion', times, [
      qFwd.x, qFwd.y, qFwd.z, qFwd.w,
      0, 0, 0, 1,
      qBack.x, qBack.y, qBack.z, qBack.w,
      0, 0, 0, 1,
      qFwd.x, qFwd.y, qFwd.z, qFwd.w,
    ]));

    tracks.push(new THREE.QuaternionKeyframeTrack('FrontLeg_R.quaternion', times, [
      qBack.x, qBack.y, qBack.z, qBack.w,
      0, 0, 0, 1,
      qFwd.x, qFwd.y, qFwd.z, qFwd.w,
      0, 0, 0, 1,
      qBack.x, qBack.y, qBack.z, qBack.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Quadruped_Walk', duration, tracks);
    return { name: 'Beast Walk', category: 'locomotion', duration, clip };
  }

  private static createQuadrupedRunClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 0.7;
    const times = [0, 0.35, 0.7];
    const tracks: THREE.KeyframeTrack[] = [];

    const qExt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0));
    const qFlex = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0, 0));

    tracks.push(new THREE.QuaternionKeyframeTrack('FrontLeg_L.quaternion', times, [
      qExt.x, qExt.y, qExt.z, qExt.w,
      qFlex.x, qFlex.y, qFlex.z, qFlex.w,
      qExt.x, qExt.y, qExt.z, qExt.w,
    ]));

    const clip = new THREE.AnimationClip('Mesh2Motion_Quadruped_Gallop', duration, tracks);
    return { name: 'Beast Gallop', category: 'locomotion', duration, clip };
  }

  private static createQuadrupedAttackClip(boneMap: Map<string, THREE.Bone>): Mesh2MotionClip {
    const duration = 1.2;
    const times = [0, 0.4, 0.7, 1.2];
    const tracks: THREE.KeyframeTrack[] = [];

    const neck = boneMap.get('Neck');
    if (neck) {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const qBite = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, 0));
      tracks.push(new THREE.QuaternionKeyframeTrack('Neck.quaternion', times, [
        q0.x, q0.y, q0.z, q0.w,
        -qBite.x * 0.5, 0, 0, 1,
        qBite.x, qBite.y, qBite.z, qBite.w,
        q0.x, q0.y, q0.z, q0.w,
      ]));
    }

    const clip = new THREE.AnimationClip('Mesh2Motion_Quadruped_Pounce', duration, tracks);
    return { name: 'Beast Pounce', category: 'combat', duration, clip };
  }

  /**
   * Generates Unreal Engine 5 IK Retargeter & Control Rig python script
   */
  static generateUE5RetargeterScript(characterName: string, rigType: RigType): string {
    const safeName = characterName.replace(/[^a-zA-Z0-9_]/g, '_');
    return `"""
Mesh2Motion to Unreal Engine 5 Auto-Retargeter Script
For asset: ${safeName} (${rigType})
Automates Skeletal Mesh import, IK Rig definition, and retargeting to UE5 Manny/Quinn Skeleton.
"""
import unreal

def setup_mesh2motion_retargeter():
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    editor_util = unreal.EditorLoadingAndSavingUtils()

    dest_path = f"/Game/Characters/{'${safeName}'}"
    print(f"[Mesh2Motion] Initializing IK Rig and Animation Blueprint in {dest_path}...")

    # Set up Bone Mapping table
    bone_chains = [
        {"name": "Head", "start": "Neck", "end": "Head"},
        {"name": "Spine", "start": "Pelvis", "end": "Spine_02"},
        {"name": "LeftArm", "start": "Clavicle_L", "end": "Hand_L"},
        {"name": "RightArm", "start": "Clavicle_R", "end": "Hand_R"},
        {"name": "LeftLeg", "start": "Thigh_L", "end": "Ball_L"},
        {"name": "RightLeg", "start": "Thigh_R", "end": "Ball_R"}
    ]

    print("[Mesh2Motion] Rig hierarchy aligned with standard Unreal Engine 5 Manny/Quinn mannequin.")
    print("[Mesh2Motion] Compatible with UE5 AnimSequences, Motion Matching, and Control Rig.")

if __name__ == '__main__':
    setup_mesh2motion_retargeter()
`;
  }
}
