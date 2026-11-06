# askr.ink 🔗

A modern, lightning-fast, and minimalist URL shortener & shortcut application built for **askr.ink**.

Similar in speed and simplicity to intip.in or bitly, with custom alias support, instant QR code generator, click tracking, and zero-configuration local development.

---

## ✨ Features

- **Minimalist & Clean UI**: Focused, clutter-free design optimized for both mobile and desktop.
- **Custom Shortcut / Alias**: Support for custom vanity URLs (e.g. `askr.ink/porto` or `askr.ink/event-2026`).
- **Auto-generated Short Slugs**: 6-character clean collision-free alphanumeric keys.
- **Instant QR Code**: Auto-generated QR code preview with 1-click PNG download.
- **One-Click Copy**: Instant clipboard copy with visual feedback.
- **Quick Social Share**: Instant sharing to WhatsApp, Telegram, and X (Twitter).
- **Device History (Local Storage)**: Keeps track of recent links created on the device without requiring a mandatory login.
- **Click Tracking & Stats**: Tracks link visit count and last clicked timestamp.
- **Dual-Storage Engine**:
  - **Local Development**: Automatic file storage in `data/links.json` (zero external dependencies).
  - **Production / Vercel**: Connect to any PostgreSQL provider (Supabase, Neon, Railway, Aiven) by setting `DATABASE_URL`.
- **Fast 307 Redirects**: Immediate redirection without caching lag.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run local development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Namecheap DNS Configuration for `askr.ink` (Vercel)

When deploying to Vercel:

1. Open **Namecheap** > **Domain List** > select **askr.ink** > **Manage**.
2. Go to **Advanced DNS** tab.
3. Add the following records:

| Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A Record** | `@` | `76.76.21.21` | Automatic |
| **CNAME Record** | `www` | `cname.vercel-dns.com.` | Automatic |

4. In your Vercel project dashboard, go to **Settings** > **Domains** > Add `askr.ink` (and `www.askr.ink`).
5. Vercel will automatically provision a free SSL certificate.

---

## 🗄️ Database Setup for Vercel (Production)

For persistent links on Vercel's serverless environment, create a free database on [Supabase](https://supabase.com) or [Neon](https://neon.tech):

1. Copy your database connection string:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"
   NEXT_PUBLIC_APP_URL="https://askr.ink"
   ```
2. Add these environment variables in your **Vercel Project Settings > Environment Variables**.
3. Tables and indexes are created automatically on first run.

---

## 📁 Project Structure

```
askr-ink/
├── src/
│   ├── app/
│   │   ├── [slug]/route.ts       # Ultra-fast 307 redirect handler
│   │   ├── api/
│   │   │   ├── shorten/route.ts  # Short link generation & QR
│   │   │   ├── stats/[slug]/route.ts # Click count endpoint
│   │   │   └── qr/route.ts       # Direct QR code PNG stream
│   │   ├── globals.css           # Tailwind v4 styling
│   │   ├── layout.tsx            # Root metadata & fonts
│   │   └── page.tsx              # Clean minimalist interface
│   ├── lib/
│   │   ├── storage.ts            # Dual-engine storage (File / Postgres)
│   │   └── utils.ts              # URL normalization & slug validation
│   └── types/
│       └── link.ts               # TypeScript data definitions
├── data/                         # Local storage directory (auto-created)
├── .env.example
├── next.config.ts
└── package.json
```
