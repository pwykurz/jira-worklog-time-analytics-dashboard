import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts.js';
import { JiraWorklogItem, ReportConfig } from '@/types';
import { formatCurrency, secondsToDecimalHours, secondsToFormattedTime, formatDateShort } from '@/lib/timeUtils';

function registerRobotoFonts(doc: jsPDF): string {
  try {
    const rawVfs = (pdfMakeFonts as any)?.pdfMake?.vfs || (pdfMakeFonts as any)?.vfs || pdfMakeFonts;
    if (rawVfs && rawVfs['Roboto-Regular.ttf'] && rawVfs['Roboto-Medium.ttf']) {
      doc.addFileToVFS('Roboto-Regular.ttf', rawVfs['Roboto-Regular.ttf']);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

      doc.addFileToVFS('Roboto-Medium.ttf', rawVfs['Roboto-Medium.ttf']);
      doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');

      doc.setFont('Roboto', 'normal');
      return 'Roboto';
    }
  } catch (err) {
    console.warn('Could not register Roboto fonts from pdfmake vfs:', err);
  }
  return 'helvetica';
}

export async function generateClientPdfReport(
  items: JiraWorklogItem[],
  config: ReportConfig
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register the Roboto TTF font so non-ASCII characters (e.g. accented author names) render correctly
  const fontName = registerRobotoFonts(doc);

  const totalSeconds = items.reduce((acc, curr) => acc + curr.time_spent_seconds, 0);
  const totalHours = secondsToDecimalHours(totalSeconds);
  const totalCost = totalHours * config.hourlyRate;
  const uniqueIssues = new Set(items.map(i => i.issue_key)).size;

  // Navy theme colors
  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Navy (#1E3A8A)
  const secondaryColor: [number, number, number] = [239, 246, 255]; // Soft Ice Blue (#EFF6FF)

  // --- HEADER BANNER ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(18);
  doc.text('PROJECT WORK AND TIME REPORT', 14, 18);

  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, 196, 18, { align: 'right' });

  let y = 40;

  // --- CLIENT & PREPARER META BLOCK ---
  doc.setFillColor(...secondaryColor);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'F');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont(fontName, 'bold');
  doc.text('CLIENT:', 18, y + 8);
  doc.text('TITLE / PROJECT:', 18, y + 16);
  doc.text('PREPARED BY:', 110, y + 8);
  doc.text('HOURLY RATE:', 110, y + 16);

  doc.setFont(fontName, 'normal');
  doc.text(config.clientName || 'Client', 40, y + 8);
  doc.text(config.reportTitle || 'Jira Time Report', 55, y + 16);
  doc.text(config.preparedBy || 'Development Team', 152, y + 8);
  doc.text(`${config.hourlyRate} ${config.currency} /h`, 152, y + 16);

  y += 34;

  // --- KPI SUMMARY CARDS ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);

  // Card 1: Total Time
  doc.roundedRect(14, y, 56, 22, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TIME', 18, y + 6);
  doc.setFontSize(13);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(secondsToFormattedTime(totalSeconds), 18, y + 16);

  // Card 2: Total Issues
  doc.roundedRect(77, y, 56, 22, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('NUMBER OF ISSUES', 81, y + 6);
  doc.setFontSize(13);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`${uniqueIssues} (entries: ${items.length})`, 81, y + 16);

  // Card 3: Total Cost
  doc.roundedRect(140, y, 56, 22, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMATED VALUE', 144, y + 6);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(totalCost, config.currency), 144, y + 16);

  y += 28;

  // --- NOTES SECTION IF PRESENT ---
  if (config.notes && config.notes.trim()) {
    doc.setFontSize(9);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Summary / Notes:', 14, y);
    y += 5;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const splitNotes = doc.splitTextToSize(config.notes, 182);
    doc.text(splitNotes, 14, y);
    y += splitNotes.length * 4.5 + 6;
  }

  // --- BREAKDOWN BY AUTHOR TABLE ---
  if (config.showAuthorBreakdown) {
    const authorMap = new Map<string, { seconds: number; count: number }>();
    items.forEach(item => {
      const author = item.author || 'Unassigned';
      const existing = authorMap.get(author) || { seconds: 0, count: 0 };
      authorMap.set(author, {
        seconds: existing.seconds + item.time_spent_seconds,
        count: existing.count + 1
      });
    });

    const authorRows = Array.from(authorMap.entries()).map(([author, stat]) => {
      const hours = secondsToDecimalHours(stat.seconds);
      const val = hours * config.hourlyRate;
      return [
        author,
        stat.count.toString(),
        secondsToFormattedTime(stat.seconds),
        `${hours.toFixed(2)} h`,
        formatCurrency(val, config.currency)
      ];
    });

    doc.setFontSize(10);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(' Summary by Author / Team', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Author / Consultant', 'Entries', 'Time', 'Hours', 'Value']],
      body: authorRows,
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 8
      },
      styles: {
        font: fontName,
        fontStyle: 'normal',
        fontSize: 8,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- BREAKDOWN BY ISSUE TYPE TABLE ---
  if (config.showTypeBreakdown) {
    const typeMap = new Map<string, { seconds: number; count: number }>();
    items.forEach(item => {
      const type = item.issue_type || 'Task';
      const existing = typeMap.get(type) || { seconds: 0, count: 0 };
      typeMap.set(type, {
        seconds: existing.seconds + item.time_spent_seconds,
        count: existing.count + 1
      });
    });

    const typeRows = Array.from(typeMap.entries()).map(([type, stat]) => {
      const hours = secondsToDecimalHours(stat.seconds);
      const pct = totalSeconds > 0 ? ((stat.seconds / totalSeconds) * 100).toFixed(1) : '0';
      return [
        type,
        stat.count.toString(),
        secondsToFormattedTime(stat.seconds),
        `${pct}%`,
        formatCurrency(hours * config.hourlyRate, config.currency)
      ];
    });

    doc.setFontSize(10);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(' Summary by Issue Type (Bugs vs Tasks)', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Issue Type', 'Count', 'Time', 'Share %', 'Value']],
      body: typeRows,
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 8
      },
      styles: {
        font: fontName,
        fontStyle: 'normal',
        fontSize: 8,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- BREAKDOWN BY EPIC / PARENT TABLE ---
  if (config.showEpicBreakdown) {
    const epicMap = new Map<string, { seconds: number; count: number }>();
    items.forEach(item => {
      const epicName = item.parent_1_summary || item.parent_2_summary || 'General / No epic';
      const existing = epicMap.get(epicName) || { seconds: 0, count: 0 };
      epicMap.set(epicName, {
        seconds: existing.seconds + item.time_spent_seconds,
        count: existing.count + 1
      });
    });

    const epicRows = Array.from(epicMap.entries()).map(([epic, stat]) => {
      const hours = secondsToDecimalHours(stat.seconds);
      return [
        epic,
        stat.count.toString(),
        secondsToFormattedTime(stat.seconds),
        formatCurrency(hours * config.hourlyRate, config.currency)
      ];
    });

    doc.setFontSize(10);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(' Summary by Epic / Module', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Module / Epic', 'Entries', 'Time Spent', 'Value']],
      body: epicRows,
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 8
      },
      styles: {
        font: fontName,
        fontStyle: 'normal',
        fontSize: 8,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- DETAILED WORKLOG TABLE ---
  if (config.showDetailedTable) {
    const tableRows = items.map(item => [
      item.issue_key,
      item.issue_summary.length > 42 ? item.issue_summary.substring(0, 42) + '...' : item.issue_summary,
      item.issue_type,
      item.author,
      formatDateShort(item.started),
      secondsToFormattedTime(item.time_spent_seconds),
      formatCurrency(secondsToDecimalHours(item.time_spent_seconds) * config.hourlyRate, config.currency)
    ]);

    doc.setFontSize(10);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(' Detailed list of logged work (Worklog)', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Key', 'Summary / Issue', 'Type', 'Author', 'Date', 'Time', 'Value']],
      body: tableRows,
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 7.5
      },
      styles: {
        font: fontName,
        fontStyle: 'normal',
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 62 },
        2: { cellWidth: 18 },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- FOOTER AND SIGNATURE SECTION ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Bottom line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Jira work time report • Automatically generated document', 14, 285);
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
  }

  // Save the generated PDF
  const cleanTitle = (config.reportTitle || 'Jira_Time_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
}
