import * as THREE from 'three';

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

// Cache generated PBR textures so we don't regenerate identical textures multiple times
const textureCache = new Map<string, {
  diffuseMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  emissiveMap?: THREE.CanvasTexture;
}>();

/**
 * Generates high-fidelity PBR procedural textures on an HTML5 canvas.
 * Produces Normal Maps, Roughness Maps, Ambient Occlusion, and Micro-detail Albedo.
 * Matches Unreal Engine 5 PBR material workflow.
 */
export function getOrCreatePBRTextures(style: PBRTextureStyle, baseColorHex: string, emissiveHex?: string) {
  const cacheKey = `${style}_${baseColorHex}_${emissiveHex || 'none'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const size = 512;
  const baseColor = new THREE.Color(baseColorHex);
  const emissiveColor = emissiveHex ? new THREE.Color(emissiveHex) : null;

  // 1. Albedo Canvas
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const albedoCtx = albedoCanvas.getContext('2d')!;

  // 2. Height Canvas (used to compute tangent normal map)
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const heightCtx = heightCanvas.getContext('2d')!;

  // 3. Roughness Canvas
  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughnessCtx = roughnessCanvas.getContext('2d')!;

  // 4. AO Canvas
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = size;
  aoCanvas.height = size;
  const aoCtx = aoCanvas.getContext('2d')!;

  // 5. Emissive Canvas (optional)
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = size;
  emissiveCanvas.height = size;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;
  emissiveCtx.fillStyle = '#000000';
  emissiveCtx.fillRect(0, 0, size, size);

  // Fill bases
  albedoCtx.fillStyle = baseColorHex;
  albedoCtx.fillRect(0, 0, size, size);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, size, size);

  roughnessCtx.fillStyle = '#808080';
  roughnessCtx.fillRect(0, 0, size, size);

  aoCtx.fillStyle = '#ffffff';
  aoCtx.fillRect(0, 0, size, size);

  // Draw procedural style details
  drawStylePatterns(style, size, albedoCtx, heightCtx, roughnessCtx, aoCtx, emissiveCtx, baseColor, emissiveColor);

  // Convert height map into a high-frequency tangent-space Normal Map using Sobel filter
  const normalCanvas = convertHeightToNormalMap(heightCanvas, size);

  const diffuseMap = new THREE.CanvasTexture(albedoCanvas);
  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const aoMap = new THREE.CanvasTexture(aoCanvas);
  aoMap.wrapS = THREE.RepeatWrapping;
  aoMap.wrapT = THREE.RepeatWrapping;

  let emissiveMap: THREE.CanvasTexture | undefined;
  if (emissiveColor) {
    emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
  }

  const result = { diffuseMap, normalMap, roughnessMap, aoMap, emissiveMap };
  textureCache.set(cacheKey, result);
  return result;
}

function drawStylePatterns(
  style: PBRTextureStyle,
  size: number,
  albedoCtx: CanvasRenderingContext2D,
  heightCtx: CanvasRenderingContext2D,
  roughnessCtx: CanvasRenderingContext2D,
  aoCtx: CanvasRenderingContext2D,
  emissiveCtx: CanvasRenderingContext2D,
  baseColor: THREE.Color,
  emissiveColor: THREE.Color | null
) {
  switch (style) {
    case 'cyber_armor': {
      // Tech armor panels, chamfered seams, hex bolt recesses
      const panelCount = 8;
      const step = size / panelCount;

      heightCtx.lineWidth = 3;
      roughnessCtx.lineWidth = 3;
      albedoCtx.lineWidth = 2;

      for (let x = 0; x <= size; x += step) {
        // Seams
        heightCtx.strokeStyle = '#202020';
        heightCtx.beginPath();
        heightCtx.moveTo(x, 0);
        heightCtx.lineTo(x, size);
        heightCtx.stroke();

        roughnessCtx.strokeStyle = '#d0d0d0'; // High roughness in seams
        roughnessCtx.beginPath();
        roughnessCtx.moveTo(x, 0);
        roughnessCtx.lineTo(x, size);
        roughnessCtx.stroke();

        albedoCtx.strokeStyle = '#05070a';
        albedoCtx.beginPath();
        albedoCtx.moveTo(x, 0);
        albedoCtx.lineTo(x, size);
        albedoCtx.stroke();
      }

      for (let y = 0; y <= size; y += step) {
        heightCtx.strokeStyle = '#202020';
        heightCtx.beginPath();
        heightCtx.moveTo(0, y);
        heightCtx.lineTo(size, y);
        heightCtx.stroke();

        roughnessCtx.strokeStyle = '#d0d0d0';
        roughnessCtx.beginPath();
        roughnessCtx.moveTo(0, y);
        roughnessCtx.lineTo(size, y);
        roughnessCtx.stroke();

        albedoCtx.strokeStyle = '#05070a';
        albedoCtx.beginPath();
        albedoCtx.moveTo(0, y);
        albedoCtx.lineTo(size, y);
        albedoCtx.stroke();
      }

      // Corner rivets / bolts
      for (let x = step / 2; x < size; x += step) {
        for (let y = step / 2; y < size; y += step) {
          heightCtx.fillStyle = '#e0e0e0';
          heightCtx.beginPath();
          heightCtx.arc(x, y, 4, 0, Math.PI * 2);
          heightCtx.fill();

          roughnessCtx.fillStyle = '#202020'; // Polished metal bolts
          roughnessCtx.beginPath();
          roughnessCtx.arc(x, y, 4, 0, Math.PI * 2);
          roughnessCtx.fill();
        }
      }

      // Emissive energy traces
      if (emissiveColor) {
        emissiveCtx.strokeStyle = `#${emissiveColor.getHexString()}`;
        emissiveCtx.lineWidth = 4;
        emissiveCtx.beginPath();
        emissiveCtx.moveTo(step * 2, step * 4);
        emissiveCtx.lineTo(step * 6, step * 4);
        emissiveCtx.moveTo(step * 4, step * 2);
        emissiveCtx.lineTo(step * 4, step * 6);
        emissiveCtx.stroke();
      }
      break;
    }

    case 'brushed_steel': {
      // Directional micro-grooves
      const imgData = albedoCtx.getImageData(0, 0, size, size);
      const hData = heightCtx.getImageData(0, 0, size, size);
      const rData = roughnessCtx.getImageData(0, 0, size, size);

      for (let y = 0; y < size; y++) {
        const lineNoise = (Math.sin(y * 0.8) + Math.cos(y * 1.5)) * 18 + (Math.random() - 0.5) * 15;
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const val = 128 + lineNoise;

          hData.data[idx] = val;
          hData.data[idx + 1] = val;
          hData.data[idx + 2] = val;

          rData.data[idx] = Math.max(50, Math.min(220, 100 + lineNoise));
          rData.data[idx + 1] = rData.data[idx];
          rData.data[idx + 2] = rData.data[idx];

          imgData.data[idx] = Math.max(0, Math.min(255, imgData.data[idx] + lineNoise * 0.5));
          imgData.data[idx + 1] = Math.max(0, Math.min(255, imgData.data[idx + 1] + lineNoise * 0.5));
          imgData.data[idx + 2] = Math.max(0, Math.min(255, imgData.data[idx + 2] + lineNoise * 0.5));
        }
      }
      albedoCtx.putImageData(imgData, 0, 0);
      heightCtx.putImageData(hData, 0, 0);
      roughnessCtx.putImageData(rData, 0, 0);
      break;
    }

    case 'carbon_fiber': {
      // 2x2 diagonal twill weave
      const weave = 16;
      for (let y = 0; y < size; y += weave) {
        for (let x = 0; x < size; x += weave) {
          const isDiagonal = ((x / weave) + (y / weave)) % 2 === 0;
          heightCtx.fillStyle = isDiagonal ? '#c0c0c0' : '#404040';
          heightCtx.fillRect(x, y, weave, weave);

          roughnessCtx.fillStyle = isDiagonal ? '#505050' : '#909090';
          roughnessCtx.fillRect(x, y, weave, weave);

          albedoCtx.fillStyle = isDiagonal ? '#1a1f26' : '#0d1117';
          albedoCtx.fillRect(x, y, weave, weave);
        }
      }
      break;
    }

    case 'glowing_circuit': {
      // Circuit board micro traces with glowing lines
      albedoCtx.fillStyle = '#08131e';
      albedoCtx.fillRect(0, 0, size, size);

      const grid = 32;
      heightCtx.strokeStyle = '#ffffff';
      heightCtx.lineWidth = 3;

      const eCol = emissiveColor ? `#${emissiveColor.getHexString()}` : '#00e5ff';
      emissiveCtx.strokeStyle = eCol;
      emissiveCtx.lineWidth = 3;

      for (let i = 0; i < 20; i++) {
        const x1 = Math.floor(Math.random() * (size / grid)) * grid;
        const y1 = Math.floor(Math.random() * (size / grid)) * grid;
        const x2 = x1 + (Math.random() > 0.5 ? 64 : -64);
        const y2 = y1 + (Math.random() > 0.5 ? 64 : -64);

        heightCtx.beginPath();
        heightCtx.moveTo(x1, y1);
        heightCtx.lineTo(x2, y1);
        heightCtx.lineTo(x2, y2);
        heightCtx.stroke();

        emissiveCtx.beginPath();
        emissiveCtx.moveTo(x1, y1);
        emissiveCtx.lineTo(x2, y1);
        emissiveCtx.lineTo(x2, y2);
        emissiveCtx.stroke();

        // Node pad
        heightCtx.fillStyle = '#ffffff';
        heightCtx.beginPath();
        heightCtx.arc(x2, y2, 4, 0, Math.PI * 2);
        heightCtx.fill();

        emissiveCtx.fillStyle = eCol;
        emissiveCtx.beginPath();
        emissiveCtx.arc(x2, y2, 4, 0, Math.PI * 2);
        emissiveCtx.fill();
      }
      break;
    }

    case 'weathered_stone': {
      // Porous noisy surface with chiseled rock fissures
      const hData = heightCtx.getImageData(0, 0, size, size);
      const aData = albedoCtx.getImageData(0, 0, size, size);
      const rData = roughnessCtx.getImageData(0, 0, size, size);

      for (let i = 0; i < hData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 45;
        hData.data[i] = Math.max(0, Math.min(255, 128 + noise));
        hData.data[i + 1] = hData.data[i];
        hData.data[i + 2] = hData.data[i];

        rData.data[i] = Math.max(0, Math.min(255, 200 + noise * 0.5));
        rData.data[i + 1] = rData.data[i];
        rData.data[i + 2] = rData.data[i];

        aData.data[i] = Math.max(0, Math.min(255, aData.data[i] + noise * 0.7));
        aData.data[i + 1] = Math.max(0, Math.min(255, aData.data[i + 1] + noise * 0.7));
        aData.data[i + 2] = Math.max(0, Math.min(255, aData.data[i + 2] + noise * 0.7));
      }
      heightCtx.putImageData(hData, 0, 0);
      albedoCtx.putImageData(aData, 0, 0);
      roughnessCtx.putImageData(rData, 0, 0);
      break;
    }

    case 'gold_inlay': {
      // Ornate baroque / metallic filigree
      roughnessCtx.fillStyle = '#303030';
      roughnessCtx.fillRect(0, 0, size, size);

      albedoCtx.strokeStyle = '#ffd700';
      albedoCtx.lineWidth = 4;
      heightCtx.strokeStyle = '#ffffff';
      heightCtx.lineWidth = 4;

      for (let r = 40; r < size / 2; r += 40) {
        albedoCtx.beginPath();
        albedoCtx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        albedoCtx.stroke();

        heightCtx.beginPath();
        heightCtx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        heightCtx.stroke();
      }
      break;
    }

    default: {
      // Subtle micro-surface noise
      const hData = heightCtx.getImageData(0, 0, size, size);
      for (let i = 0; i < hData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        hData.data[i] = 128 + noise;
        hData.data[i + 1] = 128 + noise;
        hData.data[i + 2] = 128 + noise;
      }
      heightCtx.putImageData(hData, 0, 0);
      break;
    }
  }
}

/**
 * Computes a normal map from a height map using a Sobel filter.
 */
function convertHeightToNormalMap(heightCanvas: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;

  const hCtx = heightCanvas.getContext('2d')!;
  const hData = hCtx.getImageData(0, 0, size, size).data;
  const nData = nCtx.createImageData(size, size);

  const getH = (x: number, y: number): number => {
    const cx = (x + size) % size;
    const cy = (y + size) % size;
    return hData[(cy * size + cx) * 4] / 255.0;
  };

  const strength = 3.0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sobel kernel for dX and dY
      const tl = getH(x - 1, y - 1);
      const l  = getH(x - 1, y);
      const bl = getH(x - 1, y + 1);
      const tr = getH(x + 1, y - 1);
      const r  = getH(x + 1, y);
      const br = getH(x + 1, y + 1);
      const t  = getH(x, y - 1);
      const b  = getH(x, y + 1);

      const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      nData.data[idx]     = Math.floor(((nx + 1.0) * 0.5) * 255);
      nData.data[idx + 1] = Math.floor(((ny + 1.0) * 0.5) * 255);
      nData.data[idx + 2] = Math.floor(((nz + 1.0) * 0.5) * 255);
      nData.data[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nData, 0, 0);
  return normalCanvas;
}

/**
 * Upgrades a Three.js mesh with photorealistic PBR materials, normal mapping, and high-frequency textures.
 */
export function applyPBRMaterialToMesh(
  mesh: THREE.Mesh,
  options: {
    style?: PBRTextureStyle;
    baseColor?: string;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    opacity?: number;
    wireframe?: boolean;
  }
) {
  const style = options.style || 'cyber_armor';
  const baseColor = options.baseColor || '#475569';
  const pbr = getOrCreatePBRTextures(style, baseColor, options.emissive);

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    map: pbr.diffuseMap,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: pbr.roughnessMap,
    roughness: options.roughness ?? 0.45,
    metalness: options.metalness ?? 0.35,
    aoMap: pbr.aoMap,
    aoMapIntensity: 1.0,
    emissiveMap: pbr.emissiveMap,
    emissive: options.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: options.emissiveIntensity ?? (options.emissive ? 1.0 : 0.0),
    clearcoat: options.clearcoat ?? (options.metalness && options.metalness > 0.5 ? 0.3 : 0.0),
    clearcoatRoughness: options.clearcoatRoughness ?? 0.1,
    transparent: (options.opacity !== undefined && options.opacity < 1.0),
    opacity: options.opacity ?? 1.0,
    wireframe: options.wireframe ?? false
  });

  // Ensure vertex normals and UVs exist
  if (mesh.geometry) {
    mesh.geometry.computeVertexNormals();
  }

  mesh.material = mat;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mat;
}
