import { z } from "zod";
import { BUSINESS_FACILITIES } from "@/lib/qr-codes/business";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS } from "@/lib/qr-codes/types";

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
  logoUrl: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((value) => {
      if (!value) return null;
      if (/^(https?:|data:)/i.test(value) || value.startsWith("/")) return value;
      return null;
    }),
  frameId: z
    .enum([
      "none",
      "border",
      "soft",
      "badge",
      "caption",
      "pill",
      "dashed",
      "double",
      "brackets",
      "banner-bottom",
      "banner-top",
      "balloon-bottom",
      "balloon-top",
      "ribbon-bottom",
    ])
    .default("none"),
  frameLabel: z.string().trim().max(20).default("Scan me"),
});

const linkContent = z.object({
  url: z.string().trim().url("Enter a valid URL"),
});

const pdfContent = z.object({
  fileUrl: z.string().trim().url("Upload a PDF first"),
  fileName: z.string().trim().max(200).optional(),
  filePublicId: z.string().trim().max(300).optional(),
  deliveryType: z.enum(["authenticated", "upload"]).optional(),
});

const timeSlotSchema = z.object({
  open: z.string().trim().max(5),
  close: z.string().trim().max(5),
});

const dayHoursSchema = z.object({
  closed: z.boolean(),
  slots: z.array(timeSlotSchema).max(2),
});

const openingHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

const businessFacilitySchema = z.enum(BUSINESS_FACILITIES);

const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().trim().url("Enter a valid profile URL"),
  label: z.string().trim().max(80).optional(),
});

const vcardContent = z
  .object({
    companyName: z.string().trim().max(120).optional(),
    title: z.string().trim().max(160).optional(),
    subtitle: z.string().trim().max(300).optional(),
    imageUrl: optionalUrl,
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: optionalUrl,
    openingHours: openingHoursSchema.optional(),
    address: z.string().trim().max(300).optional(),
    locationLat: z.number().min(-90).max(90).optional(),
    locationLng: z.number().min(-180).max(180).optional(),
    contactName: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    email: optionalEmail,
    website: optionalUrl,
    links: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS).optional(),
    about: z.string().trim().max(2000).optional(),
    facilities: z.array(businessFacilitySchema).max(15).optional(),
    /** Legacy fields still accepted when reading older codes. */
    fullName: z.string().trim().max(120).optional(),
    organization: z.string().trim().max(120).optional(),
    jobTitle: z.string().trim().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    const company =
      value.companyName?.trim() ||
      value.organization?.trim() ||
      value.fullName?.trim() ||
      value.contactName?.trim();
    if (!company) {
      ctx.addIssue({
        code: "custom",
        message: "Company name is required",
        path: ["companyName"],
      });
    }
  });

const eventContent = z.object({
  title: z.string().trim().min(1, "Event title is required").max(160),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  startAt: dateTimeString,
  endAt: dateTimeString.optional().or(z.literal("")),
  url: optionalUrl,
});

const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120),
  description: z.string().trim().max(300).optional(),
  price: z.string().trim().max(40).optional(),
  section: z.string().trim().max(80).optional(),
});

const menuContent = z.object({
  venueName: z.string().trim().min(1, "Venue name is required").max(120),
  subtitle: z.string().trim().max(200).optional(),
  currency: z.string().trim().max(8).optional(),
  items: z.array(menuItemSchema).min(1, "Add at least one menu item"),
});

const wifiContent = z
  .object({
    ssid: z.string().trim().min(1, "Network name is required").max(64),
    password: z.string().max(128).optional(),
    encryption: z.enum(["WPA", "WEP", "nopass"]),
    hidden: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.encryption !== "nopass" && !value.password?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required for secured networks",
        path: ["password"],
      });
    }
  });

const socialContent = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  subtitle: z.string().trim().max(200).optional(),
  imageUrl: optionalUrl,
  links: z
    .array(socialLinkSchema)
    .min(1, "Add at least one social link")
    .max(MAX_SOCIAL_LINKS, `You can add up to ${MAX_SOCIAL_LINKS} social links`),
});

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "Enter a valid date",
  );

const couponContent = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(64),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  terms: z.string().trim().max(1000).optional(),
  expiresAt: optionalDateString,
});

const nameField = z.string().trim().min(1, "Give this code a name").max(80);

const accessFields = {
  passwordEnabled: z.boolean().optional(),
  password: z.string().max(128).optional(),
};

export const qrCodeSchema = z
  .discriminatedUnion("type", [
    z.object({ name: nameField, type: z.literal("LINK"), content: linkContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("PDF"), content: pdfContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("VCARD"), content: vcardContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("EVENT"), content: eventContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("MENU"), content: menuContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("WIFI"), content: wifiContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("SOCIAL"), content: socialContent, design: qrDesignSchema, ...accessFields }),
    z.object({ name: nameField, type: z.literal("COUPON"), content: couponContent, design: qrDesignSchema, ...accessFields }),
  ])
  .superRefine((data, ctx) => {
    if (!data.passwordEnabled) return;
    const password = data.password?.trim() ?? "";
    if (password.length > 0 && password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["password"],
      });
    }
  });

export type QrCodeInput = z.infer<typeof qrCodeSchema>;

/** True when enabling protection without supplying a new password. */
export function accessPasswordMissing(input: {
  passwordEnabled?: boolean;
  password?: string;
}): boolean {
  return Boolean(input.passwordEnabled) && !(input.password?.trim().length);
}
