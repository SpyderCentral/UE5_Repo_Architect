
import React, { useState } from 'react';
import { Search, Book, Zap, MousePointer2, GitBranch, Move, Crosshair, Variable, Layout, Music, Globe, ChevronRight, Hash, Filter, Lightbulb, Code2, Layers, PlayCircle, Info } from 'lucide-react';

interface NodeCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  nodes: string[];
}

interface BlueprintTemplate {
  title: string;
  type: string;
  purpose: string;
  variables?: string[];
  logic: { heading: string; content: string }[];
  nodesUsed: string[];
}

const nodeCategories: NodeCategory[] = [
  {
    title: "Core Events",
    icon: <Zap className="w-4 h-4" />,
    color: "from-red-600 to-red-900",
    nodes: ["Event BeginPlay", "Event Tick", "Event EndPlay", "Event Destroyed", "Event ActorBeginOverlap", "Event ActorEndOverlap", "Event ActorHit", "Event AnyDamage", "Event Possessed", "Event UnPossessed"]
  },
  {
    title: "Input Events",
    icon: <MousePointer2 className="w-4 h-4" />,
    color: "from-blue-600 to-blue-900",
    nodes: ["InputAction", "InputAxis", "InputKey", "InputTouch", "InputAxisKey", "Mouse Button Down", "Mouse Button Up", "Gamepad Button Pressed", "Gamepad Button Released", "Enable Input"]
  },
  {
    title: "Flow Control",
    icon: <GitBranch className="w-4 h-4" />,
    color: "from-slate-600 to-slate-800",
    nodes: ["Branch", "Sequence", "Do Once", "Do Once (Multi Input)", "FlipFlop", "Gate", "MultiGate", "Delay", "Retriggerable Delay", "Set Timer by Event", "Clear Timer", "For Loop", "For Each Loop", "For Each Loop with Break", "While Loop"]
  },
  {
    title: "Actor & Transform",
    icon: <Move className="w-4 h-4" />,
    color: "from-blue-500 to-indigo-800",
    nodes: ["Spawn Actor from Class", "Destroy Actor", "Set Actor Location", "Set Actor Rotation", "Set Actor Transform", "Add Actor World Offset", "Add Actor Local Offset", "Add Actor World Rotation", "Get Actor Location", "Get Actor Rotation", "Get Actor Forward Vector", "Attach Actor to Actor", "Detach Actor", "Set Life Span", "Is Valid"]
  },
  {
    title: "Character & Movement",
    icon: <Hash className="w-4 h-4" />,
    color: "from-emerald-600 to-emerald-900",
    nodes: ["Add Movement Input", "Jump", "Stop Jumping", "Launch Character", "Set Max Walk Speed", "Set Movement Mode", "Disable Movement", "Stop Movement Immediately", "Get Velocity", "Is Falling"]
  },
  {
    title: "Collision & Trace",
    icon: <Crosshair className="w-4 h-4" />,
    color: "from-orange-600 to-orange-900",
    nodes: ["Line Trace by Channel", "Line Trace by Object", "Sphere Trace", "Box Trace", "Get Hit Result Under Cursor", "Get Overlapping Actors", "Set Collision Enabled", "Set Collision Response to Channel", "Break Hit Result", "Draw Debug Line"]
  },
  {
    title: "Variables & Data",
    icon: <Variable className="w-4 h-4" />,
    color: "from-teal-600 to-teal-900",
    nodes: ["Set Variable", "Get Variable", "Promote to Variable", "Make Struct", "Break Struct", "Select", "Clamp (Float / Int)", "Lerp (Float / Vector / Rotator)", "Random Float in Range", "Map Range Clamped"]
  },
  {
    title: "UI (UMG)",
    icon: <Layout className="w-4 h-4" />,
    color: "from-fuchsia-600 to-fuchsia-900",
    nodes: ["Create Widget", "Add to Viewport", "Remove from Parent", "Set Visibility", "Set Text"]
  },
  {
    title: "Audio & FX",
    icon: <Music className="w-4 h-4" />,
    color: "from-yellow-600 to-yellow-900",
    nodes: ["Play Sound at Location", "Play Sound Attached", "Spawn Sound 2D", "Spawn Emitter at Location", "Spawn Emitter Attached"]
  },
  {
    title: "Game State & System",
    icon: <Globe className="w-4 h-4" />,
    color: "from-indigo-600 to-indigo-900",
    nodes: ["Get Player Controller", "Get Player Character", "Get Player Pawn", "Get Game Mode", "Get Game Instance", "Save Game to Slot", "Load Game from Slot", "Print String", "Execute Console Command", "Quit Game"]
  }
];

const beginnerTemplates: BlueprintTemplate[] = [
  {
    title: "Basic Player Character",
    type: "Character",
    purpose: "Foundation for any third-person / FPS / ALS-based game",
    logic: [
      { heading: "Event BeginPlay", content: "Event BeginPlay → Get Player Controller → Enable Input" },
      { heading: "MoveForward", content: "InputAxis MoveForward → Add Movement Input (Dir: Get Actor Forward Vector, Value: Axis Value)" },
      { heading: "MoveRight", content: "InputAxis MoveRight → Add Movement Input (Dir: Get Actor Right Vector, Value: Axis Value)" },
      { heading: "Jump", content: "InputAction Jump Pressed → Jump; Released → Stop Jumping" }
    ],
    nodesUsed: ["Event BeginPlay", "Get Player Controller", "Enable Input", "InputAxis", "Add Movement Input", "Get Actor Forward Vector", "Jump"]
  },
  {
    title: "Interactable Object",
    type: "Actor",
    purpose: "Doors, pickups, switches, loot items",
    variables: ["bPlayerInside (Boolean)"],
    logic: [
      { heading: "Overlap Control", content: "Event ActorBeginOverlap → [Exec Pin] → Set bPlayerInside (Checked/True)\nEvent ActorEndOverlap → [Exec Pin] → Set bPlayerInside (Unchecked/False)" },
      { heading: "Interaction Logic", content: "InputAction Interaction → [Exec Pin] → Branch node\n[Condition Pin] ← Get bPlayerInside\n[True Exec Pin] → Set Visibility / Open Door / Play Animation" }
    ],
    nodesUsed: ["Event ActorBeginOverlap", "Event ActorEndOverlap", "InputAction", "Branch", "Set Variable", "Print String"]
  },
  {
    title: "Simple Weapon Fire",
    type: "Actor (Weapon)",
    purpose: "Hitscan weapon logic for shooters",
    variables: ["FireRange (Float = 5000)"],
    logic: [
      { heading: "Firing Mechanism", content: "InputAction Fire → Line Trace by Channel (Start: Get Actor Location, End: Start + Forward * FireRange) → Branch (Hit) → TRUE: Print String (\"Hit Enemy\")" }
    ],
    nodesUsed: ["InputAction", "Line Trace by Channel", "Get Actor Location", "Get Actor Forward Vector", "Branch", "Draw Debug Line"]
  },
  {
    title: "Enemy AI (Simple Chase)",
    type: "Character (Enemy)",
    purpose: "Basic AI that follows the player",
    variables: ["PlayerRef (Actor)"],
    logic: [
      { heading: "Initialization", content: "Event BeginPlay → Get Player Character → Set PlayerRef" },
      { heading: "Update Logic", content: "Event Tick → Is Valid (PlayerRef) → Branch (True) → Set Actor Location (Lerp from Current → Player Location)" }
    ],
    nodesUsed: ["Event BeginPlay", "Get Player Character", "Event Tick", "Is Valid", "Set Actor Location", "Lerp"]
  },
  {
    title: "Health System",
    type: "Actor / Character",
    purpose: "Damage management and death logic",
    variables: ["Health (Float = 100)"],
    logic: [
      { heading: "Damage Response", content: "Event AnyDamage → Health = Health - Damage → Clamp (0-100) → Branch (Health <= 0) → TRUE: Destroy Actor" }
    ],
    nodesUsed: ["Event AnyDamage", "Clamp (Float / Int)", "Branch", "Destroy Actor"]
  },
  {
    title: "UI: Health Display",
    type: "Widget Blueprint",
    purpose: "Dynamic UMG HUD update",
    variables: ["HealthText (Text)"],
    logic: [
      { heading: "Lifecycle", content: "Event Construct → Set Text (HealthText)" },
      { heading: "Update", content: "OnHealthChanged Event → Set Text (HealthText)" }
    ],
    nodesUsed: ["Event Construct", "Set Text"]
  },
  {
    title: "Pickup Item",
    type: "Actor",
    purpose: "Collectible items (coins, health packs)",
    logic: [
      { heading: "Collection", content: "Event ActorBeginOverlap → Print String (\"Picked Up\") → Destroy Actor" }
    ],
    nodesUsed: ["Event ActorBeginOverlap", "Print String", "Destroy Actor"]
  },
  {
    title: "Simple Door Toggle",
    type: "Actor",
    purpose: "Interactable door with open/close state",
    variables: ["bIsOpen (Boolean)"],
    logic: [
      { heading: "Toggle Logic", content: "InputAction Interact → FlipFlop → A: Set Actor Rotation (Open); B: Set Actor Rotation (Closed)" }
    ],
    nodesUsed: ["InputAction", "FlipFlop", "Set Actor Rotation"]
  },
  {
    title: "Timed Explosion Trap",
    type: "Actor",
    purpose: "Delay-based environmental hazards",
    logic: [
      { heading: "Fuse", content: "Event BeginPlay → Set Timer by Event (5s Delay)" },
      { heading: "Detonate", content: "Timer Event → Spawn Emitter at Location → Destroy Actor" }
    ],
    nodesUsed: ["Event BeginPlay", "Set Timer by Event", "Spawn Emitter at Location", "Destroy Actor"]
  },
  {
    title: "Save & Load State",
    type: "Game Mode / Player",
    purpose: "Persistent player data management",
    logic: [
      { heading: "Persistence", content: "InputAction Save → Save Game to Slot\nInputAction Load → Load Game from Slot" }
    ],
    nodesUsed: ["Save Game to Slot", "Load Game from Slot"]
  }
];

const ReferenceHub: React.FC = () => {
  const [activeView, setActiveView] = useState<'nodes' | 'templates'>('nodes');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = nodeCategories.map(cat => ({
    ...cat,
    nodes: cat.nodes.filter(node => 
      node.toLowerCase().includes(search.toLowerCase()) && 
      (!selectedCategory || cat.title === selectedCategory)
    )
  })).filter(cat => cat.nodes.length > 0);

  const filteredTemplates = beginnerTemplates.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.purpose.toLowerCase().includes(search.toLowerCase()) ||
    t.nodesUsed.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] animate-in fade-in duration-500">
      <div className="p-8 border-b border-white/5 bg-slate-900/20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/30">
                    <Book className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">UE5 Reference Hub</h1>
            </div>
            <p className="text-slate-400 text-sm font-light">Ground-truth data and patterns for Blueprint visual scripting.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="bg-slate-900 p-1 rounded-xl border border-white/5 flex shadow-inner">
                <button 
                  onClick={() => setActiveView('nodes')}
                  className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'nodes' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Hash className="w-3.5 h-3.5" /> 100 Nodes
                </button>
                <button 
                  onClick={() => setActiveView('templates')}
                  className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'templates' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Layers className="w-3.5 h-3.5" /> Templates
                </button>
            </div>

            <div className="relative group w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeView === 'nodes' ? "Search nodes..." : "Search templates..."}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Node Filtering */}
        {activeView === 'nodes' && (
            <div className="w-64 border-r border-white/5 bg-slate-900/10 p-6 overflow-y-auto hidden lg:block">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-3 h-3" /> Filter by Type
            </h3>
            <div className="space-y-1">
                <button 
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                All Categories
                </button>
                {nodeCategories.map(cat => (
                    <button 
                    key={cat.title}
                    onClick={() => setSelectedCategory(cat.title)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${selectedCategory === cat.title ? 'bg-slate-800 text-white border border-white/10 shadow-md' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                    >
                    <span className={`p-1 rounded bg-gradient-to-br ${cat.color} text-white/90`}>
                        {React.cloneElement(cat.icon as React.ReactElement, { className: 'w-3 h-3' })}
                    </span>
                    {cat.title}
                    </button>
                ))}
            </div>
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
           <div className="max-w-5xl mx-auto">
              {activeView === 'nodes' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                    {filteredCategories.map((cat, i) => (
                    <div key={i} className="space-y-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-3 px-2">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.color} text-white shadow-lg`}>
                                {cat.icon}
                            </div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">{cat.title}</h2>
                            <span className="text-[10px] font-mono text-slate-600 ml-auto">{cat.nodes.length} nodes</span>
                        </div>
                        <div className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                        <div className="grid grid-cols-1 divide-y divide-white/5">
                            {cat.nodes.map((node, nIdx) => (
                                <div key={nIdx} className="group flex items-center justify-between p-4 hover:bg-white/5 transition-all cursor-default">
                                    <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${cat.color} opacity-40 group-hover:opacity-100 transition-opacity`}></div>
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{node}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            ))}
                        </div>
                        </div>
                    </div>
                    ))}
                  </div>
              ) : (
                  <div className="space-y-12 pb-24 animate-in fade-in duration-500">
                      <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex items-start gap-5">
                          <div className="p-3 bg-blue-500/20 rounded-xl">
                              <Lightbulb className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white mb-1">Architectural Patterns</h3>
                              <p className="text-sm text-slate-400 leading-relaxed font-light">These beginner-safe templates form the backbone of 90% of gameplay logic. Use them to understand foundational relationships between events and actions.</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-10">
                          {filteredTemplates.map((template, i) => (
                              <div key={i} className="glass-card rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl group transition-all hover:border-blue-500/30">
                                  <div className="bg-slate-900/80 p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="flex items-center gap-4">
                                          <div className="p-3 bg-slate-800 rounded-2xl border border-white/5 text-blue-400 group-hover:scale-110 transition-transform">
                                              <PlayCircle className="w-6 h-6" />
                                          </div>
                                          <div>
                                              <h3 className="text-xl font-black text-white tracking-tight">{template.title}</h3>
                                              <div className="flex items-center gap-3 mt-1">
                                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Type: {template.type}</span>
                                                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                  <span className="text-[10px] text-slate-500 font-medium">{template.purpose}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                          {template.variables?.map((v, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-purple-950/40 text-purple-300 text-[9px] font-mono font-bold rounded border border-purple-500/20 uppercase">
                                                  VAR: {v}
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                  
                                  <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 bg-slate-950/20">
                                      <div className="lg:col-span-8 space-y-6">
                                          <div className="flex items-center gap-2 mb-2">
                                              <Code2 className="w-4 h-4 text-emerald-400" />
                                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Flow Specification</h4>
                                          </div>
                                          <div className="space-y-4">
                                              {template.logic.map((l, idx) => (
                                                  <div key={idx} className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                                                      <div className="bg-slate-900/40 px-5 py-2.5 border-b border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                          {l.heading}
                                                      </div>
                                                      <div className="p-5 font-mono text-[13px] leading-relaxed text-blue-100/90 whitespace-pre-wrap">
                                                          {l.content}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                      
                                      <div className="lg:col-span-4 flex flex-col gap-6">
                                          <div>
                                              <div className="flex items-center gap-2 mb-4">
                                                  <Zap className="w-4 h-4 text-yellow-400" />
                                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry Nodes</h4>
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                  {template.nodesUsed.map((node, idx) => (
                                                      <span key={idx} className="px-3 py-1.5 bg-slate-900 text-slate-300 text-[10px] font-bold rounded-xl border border-white/5 hover:border-blue-500/40 transition-colors cursor-default shadow-sm">
                                                          {node}
                                                      </span>
                                                  ))}
                                              </div>
                                          </div>
                                          
                                          <div className="mt-auto bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                                              <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                                                  <Info className="w-3 h-3" /> Pro Tip
                                              </div>
                                              <p className="text-[11px] text-slate-500 leading-relaxed font-light italic">
                                                  Mastering these 10 patterns covers almost all core interactions in an Indie UE5 project.
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {((activeView === 'nodes' && filteredCategories.length === 0) || (activeView === 'templates' && filteredTemplates.length === 0)) && (
                <div className="h-96 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/5 rounded-3xl">
                   <Search className="w-12 h-12 mb-4 opacity-20" />
                   <p className="text-sm font-medium">No results match your search criteria</p>
                   <button onClick={() => { setSearch(''); setSelectedCategory(null); }} className="mt-4 text-blue-500 hover:text-blue-400 text-xs font-bold uppercase tracking-widest">Clear Filters</button>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceHub;
