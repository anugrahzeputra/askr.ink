// Reserved keywords that cannot be used as short slugs
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "dashboard",
  "stats",
  "analytics",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "static",
  "_next",
  "about",
  "terms",
  "privacy",
  "login",
  "logout",
  "signup",
  "auth",
]);

// Friendly character set excluding ambiguous characters (0, O, 1, l, I)
const SLUG_CHARS = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRandomSlug(length: number = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SLUG_CHARS.length);
    result += SLUG_CHARS[randomIndex];
  }
  return result;
}

export function isValidSlug(slug: string): boolean {
  // 2 to 32 characters, alphanumeric and hyphens/underscores only
  const slugRegex = /^[a-zA-Z0-9_-]{2,32}$/;
  if (!slugRegex.test(slug)) return false;
  return !RESERVED_SLUGS.has(slug.toLowerCase());
}

export function normalizeUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return "";
  
  // If no scheme is present, default to https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  
  return trimmed;
}

export function isValidUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSelfDomain(urlStr: string, hostUrl?: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    
    // Check against askr.ink and localhost
    if (host === "askr.ink" || host.endsWith(".askr.ink")) return true;
    
    if (hostUrl) {
      const currentHost = new URL(hostUrl).hostname.toLowerCase();
      if (host === currentHost) return true;
    }
    
    return false;
  } catch {
    return false;
  }
}
