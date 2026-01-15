// src/utils/exportPDF.ts
import jsPDF from 'jspdf';
import svg2pdf from 'svg2pdf.js';

export async function exportChordSVGToPDF(svgElements: SVGElement[], fileName: string) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

  for (let i = 0; i < svgElements.length; i++) {
    await svg2pdf(svgElements[i], pdf, { xOffset: 20, yOffset: 20 });
    if (i < svgElements.length - 1) pdf.addPage();
  }

  pdf.save(fileName);
}