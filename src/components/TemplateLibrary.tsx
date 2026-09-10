import React, { useState, useMemo } from 'react';
import {
  BlueprintTemplate,
  BlueprintTemplateCategory,
  BlueprintSpec,
  VerseCode
} from '../types';
import {
  getAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  exportTemplatesAsJson,
  importTemplatesFromJson
} from '../services/blueprintTemplates';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Check,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  Cpu,
  User,
  Shield,
  Hand,
  Package,
  Brain,
  Sun,
  Code2,
  FileText,
  Boxes,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

interface TemplateLibraryProps {
  currentSpec?: BlueprintSpec;
  currentVerseCode?: VerseCode;
  onInstantiateTemplate: (template: BlueprintTemplate, customName: string) => void;
  onSelectSpecByName?: (name: string) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  currentSpec,
  currentVerseCode,
  onInstantiateTemplate,
  onSelectSpecByName
}) => {
  const [templates, setTemplates] = useState<BlueprintTemplate[]>(getAllTemplates());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEngine, setSelectedEngine] = useState<string>('ALL');

  // Modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<BlueprintTemplate | null>(null);
  const [instantiateModalTemplate, setInstantiateModalTemplate] = useState<BlueprintTemplate | null>(null);
  const [targetAssetName, setTargetAssetName] = useState('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Template Form state
  const [newTitle, setNewTitle] = useState(currentSpec ? `${currentSpec.assetName} Pattern` : '');
  const [newDescription, setNewDescription] = useState(
    currentSpec ? `Reusable architecture pattern based on ${currentSpec.assetName} with ${currentSpec.functions.length} functions and ${currentSpec.variables.length} variables.` : ''
  );
  const [newCategory, setNewCategory] = useState<BlueprintTemplateCategory>('Systems');
  const [newEngine, setNewEngine] = useState<'UE5' | 'UE6' | 'UE5+UE6'>('UE5+UE6');
  const [newTags, setNewTags] = useState('Modular, Production');
  const [includeVerse, setIncludeVerse] = useState(!!currentVerseCode);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Refresh template list
  const refreshTemplates = () => {
    setTemplates(getAllTemplates());
  };

  // Categories list
  const categories: { label: string; value: string }[] = [
    { label: 'All Modules', value: 'ALL' },
    { label: 'Movement', value: 'Movement' },
    { label: 'Combat', value: 'Combat' },
    { label: 'Systems', value: 'Systems' },
    { label: 'AI', value: 'AI' },
    { label: 'Interaction', value: 'Interaction' },
    { label: 'Environment', value: 'Environment' },
    { label: 'Verse (UE6)', value: 'Verse' }
  ];

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // Category filter
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
        return false;
      }
      // Engine filter
      if (selectedEngine !== 'ALL') {
        if (selectedEngine === 'UE5' && !t.ueVersion.includes('UE5')) return false;
        if (selectedEngine === 'UE6' && !t.ueVersion.includes('UE6')) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description.toLowerCase().includes(q);
        const inClass = t.targetClass.toLowerCase().includes(q);
        const inTags = t.tags.some(tag => tag.toLowerCase().includes(q));
        const inAsset = t.spec.assetName.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inClass && !inTags && !inAsset) {
          return false;
        }
      }
      return true;
    });
  }, [templates, selectedCategory, selectedEngine, searchQuery]);

  // Handle Save Current Blueprint as Template
  const handleSaveActiveBlueprint = () => {
    if (!currentSpec) return;

    const tagsArray = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newTpl: BlueprintTemplate = {
      id: `custom-tpl-${Date.now()}`,
      title: newTitle || `${currentSpec.assetName} Template`,
      description: newDescription || 'Custom blueprint module saved from active project session.',
      category: newCategory,
      tags: tagsArray.length > 0 ? tagsArray : ['Custom', 'Blueprint'],
      targetClass: currentSpec.parentClass,
      ueVersion: newEngine,
      spec: { ...currentSpec },
      verseCode: includeVerse && currentVerseCode ? { ...currentVerseCode } : undefined,
      isBuiltIn: false,
      author: 'Project Architect',
      createdDate: new Date().toISOString().split('T')[0]
    };

    saveCustomTemplate(newTpl);
    refreshTemplates();
    setIsSaveModalOpen(false);
    showToast(`Template "${newTpl.title}" saved to Template Library!`);
  };

  // Handle Delete Template
  const handleDeleteTemplate = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteCustomTemplate(id);
      refreshTemplates();
      showToast(`Deleted template "${title}"`);
    }
  };

  // Open Instantiate Modal
  const handleOpenInstantiate = (tpl: BlueprintTemplate) => {
    setInstantiateModalTemplate(tpl);
    setTargetAssetName(tpl.spec.assetName);
  };

  // Confirm Instantiate
  const handleConfirmInstantiate = () => {
    if (!instantiateModalTemplate) return;
    const finalName = targetAssetName.trim() || instantiateModalTemplate.spec.assetName;
    onInstantiateTemplate(instantiateModalTemplate, finalName);
    setInstantiateModalTemplate(null);
    showToast(`Instantiated "${finalName}" into project architecture!`);
  };

  // Export all as JSON
  const handleExportJson = () => {
    const jsonStr = exportTemplatesAsJson(templates);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'unreal_blueprint_templates.json';
    link.click();
    showToast('Exported templates as JSON');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importTemplatesFromJson(content);
      if (res.success) {
        refreshTemplates();
        showToast(`Successfully imported ${res.count} templates!`);
      } else {
        alert(`Failed to import: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Category Icon helper
  const getCategoryIcon = (category: BlueprintTemplateCategory) => {
    switch (category) {
      case 'Movement': return <User className="w-4 h-4 text-emerald-400" />;
      case 'Combat': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'Systems': return <Package className="w-4 h-4 text-purple-400" />;
      case 'AI': return <Brain className="w-4 h-4 text-cyan-400" />;
      case 'Interaction': return <Hand className="w-4 h-4 text-blue-400" />;
      case 'Environment': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'Verse': return <Cpu className="w-4 h-4 text-indigo-400" />;
      default: return <Boxes className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Tool Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Blueprint Template Library
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-light">
                  Pre-engineered modular systems, character controllers, and interaction frameworks ready for instant instantiation.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {currentSpec && (
              <button
                onClick={() => {
                  setNewTitle(`${currentSpec.assetName} Pattern`);
                  setIsSaveModalOpen(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Save Current Asset as Template
              </button>
            )}

            <button
              onClick={handleExportJson}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              title="Export all templates as JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Export Library
            </button>

            <label className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              Import Templates
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates, tags, classes..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-mono transition-colors"
            />
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 text-[11px] uppercase">Engine:</span>
            {(['ALL', 'UE5', 'UE6'] as const).map(eng => (
              <button
                key={eng}
                onClick={() => setSelectedEngine(eng)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedEngine === eng
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {eng === 'ALL' ? 'All Engines' : eng}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              {cat.value !== 'ALL' && getCategoryIcon(cat.value as BlueprintTemplateCategory)}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {filteredTemplates.length === 0 ? (
          <div className="h-72 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
            <Boxes className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-300">No Templates Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No blueprint patterns match your search query or active filter. Try resetting filters or save a new template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(tpl => {
              const spec = tpl.spec;
              const hasVerse = !!tpl.verseCode;
              return (
                <div
                  key={tpl.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/10 group backdrop-blur-sm"
                >
                  <div>
                    {/* Top Metadata Badge Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                          {getCategoryIcon(tpl.category)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          {tpl.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasVerse && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Verse Code
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {tpl.ueVersion}
                        </span>
                      </div>
                    </div>

                    {/* Template Title & Parent Class */}
                    <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors leading-snug mb-1">
                      {tpl.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-3">
                      <span>Parent:</span>
                      <span className="text-blue-400 font-semibold">{tpl.targetClass}</span>
                      <span>•</span>
                      <span className="text-slate-500">{tpl.author || 'Epic Architecture'}</span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4 font-light">
                      {tpl.description}
                    </p>

                    {/* Architecture Specs Pill Summary */}
                    <div className="grid grid-cols-4 gap-1.5 py-2.5 px-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center font-mono mb-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Comp</span>
                        <span className="text-xs font-bold text-slate-300">{spec.components?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Vars</span>
                        <span className="text-xs font-bold text-slate-300">{spec.variables?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Funcs</span>
                        <span className="text-xs font-bold text-emerald-400">{spec.functions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Events</span>
                        <span className="text-xs font-bold text-amber-400">{spec.dispatchers?.length || 0}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {tpl.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/50"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => setPreviewTemplate(tpl)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Inspect Spec
                    </button>

                    <div className="flex items-center gap-2">
                      {!tpl.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenInstantiate(tpl)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Instantiate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Save Active Blueprint as Template */}
      {isSaveModalOpen && currentSpec && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Save Blueprint as Template</h3>
                  <p className="text-xs text-slate-400">Add to your studio library for reuse across projects</p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Template Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Advanced Locomotion Controller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the architectural patterns, components, and intended usage..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-purple-500 resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase font-bold">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  >
                    <option value="Movement">Movement</option>
                    <option value="Combat">Combat</option>
                    <option value="Systems">Systems</option>
                    <option value="AI">AI</option>
                    <option value="Interaction">Interaction</option>
                    <option value="Environment">Environment</option>
                    <option value="Verse">Verse</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase font-bold">Engine Compatibility</label>
                  <select
                    value={newEngine}
                    onChange={(e: any) => setNewEngine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  >
                    <option value="UE5+UE6">UE5 + UE6 Hybrid</option>
                    <option value="UE5">Unreal Engine 5</option>
                    <option value="UE6">Unreal Engine 6 (Verse)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Locomotion, Stamina, Modular"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              {currentVerseCode && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includeVerseCheck"
                    checked={includeVerse}
                    onChange={(e) => setIncludeVerse(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="includeVerseCheck" className="text-slate-300 font-sans cursor-pointer">
                    Include generated Verse companion code ({currentVerseCode.fileName})
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActiveBlueprint}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-purple-600/25"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Template Detailed Specification Inspector */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{previewTemplate.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>Target Class: {previewTemplate.targetClass}</span>
                    <span>•</span>
                    <span className="text-purple-400">{previewTemplate.ueVersion}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Description</span>
                <p className="text-slate-300 font-sans leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {previewTemplate.description}
                </p>
              </div>

              {/* Components */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Components ({previewTemplate.spec.components?.length || 0})
                </span>
                <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {(previewTemplate.spec.components || []).map((comp, idx) => (
                    <div key={idx} className="text-slate-300 flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      <span>{comp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Variables ({previewTemplate.spec.variables?.length || 0})
                </span>
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                  {(previewTemplate.spec.variables || []).map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <div>
                        <span className="text-white font-bold">{v.name}</span>
                        <span className="text-slate-500 ml-2">({v.type})</span>
                      </div>
                      <span className="text-amber-400 font-semibold">{v.default}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Functions */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Functions ({previewTemplate.spec.functions?.length || 0})
                </span>
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                  {(previewTemplate.spec.functions || []).map((fn, idx) => (
                    <div key={idx} className="border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                      <div className="text-emerald-400 font-bold">{fn.name}({fn.parameters?.join(', ') || ''})</div>
                      <div className="text-slate-400 text-[11px] font-sans mt-0.5">{fn.logicDescription}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Companion Verse Code Preview */}
              {previewTemplate.verseCode && (
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">
                    Companion Verse Device ({previewTemplate.verseCode.fileName})
                  </span>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-cyan-200 overflow-x-auto max-h-44 custom-scrollbar">
                    {previewTemplate.verseCode.code}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => {
                  const jsonStr = JSON.stringify(previewTemplate, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${previewTemplate.spec.assetName}_template.json`;
                  link.click();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Spec JSON
              </button>

              <button
                onClick={() => {
                  const tpl = previewTemplate;
                  setPreviewTemplate(null);
                  handleOpenInstantiate(tpl);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Instantiate Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Instantiate Template Confirmation */}
      {instantiateModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Instantiate into Project</h3>
                  <p className="text-xs text-slate-400">Deploy this blueprint pattern into your active architecture</p>
                </div>
              </div>
              <button
                onClick={() => setInstantiateModalTemplate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 uppercase font-bold">New Blueprint Asset Name</label>
                <input
                  type="text"
                  value={targetAssetName}
                  onChange={(e) => setTargetAssetName(e.target.value)}
                  placeholder="BP_MyNewController"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-blue-500 font-bold text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Parent Class:</span>
                  <span className="text-white font-bold">{instantiateModalTemplate.targetClass}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Target Engine:</span>
                  <span className="text-purple-400 font-bold">{instantiateModalTemplate.ueVersion}</span>
                </div>
                {instantiateModalTemplate.verseCode && (
                  <div className="flex items-center justify-between text-cyan-400">
                    <span>Companion Verse:</span>
                    <span>{instantiateModalTemplate.verseCode.fileName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setInstantiateModalTemplate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstantiate}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Confirm & Create Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
