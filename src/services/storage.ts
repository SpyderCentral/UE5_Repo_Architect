import { SavedProject } from '../types';

const LS_KEY = 'ue5_architect_projects';
const DB_NAME = 'ue5_architect_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

// In-memory cache of projects for synchronous access across components
let memoryProjects: SavedProject[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (err) {
      console.error("Storage listener error:", err);
    }
  });
}

export const subscribeToProjects = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/**
 * Open or initialize IndexedDB for storing large project datasets, base64 images, and technical blueprints.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all projects from IndexedDB.
 */
export async function getAllProjectsFromIDB(): Promise<SavedProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as SavedProject[]) || [];
        resolve(results.sort((a, b) => b.lastModified - a.lastModified));
      };
      req.onerror = () => {
        resolve([]);
      };
    });
  } catch (e) {
    console.warn("Could not read projects from IndexedDB:", e);
    return [];
  }
}

/**
 * Save project to IndexedDB.
 */
export async function saveProjectToIDB(project: SavedProject): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Could not write project to IndexedDB:", e);
  }
}

/**
 * Delete project from IndexedDB.
 */
export async function deleteProjectFromIDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Could not delete project from IndexedDB:", e);
  }
}

/**
 * Create a lightweight version of projects for localStorage that strips large base64 strings
 * so localStorage never hits QuotaExceededError while IndexedDB maintains the full fidelity images.
 */
function createLightweightProjects(projects: SavedProject[]): SavedProject[] {
  return projects.map(p => ({
    ...p,
    visionBoard: (p.visionBoard || []).map(img => ({
      ...img,
      base64: img.base64 && img.base64.length > 500 ? '' : img.base64
    })),
    levelLayouts: (p.levelLayouts || []).map(l => ({
      ...l,
      imageBase64: l.imageBase64 && l.imageBase64.length > 500 ? '' : l.imageBase64
    }))
  }));
}

/**
 * Safely persists projects to localStorage without exceeding browser storage quotas.
 */
function syncToLocalStorage(projects: SavedProject[]): void {
  try {
    const serialized = JSON.stringify(projects);
    // If under 1MB, try saving directly
    if (serialized.length < 1000000) {
      localStorage.setItem(LS_KEY, serialized);
      return;
    }
  } catch {
    // If serialization or initial setItem fails, proceed to lightweight version
  }

  // Quota conservation mode: strip high-resolution base64 strings for localStorage
  try {
    const lightweight = createLightweightProjects(projects);
    localStorage.setItem(LS_KEY, JSON.stringify(lightweight));
  } catch (quotaError) {
    try {
      if (projects.length > 1) {
        const sorted = [...projects].sort((a, b) => b.lastModified - a.lastModified);
        const newestOnly = createLightweightProjects([sorted[0]]);
        localStorage.setItem(LS_KEY, JSON.stringify(newestOnly));
      }
    } catch {
      console.warn("LocalStorage space constrained; project safely preserved in IndexedDB.");
    }
  }
}

// Initial hydration from localStorage
try {
  const cached = localStorage.getItem(LS_KEY);
  if (cached) {
    memoryProjects = JSON.parse(cached) as SavedProject[];
  }
} catch (e) {
  memoryProjects = [];
}

// Background sync with IndexedDB
getAllProjectsFromIDB().then(idbProjects => {
  if (idbProjects && idbProjects.length > 0) {
    const map = new Map<string, SavedProject>();
    for (const p of memoryProjects) map.set(p.id, p);
    for (const p of idbProjects) map.set(p.id, p);
    memoryProjects = Array.from(map.values()).sort((a, b) => b.lastModified - a.lastModified);
    notifyListeners();
  } else if (memoryProjects.length > 0) {
    // Seed IndexedDB from existing projects in localStorage
    for (const p of memoryProjects) {
      saveProjectToIDB(p);
    }
  }
}).catch(err => {
  console.warn("Storage hydration note:", err);
});

/**
 * Retrieves all saved projects synchronously from memory cache (with fallback to localStorage).
 */
export const getSavedProjects = (): SavedProject[] => {
  if (memoryProjects.length > 0) {
    return [...memoryProjects].sort((a, b) => b.lastModified - a.lastModified);
  }
  try {
    const data = localStorage.getItem(LS_KEY);
    if (!data) return [];
    const projects = JSON.parse(data) as SavedProject[];
    memoryProjects = projects;
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  } catch (e) {
    console.error("Failed to parse projects from localStorage", e);
    return [];
  }
};

/**
 * Asynchronously loads the complete list of projects from IndexedDB, ensuring all images and blueprints are loaded.
 */
export const loadProjectsAsync = async (): Promise<SavedProject[]> => {
  try {
    const idbProjects = await getAllProjectsFromIDB();
    if (idbProjects && idbProjects.length > 0) {
      const map = new Map<string, SavedProject>();
      for (const p of memoryProjects) map.set(p.id, p);
      for (const p of idbProjects) map.set(p.id, p);
      memoryProjects = Array.from(map.values()).sort((a, b) => b.lastModified - a.lastModified);
      return memoryProjects;
    }
  } catch (e) {
    console.warn("Error loading projects asynchronously:", e);
  }
  return getSavedProjects();
};

/**
 * Saves or updates a project in both IndexedDB (full fidelity) and LocalStorage (quota-safe).
 */
export const saveProjectToStorage = (project: SavedProject): void => {
  try {
    const updated: SavedProject = { ...project, lastModified: Date.now() };
    const index = memoryProjects.findIndex(p => p.id === updated.id);
    if (index >= 0) {
      memoryProjects[index] = updated;
    } else {
      memoryProjects.push(updated);
    }
    memoryProjects.sort((a, b) => b.lastModified - a.lastModified);

    // Persist full-resolution project to IndexedDB asynchronously
    saveProjectToIDB(updated).catch(err => {
      console.warn("Failed saving project to IndexedDB:", err);
    });

    // Safely sync to localStorage without exceeding quota
    syncToLocalStorage(memoryProjects);
  } catch (e) {
    console.error("Failed to save project to storage", e);
  }
};

/**
 * Deletes a project from both IndexedDB and LocalStorage.
 */
export const deleteProjectFromStorage = (id: string): void => {
  try {
    memoryProjects = memoryProjects.filter(p => p.id !== id);
    deleteProjectFromIDB(id).catch(err => {
      console.warn("Failed deleting project from IndexedDB:", err);
    });
    syncToLocalStorage(memoryProjects);
    notifyListeners();
  } catch (e) {
    console.error("Failed to delete project from storage", e);
  }
};

/**
 * Finds a specific project by its unique ID.
 */
export const getProjectById = (id: string): SavedProject | undefined => {
  const fromMem = memoryProjects.find(p => p.id === id);
  if (fromMem) return fromMem;
  const projects = getSavedProjects();
  return projects.find(p => p.id === id);
};
