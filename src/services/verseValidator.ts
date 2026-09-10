/**
 * Verse Syntax Highlighting & Real-Time Validation Engine
 * Implements token-based syntax highlighting and static analysis for Epic Games Verse (UE6).
 */

export interface VerseDiagnostic {
  id: string;
  line: number; // 1-indexed
  column: number; // 1-indexed
  length: number;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestedFix?: {
    replacement: string;
    description: string;
  };
}

export interface VerseToken {
  type: 
    | 'keyword' 
    | 'specifier' 
    | 'type' 
    | 'string' 
    | 'number' 
    | 'comment' 
    | 'operator' 
    | 'identifier' 
    | 'punctuation' 
    | 'error' 
    | 'plain';
  text: string;
}

export interface HighlightedLine {
  lineNumber: number;
  tokens: VerseToken[];
  diagnostics: VerseDiagnostic[];
}

const VERSE_KEYWORDS = new Set([
  'using', 'module', 'class', 'struct', 'interface', 'var', 'set', 
  'if', 'else', 'for', 'block', 'spawn', 'sync', 'race', 'rush', 
  'branch', 'return', 'case', 'loop', 'break', 'not', 'and', 'or'
]);

const VERSE_SPECIFIERS = new Set([
  '<suspends>', '<transacts>', '<decides>', '<computes>', '<converges>',
  '<abstract>', '<concrete>', '<final>', '<public>', '<private>', 
  '<protected>', '<internal>', '<persistable>', '@editable'
]);

const VERSE_TYPES = new Set([
  'int', 'float', 'logic', 'string', 'char', 'void', 'type', 'any', 
  'comparable', 'tuple', 'player', 'agent', 'creative_device', 
  'fort_character', 'vector3', 'rotation', 'transform', 'audio_component',
  'material_instance'
]);

/**
 * Validates Verse source code and returns real-time diagnostics
 */
export function validateVerseCode(source: string): VerseDiagnostic[] {
  const diagnostics: VerseDiagnostic[] = [];
  const lines = source.split('\n');

  let hasSimulationImport = false;
  let hasDevicesImport = false;
  let usesAgentOrDevice = false;

  // Stack for bracket matching
  const bracketStack: { char: string; line: number; col: number }[] = [];

  let currentFunction: { name: string; line: number; hasSuspends: boolean; hasDecides: boolean } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Check imports
    if (trimmed.includes('using { /Verse.org/Simulation }')) hasSimulationImport = true;
    if (trimmed.includes('using { /Fortnite.com/Devices }')) hasDevicesImport = true;
    if (trimmed.includes('agent') || trimmed.includes('creative_device') || trimmed.includes('player')) {
      usesAgentOrDevice = true;
    }

    // Bracket/brace/parenthesis tracking
    let inString = false;
    let stringStartCol = 0;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      const nextChar = line[c + 1];

      // Comment ignores remainder of line
      if (char === '#' && !inString) {
        break;
      }

      if (char === '"' && line[c - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringStartCol = c + 1;
        } else {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '[' || char === '{') {
          bracketStack.push({ char, line: lineNum, col: c + 1 });
        } else if (char === ')' || char === ']' || char === '}') {
          const last = bracketStack.pop();
          const expected = char === ')' ? '(' : char === ']' ? '[' : '{';
          if (!last || last.char !== expected) {
            diagnostics.push({
              id: `unmatched_bracket_${lineNum}_${c}`,
              line: lineNum,
              column: c + 1,
              length: 1,
              severity: 'error',
              code: 'V001_UNMATCHED_DELIMITER',
              message: `Unmatched closing '${char}'. Expected corresponding opening bracket.`
            });
          }
        }
      }
    }

    if (inString) {
      diagnostics.push({
        id: `unclosed_string_${lineNum}`,
        line: lineNum,
        column: stringStartCol,
        length: line.length - stringStartCol + 1,
        severity: 'error',
        code: 'V002_UNCLOSED_STRING',
        message: 'Unterminated string literal. String quotes must be closed on the same line in Verse.',
        suggestedFix: {
          replacement: `${line}"`,
          description: 'Close string quote'
        }
      });
    }

    // Check function signatures
    // e.g. HandleBeginPlay()<suspends>:void =
    const funcMatch = line.match(/^(\s*)([A-Za-z0-9_]+)\s*\([^)]*\)\s*(<[^>]+>)*\s*:\s*([A-Za-z0-9_?]+)/);
    if (funcMatch) {
      const funcName = funcMatch[2];
      const specifiers = funcMatch[3] || '';
      currentFunction = {
        name: funcName,
        line: lineNum,
        hasSuspends: specifiers.includes('<suspends>'),
        hasDecides: specifiers.includes('<decides>')
      };
    }

    // Check for Sleep(...) or async primitives without <suspends>
    if (currentFunction && !currentFunction.hasSuspends) {
      if (trimmed.includes('Sleep(') || trimmed.includes('Sleep ') || trimmed.startsWith('sync') || trimmed.startsWith('race') || trimmed.startsWith('rush')) {
        const sleepCol = line.indexOf('Sleep');
        diagnostics.push({
          id: `missing_suspends_${lineNum}`,
          line: lineNum,
          column: sleepCol !== -1 ? sleepCol + 1 : 1,
          length: 5,
          severity: 'error',
          code: 'V101_MISSING_SUSPENDS',
          message: `Function '${currentFunction.name}' calls async operation but is missing the required '<suspends>' specifier.`,
          suggestedFix: {
            replacement: `<suspends>`,
            description: `Add <suspends> to ${currentFunction.name} signature`
          }
        });
      }
    }

    // Check for illegal mutable assignment with '=' without 'set'
    // E.g.: "Health = 50.0" instead of "set Health = 50.0" (excluding variable initialization ":=" or "var X : type = ...")
    const assignWithoutSet = line.match(/^(\s*)([a-zA-Z0-9_]+)\s*=\s*([^=].*)$/);
    if (assignWithoutSet && !trimmed.startsWith('var ') && !trimmed.startsWith('set ') && !trimmed.includes(':=') && !trimmed.includes('if ')) {
      const varName = assignWithoutSet[2];
      const eqIndex = line.indexOf('=');
      diagnostics.push({
        id: `illegal_assignment_${lineNum}`,
        line: lineNum,
        column: eqIndex + 1,
        length: 1,
        severity: 'error',
        code: 'V102_ILLEGAL_MUTATION',
        message: `In Verse, mutable variable mutation must be prefixed with 'set' (e.g. 'set ${varName} = ...') or initialized with ':='`,
        suggestedFix: {
          replacement: `set ${varName} = ${assignWithoutSet[3]}`,
          description: `Prefix with 'set ${varName} = ...'`
        }
      });
    }

    // Check for invalid 'var' declaration: E.g., "var MyVar := 10" (Verse requires explicit type for var: var MyVar : int = 10)
    if (trimmed.startsWith('var ') && trimmed.includes(':=')) {
      const col = line.indexOf(':=');
      diagnostics.push({
        id: `invalid_var_init_${lineNum}`,
        line: lineNum,
        column: col + 1,
        length: 2,
        severity: 'warning',
        code: 'V103_VAR_TYPE_ANNOTATION',
        message: `'var' variables require an explicit type annotation in Verse (e.g., 'var Name: type = value') rather than ':=' inference.`,
        suggestedFix: {
          replacement: ': float = ',
          description: 'Specify explicit type with = instead of :='
        }
      });
    }

    // Check for Failable indexing outside of failure context
    // E.g. "Item := MyArray[0]" directly on top-level without if
    if (!trimmed.startsWith('if') && line.match(/([a-zA-Z0-9_]+)\[\s*[0-9a-zA-Z_]+\s*\]/) && !line.includes('if') && !line.includes('?') && !line.includes('[]')) {
      const match = line.match(/([a-zA-Z0-9_]+\[[^\]]+\])/);
      if (match && !trimmed.startsWith('#') && !trimmed.includes('array{')) {
        const col = line.indexOf(match[0]);
        diagnostics.push({
          id: `failable_index_${lineNum}`,
          line: lineNum,
          column: col + 1,
          length: match[0].length,
          severity: 'warning',
          code: 'V104_FAILABLE_EXPRESSION',
          message: `Array indexing in Verse is a failable expression. Wrap in an 'if (Value := ${match[0]}):' block to guarantee runtime safety.`,
          suggestedFix: {
            replacement: `if (Value := ${match[0]}):`,
            description: 'Guard with if-expression'
          }
        });
      }
    }
  }

  // Report any unclosed brackets left in stack
  for (const unclosed of bracketStack) {
    diagnostics.push({
      id: `unclosed_${unclosed.line}_${unclosed.col}`,
      line: unclosed.line,
      column: unclosed.col,
      length: 1,
      severity: 'error',
      code: 'V003_UNCLOSED_BRACKET',
      message: `Unclosed delimiter '${unclosed.char}' opened on line ${unclosed.line}.`
    });
  }

  // Check missing standard simulation imports
  if (usesAgentOrDevice && !hasSimulationImport && lines.length > 5) {
    diagnostics.push({
      id: 'missing_sim_import',
      line: 1,
      column: 1,
      length: 5,
      severity: 'info',
      code: 'V201_RECOMMENDED_IMPORT',
      message: 'Module references creative devices or agent types. Ensure `using { /Verse.org/Simulation }` is imported.',
      suggestedFix: {
        replacement: 'using { /Verse.org/Simulation }\n',
        description: 'Add Simulation module import'
      }
    });
  }

  return diagnostics;
}

/**
 * Tokenizes a single line of Verse code for rich syntax highlighting
 */
export function tokenizeVerseLine(line: string): VerseToken[] {
  const tokens: VerseToken[] = [];
  let idx = 0;

  while (idx < line.length) {
    const char = line[idx];

    // Comments (# ...)
    if (char === '#') {
      tokens.push({ type: 'comment', text: line.substring(idx) });
      break;
    }

    // String literals ("...")
    if (char === '"') {
      let end = idx + 1;
      while (end < line.length && (line[end] !== '"' || line[end - 1] === '\\')) {
        end++;
      }
      if (end < line.length) end++; // include closing quote
      tokens.push({ type: 'string', text: line.substring(idx, end) });
      idx = end;
      continue;
    }

    // Specifiers in angle brackets: <suspends>, <transacts>, <decides>, etc.
    if (char === '<') {
      const match = line.substring(idx).match(/^<([a-zA-Z0-9_]+)>/);
      if (match) {
        tokens.push({ type: 'specifier', text: match[0] });
        idx += match[0].length;
        continue;
      }
    }

    // Decorators (@editable)
    if (char === '@') {
      const match = line.substring(idx).match(/^@[a-zA-Z0-9_]+/);
      if (match) {
        tokens.push({ type: 'specifier', text: match[0] });
        idx += match[0].length;
        continue;
      }
    }

    // Operators and assignment (:=, =, +, -, *, /, ?, :, =>)
    if (line.substring(idx, idx + 2) === ':=') {
      tokens.push({ type: 'operator', text: ':=' });
      idx += 2;
      continue;
    }
    if (line.substring(idx, idx + 2) === '=>') {
      tokens.push({ type: 'operator', text: '=>' });
      idx += 2;
      continue;
    }

    // Numbers (e.g. 10, 25.0, -1.5)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(line[idx + 1] || ''))) {
      const match = line.substring(idx).match(/^[0-9]+(\.[0-9]+)?/);
      if (match) {
        tokens.push({ type: 'number', text: match[0] });
        idx += match[0].length;
        continue;
      }
    }

    // Identifiers, keywords, types
    if (/[a-zA-Z_]/.test(char)) {
      const match = line.substring(idx).match(/^[a-zA-Z0-9_]+/);
      if (match) {
        const word = match[0];
        if (VERSE_KEYWORDS.has(word)) {
          tokens.push({ type: 'keyword', text: word });
        } else if (VERSE_TYPES.has(word)) {
          tokens.push({ type: 'type', text: word });
        } else {
          tokens.push({ type: 'identifier', text: word });
        }
        idx += word.length;
        continue;
      }
    }

    // Punctuation and brackets
    if (/[(){}[\]:;,?]/.test(char)) {
      tokens.push({ type: 'punctuation', text: char });
      idx++;
      continue;
    }

    // Whitespace or plain characters
    let end = idx + 1;
    while (end < line.length && !/[#"<@0-9a-zA-Z_(){}[\]:;,?]/.test(line[end])) {
      end++;
    }
    tokens.push({ type: 'plain', text: line.substring(idx, end) });
    idx = end;
  }

  return tokens;
}

/**
 * Builds the complete highlighted line structure with associated diagnostics
 */
export function buildHighlightedVerseLines(
  code: string, 
  diagnostics: VerseDiagnostic[]
): HighlightedLine[] {
  const lines = code.split('\n');
  const diagnosticsByLine = new Map<number, VerseDiagnostic[]>();

  diagnostics.forEach(d => {
    const list = diagnosticsByLine.get(d.line) || [];
    list.push(d);
    diagnosticsByLine.set(d.line, list);
  });

  return lines.map((lineText, idx) => {
    const lineNum = idx + 1;
    return {
      lineNumber: lineNum,
      tokens: tokenizeVerseLine(lineText),
      diagnostics: diagnosticsByLine.get(lineNum) || []
    };
  });
}
