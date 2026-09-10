
import { SavedProject, BlueprintSpec, MaterialSpec, EnhancedInputSpec, MetaSoundSpec, PcgSpec, CppCode } from "../types";

/**
 * DriveClient handles interactions with the browser's File System Access API
 * to create a structured UE5 project directory on the user's disk.
 */
class DriveClient {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  /**
   * Requests user permission to access a directory.
   */
  public async requestFolder(): Promise<string | null> {
    try {
      this.rootHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        id: 'ue5_architect_projects'
      });
      return this.rootHandle?.name || null;
    } catch (e: any) {
      // AbortError is expected when user cancels the picker
      if (e.name === 'AbortError') {
          return null;
      }
      
      // Handle SecurityError or NotAllowedError specifically for clearer reporting
      if (e.name === 'SecurityError' || e.message?.includes('Cross origin') || e.message?.includes('frame')) {
          const securityErr = new Error("IFRAME_RESTRICTION");
          securityErr.name = "SecurityError";
          throw securityErr;
      }

      console.error("Drive Access Error:", e);
      throw e;
    }
  }

  /**
   * Synchronizes the entire project state to the linked disk folder.
   */
  public async syncProject(project: SavedProject): Promise<boolean> {
    if (!this.rootHandle) return false;

    try {
      // 1. Create subfolders
      const blueprintsDir = await this.rootHandle.getDirectoryHandle('Blueprints', { create: true });
      const materialsDir = await this.rootHandle.getDirectoryHandle('Materials', { create: true });
      const inputDir = await this.rootHandle.getDirectoryHandle('Input', { create: true });
      const narrativeDir = await this.rootHandle.getDirectoryHandle('Narrative', { create: true });
      const worldDir = await this.rootHandle.getDirectoryHandle('World', { create: true });
      const srcDir = await this.rootHandle.getDirectoryHandle('Source', { create: true });
      const audioDir = await this.rootHandle.getDirectoryHandle('Audio', { create: true });
      const pcgDir = await this.rootHandle.getDirectoryHandle('PCG', { create: true });

      // 2. Write main roadmap and manifest
      await this.writeFile(this.rootHandle, 'Roadmap.md', this.generateRoadmapMarkdown(project));
      await this.writeFile(this.rootHandle, '.ue5architect', JSON.stringify({
          projectId: project.id,
          lastSync: Date.now(),
          version: "1.0.0"
      }, null, 2));

      // 3. Write Blueprints (.uasset_spec)
      if (project.blueprints) {
        for (const [name, spec] of Object.entries(project.blueprints)) {
          await this.writeFile(blueprintsDir, `${name}.uasset_spec`, JSON.stringify(spec, null, 2));
        }
      }

      // 4. Write Materials (.umat_spec)
      if (project.materials) {
        for (const [name, spec] of Object.entries(project.materials)) {
          await this.writeFile(materialsDir, `${name}.umat_spec`, JSON.stringify(spec, null, 2));
        }
      }

      // 5. Write Input Contexts (.uinput_spec)
      if (project.inputs) {
        for (const [name, spec] of Object.entries(project.inputs)) {
          await this.writeFile(inputDir, `${name}.uinput_spec`, JSON.stringify(spec, null, 2));
        }
      }

      // 6. Write Narrative data
      if (project.narrative) {
          await this.writeFile(narrativeDir, 'Quests.json', JSON.stringify(project.narrative.quests, null, 2));
          await this.writeFile(narrativeDir, 'NPCs.json', JSON.stringify(project.narrative.npcs, null, 2));
      }

      // 7. Write C++ Source (.h and .cpp)
      if (project.cppCodes) {
          for (const [name, code] of Object.entries(project.cppCodes)) {
              await this.writeFile(srcDir, `${name}.h`, code.header);
              await this.writeFile(srcDir, `${name}.cpp`, code.source);
          }
      }

      // 8. Write MetaSounds
      if (project.metaSounds) {
          for (const [name, spec] of Object.entries(project.metaSounds)) {
              await this.writeFile(audioDir, `${name}.usound_spec`, JSON.stringify(spec, null, 2));
          }
      }

      // 9. Write PCG Graphs
      if (project.pcgs) {
          for (const [name, spec] of Object.entries(project.pcgs)) {
              await this.writeFile(pcgDir, `${name}.upcg_spec`, JSON.stringify(spec, null, 2));
          }
      }

      return true;
    } catch (e) {
      console.error("Sync to disk failed", e);
      return false;
    }
  }

  private async writeFile(dirHandle: FileSystemDirectoryHandle, fileName: string, content: string) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();
    await writable.write(content);
    await writable.close();
  }

  private generateRoadmapMarkdown(project: SavedProject): string {
    let md = `# ${project.title}\n\n`;
    md += `## Executive Summary\n${project.summary}\n\n`;
    md += `## Project Config\n- Engine: ${project.input.ueVersion}\n- Genres: ${project.input.genres.join(', ')}\n- Levels: ${project.input.level}\n\n`;
    
    project.plan.phases.forEach((phase, i) => {
        md += `### Phase ${i+1}: ${phase.phaseName}\n`;
        md += `**Goal:** ${phase.goal}\n\n`;
        phase.tasks.forEach(task => {
            md += `#### ${task.title}\n`;
            md += `${task.description}\n`;
            md += `- Folder: \`${task.folderPath}\`\n`;
            // Add missing += operator to fix non-callable expression error
            md += `- Asset: \`${task.assetName}\`\n\n`;
            md += `**Guide:**\n`;
            task.stepByStepGuide.forEach(step => md += `1. ${step}\n`);
            md += `\n`;
        });
    });
    
    return md;
  }

  public isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  public isIframe(): boolean {
    try {
        return window.self !== window.top;
    } catch (e) {
        // Cross-origin access to window.top will throw, which means we are definitely in a restricted iframe
        return true;
    }
  }
}

export const driveClient = new DriveClient();
