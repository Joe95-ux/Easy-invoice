import { HomePageV1 } from "@/components/landing/home-page-v1";
import { HomePageV2 } from "@/components/landing/home-page-v2";

/**
 * Landing version switch.
 * - Default / unset → v2 (Linear-style demonstrative)
 * - NEXT_PUBLIC_LANDING_VERSION=v1 → previous marketing page
 */
const landingVersion = (process.env.NEXT_PUBLIC_LANDING_VERSION ?? "v2").toLowerCase();

export default function HomePage() {
  if (landingVersion === "v1") {
    return <HomePageV1 />;
  }
  return <HomePageV2 />;
}
