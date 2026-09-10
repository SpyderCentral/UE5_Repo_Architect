
import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, Cpu, Zap, Code, ShieldCheck, ArrowRight, CheckCircle2, Globe, MousePointer2, Image as ImageIcon } from 'lucide-react';

interface LandingPageProps {
  onStart: (tier: 'hobbyist' | 'indie' | 'studio') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [currency, setCurrency] = useState({ symbol: '$', code: 'USD', factor: 1 });
  const [location, setLocation] = useState('Global');

  useEffect(() => {
    const detectRegion = async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            
            if (data.country_code === 'IN') {
                setCurrency({ symbol: '₹', code: 'INR', factor: 80 });
                setLocation('India');
            } else if (data.country_code === 'GB') {
                setCurrency({ symbol: '£', code: 'GBP', factor: 0.8 });
                setLocation('United Kingdom');
            } else if (data.country_code === 'EU' || ['DE', 'FR', 'ES', 'IT'].includes(data.country_code)) {
                setCurrency({ symbol: '€', code: 'EUR', factor: 0.92 });
                setLocation('Europe');
            } else {
                setCurrency({ symbol: '$', code: 'USD', factor: 1 });
                setLocation(data.country_name || 'Global');
            }
        } catch (e) {
            console.warn("Location detection failed, defaulting to USD", e);
        }
    };

    detectRegion();
  }, []);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const pricing = [
    {
      id: 'hobbyist',
      name: 'Hobbyist',
      price: 0,
      desc: 'Perfect for learning the ropes of UE5.',
      features: ['Basic Roadmap Generation', '1 Active Project', 'Core Blueprint Specs', 'Standard Templates'],
      color: 'blue'
    },
    {
      id: 'indie',
      name: 'Indie Architect',
      price: 19,
      desc: 'For serious developers shipping games.',
      features: ['Unlimited Projects', 'C++ Source Transpiler', 'AI Vision Board', 'Design Review Board', 'Export to T3D/Python'],
      popular: true,
      color: 'indigo'
    },
    {
      id: 'studio',
      name: 'Studio Master',
      price: 99,
      desc: 'Advanced tools for professional teams.',
      features: ['Multi-Agent Logic Verification', 'Full Project Drive Sync', 'Performance Diagnosis', 'Marketplace Conflict Mapping', 'Priority Neural Link'],
      color: 'purple'
    }
  ];

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    const converted = Math.round(price * currency.factor);
    return `${currency.symbol}${converted}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-float opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-float-slow opacity-30"></div>
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/5 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-2 rounded-xl border border-white/10 shadow-xl ring-4 ring-blue-500/10">
                <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white uppercase">UE5 <span className="text-blue-400">Architect</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <button onClick={() => scrollToId('features')} className="hover:text-blue-400 transition-colors">Capabilities</button>
            <button onClick={() => scrollToId('pricing')} className="hover:text-blue-400 transition-colors">Pricing</button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-full border border-white/5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-500">{location} ({currency.code})</span>
            </div>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-40 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Open Access Public Preview
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-white leading-tight tracking-tighter mb-8 drop-shadow-2xl">
          Architect Your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 text-glow">Unreal Dream</span>
        </h1>
        
        <p className="max-w-2xl text-xl text-slate-400 font-light leading-relaxed mb-12 animate-in fade-in duration-1000">
          The ultimate AI-powered companion for Unreal Engine 5 developers. Transform your concept into a production-ready technical roadmap in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 animate-in fade-in zoom-in duration-700 delay-300">
          <button 
            onClick={() => onStart('indie')}
            className="group relative px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)] active:scale-95"
          >
            <div className="flex items-center gap-3">
              Start Designing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
          <button 
            onClick={() => scrollToId('gallery')}
            className="px-10 py-5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl font-black text-sm uppercase tracking-[0.2em] border border-white/5 transition-all shadow-xl"
          >
             Explore Gallery
          </button>
        </div>

        <div className="mt-24 w-full max-w-5xl aspect-video rounded-3xl glass-panel border border-white/10 shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent pointer-events-none"></div>
           <div className="absolute top-4 left-6 flex gap-1.5">
             <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
           </div>
           <div className="h-full flex items-center justify-center p-10">
              <div className="grid grid-cols-3 gap-6 w-full opacity-60 group-hover:opacity-100 transition-opacity duration-1000">
                <div className="h-40 rounded-2xl bg-slate-900 border border-white/5 animate-pulse"></div>
                <div className="h-60 rounded-2xl bg-slate-800 border border-white/5 animate-pulse delay-75"></div>
                <div className="h-40 rounded-2xl bg-slate-900 border border-white/5 animate-pulse delay-150"></div>
              </div>
           </div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-5 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
                 <MousePointer2 className="w-12 h-12 text-white/40 animate-bounce" />
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32 bg-slate-900/20 rounded-[4rem] border border-white/5 scroll-mt-24">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Neural Studio Capabilities</h2>
          <p className="text-slate-500 font-light max-w-xl mx-auto">Engineered to handle every stage of your development pipeline.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[
             { icon: <Cpu />, title: "Blueprint Architect", desc: "Interactive event graphs generated from high-level logic requirements." },
             { icon: <Code />, title: "C++ Transpiler", desc: "Instantly convert visual logic into production-grade native source code." },
             { icon: <Zap />, title: "Lumen Optimization", desc: "Performance advisor trained on millions of real-time rendering metrics." },
             { icon: <Globe />, title: "World Cartographer", desc: "Procedural level layout with real-world landmark grounding." },
             { icon: <Layers />, title: "Marketplace Scout", desc: "Dependency analysis for Fab.com assets to prevent class collisions." },
             { icon: <ShieldCheck />, title: "Logic Verification", desc: "Multi-agent review system to ensure architectural integrity." },
           ].map((feat, i) => (
             <div key={i} className="glass-card p-8 rounded-3xl group">
               <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                 {React.cloneElement(feat.icon as React.ReactElement, { className: "w-7 h-7" })}
               </div>
               <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feat.title}</h3>
               <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Gallery Showcase Section */}
      <section id="gallery" className="max-w-7xl mx-auto px-6 py-32 scroll-mt-24">
        <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Vision Showcase</h2>
            <p className="text-slate-500 font-light max-w-xl mx-auto">See what others are building with the power of generative architecture.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="aspect-square rounded-3xl bg-slate-900 border border-white/5 overflow-hidden group relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <ImageIcon className="w-12 h-12 text-slate-700 mb-4 group-hover:text-blue-400 transition-colors" />
                    <h4 className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">Neo-Cyber City</h4>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">Architecture Spec</p>
                 </div>
            </div>
            <div className="aspect-square rounded-3xl bg-slate-900 border border-white/5 overflow-hidden group relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <ImageIcon className="w-12 h-12 text-slate-700 mb-4 group-hover:text-purple-400 transition-colors" />
                    <h4 className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">Gothic Cathedral</h4>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">Lumen Study</p>
                 </div>
            </div>
            <div className="aspect-square rounded-3xl bg-slate-900 border border-white/5 overflow-hidden group relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <ImageIcon className="w-12 h-12 text-slate-700 mb-4 group-hover:text-emerald-400 transition-colors" />
                    <h4 className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">Verdant Valley</h4>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">PCG Ecosystem</p>
                 </div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-32 scroll-mt-24">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Modular Tiers</h2>
          <p className="text-slate-500 font-light">Flexible plans for creators of all scales. Get started instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricing.map((plan) => (
            <div key={plan.id} className={`glass-panel p-10 rounded-[3rem] flex flex-col relative transition-all duration-500 hover:scale-[1.02] ${plan.popular ? 'border-blue-500 shadow-[0_0_50px_rgba(37,99,235,0.1)]' : 'border-white/5'}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl">
                  Most Preferred
                </div>
              )}
              
              <div className="mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black text-white tracking-tighter">{formatPrice(plan.price)}</span>
                  <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{plan.price === 0 ? '' : '/ Month'}</span>
                </div>
                <p className="text-slate-500 text-sm font-light">{plan.desc}</p>
              </div>

              <div className="space-y-5 flex-1 mb-12">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300 font-light">{feat}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onStart(plan.id as any)}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${
                  plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5'
                }`}
              >
                {plan.price === 0 ? 'Start Building' : 'Choose Plan'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-20 pb-12 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-6">
           <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
             <Layers className="w-8 h-8 text-blue-400" />
             <span className="text-xl font-black tracking-tight text-white uppercase">UE5 ARCHITECT</span>
           </div>
           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
             &copy; 2025 Architectural Neural Systems &bull; Built with Gemini 3 Pro
           </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
