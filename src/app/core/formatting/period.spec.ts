import { fromLocalInputValue, toLocalInputValue } from '../forms/period-form';
import { formatPeriod } from './period';

describe('formatPeriod', () => {
  it('no mesmo dia mostra só os horários', () => {
    const start = new Date(2026, 10, 5, 8, 0).toISOString();
    const end = new Date(2026, 10, 5, 18, 0).toISOString();

    expect(formatPeriod(start, end)).toBe('05/11, das 08:00 às 18:00');
  });

  it('em dias diferentes mostra as duas datas', () => {
    const start = new Date(2026, 10, 5, 8, 0).toISOString();
    const end = new Date(2026, 10, 7, 18, 30).toISOString();

    expect(formatPeriod(start, end)).toBe('de 05/11 às 08:00 até 07/11 às 18:30');
  });

  it('converte entre o input datetime-local e ISO sem mudar o horário', () => {
    const iso = new Date(2026, 10, 5, 14, 45).toISOString();

    expect(toLocalInputValue(iso)).toBe('2026-11-05T14:45');
    expect(fromLocalInputValue('2026-11-05T14:45')).toBe(iso);
  });
});
