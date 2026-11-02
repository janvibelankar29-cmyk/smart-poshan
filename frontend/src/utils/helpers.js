export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatNumber = (n, decimals = 2) => {
  if (n === null || n === undefined) return '0';
  return parseFloat(n).toFixed(decimals).replace(/\.?0+$/, '');
};

export const getStockPercent = (available, received) => {
  if (!received || received === 0) return 0;
  return Math.min(100, Math.round((available / received) * 100));
};

export const getStockColor = (available, minLevel) => {
  if (available <= minLevel) return '#ef4444';
  if (available <= minLevel * 2) return '#f59e0b';
  return '#16a34a';
};

export const getStockBadge = (available, minLevel) => {
  if (available <= minLevel) return 'badge-danger';
  if (available <= minLevel * 2) return 'badge-warning';
  return 'badge-success';
};

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export const CATEGORIES = ['grain', 'pulse', 'oil', 'dairy', 'mixed', 'sweetener', 'other'];
export const UNITS = ['kg', 'litre', 'packets', 'grams', 'ml'];
