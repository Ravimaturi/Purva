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

export const exportPettyCashToPrint = async (
  entries: ExportEntry[],
  imageFetcher?: (urls: string[]) => Promise<Record<string, { arrayBuffer: ArrayBuffer, type: "jpg" | "png" | "gif" | "bmp", width?: number, height?: number } | null>>,
  printWindow?: Window | null
) => {
  const entriesWithReceipts = entries.filter(e => e.receipt_url);
  
  let totalAdvance = 0;
  let totalExpenditure = 0;
  
  entries.forEach(e => {
    totalAdvance += (e.advance_amount || 0);
    totalExpenditure += (e.expenditure_amount || 0);
  });

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Petty Cash Report</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; color: #0f172a; font-size: 24px; }
    .header p { margin: 0; color: #64748b; font-size: 14px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    tr:nth-child(even) { background-color: #fcfcfd; }
    
    .totals { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 40px; font-size: 15px; font-weight: 600; padding: 20px; background-color: #f8fafc; border-radius: 8px; }
    .totals div { display: flex; flex-direction: column; }
    .totals span { font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 4px; }
    
    .receipts-header { page-break-before: always; text-align: center; margin-bottom: 30px; padding-top: 20px; }
    .receipts-header h2 { margin: 0; color: #0f172a; font-size: 20px; }
    
    .receipt-container { margin-bottom: 60px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    .details { margin-bottom: 20px; line-height: 1.6; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; background: #f8fafc; padding: 15px; border-radius: 6px; }
    .details strong { color: #475569; }
    .image-wrapper { text-align: center; margin-top: 20px; }
    img { max-width: 100%; max-height: 700px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; background: #fff; }
    .error { color: #ef4444; font-style: italic; text-align: center; padding: 20px; background: #fef2f2; border-radius: 6px; }
    
    @media print {
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-container { page-break-inside: avoid; }
      .header, .totals, th { background-color: #f8fafc !important; }
      .details { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Petty Cash Report</h1>
    <p>Generated on ${currentDate}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Project / Category</th>
        <th>Bill Name / Reason</th>
        <th>Paid By</th>
        <th style="text-align: right">Advance</th>
        <th style="text-align: right">Expenditure</th>
      </tr>
    </thead>
    <tbody>`;

  entries.forEach(entry => {
    htmlContent += `
      <tr>
        <td>${entry.date}</td>
        <td>
          <div style="font-weight: 500">${entry.project_name || '-'}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px">${entry.category}</div>
        </td>
        <td>
          <div style="font-weight: 500">${entry.bill_name || '-'}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px">${entry.reason || '-'}</div>
        </td>
        <td>${entry.raised_by_name || '-'}</td>
        <td style="text-align: right; color: #10b981">${entry.advance_amount ? 'Rs. ' + entry.advance_amount : '-'}</td>
        <td style="text-align: right; color: #ef4444">${entry.expenditure_amount ? 'Rs. ' + entry.expenditure_amount : '-'}</td>
      </tr>
    `;
  });

  htmlContent += `
    </tbody>
  </table>
  
  <div class="totals">
    <div>
      <span>Total Advances</span>
      <strong style="color: #10b981">Rs. ${totalAdvance.toFixed(2)}</strong>
    </div>
    <div>
      <span>Total Expenditures</span>
      <strong style="color: #ef4444">Rs. ${totalExpenditure.toFixed(2)}</strong>
    </div>
    <div>
      <span>Net Balance</span>
      <strong style="color: ${totalAdvance - totalExpenditure >= 0 ? '#10b981' : '#ef4444'}">
        Rs. ${(totalAdvance - totalExpenditure).toFixed(2)}
      </strong>
    </div>
  </div>`;

  if (entriesWithReceipts.length > 0) {
    htmlContent += `
      <div class="receipts-header">
        <h2>Receipt Images</h2>
      </div>
    `;
    
    // Fetch all receipt images in parallel
    const totalReceipts = entriesWithReceipts.length;
    let completedReceipts = 0;
    
    // Batch fetch all images first if fetcher is provided
    let fetchedImagesMap: Record<string, { arrayBuffer: ArrayBuffer, type: "jpg" | "png" | "gif" | "bmp" } | null> | null = null;
    if (imageFetcher) {
      if (printWindow && printWindow.document) {
        const statusEl = printWindow.document.getElementById('loading-status');
        if (statusEl) statusEl.innerText = "Fetching images in batch...";
      }
      const urls = entriesWithReceipts.map(e => e.receipt_url).filter(Boolean);
      try {
        fetchedImagesMap = await imageFetcher(urls);
      } catch (err) {
        console.error("Batch fetch failed", err);
        fetchedImagesMap = {};
      }
    }


    const updateProgress = () => {
      if (printWindow && printWindow.document) {
        const statusEl = printWindow.document.getElementById('loading-status');
        const progressBarEl = printWindow.document.getElementById('loading-progress-bar');
        if (statusEl) {
          statusEl.innerText = `Fetched ${completedReceipts} of ${totalReceipts} receipts...`;
        }
        if (progressBarEl) {
          progressBarEl.style.width = `${(completedReceipts / totalReceipts) * 100}%`;
        }
      }
    };

    const receiptPromises = entriesWithReceipts.map(async (entry) => {
      let resultHtml = `
        <div class="receipt-container">
          <div class="details">
            <div><strong>Date:</strong> ${entry.date || '-'}</div>
            <div><strong>Amount:</strong> Rs. ${entry.expenditure_amount || 0}</div>
            <div><strong>Bill Name:</strong> ${entry.bill_name || '-'}</div>
            <div><strong>Project:</strong> ${entry.project_name || '-'}</div>
            <div style="grid-column: 1 / -1"><strong>Reason:</strong> ${entry.reason || '-'}</div>
          </div>
          <div class="image-wrapper">
      `;

      if (entry.receipt_url) {
        try {
          let imageData: { arrayBuffer: ArrayBuffer, type: "jpg" | "png" | "gif" | "bmp" } | null = null;
          
          // Fetch logic has moved out to batch before the loop
          if (fetchedImagesMap && fetchedImagesMap[entry.receipt_url]) {
             imageData = fetchedImagesMap[entry.receipt_url];
          } else if (!imageFetcher) {
            const response = await fetch(entry.receipt_url, { mode: 'cors' });
            if (response.ok) {
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              let type: "jpg" | "png" | "gif" | "bmp" = "jpg";
              if (blob.type.includes("png")) type = "png";
              else if (blob.type.includes("gif")) type = "gif";
              else if (blob.type.includes("bmp")) type = "bmp";
              imageData = { arrayBuffer, type };
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          }
          if (imageData) {
            const mimeType = imageData.type === 'jpg' ? 'image/jpeg' : `image/${imageData.type}`;
            
            // Fast native conversion to base64
            const dataUrl = await new Promise<string>((resolve, reject) => {
               const blob = new Blob([imageData!.arrayBuffer], { type: mimeType });
               const reader = new FileReader();
               reader.onloadend = () => resolve(reader.result as string);
               reader.onerror = reject;
               reader.readAsDataURL(blob);
            });
            
            resultHtml += `<img src="${dataUrl}" alt="Receipt image" />`;
          } else {
            resultHtml += `<div class="error">[Receipt Image Unavailable]</div>`;
          }
        } catch (error) {
          console.error(`Failed to load image for entry ${entry.id}`, error);
          resultHtml += `<div class="error">(Failed to load receipt image)</div>`;
        }
      }
      
      resultHtml += `
          </div>
        </div>
      `;
      
      completedReceipts++;
      updateProgress();
      
      return resultHtml;
    });

    // Update progress initially
    updateProgress();
    const resolvedReceipts = await Promise.all(receiptPromises);
    htmlContent += resolvedReceipts.join('');
  }

  htmlContent += `
  <script>
    window.onload = () => {
      // Small delay to ensure images are rendered before print dialog
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  let targetWindow = printWindow;
  if (targetWindow === undefined) {
    targetWindow = window.open('', '_blank');
  }
  
  if (targetWindow) {
    targetWindow.document.open();
    targetWindow.document.write(htmlContent);
    targetWindow.document.close();
  } else {
    throw new Error("Could not open print window. Please allow popups.");
  }
};
