import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportRow {
  vehicle: string;
  plate: string;
  driver: string;
  distance: string;
  duration: string;
  avgSpeed: string;
  maxSpeed: string;
  stops: number;
}

export const exportToPdf = (title: string, headers: string[], rows: (string | number)[][]) => {
  const doc = new jsPDF();

  // Header Brand Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(6, 182, 212); // cyan-500
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BCS FLEET DAKAR', 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('RAPPORT GESTION DE FLOTTE GPS', 14, 25);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(14);
  doc.text(title, 14, 42);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')} | Fuseau: Africa/Dakar`, 14, 48);

  autoTable(doc, {
    startY: 54,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [6, 182, 212], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const exportToExcel = (fileName: string, data: Record<string, any>[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Flotte');
  XLSX.writeFile(workbook, `${fileName}_${Date.now()}.xlsx`);
};

export const exportToCsv = (fileName: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${fileName}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
