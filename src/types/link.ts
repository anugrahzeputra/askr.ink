export interface LinkItem {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: string;
  clicks: number;
  lastClickedAt?: string | null;
  custom?: boolean;
}

export interface ShortenRequest {
  url: string;
  customSlug?: string;
}

export interface ShortenResponse {
  success: boolean;
  message?: string;
  data?: LinkItem;
  shortUrl?: string;
  qrCode?: string;
}
