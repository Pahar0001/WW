import { z } from 'zod';

// Validation contract for the CMS "create trip" form.
export const CreateTripSchema = z.object({
  countryName: z.string().min(1, 'Country is required'),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  summary: z.string().optional(),
  longDescription: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  bestTime: z.string().optional(),
  visaNote: z.string().optional(),
  heroImage: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  pace: z.enum(['CALM', 'BALANCED', 'ACTIVE']).optional(),
  seasonLabel: z.string().optional(),
  startWindow: z.string().optional(),
  endWindow: z.string().optional(),
  durationDays: z.coerce.number().int().min(1).max(60),
  budgetMinRub: z.coerce.number().int().positive().optional(),
  budgetMaxRub: z.coerce.number().int().positive().optional(),
  hotels: z
    .array(
      z.object({
        cityLabel: z.string().optional(),
        name: z.string().min(1),
        url: z.string().optional(),
        area: z.string().optional(),
        priceNote: z.string().optional(),
        photoUrl: z.string().optional(),
      }),
    )
    .optional(),
  days: z
    .array(
      z.object({
        title: z.string().optional(),
        baseCity: z.string().optional(),
        notes: z.string().optional(),
        places: z
          .array(
            z.object({
              name: z.string().min(1),
              nameLocal: z.string().optional(),
              lat: z.coerce.number().min(-90).max(90).optional(),
              lng: z.coerce.number().min(-180).max(180).optional(),
              description: z.string().optional(),
              photoUrl: z.string().optional(),
              photos: z.array(z.string()).optional(),
              howToGet: z.string().optional(),
              tips: z.string().optional(),
              nearby: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .min(1, 'At least one day is required'),
});

export type CreateTripInput = z.infer<typeof CreateTripSchema>;

// Reusable shapes so the editor can update days/places/hotels too.
export const HotelSchema = z.object({
  cityLabel: z.string().optional(),
  name: z.string().min(1),
  url: z.string().optional(),
  area: z.string().optional(),
  priceNote: z.string().optional(),
  photoUrl: z.string().optional(),
});
export const PlaceSchema = z.object({
  name: z.string().min(1),
  nameLocal: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
  howToGet: z.string().optional(),
  tips: z.string().optional(),
  nearby: z.string().optional(),
});
export const DaySchema = z.object({
  title: z.string().optional(),
  baseCity: z.string().optional(),
  notes: z.string().optional(),
  places: z.array(PlaceSchema).default([]),
});

// Editable trip-level fields (everyone except MEMBER may edit).
export const UpdateTripSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  summary: z.string().optional(),
  longDescription: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  bestTime: z.string().optional(),
  visaNote: z.string().optional(),
  heroImage: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).optional(),
  seasonLabel: z.string().optional(),
  durationDays: z.coerce.number().int().min(1).max(60).optional(),
  budgetMinRub: z.coerce.number().int().positive().nullable().optional(),
  budgetMaxRub: z.coerce.number().int().positive().nullable().optional(),
  // When provided, the editor replaces the whole itinerary / hotel list.
  days: z.array(DaySchema).optional(),
  hotels: z.array(HotelSchema).optional(),
});
export type UpdateTripInput = z.infer<typeof UpdateTripSchema>;
