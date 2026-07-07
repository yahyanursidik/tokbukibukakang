import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, Json, PoPeriodStatus, ReviewSourceType, StockType } from '@/lib/supabase/client';

type BookRow = Database['public']['Tables']['books']['Row'];
type ReviewRow = Database['public']['Tables']['reviews']['Row'];
type PoPeriodRow = Database['public']['Tables']['po_periods']['Row'];
type PageRow = Database['public']['Tables']['pages']['Row'];

export type ExternalReviewSource = {
  sourceName: string;
  sourceUrl?: string;
};

export type PublicBook = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  ageMin: number;
  ageMax: number;
  categories: string[];
  themes: string[];
  price: number;
  originalPrice?: number;
  coverImage: string;
  galleryImages: string[];
  shortDescription: string;
  reviewSummary: string;
  parentNotes: string;
  manhajNotes: string;
  stockType: StockType;
  isActive: boolean;
  featured: boolean;
  externalReviewSources: ExternalReviewSource[];
};

export type PublicReview = {
  id: string;
  title: string;
  slug: string;
  bookSlug: string;
  summary: string;
  content: string;
  sourceType: ReviewSourceType;
  sourceName?: string;
  sourceUrl?: string;
  reviewerNote?: string;
};

export type PublicPoPeriod = {
  id: string;
  title: string;
  slug: string;
  startDate: Date;
  endDate: Date;
  estimatedShippingDate: Date;
  status: PoPeriodStatus;
  description: string;
  bookSlugs: string[];
  notes?: string;
};

export type PublicPage = {
  id: string;
  title: string;
  slug: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
};

const optionalString = (value: string | null | undefined) => value || undefined;

const parseExternalReviewSources = (value: Json): ExternalReviewSource[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((source) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return null;
      }

      const sourceName = source.sourceName;
      const sourceUrl = source.sourceUrl;

      if (typeof sourceName !== 'string' || !sourceName.trim()) {
        return null;
      }

      const parsedSource: ExternalReviewSource = {
        sourceName: sourceName.trim()
      };

      if (typeof sourceUrl === 'string' && sourceUrl.trim()) {
        parsedSource.sourceUrl = sourceUrl.trim();
      }

      return parsedSource;
    })
    .filter((source): source is ExternalReviewSource => source !== null);
};

export const mapBookRow = (row: BookRow): PublicBook => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  subtitle: optionalString(row.subtitle),
  author: optionalString(row.author),
  publisher: optionalString(row.publisher),
  ageMin: row.age_min,
  ageMax: row.age_max,
  categories: row.categories,
  themes: row.themes,
  price: row.price,
  originalPrice: typeof row.original_price === 'number' ? row.original_price : undefined,
  coverImage: row.cover_image,
  galleryImages: row.gallery_images,
  shortDescription: row.short_description,
  reviewSummary: row.review_summary,
  parentNotes: row.parent_notes,
  manhajNotes: row.manhaj_notes,
  stockType: row.stock_type,
  isActive: row.is_active,
  featured: row.featured,
  externalReviewSources: parseExternalReviewSources(row.external_review_sources)
});

export const mapReviewRow = (row: ReviewRow): PublicReview => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  bookSlug: row.book_slug,
  summary: row.summary,
  content: row.content,
  sourceType: row.source_type,
  sourceName: optionalString(row.source_name),
  sourceUrl: optionalString(row.source_url),
  reviewerNote: optionalString(row.reviewer_note)
});

export const mapPoPeriodRow = (row: PoPeriodRow): PublicPoPeriod => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  startDate: new Date(row.start_date),
  endDate: new Date(row.end_date),
  estimatedShippingDate: new Date(row.estimated_shipping_date),
  status: row.status,
  description: row.description,
  bookSlugs: row.book_slugs,
  notes: optionalString(row.notes)
});

export const mapPageRow = (row: PageRow): PublicPage => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  seoTitle: optionalString(row.seo_title),
  seoDescription: optionalString(row.seo_description)
});

export const listPublicBooks = async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('is_active', true)
    .order('featured', { ascending: false })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapBookRow);
};

export const getPublicBookBySlug = async (slug: string) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('books').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapBookRow(data) : null;
};

export const listPublicReviews = async (limit?: number) => {
  const supabase = createSupabaseServerClient();
  let query = supabase.from('reviews').select('*').order('updated_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapReviewRow);
};

export const listPublicPoPeriods = async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('po_periods')
    .select('*')
    .neq('status', 'draft')
    .order('end_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPoPeriodRow);
};

export const getPublicPoPeriodBySlug = async (slug: string) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('po_periods')
    .select('*')
    .eq('slug', slug)
    .neq('status', 'draft')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPoPeriodRow(data) : null;
};

export const getPublicPageBySlug = async (slug: string) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPageRow(data) : null;
};
