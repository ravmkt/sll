export function isSafeUrl(url?: string | null): url is string {
  return !!url && /^(https?:\/\/|\/(?!\/))/i.test(url.trim());
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}