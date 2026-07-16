import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color");

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .optional()
  .or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email")
  .optional()
  .or(z.literal(""));

const dateTimeString = z
  .string()
  .trim()
  .min(1, "Pick a date and time")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date");

export const qrDesignSchema = z.object({
  fgColor: hexColor,
  bgColor: hexColor,
  dotStyle: z.enum(["squares", "dots", "fluid"]),
  eyeRadius: z.number().min(0).max(50),
  logoEnabled: z.boolean(),
});

const linkContent = z.object({
  url: z.string().trim().url("Enter a valid URL"),
});

const pdfContent = z.object({
  fileUrl: z.string().trim().url("Upload a PDF first"),
  fileName: z.string().trim().max(200).optional(),
});

const vcardContent = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  organization: z.string().trim().max(120).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: optionalEmail,
  website: optionalUrl,
  address: z.string().trim().max(300).optional(),
});

const eventContent = z.object({
  title: z.string().trim().min(1, "Event title is required").max(160),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  startAt: dateTimeString,
  endAt: dateTimeString.optional().or(z.literal("")),
  url: optionalUrl,
});

const nameField = z.string().trim().min(1, "Give this code a name").max(80);

export const qrCodeSchema = z.discriminatedUnion("type", [
  z.object({ name: nameField, type: z.literal("LINK"), content: linkContent, design: qrDesignSchema }),
  z.object({ name: nameField, type: z.literal("PDF"), content: pdfContent, design: qrDesignSchema }),
  z.object({ name: nameField, type: z.literal("VCARD"), content: vcardContent, design: qrDesignSchema }),
  z.object({ name: nameField, type: z.literal("EVENT"), content: eventContent, design: qrDesignSchema }),
]);

export type QrCodeInput = z.infer<typeof qrCodeSchema>;
