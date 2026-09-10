import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Audio Helpers
const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.readAsDataURL(blob);
    });
};

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private isConnected = false;
  private onVolumeChange: ((level: number) => void) | null = null;
  private frameInterval: number | null = null;
  private captureCanvas: HTMLCanvasElement | null = null;
  private sessionPromise: Promise<any> | null = null;

  constructor() {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY || (typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) || '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  public async connect(
    onStatusChange: (status: string) => void, 
    onVolumeChange: (level: number) => void,
    videoStream?: MediaStream
  ) {
    if (this.isConnected) return;
    
    this.onVolumeChange = onVolumeChange;
    this.videoStream = videoStream || null;
    onStatusChange("Requesting Microphone...");

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });

      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      onStatusChange("Connecting to Neural Link...");

      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are the UE5 Architect "Live Eyes" system. 
          You are acting as a Senior Pair Programmer. 
          You can see the user's screen (Unreal Engine 5). 
          Watch for: 
          1. Blueprint errors (wrong connections, missing variables).
          2. Performance warnings (Shader complexity, Stat Unit numbers).
          3. Best practices (CCD on fast objects, Lumen vs Static lighting).
          Keep responses concise and verbally guide them as if you are looking over their shoulder.`,
        },
        callbacks: {
          onopen: () => {
            onStatusChange("Connected" + (this.videoStream ? " with Vision" : ""));
            this.isConnected = true;
            this.startAudioInput();
            if (this.videoStream) {
                this.startVideoStreaming();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleIncomingMessage(message);
          },
          onclose: () => {
            onStatusChange("Disconnected");
            this.disconnect();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            onStatusChange("Error");
            this.disconnect();
          }
        }
      });

    } catch (error) {
      console.error("Failed to initialize live session:", error);
      onStatusChange("Failed");
      this.disconnect();
      throw error;
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.mediaStream || !this.sessionPromise) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      if (this.onVolumeChange) this.onVolumeChange(rms);

      const pcm16 = floatTo16BitPCM(inputData);
      const base64Data = arrayBufferToBase64(pcm16);

      this.sessionPromise!.then((session) => {
          session.sendRealtimeInput({
              media: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Data
              }
          });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private startVideoStreaming() {
      if (!this.videoStream || !this.sessionPromise) return;

      const videoTrack = this.videoStream.getVideoTracks()[0];
      const videoElement = document.createElement('video');
      videoElement.srcObject = this.videoStream;
      videoElement.play();

      this.captureCanvas = document.createElement('canvas');
      const ctx = this.captureCanvas.getContext('2d');

      // 1 Frame per 2 seconds is enough for architectural feedback and saves bandwidth
      this.frameInterval = window.setInterval(() => {
          if (!ctx || !this.captureCanvas || !videoTrack.enabled) return;

          const width = videoElement.videoWidth;
          const height = videoElement.videoHeight;
          if (width === 0 || height === 0) return;

          this.captureCanvas.width = 640; // Downscale for API efficiency
          this.captureCanvas.height = (height / width) * 640;

          ctx.drawImage(videoElement, 0, 0, this.captureCanvas.width, this.captureCanvas.height);
          
          this.captureCanvas.toBlob(async (blob) => {
              if (blob && this.sessionPromise) {
                  const base64Data = await blobToBase64(blob);
                  this.sessionPromise.then((session) => {
                      session.sendRealtimeInput({
                          media: {
                              mimeType: 'image/jpeg',
                              data: base64Data
                          }
                      });
                  });
              }
          }, 'image/jpeg', 0.6);

      }, 2000);
  }

  private async handleIncomingMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext) return;

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      const audioData = base64ToUint8Array(base64Audio);
      const audioBuffer = await this.pcmToAudioBuffer(audioData, this.outputAudioContext);
      this.playAudioBuffer(audioBuffer);
    }

    if (message.serverContent?.interrupted) {
        // Clear audio queue if interrupted
        this.nextStartTime = 0;
    }
  }

  private pcmToAudioBuffer(pcmData: Uint8Array, context: AudioContext): AudioBuffer {
    const frameCount = pcmData.byteLength / 2;
    const audioBuffer = context.createBuffer(1, frameCount, 24000);
    const channelData = audioBuffer.getChannelData(0);
    const dataView = new DataView(pcmData.buffer);

    for (let i = 0; i < frameCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
    }

    return audioBuffer;
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);

    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  public disconnect() {
    this.isConnected = false;
    
    if (this.frameInterval) {
        clearInterval(this.frameInterval);
        this.frameInterval = null;
    }

    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
        this.processor = null;
    }
    
    if (this.source) {
        this.source.disconnect();
        this.source = null;
    }

    if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
    }

    if (this.videoStream) {
        this.videoStream.getTracks().forEach(track => track.stop());
        this.videoStream = null;
    }

    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    
    this.sessionPromise = null;
  }
}

export const liveClient = new LiveClient();
