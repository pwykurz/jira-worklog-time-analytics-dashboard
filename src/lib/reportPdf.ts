import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts.js';
import { AggregatedIssue } from '@/lib/aggregateIssues';
import { PDF_COLUMN_LABELS, PdfColumnId, PdfSections } from '@/lib/reportScope';
import { formatDateShort, secondsToDecimalHours, secondsToFormattedTime } from '@/lib/timeUtils';

function registerRobotoFonts(doc: jsPDF): string {
  try {
    const rawVfs = (pdfMakeFonts as { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> })
      ?.pdfMake?.vfs || (pdfMakeFonts as { vfs?: Record<string, string> }).vfs;
    if (rawVfs && rawVfs['Roboto-Regular.ttf'] && rawVfs['Roboto-Medium.ttf']) {
      doc.addFileToVFS('Roboto-Regular.ttf', rawVfs['Roboto-Regular.ttf']);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Medium.ttf', rawVfs['Roboto-Medium.ttf']);
      doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
      doc.setFont('Roboto', 'normal');
      return 'Roboto';
    }
  } catch {
    // fallback
  }
  return 'helvetica';
}

export interface ReportPdfInput {
  title: string;
  subtitle: string;
  issues: AggregatedIssue[];
  columns: PdfColumnId[];
  sections: PdfSections;
  qaPercent: number;
  poPercent: number;
}

function cellValue(issue: AggregatedIssue, column: PdfColumnId): string {
  switch (column) {
    case 'issue_key':
      return issue.issue_key;
    case 'issue_summary':
      return issue.issue_summary;
    case 'status':
      return issue.status;
    case 'issue_type':
      return issue.issue_type;
    case 'labels':
      return issue.labels;
    case 'epic':
      return issue.epic;
    case 'authors':
      return issue.authors.join(', ');
    case 'last_started':
      return formatDateShort(issue.last_started);
    case 'time_spent':
      return issue.time_spent;
    case 'assignee':
      return issue.last_author;
    case 'updated':
      return formatDateShort(issue.last_started);
    case 'comment':
      return issue.comment || '';
    default:
      return '';
  }
}

export async function generateScopedReportPdf(input: ReportPdfInput): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontName = registerRobotoFonts(doc);
  const totalSeconds = input.issues.reduce((sum, issue) => sum + issue.time_spent_seconds, 0);
  const devHours = secondsToDecimalHours(totalSeconds);
  const qaHours = devHours * (input.qaPercent / 100);
  const poHours = devHours * (input.poPercent / 100);
  const totalHours = devHours + qaHours + poHours;
  const authors = [...new Set(input.issues.flatMap(issue => issue.authors))];

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(16);
  doc.text(input.title, 14, 12);
  doc.setFont(fontName, 'normal');
  doc.setFontSize(9);
  doc.text(input.subtitle, 14, 20);
  doc.text(new Date().toISOString().split('T')[0], 196, 12, { align: 'right' });

  let y = 36;

  if (input.sections.kpi) {
    doc.setTextColor(30, 41, 59);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.text('Summary', 14, y);
    y += 6;
    doc.setFont(fontName, 'normal');
    doc.setFontSize(10);
    doc.text(`Issues: ${input.issues.length}`, 14, y);
    doc.text(`Dev time: ${secondsToFormattedTime(totalSeconds)} (${devHours.toFixed(2)} h)`, 70, y);
    doc.text(`People: ${authors.length}`, 150, y);
    y += 10;
  }

  if (input.sections.authors && authors.length) {
    const counts = new Map<string, number>();
    for (const issue of input.issues) {
      for (const [author, seconds] of Object.entries(issue.timeByAuthor)) {
        counts.set(author, (counts.get(author) || 0) + seconds);
      }
    }
    autoTable(doc, {
      startY: y,
      head: [['Author', 'Time']],
      body: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([author, seconds]) => [author, secondsToFormattedTime(seconds)]),
      styles: { font: fontName, fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;
  }

  if (input.sections.table && input.columns.length) {
    autoTable(doc, {
      startY: y,
      head: [input.columns.map(column => PDF_COLUMN_LABELS[column])],
      body: input.issues.map(issue => input.columns.map(column => cellValue(issue, column))),
      styles: { font: fontName, fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
  }

  if (input.sections.overhead || input.sections.summary) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Final summary', 14, y);
    y += 8;
    doc.setFont(fontName, 'normal');
    doc.setFontSize(10);
    doc.text(`Dev: ${devHours.toFixed(2)} h`, 14, y);
    y += 6;
    if (input.sections.overhead) {
      doc.text(`QA (${input.qaPercent}%): ${qaHours.toFixed(2)} h`, 14, y);
      y += 6;
      doc.text(`PO (${input.poPercent}%): ${poHours.toFixed(2)} h`, 14, y);
      y += 6;
      doc.setFont(fontName, 'bold');
      doc.text(`Total: ${totalHours.toFixed(2)} h`, 14, y);
    }
  }

  const safeTitle = input.title.replace(/[^\w\-]+/g, '_').slice(0, 40);
  doc.save(`${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
}
