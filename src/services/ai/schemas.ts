
import { Type, Schema } from "@google/genai";

const blueprintFunctionSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    parameters: { type: Type.ARRAY, items: { type: Type.STRING } },
    returnType: { type: Type.STRING },
    logicDescription: { type: Type.STRING },
    isPublic: { type: Type.BOOLEAN },
    category: { type: Type.STRING },
    implementationTarget: { type: Type.STRING, description: "The specific Blueprint asset name this function belongs to." }
  },
  required: ["name", "parameters", "logicDescription", "implementationTarget"]
};

const blueprintVariableSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING },
    default: { type: Type.STRING },
    tooltip: { type: Type.STRING },
    isExposed: { type: Type.BOOLEAN }
  },
  required: ["name", "type", "default"]
};

const blueprintMacroSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
    outputs: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["name", "description"]
};

const blueprintDispatcherSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    parameters: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["name", "parameters"]
};

export const planSchemaDef = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    targetPlatformRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    requiredPlugins: { type: Type.ARRAY, items: { type: Type.STRING } },
    migrationNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phaseName: { type: Type.STRING },
          duration: { type: Type.STRING },
          goal: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                folderPath: { type: Type.STRING },
                assetName: { type: Type.STRING },
                stepByStepGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedNodes: { type: Type.ARRAY, items: { type: Type.STRING } },
                requiredFunctions: { type: Type.ARRAY, items: blueprintFunctionSchema },
                blueprintDetails: {
                  type: Type.OBJECT,
                  properties: {
                    variables: { type: Type.ARRAY, items: blueprintVariableSchema },
                    components: { type: Type.ARRAY, items: { type: Type.STRING } },
                    propertySettings: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          component: { type: Type.STRING },
                          property: { type: Type.STRING },
                          value: { type: Type.STRING }
                        },
                        required: ["component", "property", "value"]
                      }
                    }
                  }
                }
              },
              required: ["title", "description", "folderPath", "assetName", "stepByStepGuide"]
            }
          },
          keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["phaseName", "duration", "goal", "tasks"]
      }
    }
  },
  required: ["title", "summary", "phases"]
};

export const planSchema: Schema = planSchemaDef as Schema;

export const blueprintSpecSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetName: { type: Type.STRING },
    parentClass: { type: Type.STRING },
    components: { type: Type.ARRAY, items: { type: Type.STRING } },
    variables: { type: Type.ARRAY, items: blueprintVariableSchema },
    functions: { type: Type.ARRAY, items: blueprintFunctionSchema },
    macros: { type: Type.ARRAY, items: blueprintMacroSchema },
    dispatchers: { type: Type.ARRAY, items: blueprintDispatcherSchema },
    eventGraph: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          eventName: { type: Type.STRING },
          description: { type: Type.STRING },
          nodes: { 
            type: Type.ARRAY, 
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['event', 'function', 'macro', 'variable', 'flow', 'audio', 'pcg'] },
                inputs: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            name: { type: Type.STRING }, 
                            type: { type: Type.STRING }, 
                            value: { type: Type.STRING } 
                        }, 
                        required: ["name", "type"] 
                    } 
                },
                outputs: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            name: { type: Type.STRING }, 
                            type: { type: Type.STRING } 
                        }, 
                        required: ["name", "type"] 
                    } 
                }
              },
              required: ["id", "name", "type", "inputs", "outputs"]
            }
          },
          connections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fromNode: { type: Type.STRING },
                fromPin: { type: Type.STRING },
                toNode: { type: Type.STRING },
                toPin: { type: Type.STRING }
              },
              required: ["fromNode", "fromPin", "toNode", "toPin"]
            }
          }
        },
        required: ["eventName", "nodes", "connections"]
      }
    },
    requiredAssets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          sourceType: { type: Type.STRING },
          importGuide: { type: Type.STRING }
        },
        required: ["name", "sourceType"]
      }
    }
  },
  required: ["assetName", "parentClass", "components", "variables", "functions", "eventGraph", "requiredAssets"]
};

export const overseerReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallReadiness: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    subsystems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pillar: { type: Type.STRING },
          score: { type: Type.NUMBER },
          status: { type: Type.STRING },
          details: { type: Type.STRING }
        },
        required: ["pillar", "score", "status", "details"]
      }
    },
    missingCriticalAssets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["name", "type", "reason"]
      }
    },
    technicalDebtAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedNextAction: { type: Type.STRING }
  },
  required: ["overallReadiness", "summary", "subsystems", "missingCriticalAssets", "suggestedNextAction"]
};

export const compatibilitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: { type: Type.STRING, enum: ['Compatible', 'Warnings', 'Critical Issues'] },
    warnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          asset: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
          issue: { type: Type.STRING },
          fix: { type: Type.STRING }
        },
        required: ["asset", "severity", "issue", "fix"]
      }
    },
    architecturalAdvice: { type: Type.STRING }
  },
  required: ["overallStatus", "warnings", "architecturalAdvice"]
};

export const behaviorTreeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetName: { type: Type.STRING },
    blackboardAsset: { type: Type.STRING },
    rootNode: { type: Type.STRING },
    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["id", "name"] } },
    blackboardKeys: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "type"] } },
    logicSummary: { type: Type.STRING }
  },
  required: ["assetName", "blackboardAsset", "rootNode", "nodes", "blackboardKeys", "logicSummary"]
};

export const searchAgentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestedQueries: { type: Type.ARRAY, items: { type: Type.STRING } },
    technicalReasoning: { type: Type.STRING }
  },
  required: ["suggestedQueries", "technicalReasoning"]
};

export const projectAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    genres: { type: Type.ARRAY, items: { type: Type.STRING } },
    platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
    mechanics: { type: Type.ARRAY, items: { type: Type.STRING } },
    artStyle: { type: Type.STRING },
    lightingMethod: { type: Type.STRING },
    ueVersion: { type: Type.STRING },
    inputSystem: { type: Type.STRING },
    networking: { type: Type.STRING },
    template: { type: Type.STRING },
    assets: { type: Type.ARRAY, items: { type: Type.STRING } },
    teamSize: { type: Type.NUMBER }
  },
  required: ["genres", "platforms", "mechanics", "artStyle", "lightingMethod", "ueVersion", "inputSystem", "networking", "template", "assets", "teamSize"]
};

export const designReviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    technicalDirector: { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, flags: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }, score: { type: Type.NUMBER } }, required: ["summary", "flags", "recommendations", "score"] },
    artDirector: { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, flags: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }, score: { type: Type.NUMBER } }, required: ["summary", "flags", "recommendations", "score"] },
    producer: { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, flags: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }, score: { type: Type.NUMBER }, timeToPrototype: { type: Type.STRING }, estimatedBudgetRisk: { type: Type.STRING } }, required: ["summary", "flags", "recommendations", "score", "timeToPrototype", "estimatedBudgetRisk"] }
  },
  required: ["technicalDirector", "artDirector", "producer"]
};

export const performanceAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    score: { type: Type.NUMBER },
    metrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.STRING }, status: { type: Type.STRING } }, required: ["label", "value", "status"] } },
    bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, complexity: { type: Type.STRING } }, required: ["title", "description", "complexity"] } }
  },
  required: ["summary", "score", "metrics", "bottlenecks", "recommendations"]
};

export const materialSpecSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetName: { type: Type.STRING },
    domain: { type: Type.STRING },
    blendMode: { type: Type.STRING },
    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["id", "name"] } },
    connections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fromNode: { type: Type.STRING }, fromPin: { type: Type.STRING }, toNode: { type: Type.STRING }, toPin: { type: Type.STRING } }, required: ["fromNode", "fromPin", "toNode", "toPin"] } }
  },
  required: ["assetName", "domain", "blendMode", "nodes", "connections"]
};

export const enhancedInputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    contextName: { type: Type.STRING },
    description: { type: Type.STRING },
    actions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, valueType: { type: Type.STRING } }, required: ["name", "description", "valueType"] } },
    mappings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { actionName: { type: Type.STRING }, key: { type: Type.STRING }, modifiers: { type: Type.ARRAY, items: { type: Type.STRING } }, triggers: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["actionName", "key"] } }
  },
  required: ["contextName", "description", "actions", "mappings"]
};

export const chatSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    response: { type: Type.STRING },
    hasPlanUpdates: { type: Type.BOOLEAN },
    updatedPlan: planSchemaDef as Schema
  },
  required: ["response", "hasPlanUpdates"]
};

export const enhancementSchema: Schema = {
  type: Type.OBJECT,
  properties: { enhancedConcept: { type: Type.STRING } },
  required: ["enhancedConcept"]
};

export const pythonScriptSchema: Schema = {
  type: Type.OBJECT,
  properties: { script: { type: Type.STRING }, usageGuide: { type: Type.STRING } },
  required: ["script", "usageGuide"]
};

export const cppCodeSchema: Schema = {
  type: Type.OBJECT,
  properties: { header: { type: Type.STRING }, source: { type: Type.STRING }, explanation: { type: Type.STRING } },
  required: ["header", "source", "explanation"]
};

export const verseCodeSchema: Schema = {
  type: Type.OBJECT,
  properties: { 
    code: { type: Type.STRING }, 
    explanation: { type: Type.STRING },
    concurrencyModel: { type: Type.STRING },
    ue6Features: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["code", "explanation"]
};

export const visualPromptsSchema: Schema = {
  type: Type.OBJECT,
  properties: { prompts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, prompt: { type: Type.STRING }, title: { type: Type.STRING } }, required: ["category", "prompt", "title"] } } },
  required: ["prompts"]
};

export const t3dResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: { t3d: { type: Type.STRING } },
  required: ["t3d"]
};

export const questListSchema: Schema = {
  type: Type.OBJECT,
  properties: { quests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["title", "description"] } } },
  required: ["quests"]
};

export const npcListSchema: Schema = {
  type: Type.OBJECT,
  properties: { npcs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING } }, required: ["name", "role"] } } },
  required: ["npcs"]
};

export const dialogueSchema: Schema = {
  type: Type.OBJECT,
  properties: { context: { type: Type.STRING }, lines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["speaker", "text"] } } },
  required: ["context", "lines"]
};

export const levelLayoutSchema: Schema = {
  type: Type.OBJECT,
  properties: { 
    name: { type: Type.STRING }, 
    description: { type: Type.STRING }, 
    visualPrompt: { type: Type.STRING },
    pointsOfInterest: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING }, 
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Spawn', 'Enemy', 'Boss', 'Loot', 'Puzzle', 'Point', 'NavMesh', 'Volume'] }
        }, 
        required: ["name", "description", "type"] 
      } 
    } 
  },
  required: ["name", "description", "pointsOfInterest", "visualPrompt"]
};

export const metaSoundSpecSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetName: { type: Type.STRING },
    description: { type: Type.STRING },
    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["id", "name"] } },
    connections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fromNode: { type: Type.STRING }, toNode: { type: Type.STRING } }, required: ["fromNode", "toNode"] } },
    dspLogic: { type: Type.STRING }
  },
  required: ["assetName", "description", "nodes", "connections", "dspLogic"]
};

export const pcgSpecSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetName: { type: Type.STRING },
    description: { type: Type.STRING },
    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["id", "name"] } },
    connections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fromNode: { type: Type.STRING }, toNode: { type: Type.STRING } }, required: ["fromNode", "toNode"] } },
    proceduralLogic: { type: Type.STRING }
  },
  required: ["assetName", "description", "nodes", "connections", "proceduralLogic"]
};

export const conflictAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    conflicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          affectedAssets: { type: Type.ARRAY, items: { type: Type.STRING } },
          conflictingClass: { type: Type.STRING },
          severity: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["affectedAssets", "conflictingClass", "severity", "reason"]
      }
    },
    patchSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedPatchAsset: { type: Type.STRING }
  },
  required: ["summary", "conflicts", "patchSteps", "recommendedPatchAsset"]
};

export const model3DSpecSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    category: { type: Type.STRING, enum: ["Environment", "Character", "Prop", "UI", "Level"] },
    archetype: { type: Type.STRING },
    description: { type: Type.STRING },
    parts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          shape: { type: Type.STRING, enum: ["box", "sphere", "cylinder", "cone", "torus", "capsule", "ring", "pyramid", "wedge"] },
          position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          color: { type: Type.STRING },
          metalness: { type: Type.NUMBER },
          roughness: { type: Type.NUMBER },
          emissive: { type: Type.STRING },
          emissiveIntensity: { type: Type.NUMBER },
          opacity: { type: Type.NUMBER },
          wireframe: { type: Type.BOOLEAN },
          textureStyle: { 
            type: Type.STRING, 
            enum: ["cyber_armor", "brushed_steel", "worn_leather", "gold_inlay", "carbon_fiber", "glowing_circuit", "weathered_stone", "alien_chitin", "cloth_weave", "crystal_glass"] 
          },
          clearcoat: { type: Type.NUMBER },
          clearcoatRoughness: { type: Type.NUMBER }
        },
        required: ["name", "shape", "position", "scale", "color"]
      }
    },
    rigType: { type: Type.STRING, enum: ["humanoid", "quadruped", "mech", "creature"] },
    engineImportNotes: {
      type: Type.OBJECT,
      properties: {
        unreal: { type: Type.STRING },
        godot: { type: Type.STRING },
        unity: { type: Type.STRING }
      }
    }
  },
  required: ["name", "category", "description", "parts"]
};

export const gddDeconstructionSchema = {
  type: Type.OBJECT,
  properties: {
    gameTitle: { type: Type.STRING },
    logline: { type: Type.STRING },
    targetAudience: { type: Type.STRING },
    genres: { type: Type.ARRAY, items: { type: Type.STRING } },
    platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
    cameraPerspective: { 
      type: Type.STRING, 
      enum: ["First Person", "Third Person", "Top Down", "Isometric", "Side Scroller", "VR"] 
    },
    multiplayerModel: { 
      type: Type.STRING, 
      enum: ["Single Player", "Listen Server (Co-op)", "Dedicated Server"] 
    },
    artStyle: { type: Type.STRING },
    lightingMethod: { type: Type.STRING },
    recommendedUEVersion: { type: Type.STRING },
    recommendedTemplate: { 
      type: Type.STRING, 
      enum: ["None", "Third Person", "First Person", "Top Down", "Vehicle", "Handheld AR", "Virtual Reality"] 
    },
    recommendedPlugins: { type: Type.ARRAY, items: { type: Type.STRING } },
    coreMechanics: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyGameplayLoops: { type: Type.ARRAY, items: { type: Type.STRING } },
    technicalRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedBlueprints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          parentClass: { type: Type.STRING },
          role: { type: Type.STRING },
          primarySubsystem: { type: Type.STRING },
          keyFunctions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "parentClass", "role", "primarySubsystem", "keyFunctions"]
      }
    },
    worldBiomes: { type: Type.ARRAY, items: { type: Type.STRING } },
    narrativeOverview: { type: Type.STRING },
    riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    complianceScore: { type: Type.INTEGER }
  },
  required: [
    "gameTitle", 
    "logline", 
    "targetAudience", 
    "genres", 
    "platforms", 
    "cameraPerspective", 
    "multiplayerModel", 
    "artStyle", 
    "lightingMethod", 
    "recommendedUEVersion", 
    "recommendedTemplate", 
    "recommendedPlugins", 
    "coreMechanics", 
    "keyGameplayLoops", 
    "suggestedBlueprints", 
    "complianceScore"
  ]
};

