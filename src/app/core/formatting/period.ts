const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "05/11, das 08:00 às 18:00" ou, em dias diferentes, "de 05/11 às 08:00 até 07/11 às 18:00". */
export function formatPeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (sameDay(start, end)) {
    return `${DAY.format(start)}, das ${TIME.format(start)} às ${TIME.format(end)}`;
  }
  return `de ${DAY.format(start)} às ${TIME.format(start)} até ${DAY.format(end)} às ${TIME.format(end)}`;
}

/** "05/11 às 14:00". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${DAY.format(date)} às ${TIME.format(date)}`;
}
