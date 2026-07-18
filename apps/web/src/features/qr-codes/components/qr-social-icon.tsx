"use client";

import Image from "next/image";
import { GlobeIcon } from "lucide-react";
import { SocialIcon } from "react-social-icons";
import type { SocialPlatform } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

/** Maps our platform ids to react-social-icons network names. */
const NETWORK_BY_PLATFORM: Record<Exclude<SocialPlatform, "instagram" | "other">, string> = {
  facebook: "facebook",
  x: "x",
  linkedin: "linkedin",
  youtube: "youtube",
  tiktok: "tiktok",
  threads: "threads",
  whatsapp: "whatsapp",
  telegram: "telegram",
  snapchat: "snapchat",
  pinterest: "pinterest",
  reddit: "reddit",
  github: "github",
  gitlab: "gitlab",
  discord: "discord",
  twitch: "twitch",
  spotify: "spotify",
  soundcloud: "soundcloud",
  dribbble: "dribbble",
  tumblr: "tumblr",
  flickr: "flickr",
  vimeo: "vimeo",
  yelp: "yelp",
  patreon: "patreon",
  wechat: "wechat",
  line: "line.me",
  google: "google",
  vk: "vk",
  xing: "xing",
  onlyfans: "onlyfans",
};

type QrSocialIconProps = {
  platform: SocialPlatform;
  size?: number;
  className?: string;
};

export function QrSocialIcon({ platform, size = 40, className }: QrSocialIconProps) {
  if (platform === "other") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-sky-600 text-white",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <GlobeIcon style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

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

  return (
    <SocialIcon
      network={NETWORK_BY_PLATFORM[platform]}
      style={{ height: size, width: size }}
      className={className}
      as="div"
    />
  );
}
