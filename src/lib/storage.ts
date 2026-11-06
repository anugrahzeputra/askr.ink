import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { LinkItem } from "@/types/link";

// Global cache to minimize DB/disk queries
const memoryCache = new Map<string, LinkItem>();

// Determine environment & storage strategy
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool: Pool | null = null;
let dbInitialized = false;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// Local file storage fallback
function getLocalFilePath(): string {
  // Try writing to data folder, fallback to tmp if running in serverless without write access
  const primaryDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return path.join(primaryDir, "links.json");
  } catch {
    const tmpDir = path.join(process.platform === "win32" ? process.env.TEMP || "C:\\Temp" : "/tmp", "askr-ink");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return path.join(tmpDir, "links.json");
  }
}

function readLocalLinks(): Record<string, LinkItem> {
  try {
    const filePath = getLocalFilePath();
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) || {};
  } catch (error) {
    console.error("Error reading local links:", error);
    return {};
  }
}

function writeLocalLinks(links: Record<string, LinkItem>): void {
  try {
    const filePath = getLocalFilePath();
    fs.writeFileSync(filePath, JSON.stringify(links, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local links:", error);
  }
}

async function initPostgres(): Promise<void> {
  if (!pool || dbInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS links (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(64) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        clicks INTEGER NOT NULL DEFAULT 0,
        last_clicked_at TIMESTAMPTZ,
        custom BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
    `);
    dbInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PostgreSQL table:", err);
  }
}

export async function findLinkBySlug(slug: string): Promise<LinkItem | null> {
  const normalizedSlug = slug.trim();
  
  // Check memory cache first
  if (memoryCache.has(normalizedSlug)) {
    return memoryCache.get(normalizedSlug)!;
  }

  // PostgreSQL lookup
  if (pool) {
    try {
      await initPostgres();
      const res = await pool.query(
        "SELECT id, slug, original_url, created_at, clicks, last_clicked_at, custom FROM links WHERE slug = $1 LIMIT 1",
        [normalizedSlug]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const item: LinkItem = {
          id: row.id,
          slug: row.slug,
          originalUrl: row.original_url,
          createdAt: new Date(row.created_at).toISOString(),
          clicks: row.clicks || 0,
          lastClickedAt: row.last_clicked_at ? new Date(row.last_clicked_at).toISOString() : null,
          custom: !!row.custom,
        };
        memoryCache.set(normalizedSlug, item);
        return item;
      }
      return null;
    } catch (err) {
      console.error("Postgres find error, falling back to local file:", err);
    }
  }

  // Local file lookup
  const links = readLocalLinks();
  const found = links[normalizedSlug] || null;
  if (found) {
    memoryCache.set(normalizedSlug, found);
  }
  return found;
}

export async function saveLink(link: LinkItem): Promise<boolean> {
  memoryCache.set(link.slug, link);

  if (pool) {
    try {
      await initPostgres();
      await pool.query(
        `INSERT INTO links (id, slug, original_url, created_at, clicks, last_clicked_at, custom)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE 
         SET original_url = EXCLUDED.original_url`,
        [
          link.id,
          link.slug,
          link.originalUrl,
          link.createdAt,
          link.clicks,
          link.lastClickedAt || null,
          link.custom || false,
        ]
      );
      return true;
    } catch (err) {
      console.error("Postgres insert error, falling back to local file:", err);
    }
  }

  const links = readLocalLinks();
  links[link.slug] = link;
  writeLocalLinks(links);
  return true;
}

export async function incrementClickCount(slug: string): Promise<void> {
  const normalizedSlug = slug.trim();
  const now = new Date().toISOString();

  // Update memory cache
  const cached = memoryCache.get(normalizedSlug);
  if (cached) {
    cached.clicks += 1;
    cached.lastClickedAt = now;
  }

  if (pool) {
    try {
      await pool.query(
        "UPDATE links SET clicks = clicks + 1, last_clicked_at = NOW() WHERE slug = $1",
        [normalizedSlug]
      );
      return;
    } catch (err) {
      console.error("Postgres update click error:", err);
    }
  }

  const links = readLocalLinks();
  if (links[normalizedSlug]) {
    links[normalizedSlug].clicks = (links[normalizedSlug].clicks || 0) + 1;
    links[normalizedSlug].lastClickedAt = now;
    writeLocalLinks(links);
  }
}

export async function getRecentLinks(limit: number = 10): Promise<LinkItem[]> {
  if (pool) {
    try {
      await initPostgres();
      const res = await pool.query(
        "SELECT id, slug, original_url, created_at, clicks, last_clicked_at, custom FROM links ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return res.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        originalUrl: row.original_url,
        createdAt: new Date(row.created_at).toISOString(),
        clicks: row.clicks || 0,
        lastClickedAt: row.last_clicked_at ? new Date(row.last_clicked_at).toISOString() : null,
        custom: !!row.custom,
      }));
    } catch (err) {
      console.error("Postgres getRecent error:", err);
    }
  }

  const links = readLocalLinks();
  return Object.values(links)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
