function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape values containing commas, quotes, or newlines
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => formatCsvValue(row[h]));
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export { formatCsvValue, generateCsv, downloadCsv };
