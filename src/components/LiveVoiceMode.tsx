
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Radio, Activity, Monitor, Eye, EyeOff, Sparkles, Zap } from 'lucide-react';

interface LiveVoiceModeProps {
    isActive: boolean;
    status: string;
    volume: number;
    videoStream: MediaStream | null;
    onClose: () => void;
}

const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ isActive, status, volume, videoStream, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const particlesRef = useRef<{x: number, y: number, r: number, vx: number, vy: number}[]>([]);

    useEffect(() => {
        if (videoRef.current && videoStream) {
            videoRef.current.srcObject = videoStream;
        }
    }, [videoStream]);

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize Particles
        if (particlesRef.current.length === 0) {
            for(let i=0; i<60; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: Math.random() * 2 + 1,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5
                });
            }
        }

        let animationFrame: number;

        const render = () => {
            if (!canvas || !ctx) return;
            ctx.fillStyle = 'rgba(11, 15, 25, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            const baseRadius = videoStream ? 120 : 80;
            const dynamicRadius = baseRadius + (volume * 120);

            // Draw Central Orb Glow
            const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.3, centerX, centerY, dynamicRadius * 2);
            if (videoStream) {
                gradient.addColorStop(0, 'rgba(34, 211, 238, 0.9)'); // Cyan core for vision
                gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)'); 
            } else {
                gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // Blue core
                gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)'); // Purple mid
            }
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, dynamicRadius * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw Particles
            particlesRef.current.forEach(p => {
                p.x += p.vx + (volume * (Math.random() - 0.5) * 8);
                p.y += p.vy + (volume * (Math.random() - 0.5) * 8);

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = videoStream ? `rgba(165, 243, 252, ${0.4 + volume})` : `rgba(100, 200, 255, ${0.3 + volume})`;
                ctx.fill();
            });

            // Neural Scanning Line if video is active
            if (videoStream) {
                const scanY = (Date.now() % 2000) / 2000 * canvas.height;
                ctx.beginPath();
                ctx.moveTo(0, scanY);
                ctx.lineTo(canvas.width, scanY);
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            animationFrame = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrame);
    }, [isActive, volume, videoStream]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0f19]/98 backdrop-blur-3xl animate-in fade-in duration-700">
            <canvas 
                ref={canvasRef} 
                width={window.innerWidth} 
                height={window.innerHeight} 
                className="absolute inset-0 pointer-events-none opacity-60"
            />

            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-6xl px-12">
                
                <div className="text-center space-y-6 mb-12">
                    <div className="flex items-center justify-center gap-4">
                        {videoStream ? (
                            <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse">
                                <Eye className="w-6 h-6 text-cyan-400" />
                            </div>
                        ) : (
                            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/40">
                                <Sparkles className="w-6 h-6 text-blue-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                {videoStream ? 'Live Eyes' : 'Live Architect'}
                            </h2>
                            <div className="flex items-center justify-center gap-2 text-cyan-300 font-mono text-xs mt-2 uppercase tracking-[0.2em] bg-cyan-950/40 px-4 py-1.5 rounded-full border border-cyan-500/20">
                                <Zap className="w-3 h-3 animate-bounce" />
                                {status}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full items-center">
                    {/* Visual Interface */}
                    <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                        {videoStream ? (
                            <>
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    className="w-full h-full object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Neural Feed Active</span>
                                </div>
                                {/* Scanning Hud */}
                                <div className="absolute inset-0 pointer-events-none opacity-40">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 m-6 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 m-6 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 m-6 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 m-6 rounded-br-lg" />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 bg-[#0c1220]">
                                <EyeOff className="w-16 h-16 mb-4 opacity-10" />
                                <p className="text-sm font-medium tracking-widest uppercase opacity-20">Visual Cortex Offline</p>
                            </div>
                        )}
                    </div>

                    {/* Dialogue & Status */}
                    <div className="space-y-8">
                        <div className="glass-panel p-8 rounded-3xl border-white/5 bg-white/5 backdrop-blur-2xl">
                            <h4 className="text-xs font-black text-cyan-500 uppercase tracking-[0.3em] mb-6">Cognitive Processing</h4>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl transition-all duration-500 ${volume > 0.05 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Audio Input</div>
                                        <div className="h-1.5 w-48 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-cyan-400 transition-all duration-100" style={{ width: `${volume * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl transition-all duration-500 ${videoStream ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-600'}`}>
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Visual Stream</div>
                                        <div className="text-sm font-bold text-slate-300">
                                            {videoStream ? 'Unreal Engine Link Active' : 'Waiting for Vision...'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                <PhoneOff className="w-5 h-5" />
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>

                <p className="mt-16 text-slate-500 text-sm max-w-2xl text-center leading-relaxed font-light">
                    The Live Architect is observing your viewport. <br/>
                    <span className="text-cyan-400/60 font-medium italic">"Hey Architect, look at my character blueprint, is the jump logic correct?"</span>
                </p>
            </div>
        </div>
    );
};

export default LiveVoiceMode;
