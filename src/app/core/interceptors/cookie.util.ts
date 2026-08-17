export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}
