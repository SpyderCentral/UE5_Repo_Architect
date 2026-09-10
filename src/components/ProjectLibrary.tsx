
import React, { useRef } from 'react';
import { SavedProject } from '../types';
import { FolderOpen, Calendar, Trash2, ArrowRight, Gamepad2, Layers, Download, Upload } from 'lucide-react';

interface ProjectLibraryProps {
  projects: SavedProject[];
  onLoad: (project: SavedProject) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onImport: (project: SavedProject) => void;
}

const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ projects, onLoad, onDelete, onCreateNew, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownload = (e: React.MouseEvent, project: SavedProject) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_')}_UE5Plan.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const project = JSON.parse(content) as SavedProject;
        if (project && project.id && project.plan) {
            onImport(project);
        } else {
            alert("Invalid project file structure.");
        }
      } catch (err) {
        console.error("Error parsing project file", err);
        alert("Failed to parse the project file. Ensure it is a valid JSON exported from UE5 Architect.");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Project Library</h1>
            <p className="text-slate-400 text-lg">Manage and resume your AI-generated development plans.</p>
          </div>
          <div className="flex gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold transition-all shadow-lg border border-white/5 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Upload className="w-5 h-5 text-blue-400" />
              Import Project
            </button>
            <button 
              onClick={onCreateNew}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Layers className="w-5 h-5" />
              Create New Project
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-slate-700 rounded-3xl bg-slate-900/20 backdrop-blur-sm">
             <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                <FolderOpen className="w-12 h-12 text-slate-500" />
             </div>
             <h3 className="text-2xl font-bold text-slate-300 mb-2">No projects found</h3>
             <p className="text-slate-500 max-w-sm text-center mb-8 leading-relaxed">
               Start by creating a new game development roadmap or import a previously saved JSON file.
             </p>
             <button 
                onClick={onCreateNew}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2 transition-colors hover:gap-3"
              >
                Start your first project <ArrowRight className="w-5 h-5" />
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="glass-card rounded-2xl overflow-hidden flex flex-col group h-[280px]"
              >
                {/* Header Decoration */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="p-7 flex-1 flex flex-col relative">
                    {/* Background shine on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/20 shadow-sm">
                            <Gamepad2 className="w-3.5 h-3.5" />
                            {project.genre}
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => handleDownload(e, project)}
                                className="text-slate-600 hover:text-blue-400 transition-colors p-2 hover:bg-blue-500/10 rounded-lg"
                                title="Download JSON"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                                className="text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-100 mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors relative z-10">
                        {project.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-6 flex-1 leading-relaxed relative z-10">
                        {project.summary}
                    </p>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto relative z-10">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(project.lastModified)}
                        </div>
                        
                        <button 
                            onClick={() => onLoad(project)}
                            className="flex items-center gap-2 text-xs font-bold text-white bg-slate-800 hover:bg-blue-600 px-4 py-2.5 rounded-lg transition-all group-hover:translate-x-1 shadow-md border border-white/5 hover:border-blue-500/50"
                        >
                            Resume <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectLibrary;
