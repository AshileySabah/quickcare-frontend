export function latestBirthDate(today: Date = new Date()): string {
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${yesterday.getFullYear()}-${month}-${day}`;
}
