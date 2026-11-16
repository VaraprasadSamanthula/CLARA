/**
 * GET /api/patients/import/template?format=csv|xlsx
 * 
 * Download a template file for patient import.
 * Supports both CSV and XLSX formats.
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    if (!['csv', 'xlsx'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Use "csv" or "xlsx".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const headers = ['full_name', 'date_of_birth', 'gender', 'phone', 'email', 'address'];
    const exampleRows = [
      ['John Doe', '1985-06-20', 'M', '555-123-4567', 'john@example.com', '123 Main St'],
      ['Jane Smith', '1990-01-15', 'F', '555-987-6543', 'jane@example.com', '456 Oak Ave'],
    ];

    if (format === 'csv') {
      // CSV format
      const csv = [
        headers.join(','),
        ...exampleRows.map(row => row.map(v => `"${v}"`).join(','))
      ].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="CLARA_Patient_Import_Template.csv"'
        }
      });
    } else if (format === 'xlsx') {
      // XLSX format using xlsx library
      try {
        const XLSX = require('xlsx');

        // Create workbook with one sheet
        const workbook = XLSX.utils.book_new();
        const worksheetData = [headers, ...exampleRows];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
          { wch: 20 }, // full_name
          { wch: 15 }, // date_of_birth
          { wch: 10 }, // gender
          { wch: 15 }, // phone
          { wch: 25 }, // email
          { wch: 25 }  // address
        ];

        // Style the header row
        for (let i = 0; i < headers.length; i++) {
          const cellRef = XLSX.utils.encode_col(i) + '1';
          if (!worksheet[cellRef]) continue;
          worksheet[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'CCCCCC' } },
            alignment: { horizontal: 'center' }
          };
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

        // Generate Excel file buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="CLARA_Patient_Import_Template.xlsx"'
          }
        });
      } catch (e) {
        console.error('[TEMPLATE_API] XLSX error:', e);
        return new Response(
          JSON.stringify({ error: 'Failed to generate Excel template. Please use CSV template instead.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('[TEMPLATE_API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error generating template' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
