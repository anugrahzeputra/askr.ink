import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Parameter url diperlukan", { status: 400 });
  }

  try {
    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 512,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="askr-ink-qr.png"',
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR PNG:", error);
    return new NextResponse("Gagal membuat QR Code", { status: 500 });
  }
}
