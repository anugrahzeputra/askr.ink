import { NextRequest, NextResponse } from "next/server";
import { findLinkBySlug, incrementClickCount } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Look up link
  const link = await findLinkBySlug(slug);

  if (!link) {
    // If not found, redirect to homepage with notfound parameter
    const notFoundUrl = new URL("/", req.url);
    notFoundUrl.searchParams.set("notfound", "1");
    notFoundUrl.searchParams.set("slug", slug);
    return NextResponse.redirect(notFoundUrl);
  }

  // Asynchronously record the click without blocking redirection
  incrementClickCount(slug).catch((err) => {
    console.error("Failed to increment click count for slug:", slug, err);
  });

  // Perform temporary 307 redirect so browsers do not cache the destination permanently,
  // ensuring analytics remain accurate.
  return NextResponse.redirect(link.originalUrl, { status: 307 });
}
