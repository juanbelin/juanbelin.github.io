const monthIndex = value => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) throw new Error(`Invalid experience month: ${value}`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
};

// Dates are known to month precision, so count calendar months inclusively,
// as in the supplied work history. Merge overlaps and omit employment gaps.
export function cybersecurityMonths(entries, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Madrid' }).formatToParts(now);
  const current = Number(parts.find(part => part.type === 'year').value) * 12 + Number(parts.find(part => part.type === 'month').value) - 1;
  const periods = entries.filter(entry => entry.cybersecurity === true || entry.includeInTotal === true).map(entry => ({
    start: monthIndex(entry.start), end: entry.end ? Math.min(monthIndex(entry.end), current) : current,
  })).filter(period => period.start <= period.end).sort((a, b) => a.start - b.start);
  let total = 0, start, end;
  for (const period of periods) {
    if (start === undefined) { start = period.start; end = period.end; }
    else if (period.start <= end + 1) end = Math.max(end, period.end);
    else { total += end - start + 1; start = period.start; end = period.end; }
  }
  return total + (start === undefined ? 0 : end - start + 1);
}

export function formatExperienceDuration(months) {
  const years = Math.floor(months / 12), remainder = months % 12;
  return [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', remainder ? `${remainder} ${remainder === 1 ? 'month' : 'months'}` : '']
    .filter(Boolean).join(' · ') || '0 months';
}
