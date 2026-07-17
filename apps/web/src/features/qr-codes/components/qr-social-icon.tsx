"use client";

import Image from "next/image";
import { SocialIcon } from "react-social-icons";
import type { SocialPlatform } from "@/lib/qr-codes/types";

const NETWORK_BY_PLATFORM: Record<Exclude<SocialPlatform, "instagram" | "other">, string> = {
  facebook: "facebook",
  x: "x",
  linkedin: "linkedin",
  youtube: "youtube",
  tiktok: "tiktok",
  threads: "threads",
  whatsapp: "whatsapp",
};

type QrSocialIconProps = {
  platform: SocialPlatform;
  size?: number;
  className?: string;
};

export function QrSocialIcon({ platform, size = 40, className }: QrSocialIconProps) {
  if (platform === "instagram") {
    return (
      <Image
        src="/instagram.png"
        alt="Instagram"
        width={size}
        height={size}
        className={className ?? "rounded-full object-cover"}
        unoptimized
      />
    );
  }

  const network = platform === "other" ? "sharethis" : NETWORK_BY_PLATFORM[platform];

  return (
    <SocialIcon
      network={network}
      style={{ height: size, width: size }}
      className={className}
      as="div"
    />
  );
}
