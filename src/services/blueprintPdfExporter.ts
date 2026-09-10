import { jsPDF } from 'jspdf';
import { BlueprintSpec, AssetResourceMetric } from '../types';

export interface ExportPdfOptions {
  projectName?: string;
  author?: string;
  includeTelemetry?: boolean;
  currentPlatformMetric?: AssetResourceMetric;
  documentTitle?: string;
}

/**
 * Draws decorative top accent line and running header
 */
function drawHeaderDecoration(doc: jsPDF, title: string, margin: number, pageWidth: number) {
  doc.setDrawColor(0, 112, 224); // UE Blue
  doc.setLineWidth(0.8);
  doc.line(margin, 8, pageWidth - margin, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 150, 165);
  doc.text(`UNREAL ENGINE 5 TECHNICAL SPECIFICATION | ${title}`, margin, 6);
}

/**
 * Adds running page numbers and footer text across all generated pages
 */
function applyFootersAndHeaders(doc: jsPDF, subtitle: string, margin: number, pageWidth: number, pageHeight: number) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    // Bottom border line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(`UE5 Architect • ${subtitle}`, margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 6);
  }
}

/**
 * Renders a full blueprint specification block onto the active jsPDF document
 */
function renderBlueprintSpecToDoc(
  doc: jsPDF,
  spec: BlueprintSpec,
  options: ExportPdfOptions,
  startOnNewPage = false
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  if (startOnNewPage) {
    doc.addPage();
  }

  let y = margin;
  drawHeaderDecoration(doc, spec.assetName, margin, pageWidth);

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 14) {
      doc.addPage();
      y = margin;
      drawHeaderDecoration(doc, spec.assetName, margin, pageWidth);
    }
  };

  // === ASSET HEADER BANNER ===
  doc.setFillColor(15, 23, 42); // Deep slate background
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'F');

  // Badge: UE5 Blueprint
  doc.setFillColor(0, 112, 224);
  doc.roundedRect(margin + 4, y + 4, 38, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('UE5 BLUEPRINT SPEC', margin + 6, y + 8.2);

  // Asset Name Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(spec.assetName, margin + 4, y + 18);

  // Metadata Row inside Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const parentClassText = `Parent: ${spec.parentClass || 'Actor'}`;
  const projectText = `Project: ${options.projectName || 'Unreal Project'}`;
  const dateText = `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
  doc.text(`${parentClassText}  •  ${projectText}  •  ${dateText}`, margin + 4, y + 27);

  y += 40;

  // === SECTION 1: ARCHITECTURE OVERVIEW & PURPOSE ===
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Architectural Purpose & Overview', margin, y);
  y += 2;

  doc.setDrawColor(0, 112, 224);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 60, y);
  y += 5;

  const descText = `Technical architectural specification for '${spec.assetName}' inheriting from '${spec.parentClass}'. Defines component setup, replicated variable properties, and event execution graphs for production Unreal Engine 5 workflows.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(descText, contentWidth);
  doc.text(splitDesc, margin, y);
  y += splitDesc.length * 4.5 + 4;

  // Key Technical Attributes Pill Box
  checkPageBreak(22);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const colWidth = contentWidth / 3;
  // Col 1
  doc.text('TARGET ENGINE', margin + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Unreal Engine 5.4+', margin + 4, y + 11);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('AUTHORITY / REPLICATION', margin + colWidth + 4, y + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(spec.assetName.startsWith('GM_') ? 'Server Only (Auth)' : 'Autonomous / Simulated', margin + colWidth + 4, y + 11);

  // Col 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PERFORMANCE PROFILE', margin + colWidth * 2 + 4, y + 5);
  doc.setTextColor(0, 128, 90);
  doc.text('Event-Driven (Tick Disabled)', margin + colWidth * 2 + 4, y + 11);

  y += 22;

  // === SECTION 2: COMPONENTS HIERARCHY ===
  if (spec.components && spec.components.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Component Hierarchy & Attachments', margin, y);
    y += 2;
    doc.line(margin, y, margin + 65, y);
    y += 5;

    // Component Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 3, y + 4.5);
    doc.text('Component Definition & Class', margin + 15, y + 4.5);
    y += 6.5;

    spec.components.forEach((compStr, idx) => {
      checkPageBreak(7);
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${idx + 1}`, margin + 3, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(compStr, margin + 15, y + 4.2);

      y += 6;
    });

    y += 6;
  }

  // === SECTION 3: VARIABLES & PROPERTY SPECIFICATIONS ===
  if (spec.variables && spec.variables.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Variables & Property Definitions', margin, y);
    y += 2;
    doc.line(margin, y, margin + 60, y);
    y += 5;

    // Variables Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Variable Name', margin + 3, y + 4.5);
    doc.text('Type', margin + 50, y + 4.5);
    doc.text('Default Value', margin + 95, y + 4.5);
    doc.text('Exposed / Tooltip', margin + 135, y + 4.5);
    y += 6.5;

    spec.variables.forEach((v, idx) => {
      checkPageBreak(7);
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(v.name || `Var_${idx + 1}`, margin + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 149, 106); // Emerald
      doc.text(v.type || 'float', margin + 50, y + 4.5);

      doc.setTextColor(71, 85, 105);
      doc.text(v.default || 'None / 0', margin + 95, y + 4.5);

      const note = v.tooltip || (v.isExposed ? 'Editable / Instance Exposed' : 'Private');
      doc.text(note.length > 25 ? note.substring(0, 23) + '...' : note, margin + 135, y + 4.5);

      y += 6.5;
    });

    y += 6;
  }

  // === SECTION 4: FUNCTIONS & LOGIC GRAPHS ===
  if (spec.functions && spec.functions.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Function Graph & Logic Declarations', margin, y);
    y += 2;
    doc.line(margin, y, margin + 65, y);
    y += 5;

    spec.functions.forEach((fn) => {
      checkPageBreak(20);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'S');

      // Function name and flags
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 102, 204);
      doc.text(`ƒ  ${fn.name}(${(fn.parameters || []).join(', ')})`, margin + 3, y + 5);

      if (fn.returnType) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`-> ${fn.returnType}`, margin + contentWidth - 35, y + 5);
      }

      // Logic Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const fnDesc = fn.logicDescription || 'Executes member logic graph.';
      doc.text(fnDesc.length > 100 ? fnDesc.substring(0, 98) + '...' : fnDesc, margin + 3, y + 10.5);

      y += 17;
    });

    y += 4;
  }

  // === SECTION 5: PERFORMANCE GUIDELINES & UNREAL ENGINE 5 BEST PRACTICES ===
  checkPageBreak(30);
  doc.setFillColor(240, 253, 244); // Light emerald
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('✓ UE5 Best Practice Implementation Checklist', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(22, 101, 52);
  doc.text('• Avoid Event Tick: Implement event-driven delegates, timers, or Enhanced Input bindings.', margin + 4, y + 11);
  doc.text('• Interface Messaging: Decouple actor dependencies via BPI Blueprint Interfaces rather than direct casts.', margin + 4, y + 15.5);
  doc.text('• Heavy Math to C++: Consider converting tight loops or complex raycasts to native C++ functions.', margin + 4, y + 20);

  y += 28;
}

/**
 * Exports a single Blueprint specification to a formatted PDF
 */
export async function exportBlueprintSpecToPdf(
  spec: BlueprintSpec, 
  options: ExportPdfOptions = {}
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  renderBlueprintSpecToDoc(doc, spec, options, false);
  applyFootersAndHeaders(doc, `Technical Spec • ${spec.assetName}`, margin, pageWidth, pageHeight);

  const filename = `${spec.assetName || 'Blueprint'}_Spec_Sheet.pdf`;
  doc.save(filename);
}

/**
 * Exports multiple selected Blueprint specifications into a single combined master PDF document
 */
export async function exportMultipleBlueprintSpecsToPdf(
  specs: BlueprintSpec[],
  options: ExportPdfOptions = {}
): Promise<void> {
  if (specs.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // === COVER / TABLE OF CONTENTS PAGE ===
  drawHeaderDecoration(doc, 'COMBINED SPECIFICATION BUNDLE', margin, pageWidth);
  let y = margin;

  // Hero Title Block
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, y, contentWidth, 42, 3, 3, 'F');

  doc.setFillColor(0, 112, 224);
  doc.roundedRect(margin + 5, y + 5, 48, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('UE5 ARCHITECTURE BUNDLE', margin + 7, y + 9.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(options.projectName || 'Unreal Engine Architecture Plan', margin + 5, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const totalVars = specs.reduce((acc, s) => acc + (s.variables?.length || 0), 0);
  const totalFns = specs.reduce((acc, s) => acc + (s.functions?.length || 0), 0);
  const totalComps = specs.reduce((acc, s) => acc + (s.components?.length || 0), 0);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(`${specs.length} Blueprint Assets  •  ${totalFns} Functions  •  ${totalVars} Variables  •  ${dateStr}`, margin + 5, y + 32);

  y += 50;

  // Executive Summary Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Technical Summary', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `This consolidated architectural specification contains ${specs.length} interconnected subsystems encompassing ${totalComps} component declarations, ` +
    `${totalFns} API function graphs, and ${totalVars} internal state variables formatted for Unreal Engine 5.4+ standards.`,
    margin + 4,
    y + 12,
    { maxWidth: contentWidth - 8 }
  );

  y += 28;

  // Table of Contents Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Table of Contents & Included Assets', margin, y);
  y += 2;
  doc.setDrawColor(0, 112, 224);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 65, y);
  y += 5;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 3, y + 4.5);
  doc.text('Blueprint Asset Name', margin + 12, y + 4.5);
  doc.text('Parent Class', margin + 70, y + 4.5);
  doc.text('Components', margin + 115, y + 4.5);
  doc.text('Functions', margin + 140, y + 4.5);
  doc.text('Variables', margin + 162, y + 4.5);
  y += 6.5;

  specs.forEach((spec, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${idx + 1}`, margin + 3, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text(spec.assetName, margin + 12, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(spec.parentClass || 'Actor', margin + 70, y + 4.2);

    doc.setTextColor(71, 85, 105);
    doc.text(`${spec.components?.length || 0}`, margin + 120, y + 4.2);
    doc.text(`${spec.functions?.length || 0}`, margin + 145, y + 4.2);
    doc.text(`${spec.variables?.length || 0}`, margin + 167, y + 4.2);

    y += 6;
  });

  // Render individual blueprint sections on subsequent pages
  for (const spec of specs) {
    renderBlueprintSpecToDoc(doc, spec, options, true);
  }

  // Apply page numbers & footers across all pages
  applyFootersAndHeaders(
    doc,
    `${options.projectName || 'Unreal Engine Project'} • ${specs.length} Blueprint Bundle`,
    margin,
    pageWidth,
    pageHeight
  );

  const cleanProjectName = (options.projectName || 'UE5_Architecture').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanProjectName}_Combined_${specs.length}_Blueprints_Spec.pdf`;
  doc.save(filename);
}
