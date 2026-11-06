import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { findLinkBySlug, saveLink } from "@/lib/storage";
import {
  generateRandomSlug,
  isValidSlug,
  isValidUrl,
  normalizeUrl,
  isSelfDomain,
} from "@/lib/utils";
import { LinkItem, ShortenRequest, ShortenResponse } from "@/types/link";

export async function POST(req: NextRequest) {
  try {
    const body: ShortenRequest = await req.json();
    const rawUrl = body.url;
    const requestedCustomSlug = body.customSlug?.trim();

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json<ShortenResponse>(
        { success: false, message: "URL tujuan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const normalized = normalizeUrl(rawUrl);

    if (!isValidUrl(normalized)) {
      return NextResponse.json<ShortenResponse>(
        { success: false, message: "Format URL tidak valid. Pastikan diawali dengan http:// atau https://" },
        { status: 400 }
      );
    }

    // Determine current host
    const origin = req.nextUrl.origin;
    if (isSelfDomain(normalized, origin)) {
      return NextResponse.json<ShortenResponse>(
        { success: false, message: "Tidak bisa memperpendek domain askr.ink sendiri untuk mencegah loop." },
        { status: 400 }
      );
    }

    let finalSlug: string;
    let isCustom = false;

    if (requestedCustomSlug) {
      if (!isValidSlug(requestedCustomSlug)) {
        return NextResponse.json<ShortenResponse>(
          {
            success: false,
            message:
              "Alias kustom tidak valid atau mengandung kata yang dicadangkan sistem. Gunakan 2-32 karakter huruf, angka, atau tanda strip (-).",
          },
          { status: 400 }
        );
      }

      // Check if slug is already used
      const existing = await findLinkBySlug(requestedCustomSlug);
      if (existing) {
        return NextResponse.json<ShortenResponse>(
          {
            success: false,
            message: `Alias "${requestedCustomSlug}" sudah digunakan oleh orang lain. Silakan pilih alias yang berbeda.`,
          },
          { status: 409 }
        );
      }

      finalSlug = requestedCustomSlug;
      isCustom = true;
    } else {
      // Generate a collision-free slug
      let attempts = 0;
      let generated = generateRandomSlug(6);
      while ((await findLinkBySlug(generated)) && attempts < 5) {
        generated = generateRandomSlug(6);
        attempts++;
      }
      finalSlug = generated;
    }

    const newLink: LinkItem = {
      id: "lnk_" + Math.random().toString(36).substring(2, 10),
      slug: finalSlug,
      originalUrl: normalized,
      createdAt: new Date().toISOString(),
      clicks: 0,
      lastClickedAt: null,
      custom: isCustom,
    };

    await saveLink(newLink);

    // Build the short URL string (use NEXT_PUBLIC_APP_URL or fallback to request origin)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "https://askr.ink";
    const shortUrl = `${baseUrl.replace(/\/+$/, "")}/${finalSlug}`;

    // Generate QR Code data URL
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(shortUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
    } catch (qrErr) {
      console.error("QR Code generation error:", qrErr);
    }

    return NextResponse.json<ShortenResponse>({
      success: true,
      data: newLink,
      shortUrl,
      qrCode: qrDataUrl,
    });
  } catch (error) {
    console.error("API /api/shorten error:", error);
    return NextResponse.json<ShortenResponse>(
      { success: false, message: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
