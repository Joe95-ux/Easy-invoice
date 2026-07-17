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
  filePublicId: z.string().trim().max(300).optional(),
  deliveryType: z.enum(["authenticated", "upload"]).optional(),
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

const socialLinkSchema = z.object({
  platform: z.enum([
    "instagram",
    "facebook",
    "x",
    "linkedin",
    "youtube",
    "tiktok",
    "threads",
    "whatsapp",
    "other",
  ]),
  url: z.string().trim().url("Enter a valid profile URL"),
  label: z.string().trim().max(80).optional(),
});

const socialContent = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  subtitle: z.string().trim().max(200).optional(),
  links: z.array(socialLinkSchema).min(1, "Add at least one social link"),
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
