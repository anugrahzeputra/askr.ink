"use client";

import { useState, useEffect, useId, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface HistoryItem {
  id: string;
  slug: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  clicks: number;
}

function ShortenerContent() {
  const searchParams = useSearchParams();
  const notFoundSlug = searchParams.get("slug");
  const isNotFound = searchParams.get("notfound") === "1";

  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [latestResult, setLatestResult] = useState<{
    shortUrl: string;
    slug: string;
    originalUrl: string;
    qrCode?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const customSlugId = useId();

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("askr_ink_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (item: HistoryItem) => {
    try {
      const updated = [item, ...history.filter((h) => h.slug !== item.slug)].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("askr_ink_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeFromHistory = (slug: string) => {
    const updated = history.filter((h) => h.slug !== slug);
    setHistory(updated);
    try {
      localStorage.setItem("askr_ink_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const refreshClicks = async (slug: string) => {
    try {
      const res = await fetch(`/api/stats/${slug}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = history.map((item) =>
            item.slug === slug ? { ...item, clicks: json.data.clicks } : item
          );
          setHistory(updated);
          localStorage.setItem("askr_ink_history", JSON.stringify(updated));
        }
      }
    } catch {
      // ignore
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: longUrl.trim(),
          customSlug: showCustom && customSlug.trim() ? customSlug.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Gagal memperpendek tautan.");
        setLoading(false);
        return;
      }

      const result = {
        shortUrl: json.shortUrl,
        slug: json.data.slug,
        originalUrl: json.data.originalUrl,
        qrCode: json.qrCode,
      };

      setLatestResult(result);

      // Save to local device history
      saveToHistory({
        id: json.data.id,
        slug: json.data.slug,
        shortUrl: json.shortUrl,
        originalUrl: json.data.originalUrl,
        createdAt: json.data.createdAt,
        clicks: 0,
      });

      // Clear input
      setLongUrl("");
      setCustomSlug("");
      setShowCustom(false);
    } catch (err) {
      console.error(err);
      setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, slug?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (slug) {
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
      {/* Top Banner / Not Found Alert */}
      {isNotFound && notFoundSlug && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-sm">
            <span className="font-semibold">Tautan tidak ditemukan:</span> Shortcut{" "}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-medium">
              /{notFoundSlug}
            </code>{" "}
            belum terdaftar atau sudah tidak aktif. Anda bisa membuat shortcut baru di bawah ini.
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 font-bold text-xl tracking-tight">
            a
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            askr<span className="text-indigo-600">.ink</span>
          </h1>
        </div>
        <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
          Shortcut link & pemendek tautan cepat, simpel, dan bebas iklan.
        </p>
      </header>

      {/* Main Shortener Form Card */}
      <main className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7 transition-all">
          <form onSubmit={handleShorten} className="space-y-4">
            <div>
              <label htmlFor="long-url-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Tujuan Tautan Panjang
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <input
                  id="long-url-input"
                  type="text"
                  required
                  placeholder="Tempel tautan panjang di sini (misal: https://docs.google.com/...)"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm sm:text-base transition-all"
                />
              </div>
            </div>

            {/* Custom Alias Toggle */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowCustom(!showCustom)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showCustom ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                {showCustom ? "Sembunyikan alias kustom" : "Gunakan alias kustom (opsional)"}
              </button>
            </div>

            {/* Custom Slug Input */}
            {showCustom && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 animate-in fade-in duration-200">
                <label htmlFor={customSlugId} className="block text-xs font-semibold text-slate-700">
                  Custom Shortcut / Alias:
                </label>
                <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <span className="px-3 text-xs sm:text-sm text-slate-500 bg-slate-100 py-2.5 border-r border-slate-200 select-none">
                    askr.ink/
                  </span>
                  <input
                    id={customSlugId}
                    type="text"
                    placeholder="nama-singkat-kamu"
                    value={customSlug}
                    onChange={(e) =>
                      setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                    }
                    maxLength={32}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Hanya huruf kecil, angka, tanda strip (-), atau garis bawah (_).
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !longUrl.trim()}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-semibold rounded-xl shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Perpendek Link</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Latest Result Card */}
        {latestResult && (
          <div className="mt-6 bg-white rounded-2xl p-5 sm:p-6 border-2 border-indigo-500/20 shadow-md shadow-indigo-100/50 space-y-5 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Shortcut Berhasil Dibuat
                </span>
              </div>
              <span className="text-xs text-slate-600 font-mono">/{latestResult.slug}</span>
            </div>

            {/* URL Display and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <a
                href={latestResult.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-base sm:text-lg font-bold text-indigo-600 hover:text-indigo-800 break-all transition-colors flex items-center gap-1.5"
              >
                <span>{latestResult.shortUrl}</span>
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(latestResult.shortUrl)}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Salin Link</span>
                    </>
                  )}
                </button>

                <a
                  href={latestResult.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                >
                  Buka
                </a>
              </div>
            </div>

            {/* Destination URL */}
            <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-700 shrink-0">Tujuan:</span>
              <span className="truncate text-slate-600 font-mono">{latestResult.originalUrl}</span>
            </div>

            {/* QR Code and Share Section */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              {latestResult.qrCode && (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                    <Image
                      src={latestResult.qrCode}
                      alt="QR Code askr.ink"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">QR Code Siap Pakai</div>
                    <a
                      href={`/api/qr?url=${encodeURIComponent(latestResult.shortUrl)}`}
                      download={`askr-ink-${latestResult.slug}.png`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh QR (PNG)
                    </a>
                  </div>
                </div>
              )}

              {/* Share shortcuts */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 mr-1">Bagikan:</span>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(latestResult.shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(latestResult.shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium transition-colors"
                >
                  Telegram
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(latestResult.shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
                >
                  X
                </a>
              </div>
            </div>
          </div>
        )}

        {/* History / Recent Links on This Device */}
        {history.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Riwayat Shortcut di Browser Ini
              </h2>
              <span className="text-xs text-slate-600">{history.length} link tersimpan</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-sm">
              {history.map((item) => (
                <div
                  key={item.slug}
                  className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={item.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {item.shortUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => refreshClicks(item.slug)}
                        title="Klik untuk menyegarkan jumlah kunjungan"
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{item.clicks}</span> klik
                        <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1 max-w-lg font-mono">
                      {item.originalUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.shortUrl, item.slug)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedSlug === item.slug ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-emerald-700 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Salin</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromHistory(item.slug)}
                      title="Hapus dari riwayat browser"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Namecheap DNS Guide Toggle */}
        <div className="mt-10 border border-slate-200/80 rounded-2xl bg-white p-5">
          <button
            type="button"
            onClick={() => setShowDnsGuide(!showDnsGuide)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Panduan Setup Domain Namecheap (askr.ink) ke Vercel
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${showDnsGuide ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDnsGuide && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 space-y-3">
              <p>
                Untuk menghubungkan domain <strong className="text-slate-900">askr.ink</strong> yang dibeli di Namecheap ke project Vercel:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Buka akun Namecheap Anda lalu masuk ke <strong>Domain List</strong> &gt; pilih <strong>askr.ink</strong> &gt; klik <strong>Manage</strong>.</li>
                <li>Pilih tab <strong>Advanced DNS</strong>.</li>
                <li>Tambahkan / sesuaikan 2 Host Records berikut:</li>
              </ol>

              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs font-mono border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 text-left">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Type</th>
                      <th className="p-2 border-b border-slate-200">Host</th>
                      <th className="p-2 border-b border-slate-200">Value (Target)</th>
                      <th className="p-2 border-b border-slate-200">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="p-2 font-bold text-indigo-600">A Record</td>
                      <td className="p-2">@</td>
                      <td className="p-2 text-slate-800">76.76.21.21</td>
                      <td className="p-2 text-slate-400">Automatic</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-indigo-600">CNAME Record</td>
                      <td className="p-2">www</td>
                      <td className="p-2 text-slate-800">cname.vercel-dns.com.</td>
                      <td className="p-2 text-slate-400">Automatic</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-slate-500 text-xs">
                Setelah itu, tambahkan <code>askr.ink</code> di menu <strong>Settings &gt; Domains</strong> pada dashboard project Vercel Anda. Sertifikat SSL gratis akan aktif secara otomatis.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-600 space-y-1">
        <p>
          &copy; {new Date().getFullYear()} <strong className="text-slate-700">askr.ink</strong> &bull; Link Shortener & Shortcut Service
        </p>
        <p className="text-[11px] text-slate-600">
          Dibuat dengan Next.js, Tailwind CSS, & QR Engine
        </p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Memuat askr.ink...</div>}>
      <ShortenerContent />
    </Suspense>
  );
}
