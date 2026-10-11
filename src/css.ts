const URL_TOKEN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/i;
const URL_TOKEN_GLOBAL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;

export function extractUrlFromSrc(value: string): string | null {
  const match = URL_TOKEN.exec(value);
  if (!match) return null;
  const url = (match[1] ?? match[2] ?? match[3] ?? "").trim();
  return url.length > 0 ? url : null;
}

export function replaceUrls(
  value: string,
  replace: (url: string) => string | null,
): string {
  return value.replace(URL_TOKEN_GLOBAL, (match, doubleQuoted, singleQuoted, bare) => {
    const url = (doubleQuoted ?? singleQuoted ?? bare ?? "").trim();
    if (url.length === 0) return match;
    const replacement = replace(url);
    return replacement === null ? match : `url(${replacement})`;
  });
}
