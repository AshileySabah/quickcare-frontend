const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatPeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (sameDay(start, end)) {
    return `${DAY.format(start)}, das ${TIME.format(start)} às ${TIME.format(end)}`;
  }
  return `de ${DAY.format(start)} às ${TIME.format(start)} até ${DAY.format(end)} às ${TIME.format(end)}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${DAY.format(date)} às ${TIME.format(date)}`;
}
