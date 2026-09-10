/**
 * Blueprint Tagging Service
 * Manages category tags for Unreal Engine Blueprint assets.
 */

const TAG_STORAGE_PREFIX = 'ue5_bp_tags_';

export const PRESET_TAGS = [
  'Movement',
  'UI',
  'AI',
  'Combat',
  'Inventory',
  'Core',
  'Audio',
  'VFX',
  'Gameplay',
  'Networking',
  'Physics',
  'Animation',
  'Level'
] as const;

export type PresetTag = typeof PRESET_TAGS[number];

// Tag color mapping with high contrast accessible Tailwind badge classes
export const TAG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Movement: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  UI: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', dot: 'bg-sky-400' },
  AI: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  Combat: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  Inventory: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  Core: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  Audio: { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', dot: 'bg-pink-400' },
  VFX: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  Gameplay: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  Networking: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  Physics: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  Animation: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  Level: { bg: 'bg-lime-500/15', text: 'text-lime-300', border: 'border-lime-500/30', dot: 'bg-lime-400' },
};

// Fallback palette for user-created custom tags
const CUSTOM_TAG_PALETTES = [
  { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-400' },
  { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400' },
  { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
];

export function getTagStyle(tag: string) {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  // Deterministic color hash for custom tags
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
  }
  const idx = Math.abs(hash) % CUSTOM_TAG_PALETTES.length;
  return CUSTOM_TAG_PALETTES[idx];
}

/**
 * Infer intelligent default tags for an asset based on naming patterns and UE conventions
 */
export function inferDefaultTags(assetName: string, assetType?: string): string[] {
  const tags = new Set<string>();
  const name = assetName.toUpperCase();

  if (assetType === 'BehaviorTree' || name.startsWith('BT_') || name.startsWith('BB_') || name.includes('AI') || name.includes('ENEMY') || name.includes('NPC')) {
    tags.add('AI');
  }

  if (assetType === 'Widget' || name.startsWith('WBP_') || name.startsWith('W_') || name.includes('HUD') || name.includes('MENU') || name.includes('UI')) {
    tags.add('UI');
  }

  if (name.includes('PLAYER') || name.includes('CHARACTER') || name.includes('MOVEMENT') || name.includes('LOCOMOTION') || name.includes('PAWN') || name.startsWith('ABP_')) {
    tags.add('Movement');
    tags.add('Gameplay');
  }

  if (name.includes('WEAPON') || name.includes('PROJECTILE') || name.includes('DAMAGE') || name.includes('COMBAT') || name.includes('ATTACK') || name.includes('HITBOX')) {
    tags.add('Combat');
    tags.add('Gameplay');
  }

  if (name.includes('INVENTORY') || name.includes('ITEM') || name.includes('PICKUP') || name.includes('LOOT') || name.includes('BAG') || name.includes('CONTAINER')) {
    tags.add('Inventory');
    tags.add('Gameplay');
  }

  if (name.startsWith('GM_') || name.startsWith('GS_') || name.startsWith('PC_') || name.startsWith('PS_') || name.startsWith('GI_') || name.includes('MANAGER') || name.includes('CORE') || name.includes('GAMEMODE')) {
    tags.add('Core');
  }

  if (assetType === 'MetaSound' || name.startsWith('MS_') || name.startsWith('A_') || name.includes('AUDIO') || name.includes('SOUND') || name.includes('SFX')) {
    tags.add('Audio');
  }

  if (name.includes('VFX') || name.includes('PARTICLE') || name.includes('NIAGARA') || name.startsWith('NS_') || name.startsWith('NE_') || assetType === 'Material') {
    tags.add('VFX');
  }

  if (assetType === 'Input' || name.startsWith('IA_') || name.startsWith('IMC_') || name.includes('INPUT')) {
    tags.add('Core');
    tags.add('Movement');
  }

  if (name.includes('PHYSICS') || name.includes('COLLISION') || name.includes('RAGDOLL') || name.includes('VEHICLE')) {
    tags.add('Physics');
  }

  if (name.startsWith('ABP_') || name.includes('ANIM') || name.includes('RIG')) {
    tags.add('Animation');
  }

  if (tags.size === 0) {
    tags.add('Gameplay');
  }

  return Array.from(tags);
}

/**
 * Retrieves all stored tags for a project
 */
export function getBlueprintTagsMap(projectId: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(`${TAG_STORAGE_PREFIX}${projectId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load blueprint tags for project ${projectId}:`, err);
    return {};
  }
}

/**
 * Returns tags for a specific blueprint asset, using persisted tags or falling back to inferred defaults
 */
export function getAssetTags(projectId: string, assetName: string, assetType?: string): string[] {
  const map = getBlueprintTagsMap(projectId);
  if (map[assetName] && Array.isArray(map[assetName])) {
    return map[assetName];
  }
  return inferDefaultTags(assetName, assetType);
}

/**
 * Updates tags for an asset
 */
export function setAssetTags(projectId: string, assetName: string, tags: string[]): void {
  try {
    const map = getBlueprintTagsMap(projectId);
    map[assetName] = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
    localStorage.setItem(`${TAG_STORAGE_PREFIX}${projectId}`, JSON.stringify(map));
  } catch (err) {
    console.error(`Failed to save blueprint tags for ${assetName}:`, err);
  }
}

/**
 * Adds a single tag to an asset
 */
export function addAssetTag(projectId: string, assetName: string, tag: string, assetType?: string): string[] {
  const current = getAssetTags(projectId, assetName, assetType);
  const updated = Array.from(new Set([...current, tag.trim()])).filter(Boolean);
  setAssetTags(projectId, assetName, updated);
  return updated;
}

/**
 * Removes a single tag from an asset
 */
export function removeAssetTag(projectId: string, assetName: string, tag: string, assetType?: string): string[] {
  const current = getAssetTags(projectId, assetName, assetType);
  const updated = current.filter(t => t !== tag.trim());
  setAssetTags(projectId, assetName, updated);
  return updated;
}

/**
 * Collects all unique tags across a set of assets for filter navigation
 */
export function getAllUniqueTags(
  projectId: string,
  assets: { name: string; type?: string }[]
): { tag: string; count: number }[] {
  const map = getBlueprintTagsMap(projectId);
  const tagCounts: Record<string, number> = {};

  assets.forEach(asset => {
    const tags = map[asset.name] || inferDefaultTags(asset.name, asset.type);
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
