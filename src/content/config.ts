import { defineCollection, z } from 'astro:content';

const externalReviewSourceSchema = z.object({
  sourceName: z.string(),
  sourceUrl: z.string().url().optional()
});

const books = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    subtitle: z.string().optional(),
    author: z.string().optional(),
    publisher: z.string().optional(),
    ageMin: z.number().int().min(0),
    ageMax: z.number().int().min(0),
    categories: z.array(z.string()).min(1),
    themes: z.array(z.string()).min(1),
    price: z.number().int().min(0),
    coverImage: z.string(),
    shortDescription: z.string(),
    reviewSummary: z.string(),
    parentNotes: z.string(),
    manhajNotes: z.string(),
    stockType: z.enum(['preorder', 'ready_stock']),
    isActive: z.boolean(),
    featured: z.boolean(),
    externalReviewSources: z.array(externalReviewSourceSchema).optional()
  })
});

const reviews = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    bookSlug: z.string(),
    summary: z.string(),
    content: z.string(),
    sourceType: z.enum(['original', 'external_summary']),
    sourceName: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    reviewerNote: z.string().optional()
  })
});

const poPeriods = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    estimatedShippingDate: z.coerce.date(),
    status: z.enum(['draft', 'open', 'closed', 'archived']),
    description: z.string(),
    bookSlugs: z.array(z.string()).min(1),
    notes: z.string().optional()
  })
});

const pages = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional()
  })
});

export const collections = {
  books,
  reviews,
  poPeriods,
  pages
};
