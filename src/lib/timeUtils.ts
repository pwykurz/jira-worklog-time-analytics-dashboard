export function secondsToFormattedTime(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0m';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

export function secondsToDecimalHours(totalSeconds: number): number {
  if (!totalSeconds || isNaN(totalSeconds)) return 0;
  return Number((totalSeconds / 3600).toFixed(2));
}

export function parseJiraDurationToSeconds(input: string | number): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;

  const str = String(input).trim();
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  let totalSeconds = 0;
  // match Jira patterns like 1w 2d 4h 30m
  const weeks = str.match(/(\d+(?:\.\d+)?)\s*w/i);
  const days = str.match(/(\d+(?:\.\d+)?)\s*d/i);
  const hours = str.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mins = str.match(/(\d+(?:\.\d+)?)\s*m/i);
  const secs = str.match(/(\d+(?:\.\d+)?)\s*s/i);

  if (weeks) totalSeconds += parseFloat(weeks[1]) * 5 * 8 * 3600; // Jira standard 5d/w, 8h/d
  if (days) totalSeconds += parseFloat(days[1]) * 8 * 3600;
  if (hours) totalSeconds += parseFloat(hours[1]) * 3600;
  if (mins) totalSeconds += parseFloat(mins[1]) * 60;
  if (secs) totalSeconds += parseFloat(secs[1]);

  if (totalSeconds === 0 && !isNaN(Number(str))) {
    totalSeconds = parseFloat(str);
  }

  return Math.round(totalSeconds);
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
