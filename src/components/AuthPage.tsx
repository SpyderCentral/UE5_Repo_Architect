
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, Chrome, Loader2, Sparkles, ShieldCheck, ChevronLeft, Layers, AlertCircle, Building2, Briefcase, Cpu, CheckCircle2, ArrowRight, Smartphone, Monitor, Code2, Globe, Bell, Info } from 'lucide-react';
import { AuthUser } from '../types';
import { authService } from '../services/authService';

interface AuthPageProps {
  onLogin: (user: AuthUser) => void;
  onBack: () => void;
}

type AuthViewState = 'login' | 'signup_details' | 'signup_verify';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onBack }) => {
  const [viewState, setViewState] = useState<AuthViewState>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [systemNotification, setSystemNotification] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
      email: '', 
      password: '', 
      name: '',
      studioName: '',
      primaryRole: 'Lead Technical Artist',
      specialty: 'Blueprints & Logic',
      preferredScripting: 'C++ & Blueprints',
      targetPlatform: 'PC & Console',
      verificationCode: ''
  });

  const googleButtonRef = useRef<HTMLDivElement>(null);

  // IMPORTANT: Replace this with your client ID from https://console.cloud.google.com/
  const GOOGLE_CLIENT_ID = "YOUR_REAL_CLIENT_ID.apps.googleusercontent.com";

  useEffect(() => {
    if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID, 
            callback: async (response: any) => {
                setIsLoading(true);
                try {
                    const user = await authService.handleGoogleCredential(response.credential);
                    onLogin(user);
                } catch (err: any) {
                    setErrorMessage("Google Sign-In Error: Make sure your Client ID is valid for this domain.");
                } finally {
                    setIsLoading(false);
                }
            }
        });
        
        if (googleButtonRef.current) {
            (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
                theme: 'outline',
                size: 'large',
                width: 320,
                text: 'continue_with',
                shape: 'rectangular'
            });
        }
    }
  }, [viewState]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
        const user = await authService.signIn(formData.email, formData.password);
        onLogin(user);
    } catch (err: any) {
        setErrorMessage(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRequestVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
        const code = await authService.requestVerification(formData);
        setViewState('signup_verify');
        setSuccessMessage(`Security protocol initiated. Verification code dispatched to your Neural ID.`);
        
        // Show the code in-app for the user to "receive" it
        setTimeout(() => {
            setSystemNotification(`[INCOMING TRANSMISSION]: Your synchronization code is ${code}. Please enter it now to finalize your profile.`);
        }, 1200);
    } catch (err: any) {
        setErrorMessage(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
        const user = await authService.verifyAndSignUp(formData.email, formData.verificationCode);
        onLogin(user);
    } catch (err: any) {
        setErrorMessage(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const simulateGoogleAuth = async () => {
    setIsLoading(true);
    const mockUser: AuthUser = {
        id: `google_mock_${Date.now()}`,
        email: "demo.architect@studio.io",
        name: "Architect Prime",
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
        provider: 'google',
        isVerified: true,
        studioName: 'AI Neural Lab'
    };
    await new Promise(r => setTimeout(r, 1500));
    onLogin(mockUser);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-float opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-float-slow opacity-30"></div>
      
      {/* In-App Verification Code Receipt (Simulation of receiving email) */}
      {systemNotification && (
          <div className="fixed top-8 right-8 z-[100] w-80 glass-panel p-5 rounded-2xl border-blue-500/50 bg-blue-900/20 shadow-[0_0_50px_rgba(59,130,246,0.4)] animate-in slide-in-from-right-8 duration-500 border">
              <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                      <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                      <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                         Secure Link Established
                      </div>
                      <div className="text-[13px] text-slate-100 font-medium leading-relaxed">{systemNotification}</div>
                      <button 
                        onClick={() => setSystemNotification(null)}
                        className="mt-4 text-[10px] font-black text-blue-500 hover:text-white uppercase tracking-widest transition-all bg-blue-500/10 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/30"
                      >
                        Acknowledge Signal
                      </button>
                  </div>
              </div>
          </div>
      )}

      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Portal Root
      </button>

      <div className="w-full max-w-5xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="flex flex-col items-center mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-4 rounded-2xl border border-white/10 shadow-2xl ring-8 ring-blue-500/5 mb-6 scale-110">
             <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-center">
            {viewState === 'login' ? 'System Uplink' : 'Initialize Architect Profile'}
          </h1>
          <p className="text-slate-500 text-sm font-light text-center max-w-[450px] leading-relaxed">
            {viewState === 'login' ? 'Synchronize your workspace with the architectural grid.' : 'Complete your technical induction to enable AI-powered UE5 roadmap mapping.'}
          </p>
        </div>

        <div className="glass-panel p-1 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden bg-slate-900/40">
          
          <div className="flex flex-col lg:flex-row min-h-[500px]">
             {/* Left Info Panel */}
             <div className="hidden lg:flex flex-col w-80 bg-gradient-to-b from-blue-600/10 to-transparent border-r border-white/5 p-10">
                 <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-12">Network Protocol</h3>
                 <div className="space-y-12">
                     <div className="flex gap-5 group">
                         <div className="shrink-0 w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-600 group-hover:border-blue-400 transition-all duration-500 shadow-lg">
                            <Cpu className="w-6 h-6 text-blue-400 group-hover:text-white" />
                         </div>
                         <div>
                             <div className="text-[11px] font-black text-white mb-1.5 uppercase tracking-wider">Logic Synthesis</div>
                             <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Production-grade Blueprint and C++ source generation.</p>
                         </div>
                     </div>
                     <div className="flex gap-5 group">
                         <div className="shrink-0 w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 group-hover:bg-purple-600 group-hover:border-purple-400 transition-all duration-500 shadow-lg">
                            <Sparkles className="w-6 h-6 text-purple-400 group-hover:text-white" />
                         </div>
                         <div>
                             <div className="text-[11px] font-black text-white mb-1.5 uppercase tracking-wider">Neural Vision</div>
                             <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Real-time scene analysis via Screen-Space architectural link.</p>
                         </div>
                     </div>
                     <div className="flex gap-5 group">
                         <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:border-emerald-400 transition-all duration-500 shadow-lg">
                            <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:text-white" />
                         </div>
                         <div>
                             <div className="text-[11px] font-black text-white mb-1.5 uppercase tracking-wider">Verified Sync</div>
                             <p className="text-[10px] text-slate-500 leading-relaxed font-medium">End-to-end encrypted local drive project synchronization.</p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="mt-auto pt-10">
                    <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Neural Status</div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                             <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Core Synchronized</span>
                        </div>
                    </div>
                 </div>
             </div>

             {/* Main Content Form */}
             <div className="flex-1 p-8 sm:p-12 lg:p-16 bg-slate-900/10">
                {errorMessage && (
                    <div className="mb-8 p-5 bg-red-500/10 border border-red-500/40 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300">
                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                        <div className="flex-1">
                            <div className="text-xs text-red-200 font-black uppercase tracking-widest mb-1">Authorization Fault</div>
                            <span className="text-xs text-red-300/80 font-medium leading-relaxed">{errorMessage}</span>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                            <div className="text-xs text-emerald-100 font-black uppercase tracking-widest mb-1">Protocol Success</div>
                            <span className="text-xs text-emerald-300 font-medium leading-relaxed">{successMessage}</span>
                        </div>
                    </div>
                )}

                {viewState === 'login' && (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        <div className="flex flex-col gap-8">
                             {/* Real Google Button Container */}
                             <div className="flex flex-col items-center gap-5">
                                <div ref={googleButtonRef} className="w-full flex justify-center scale-110"></div>
                                
                                <button 
                                    type="button"
                                    onClick={simulateGoogleAuth}
                                    className="flex items-center gap-3 px-8 py-3.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/5 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
                                >
                                    <Info className="w-4 h-4 text-blue-400" />
                                    Bypass with Mock Sync (Demo Only)
                                </button>
                             </div>

                             <div className="flex items-center gap-8 py-2">
                                <div className="h-px flex-1 bg-white/5"></div>
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Legacy Uplink</span>
                                <div className="h-px flex-1 bg-white/5"></div>
                            </div>
                        </div>

                        <form onSubmit={handleSignIn} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="email" required
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-slate-950/80 border border-white/10 rounded-[1.25rem] pl-16 pr-8 py-5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-800 font-medium"
                                        placeholder="architect@studio.io"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Passkey</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="password" required
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full bg-slate-950/80 border border-white/10 rounded-[1.25rem] pl-16 pr-8 py-5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-800 font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" disabled={isLoading}
                                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(37,99,235,0.2)] active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                Establish Neural Link
                            </button>
                        </form>
                        
                        <div className="text-center pt-6">
                            <button 
                                onClick={() => { setViewState('signup_details'); setErrorMessage(null); setSuccessMessage(null); }}
                                className="text-[11px] font-black text-slate-600 hover:text-blue-400 uppercase tracking-[0.2em] transition-all"
                            >
                                Not in registry? <span className="text-blue-500 ml-2 border-b border-blue-500/30 pb-1">Create Architect Unit</span>
                            </button>
                        </div>
                    </div>
                )}

                {viewState === 'signup_details' && (
                    <div className="space-y-10 animate-in slide-in-from-right-8 duration-700">
                        <div className="flex items-center justify-between border-b border-white/10 pb-6">
                             <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Technical Induction</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Stage 01: Profile Definition</p>
                             </div>
                             <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-widest shadow-lg">New Unit</span>
                        </div>

                        <form onSubmit={handleRequestVerify} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><User className="w-3 h-3 text-blue-400" /> Full Name</label>
                                <input type="text" required placeholder="Architect Identity" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail className="w-3 h-3 text-blue-400" /> Neural ID (Email)</label>
                                <input type="email" required placeholder="name@domain.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Building2 className="w-3 h-3 text-purple-400" /> Studio / Org</label>
                                <input type="text" required placeholder="Indie Lab / Studio Name" value={formData.studioName} onChange={e => setFormData({...formData, studioName: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase className="w-3 h-3 text-purple-400" /> Primary Role</label>
                                <div className="relative">
                                    <select value={formData.primaryRole} onChange={e => setFormData({...formData, primaryRole: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer shadow-inner">
                                        <option>Lead Technical Artist</option>
                                        <option>Gameplay Engineer</option>
                                        <option>Systems Architect</option>
                                        <option>Solo Indie Creator</option>
                                        <option>Tools Developer</option>
                                    </select>
                                    <ChevronLeft className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-[-90deg] pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Code2 className="w-3 h-3 text-emerald-400" /> Logic Standard</label>
                                <div className="relative">
                                    <select value={formData.preferredScripting} onChange={e => setFormData({...formData, preferredScripting: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer shadow-inner">
                                        <option>C++ Heavy</option>
                                        <option>Blueprint Native</option>
                                        <option>Hybrid Approach</option>
                                        <option>Python Automation</option>
                                    </select>
                                    <ChevronLeft className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-[-90deg] pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Monitor className="w-3 h-3 text-emerald-400" /> Target Platform</label>
                                <div className="relative">
                                    <select value={formData.targetPlatform} onChange={e => setFormData({...formData, targetPlatform: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer shadow-inner">
                                        <option>Desktop / PC</option>
                                        <option>Consoles (PS5/Xbox)</option>
                                        <option>Mobile (iOS/Android)</option>
                                        <option>XR / Vision Pro</option>
                                    </select>
                                    <ChevronLeft className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-[-90deg] pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock className="w-3 h-3 text-red-400" /> Neural Passkey</label>
                                <input type="password" required placeholder="Select a secure credential" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" />
                            </div>
                            
                            <button 
                                type="submit" disabled={isLoading}
                                className="md:col-span-2 mt-8 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.35em] transition-all shadow-[0_20px_40px_rgba(37,99,235,0.25)] active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                Request Sync Code
                            </button>
                        </form>

                        <div className="text-center">
                            <button 
                                onClick={() => setViewState('login')}
                                className="text-[11px] font-black text-slate-600 hover:text-blue-400 uppercase tracking-[0.2em] transition-all"
                            >
                                Link already active? <span className="text-blue-500 ml-1">Return to Uplink</span>
                            </button>
                        </div>
                    </div>
                )}

                {viewState === 'signup_verify' && (
                    <div className="space-y-12 animate-in zoom-in-95 duration-700 text-center py-10">
                        <div className="flex flex-col items-center">
                            <div className="w-28 h-28 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/40 mb-10 shadow-[0_0_60px_rgba(59,130,246,0.4)] animate-pulse">
                                <Smartphone className="w-12 h-12 text-blue-400" />
                            </div>
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Neural Synchronization</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                                Enter the 6-digit cryptographic sync code sent to your terminal: <br/>
                                <span className="text-white font-mono font-bold mt-3 inline-block bg-slate-800 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner">{formData.email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerifyCode} className="space-y-12">
                            <div className="flex justify-center">
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    required
                                    autoFocus
                                    value={formData.verificationCode}
                                    onChange={e => setFormData({...formData, verificationCode: e.target.value.replace(/[^0-9]/g, '')})}
                                    placeholder="000000"
                                    className="w-72 bg-slate-950/80 border-b-4 border-blue-500 text-center text-6xl font-mono tracking-[0.4em] text-white focus:outline-none py-6 transition-all shadow-2xl rounded-t-xl"
                                />
                            </div>
                            
                            <div className="space-y-8">
                                <button 
                                    type="submit" disabled={isLoading || formData.verificationCode.length !== 6}
                                    className="w-full max-w-sm mx-auto py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Finalize Synchronization
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => { setViewState('signup_details'); setSuccessMessage(null); setSystemNotification(null); }}
                                    className="text-[11px] font-black text-slate-700 hover:text-white uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mx-auto group"
                                >
                                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    Modify Induction Parameters
                                </button>
                            </div>
                        </form>
                    </div>
                )}
             </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-center gap-12 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
           <div className="flex items-center gap-4">
             <Globe className="w-5 h-5 text-blue-400" />
             <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Architect Grid Node: 001</span>
           </div>
           <div className="h-5 w-px bg-white/10"></div>
           <div className="flex items-center gap-4">
             <ShieldCheck className="w-5 h-5 text-emerald-400" />
             <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Secured via Neural Link</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
