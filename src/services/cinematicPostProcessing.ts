import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

export interface PostProcessingConfig {
  enabled: boolean;
  preset: 'ue5_lumen' | 'cyberpunk_neon' | 'studio_clean' | 'cinematic_film' | 'custom';
  
  // Bloom
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  
  // Depth of Field (Bokeh)
  dofEnabled: boolean;
  dofFocus: number;
  dofAperture: number;
  dofMaxBlur: number;
  
  // Color Grading & Lens
  vignetteStrength: number;
  chromaticAberration: number;
  saturation: number;
  contrast: number;
  exposure: number;
  fxaaEnabled: boolean;
}

export const POST_PROCESSING_PRESETS: Record<string, Partial<PostProcessingConfig>> = {
  ue5_lumen: {
    preset: 'ue5_lumen',
    enabled: true,
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
  },
  cyberpunk_neon: {
    preset: 'cyberpunk_neon',
    enabled: true,
    bloomEnabled: true,
    bloomStrength: 1.8,
    bloomRadius: 0.8,
    bloomThreshold: 0.7,
    dofEnabled: true,
    dofFocus: 3.8,
    dofAperture: 0.018,
    dofMaxBlur: 0.02,
    vignetteStrength: 0.55,
    chromaticAberration: 0.0035,
    saturation: 1.35,
    contrast: 1.25,
    exposure: 1.1,
    fxaaEnabled: true,
  },
  studio_clean: {
    preset: 'studio_clean',
    enabled: true,
    bloomEnabled: true,
    bloomStrength: 0.4,
    bloomRadius: 0.3,
    bloomThreshold: 0.92,
    dofEnabled: false,
    dofFocus: 4.5,
    dofAperture: 0.008,
    dofMaxBlur: 0.008,
    vignetteStrength: 0.15,
    chromaticAberration: 0.0005,
    saturation: 1.0,
    contrast: 1.05,
    exposure: 1.0,
    fxaaEnabled: true,
  },
  cinematic_film: {
    preset: 'cinematic_film',
    enabled: true,
    bloomEnabled: true,
    bloomStrength: 1.1,
    bloomRadius: 0.6,
    bloomThreshold: 0.8,
    dofEnabled: true,
    dofFocus: 3.5,
    dofAperture: 0.022,
    dofMaxBlur: 0.025,
    vignetteStrength: 0.6,
    chromaticAberration: 0.0028,
    saturation: 0.95,
    contrast: 1.3,
    exposure: 0.98,
    fxaaEnabled: true,
  },
};

/**
 * Custom UE5 Cinematic Lens & Grading Shader
 */
export const UE5CinematicGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.35 },
    chromaticAberration: { value: 0.002 },
    saturation: { value: 1.15 },
    contrast: { value: 1.1 },
    exposure: { value: 1.0 },
    resolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float chromaticAberration;
    uniform float saturation;
    uniform float contrast;
    uniform float exposure;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 distFromCenter = uv - vec2(0.5);

      // Chromatic Aberration (Radial dispersion)
      vec2 caOffset = distFromCenter * chromaticAberration;
      float r = texture2D(tDiffuse, uv + caOffset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - caOffset).b;
      float a = texture2D(tDiffuse, uv).a;
      vec3 color = vec3(r, g, b);

      // Exposure adjustment
      color *= exposure;

      // Contrast S-Curve (ACES style)
      color = ((color - 0.5) * max(contrast, 0.0)) + 0.5;

      // Saturation
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);

      // Cinematic Vignette (Smooth corner falloff)
      float dist = length(distFromCenter);
      float vig = smoothstep(0.75, 0.25, dist * (1.0 + vignette * 0.8));
      color *= mix(1.0, vig, vignette);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), a);
    }
  `,
};

export class CinematicPostProcessingStack {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private bokehPass: BokehPass;
  private gradingPass: ShaderPass;
  private fxaaPass: ShaderPass;
  private outputPass: OutputPass;
  private config: PostProcessingConfig;
  private camera: THREE.PerspectiveCamera;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    initialConfig?: Partial<PostProcessingConfig>
  ) {
    this.camera = camera;
    this.config = {
      ...POST_PROCESSING_PRESETS.ue5_lumen,
      ...initialConfig,
    } as PostProcessingConfig;

    // 1. Initialize EffectComposer
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Base Render Pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 3. Unreal Bloom Pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      this.config.bloomStrength,
      this.config.bloomRadius,
      this.config.bloomThreshold
    );
    this.bloomPass.enabled = this.config.bloomEnabled;
    this.composer.addPass(this.bloomPass);

    // 4. Depth of Field (Bokeh Pass)
    this.bokehPass = new BokehPass(scene, camera, {
      focus: this.config.dofFocus,
      aperture: this.config.dofAperture,
      maxblur: this.config.dofMaxBlur,
    });
    this.bokehPass.enabled = this.config.dofEnabled;
    this.composer.addPass(this.bokehPass);

    // 5. Cinematic Grading & Lens Shader Pass
    this.gradingPass = new ShaderPass(UE5CinematicGradingShader);
    this.gradingPass.uniforms.vignette.value = this.config.vignetteStrength;
    this.gradingPass.uniforms.chromaticAberration.value = this.config.chromaticAberration;
    this.gradingPass.uniforms.saturation.value = this.config.saturation;
    this.gradingPass.uniforms.contrast.value = this.config.contrast;
    this.gradingPass.uniforms.exposure.value = this.config.exposure;
    this.gradingPass.uniforms.resolution.value.set(width, height);
    this.composer.addPass(this.gradingPass);

    // 6. Fast Approximate Anti-Aliasing (FXAA)
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    this.fxaaPass.enabled = this.config.fxaaEnabled;
    this.composer.addPass(this.fxaaPass);

    // 7. Output Pass
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  public updateConfig(newConfig: Partial<PostProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update Bloom
    this.bloomPass.enabled = this.config.bloomEnabled;
    this.bloomPass.strength = this.config.bloomStrength;
    this.bloomPass.radius = this.config.bloomRadius;
    this.bloomPass.threshold = this.config.bloomThreshold;

    // Update Depth of Field
    this.bokehPass.enabled = this.config.dofEnabled;
    if ((this.bokehPass as any).uniforms) {
      if ((this.bokehPass as any).uniforms['focus']) {
        (this.bokehPass as any).uniforms['focus'].value = this.config.dofFocus;
      }
      if ((this.bokehPass as any).uniforms['aperture']) {
        (this.bokehPass as any).uniforms['aperture'].value = this.config.dofAperture;
      }
      if ((this.bokehPass as any).uniforms['maxblur']) {
        (this.bokehPass as any).uniforms['maxblur'].value = this.config.dofMaxBlur;
      }
    }

    // Update Cinematic Grading
    this.gradingPass.uniforms.vignette.value = this.config.vignetteStrength;
    this.gradingPass.uniforms.chromaticAberration.value = this.config.chromaticAberration;
    this.gradingPass.uniforms.saturation.value = this.config.saturation;
    this.gradingPass.uniforms.contrast.value = this.config.contrast;
    this.gradingPass.uniforms.exposure.value = this.config.exposure;

    // Update FXAA
    this.fxaaPass.enabled = this.config.fxaaEnabled;
  }

  public applyPreset(presetKey: keyof typeof POST_PROCESSING_PRESETS): void {
    const preset = POST_PROCESSING_PRESETS[presetKey];
    if (preset) {
      this.updateConfig(preset);
    }
  }

  public resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.bloomPass.setSize(width, height);
    if ((this.bokehPass as any).setSize) {
      (this.bokehPass as any).setSize(width, height);
    }
    this.gradingPass.uniforms.resolution.value.set(width, height);
    this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
  }

  public render(delta: number): void {
    if (this.config.enabled) {
      this.composer.render(delta);
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getConfig(): PostProcessingConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
  }
}
