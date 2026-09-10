/**
 * Industry-Standard Unreal Engine Asset Naming Convention Rules & Assistant
 * Grounded in Epic Games Standard Conventions and Allar's UE5 Style Guide.
 */

export interface NamingPrefixRule {
  assetType: string;
  prefix: string;
  secondaryPrefixes?: string[];
  recommendedSuffix?: string;
  category: 'Core' | 'Rendering' | 'Audio' | 'Gameplay' | 'Input' | 'AI' | 'UI';
  example: string;
  description: string;
}

export const INDUSTRY_NAMING_RULES: NamingPrefixRule[] = [
  {
    assetType: 'Blueprint',
    prefix: 'BP_',
    secondaryPrefixes: ['B_'],
    category: 'Core',
    example: 'BP_HeroCharacter',
    description: 'Blueprint Actor or Object class'
  },
  {
    assetType: 'Animation Blueprint',
    prefix: 'ABP_',
    category: 'Core',
    example: 'ABP_HeroLocomotion',
    description: 'Animation state machine and graph'
  },
  {
    assetType: 'Widget Blueprint',
    prefix: 'WBP_',
    secondaryPrefixes: ['WB_', 'UW_'],
    category: 'UI',
    example: 'WBP_PlayerHUD',
    description: 'User Interface Widget Blueprint'
  },
  {
    assetType: 'Blueprint Interface',
    prefix: 'BPI_',
    category: 'Core',
    example: 'BPI_Damageable',
    description: 'Decoupled communication interface'
  },
  {
    assetType: 'Material',
    prefix: 'M_',
    category: 'Rendering',
    example: 'M_Metal_Chrome',
    description: 'Master shading material'
  },
  {
    assetType: 'Material Instance',
    prefix: 'MI_',
    recommendedSuffix: '_Inst',
    category: 'Rendering',
    example: 'MI_Metal_Rusted',
    description: 'Instanced material with parameter overrides'
  },
  {
    assetType: 'Material Function',
    prefix: 'MF_',
    category: 'Rendering',
    example: 'MF_TriplanarProjection',
    description: 'Reusable shader sub-graph'
  },
  {
    assetType: 'Texture',
    prefix: 'T_',
    category: 'Rendering',
    example: 'T_Rock_BaseColor_D',
    description: 'Texture map with suffix (_D, _N, _R, _M, _AO)'
  },
  {
    assetType: 'Static Mesh',
    prefix: 'SM_',
    category: 'Rendering',
    example: 'SM_StonePillar_01',
    description: 'Rigid 3D geometry mesh'
  },
  {
    assetType: 'Skeletal Mesh',
    prefix: 'SK_',
    category: 'Core',
    example: 'SK_Dragon_Boss',
    description: 'Rigged animated geometry mesh'
  },
  {
    assetType: 'MetaSound',
    prefix: 'MS_',
    secondaryPrefixes: ['MSS_'],
    category: 'Audio',
    example: 'MS_Footsteps_Grass',
    description: 'DSP audio graph generator'
  },
  {
    assetType: 'Sound Cue',
    prefix: 'SC_',
    category: 'Audio',
    example: 'SC_Explosion_Large',
    description: 'Legacy audio cue graph'
  },
  {
    assetType: 'Behavior Tree',
    prefix: 'BT_',
    category: 'AI',
    example: 'BT_Guard_Patrol',
    description: 'AI decision tree'
  },
  {
    assetType: 'Blackboard',
    prefix: 'BB_',
    category: 'AI',
    example: 'BB_Guard_Memory',
    description: 'AI memory data keys'
  },
  {
    assetType: 'Enhanced Input Action',
    prefix: 'IA_',
    category: 'Input',
    example: 'IA_Jump',
    description: 'Digital or axis input action'
  },
  {
    assetType: 'Input Mapping Context',
    prefix: 'IMC_',
    category: 'Input',
    example: 'IMC_DefaultControls',
    description: 'Context binding keys to Input Actions'
  },
  {
    assetType: 'PCG Graph',
    prefix: 'PCG_',
    category: 'Gameplay',
    example: 'PCG_Forest_Scatter',
    description: 'Procedural Content Generation graph'
  },
  {
    assetType: 'Niagara System',
    prefix: 'NS_',
    category: 'Rendering',
    example: 'NS_Fire_Sparks',
    description: 'VFX particle system'
  },
  {
    assetType: 'Enumeration',
    prefix: 'E_',
    category: 'Core',
    example: 'E_WeaponRarity',
    description: 'User Defined Enum'
  },
  {
    assetType: 'Structure',
    prefix: 'S_',
    category: 'Core',
    example: 'S_PlayerInventorySlot',
    description: 'User Defined Struct'
  }
];

export interface AssetNamingAuditItem {
  id: string;
  originalName: string;
  assetType: string;
  suggestedName: string;
  status: 'compliant' | 'violation' | 'warning';
  appliedRule: NamingPrefixRule;
  reason: string;
  category: string;
}

export interface ProjectNamingReport {
  totalAssets: number;
  compliantCount: number;
  violationCount: number;
  compliancePercentage: number;
  items: AssetNamingAuditItem[];
  pythonRenameScript: string;
}

/**
 * Normalizes an asset name to PascalCase and applies industry standard prefix
 */
export function generateStandardizedName(name: string, targetType: string): { suggested: string; reason: string } {
  const rule = getRuleForAssetType(targetType);
  if (!rule) return { suggested: name, reason: 'No naming rule configured' };

  let base = name.trim();

  // Strip unwanted common prefixes if they don't match the canonical one
  const allKnownPrefixes = [
    'BP_', 'B_', 'ABP_', 'WBP_', 'WB_', 'UW_', 'BPI_', 'M_', 'MI_', 'MF_',
    'T_', 'SM_', 'SK_', 'MS_', 'MSS_', 'SC_', 'BT_', 'BB_', 'IA_', 'IMC_',
    'PCG_', 'NS_', 'NE_', 'E_', 'S_'
  ];

  for (const prefix of allKnownPrefixes) {
    if (base.startsWith(prefix)) {
      base = base.substring(prefix.length);
      break;
    }
  }

  // Also remove redundant word prefixes like "Blueprint_", "Material_", "Audio_"
  base = base.replace(/^(blueprint|material|texture|sound|metasound|audio|inputaction|inputcontext|behaviortree)_/i, '');

  // Clean invalid characters and ensure proper PascalCase
  base = base.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Convert first character to uppercase
  if (base.length > 0) {
    base = base.charAt(0).toUpperCase() + base.slice(1);
  }

  const suggested = `${rule.prefix}${base}`;
  return {
    suggested,
    reason: `Apply industry-standard '${rule.prefix}' prefix for ${rule.assetType}`
  };
}

/**
 * Finds the naming rule for a given asset type string
 */
export function getRuleForAssetType(assetType: string): NamingPrefixRule | undefined {
  const t = assetType.toLowerCase();
  if (t.includes('widget') || t.includes('ui') || t.includes('hud')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'WBP_');
  }
  if (t.includes('anim') && t.includes('blueprint')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'ABP_');
  }
  if (t.includes('interface')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'BPI_');
  }
  if (t.includes('blueprint') || t.includes('actor') || t.includes('character')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'BP_');
  }
  if (t.includes('material instance')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'MI_');
  }
  if (t.includes('material')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'M_');
  }
  if (t.includes('texture')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'T_');
  }
  if (t.includes('metasound') || t.includes('sound') || t.includes('audio')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'MS_');
  }
  if (t.includes('behavior') || t.includes('tree') || t.includes('ai')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'BT_');
  }
  if (t.includes('input') && (t.includes('action') || t.includes('ia'))) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'IA_');
  }
  if (t.includes('mapping') || t.includes('context') || t.includes('imc')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'IMC_');
  }
  if (t.includes('pcg')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'PCG_');
  }
  if (t.includes('mesh') || t.includes('static')) {
    return INDUSTRY_NAMING_RULES.find(r => r.prefix === 'SM_');
  }

  return INDUSTRY_NAMING_RULES.find(r => r.assetType.toLowerCase() === t);
}

/**
 * Audits a single asset against standard naming conventions
 */
export function auditAssetName(name: string, assetType: string): AssetNamingAuditItem {
  const rule = getRuleForAssetType(assetType) || INDUSTRY_NAMING_RULES[0];
  const primaryPrefix = rule.prefix;
  const secondaryPrefixes = rule.secondaryPrefixes || [];

  const isPrimaryMatch = name.startsWith(primaryPrefix);
  const isSecondaryMatch = secondaryPrefixes.some(p => name.startsWith(p));

  if (isPrimaryMatch) {
    return {
      id: `${assetType}_${name}`,
      originalName: name,
      assetType: rule.assetType,
      suggestedName: name,
      status: 'compliant',
      appliedRule: rule,
      reason: `Complies with canonical '${primaryPrefix}' prefix standard`,
      category: rule.category
    };
  }

  if (isSecondaryMatch) {
    const { suggested } = generateStandardizedName(name, assetType);
    return {
      id: `${assetType}_${name}`,
      originalName: name,
      assetType: rule.assetType,
      suggestedName: suggested,
      status: 'warning',
      appliedRule: rule,
      reason: `Acceptable secondary prefix, but '${primaryPrefix}' is preferred standard`,
      category: rule.category
    };
  }

  const { suggested } = generateStandardizedName(name, assetType);
  return {
    id: `${assetType}_${name}`,
    originalName: name,
    assetType: rule.assetType,
    suggestedName: suggested,
    status: 'violation',
    appliedRule: rule,
    reason: `Missing required '${primaryPrefix}' prefix for ${rule.assetType}`,
    category: rule.category
  };
}

/**
 * Runs a comprehensive project audit across all assets
 */
export function auditProjectNaming(assets: { name: string; type: string }[]): ProjectNamingReport {
  const auditedItems = assets.map(a => auditAssetName(a.name, a.type));

  const totalAssets = auditedItems.length;
  const compliantCount = auditedItems.filter(i => i.status === 'compliant').length;
  const violationCount = auditedItems.filter(i => i.status === 'violation').length;

  const compliancePercentage = totalAssets > 0 ? Math.round((compliantCount / totalAssets) * 100) : 100;

  // Generate runnable Python batch rename script for Unreal Engine 5 console
  const renames = auditedItems.filter(i => i.status !== 'compliant');
  const pythonLines: string[] = [
    '# ======================================================================',
    '# Unreal Engine 5 Python Asset Naming Standardization Batch Script',
    '# Run in UE5 Output Log Python command prompt: py "script_name.py"',
    '# ======================================================================',
    'import unreal',
    '',
    'asset_tools = unreal.AssetToolsHelpers.get_asset_tools()',
    'editor_asset_lib = unreal.EditorAssetLibrary()',
    '',
    'rename_mappings = ['
  ];

  renames.forEach(r => {
    pythonLines.push(`    ("${r.originalName}", "${r.suggestedName}"),`);
  });

  pythonLines.push(']');
  pythonLines.push('');
  pythonLines.push('print(f"Standardizing {len(rename_mappings)} assets in /Game/...")');
  pythonLines.push('success_count = 0');
  pythonLines.push('');
  pythonLines.push('for old_name, new_name in rename_mappings:');
  pythonLines.push('    # Search asset by name in /Game/');
  pythonLines.push('    asset_path = f"/Game/{old_name}"');
  pythonLines.push('    new_path = f"/Game/{new_name}"');
  pythonLines.push('    if editor_asset_lib.does_asset_exist(asset_path):');
  pythonLines.push('        renamed = editor_asset_lib.rename_asset(asset_path, new_path)');
  pythonLines.push('        if renamed:');
  pythonLines.push('            print(f" Renamed {old_name} -> {new_name}")');
  pythonLines.push('            success_count += 1');
  pythonLines.push('        else:');
  pythonLines.push('            print(f" Failed to rename {old_name}")');
  pythonLines.push('    else:');
  pythonLines.push('        print(f" Note: {old_name} not yet instantiated in /Game/")');
  pythonLines.push('');
  pythonLines.push('print(f"Standardization complete. Successfully renamed {success_count} assets.")');

  return {
    totalAssets,
    compliantCount,
    violationCount,
    compliancePercentage,
    items: auditedItems,
    pythonRenameScript: pythonLines.join('\n')
  };
}
