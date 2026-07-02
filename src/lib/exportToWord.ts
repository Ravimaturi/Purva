import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export interface ExportEntry {
  id: string;
  date: string;
  project_name: string;
  category: string;
  bill_name: string;
  reason: string;
  advance_amount: number;
  expenditure_amount: number;
  raised_by_name: string;
  entered_by_name?: string;
  receipt_url?: string;
}

export const exportPettyCashToWord = async (entries: ExportEntry[]) => {
  const children: any[] = [];

  children.push(
    new Paragraph({
      text: "Petty Cash Report",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph(entry.date)] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Category", bold: true })] })] }),
            new TableCell({ children: [new Paragraph(entry.category)] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bill/Vendor", bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph(entry.bill_name || "-")] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Project", bold: true })] })] }),
            new TableCell({ children: [new Paragraph(entry.project_name || "-")] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Advance", bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph(`Rs. ${entry.advance_amount || 0}`)] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Expenditure", bold: true })] })] }),
            new TableCell({ children: [new Paragraph(`Rs. ${entry.expenditure_amount || 0}`)] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Reason/Comments", bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph(entry.reason || "-")], columnSpan: 3 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Raised By (Entered)", bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph(entry.entered_by_name || "-")] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Paid By (Owner)", bold: true })] })] }),
            new TableCell({ children: [new Paragraph(entry.raised_by_name || "-")] }),
          ],
        }),
      ],
    });

    children.push(table);
    children.push(new Paragraph({ spacing: { after: 200 } }));

    if (entry.receipt_url) {
      try {
        const response = await fetch(entry.receipt_url, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        let type: "jpg" | "png" | "gif" | "bmp" = "jpg";
        if (blob.type.includes("png")) type = "png";
        else if (blob.type.includes("gif")) type = "gif";
        else if (blob.type.includes("bmp")) type = "bmp";

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: arrayBuffer,
                transformation: {
                  width: 400,
                  height: 400,
                },
                type: type,
              }),
            ],
          })
        );
      } catch (error) {
        console.error(`Failed to load image for entry ${entry.id}`, error);
        children.push(
          new Paragraph({
            text: "(Failed to load receipt image)",
            alignment: AlignmentType.CENTER,
          })
        );
      }
    }

    children.push(new Paragraph({ spacing: { after: 400 } }));

    if ((i + 1) % 2 === 0 && i !== entries.length - 1) {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
        })
      );
    } else if (i !== entries.length - 1) {
      children.push(
        new Paragraph({
          text: "--------------------------------------------------------------------------------",
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `PettyCash_Export_${new Date().toISOString().split("T")[0]}.docx`);
};
