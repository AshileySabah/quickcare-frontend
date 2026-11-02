import { timeAgo } from './time-ago';

describe('timeAgo', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const before = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('descreve o tempo passado de forma curta', () => {
    expect(timeAgo(before(20_000), now)).toBe('agora');
    expect(timeAgo(before(5 * 60_000), now)).toBe('há 5 min');
    expect(timeAgo(before(3 * 3_600_000), now)).toBe('há 3 h');
    expect(timeAgo(before(30 * 3_600_000), now)).toBe('ontem');
    expect(timeAgo(before(4 * 86_400_000), now)).toBe('há 4 dias');
  });

  it('depois de uma semana mostra a data', () => {
    expect(timeAgo(before(10 * 86_400_000), now)).toBe(new Date(before(10 * 86_400_000)).toLocaleDateString('pt-BR'));
  });
});
