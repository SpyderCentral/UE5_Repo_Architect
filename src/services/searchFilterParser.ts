import { AssetType } from '../components/BlueprintArchitect';
import { BlueprintComplexityInfo } from '../types';

export interface ParsedSearchFilter {
  type?: string;
  status?: 'all' | 'generated' | 'pending';
  parentClass?: string;
  tag?: string;
  scoreOp?: '>' | '<' | '>=' | '<=' | '=';
  scoreVal?: number;
  complexityTier?: 'low' | 'moderate' | 'high' | 'critical';
  nodesOp?: '>' | '<' | '>=' | '<=' | '=';
  nodesVal?: number;
  folder?: string;
  freeText: string;
  rawTokens: { key: string; value: string; raw: string }[];
}

/**
 * Parses user input for advanced search syntax, e.g.:
 * "type:AI status:todo score:>40 class:Character combat"
 */
export function parseSearchQuery(query: string): ParsedSearchFilter {
  const result: ParsedSearchFilter = {
    freeText: '',
    rawTokens: []
  };

  if (!query || !query.trim()) {
    return result;
  }

  // Regex to match key:value tokens (supporting quoted values like class:"Character Movement")
  const tokenRegex = /(?:(\w+):(?:"([^"]+)"|([^\s]+)))/g;
  let remainingText = query;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(query)) !== null) {
    const raw = match[0];
    const key = (match[1] || '').toLowerCase();
    const value = match[2] !== undefined ? match[2] : match[3];

    result.rawTokens.push({ key, value, raw });

    // Remove token from remaining text
    remainingText = remainingText.replace(raw, ' ');

    switch (key) {
      case 'type':
      case 't': {
        result.type = value.toLowerCase();
        break;
      }
      case 'status':
      case 's': {
        const valLower = value.toLowerCase();
        if (valLower === 'todo' || valLower === 'pending' || valLower === 'queued') {
          result.status = 'pending';
        } else if (valLower === 'generated' || valLower === 'done' || valLower === 'ready') {
          result.status = 'generated';
        } else if (valLower === 'all') {
          result.status = 'all';
        }
        break;
      }
      case 'class':
      case 'parent':
      case 'c': {
        result.parentClass = value.toLowerCase();
        break;
      }
      case 'tag':
      case 'tags': {
        result.tag = value.toLowerCase();
        break;
      }
      case 'score':
      case 'complexity':
      case 'comp': {
        const valLower = value.toLowerCase();
        if (['low', 'moderate', 'high', 'critical'].includes(valLower)) {
          result.complexityTier = valLower as 'low' | 'moderate' | 'high' | 'critical';
        } else {
          const numMatch = valLower.match(/^([><]=?|=)?(\d+)$/);
          if (numMatch) {
            result.scoreOp = (numMatch[1] as any) || '>=';
            result.scoreVal = parseInt(numMatch[2], 10);
          }
        }
        break;
      }
      case 'nodes':
      case 'node': {
        const numMatch = value.match(/^([><]=?|=)?(\d+)$/);
        if (numMatch) {
          result.nodesOp = (numMatch[1] as any) || '>=';
          result.nodesVal = parseInt(numMatch[2], 10);
        }
        break;
      }
      case 'path':
      case 'folder':
      case 'dir': {
        result.folder = value.toLowerCase();
        break;
      }
      default:
        // Unknown key, treat as part of free text
        remainingText += ` ${key}:${value}`;
        break;
    }
  }

  result.freeText = remainingText.replace(/\s+/g, ' ').trim().toLowerCase();
  return result;
}

/**
 * Normalizes input string to canonical AssetType
 */
export function normalizeTypeToken(token: string): AssetType | null {
  const t = token.toLowerCase();
  if (t === 'ai' || t === 'bt' || t === 'behavior' || t === 'behaviortree') return 'BehaviorTree';
  if (t === 'bp' || t === 'blueprint') return 'Blueprint';
  if (t === 'wbp' || t === 'widget' || t === 'ui') return 'Widget';
  if (t === 'input' || t === 'ia' || t === 'imc') return 'Input';
  if (t === 'material' || t === 'mat' || t === 'm' || t === 'shader') return 'Material';
  if (t === 'metasound' || t === 'audio' || t === 'sound' || t === 'ms') return 'MetaSound';
  if (t === 'pcg' || t === 'procedural') return 'PCG';
  return null;
}

/**
 * Evaluates whether an asset matches the parsed filter
 */
export function matchesSearchFilter(
  asset: {
    name: string;
    desc?: string;
    folder: string;
    type: AssetType;
  },
  filter: ParsedSearchFilter,
  extra: {
    isGenerated: boolean;
    parentClass?: string;
    tags: string[];
    complexity?: BlueprintComplexityInfo;
    nodeCount?: number;
  }
): boolean {
  // 1. Type filter
  if (filter.type) {
    const normalized = normalizeTypeToken(filter.type);
    if (normalized) {
      if (asset.type !== normalized) return false;
    } else {
      // Direct string match against asset.type or asset name prefix
      const matchType = asset.type.toLowerCase().includes(filter.type);
      const matchPrefix = asset.name.toLowerCase().startsWith(filter.type);
      if (!matchType && !matchPrefix) return false;
    }
  }

  // 2. Status filter
  if (filter.status && filter.status !== 'all') {
    if (filter.status === 'generated' && !extra.isGenerated) return false;
    if (filter.status === 'pending' && extra.isGenerated) return false;
  }

  // 3. Parent Class filter
  if (filter.parentClass) {
    const parentLower = (extra.parentClass || '').toLowerCase();
    if (!parentLower.includes(filter.parentClass)) return false;
  }

  // 4. Tag filter
  if (filter.tag) {
    const hasTag = extra.tags.some(t => t.toLowerCase().includes(filter.tag!));
    if (!hasTag) return false;
  }

  // 5. Complexity Score / Tier filter
  if (filter.complexityTier && extra.complexity) {
    if (extra.complexity.tier !== filter.complexityTier) return false;
  }

  if (filter.scoreVal !== undefined && extra.complexity) {
    const val = extra.complexity.score;
    const target = filter.scoreVal;
    const op = filter.scoreOp || '>=';
    if (op === '>' && !(val > target)) return false;
    if (op === '>=' && !(val >= target)) return false;
    if (op === '<' && !(val < target)) return false;
    if (op === '<=' && !(val <= target)) return false;
    if (op === '=' && !(val === target)) return false;
  }

  // 6. Node Count filter
  if (filter.nodesVal !== undefined) {
    const nodeCount = extra.nodeCount ?? extra.complexity?.breakdown.nodeCount ?? 0;
    const target = filter.nodesVal;
    const op = filter.nodesOp || '>=';
    if (op === '>' && !(nodeCount > target)) return false;
    if (op === '>=' && !(nodeCount >= target)) return false;
    if (op === '<' && !(nodeCount < target)) return false;
    if (op === '<=' && !(nodeCount <= target)) return false;
    if (op === '=' && !(nodeCount === target)) return false;
  }

  // 7. Folder / Path filter
  if (filter.folder) {
    const folderLower = (asset.folder || '').toLowerCase();
    if (!folderLower.includes(filter.folder)) return false;
  }

  // 8. Free text matching
  if (filter.freeText) {
    const ft = filter.freeText;
    const nameMatch = asset.name.toLowerCase().includes(ft);
    const descMatch = (asset.desc || '').toLowerCase().includes(ft);
    const folderMatch = (asset.folder || '').toLowerCase().includes(ft);
    const parentMatch = (extra.parentClass || '').toLowerCase().includes(ft);
    const tagMatch = extra.tags.some(t => t.toLowerCase().includes(ft));

    if (!nameMatch && !descMatch && !folderMatch && !parentMatch && !tagMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Suggested power-user filter presets for quick discovery
 */
export const SEARCH_SYNTAX_EXAMPLES = [
  { label: 'AI & Behavior Trees', query: 'type:AI' },
  { label: 'Pending Generation', query: 'status:todo' },
  { label: 'Character Blueprints', query: 'class:Character' },
  { label: 'High Complexity Logic', query: 'complexity:high' },
  { label: 'Complex Nodes (>10)', query: 'nodes:>10' },
  { label: 'AI Combat Tasks', query: 'type:AI status:todo' },
  { label: 'Critical Refactor Alerts', query: 'score:>60' },
  { label: 'UI Widgets', query: 'type:widget' },
  { label: 'Procedural PCG', query: 'type:pcg' },
];
