import { NextRequest, NextResponse } from "next/server";
import { findLinkBySlug } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ success: false, message: "Slug is required" }, { status: 400 });
    }

    const link = await findLinkBySlug(slug);
    if (!link) {
      return NextResponse.json({ success: false, message: "Link tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        slug: link.slug,
        originalUrl: link.originalUrl,
        clicks: link.clicks,
        createdAt: link.createdAt,
        lastClickedAt: link.lastClickedAt,
      },
    });
  } catch (err) {
    console.error("API /api/stats/[slug] error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
