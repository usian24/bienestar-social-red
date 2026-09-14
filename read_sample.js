const ExcelJS = require('exceljs');

async function readSample() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./marzo-2026/AMARILIS.xlsx');
  
  // Try to find a worksheet with data
  for (const worksheet of workbook.worksheets) {
    console.log(`\n--- Sheet Name: ${worksheet.name} ---`);
    for (let i = 1; i <= 6; i++) {
        const row = worksheet.getRow(i).values;
        if (row && row.length > 0) {
           console.log(`Row ${i}:`, JSON.stringify(row));
        }
    }
  }
}

readSample().catch(console.error);

