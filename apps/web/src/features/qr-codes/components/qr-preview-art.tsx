/** Decorative SVG scenes used in the phone mockup type previews. */

export function VcardIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden>
      <rect width="200" height="140" rx="16" fill="#E0F2FE" />
      {/* Desk card */}
      <rect x="36" y="38" width="128" height="78" rx="12" fill="#fff" stroke="#7DD3FC" strokeWidth="1.5" />
      <rect x="36" y="38" width="128" height="28" rx="12" fill="#0EA5E9" />
      <rect x="36" y="52" width="128" height="14" fill="#0EA5E9" />
      {/* Avatar */}
      <circle cx="68" cy="78" r="16" fill="#BAE6FD" />
      <circle cx="68" cy="74" r="7" fill="#0284C7" />
      <path
        d="M54 92c2.5-7 8-11 14-11s11.5 4 14 11"
        fill="#0284C7"
      />
      {/* Text lines */}
      <rect x="96" y="66" width="50" height="7" rx="3.5" fill="#0EA5E9" />
      <rect x="96" y="80" width="36" height="5" rx="2.5" fill="#7DD3FC" />
      <rect x="96" y="92" width="44" height="5" rx="2.5" fill="#BAE6FD" />
      {/* Floating badge */}
      <circle cx="156" cy="34" r="16" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="2" />
      <path
        d="M150 34h12M156 28v12"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EventIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden>
      <rect width="200" height="140" rx="16" fill="#F3E8FF" />
      {/* Ticket */}
      <rect x="42" y="34" width="116" height="72" rx="12" fill="#fff" stroke="#D8B4FE" strokeWidth="1.5" />
      <path d="M42 70h116" stroke="#E9D5FF" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx="42" cy="70" r="8" fill="#F3E8FF" />
      <circle cx="158" cy="70" r="8" fill="#F3E8FF" />
      {/* Calendar stub */}
      <rect x="56" y="44" width="28" height="32" rx="6" fill="#A855F7" />
      <rect x="56" y="44" width="28" height="10" rx="6" fill="#7C3AED" />
      <text x="70" y="70" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="system-ui">
        24
      </text>
      {/* Title lines */}
      <rect x="94" y="48" width="50" height="6" rx="3" fill="#A855F7" />
      <rect x="94" y="60" width="36" height="4" rx="2" fill="#D8B4FE" />
      <rect x="56" y="86" width="70" height="4" rx="2" fill="#E9D5FF" />
      <rect x="56" y="96" width="52" height="4" rx="2" fill="#E9D5FF" />
      {/* Confetti */}
      <circle cx="168" cy="28" r="4" fill="#F472B6" />
      <circle cx="28" cy="48" r="3" fill="#A855F7" />
      <rect x="172" y="52" width="6" height="6" rx="1" fill="#FBBF24" transform="rotate(20 175 55)" />
      <rect x="22" y="96" width="5" height="5" rx="1" fill="#34D399" transform="rotate(-15 24 98)" />
      <circle cx="160" cy="108" r="3.5" fill="#FB7185" />
    </svg>
  );
}

export function MenuIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden>
      <rect width="200" height="140" rx="16" fill="#FEF3C7" />
      {/* Plate */}
      <ellipse cx="100" cy="78" rx="48" ry="34" fill="#fff" stroke="#F59E0B" strokeWidth="2" />
      <ellipse cx="100" cy="78" rx="34" ry="22" fill="#FEF3C7" />
      {/* Food accents */}
      <circle cx="88" cy="72" r="8" fill="#F97316" />
      <circle cx="108" cy="70" r="7" fill="#EF4444" />
      <ellipse cx="100" cy="88" rx="14" ry="6" fill="#84CC16" />
      {/* Fork / knife */}
      <rect x="38" y="40" width="4" height="60" rx="2" fill="#D97706" />
      <rect x="32" y="40" width="16" height="3" rx="1.5" fill="#D97706" />
      <rect x="158" y="40" width="4" height="60" rx="2" fill="#D97706" />
      <path d="M154 40h12l-4 14h-4l-4-14z" fill="#D97706" />
      {/* Steam */}
      <path d="M90 34c0-6 6-6 6-12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <path d="M102 30c0-6 6-6 6-12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WifiIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden>
      <rect width="200" height="140" rx="16" fill="#D1FAE5" />
      {/* Device */}
      <rect x="70" y="48" width="60" height="56" rx="10" fill="#fff" stroke="#34D399" strokeWidth="2" />
      <rect x="80" y="58" width="40" height="28" rx="4" fill="#A7F3D0" />
      <circle cx="100" cy="96" r="3" fill="#10B981" />
      {/* Signal arcs */}
      <path
        d="M64 52c18-18 54-18 72 0"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M74 62c12-12 40-12 52 0"
        stroke="#34D399"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M84 72c6-6 26-6 32 0"
        stroke="#6EE7B7"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="100" cy="82" r="3.5" fill="#059669" />
    </svg>
  );
}

export function SocialIllustration({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden>
      <rect width="200" height="140" rx="16" fill={dark ? "#1e293b" : "#E0F2FE"} />
      <circle cx="70" cy="70" r="22" fill="#38BDF8" />
      <circle cx="100" cy="52" r="18" fill="#818CF8" />
      <circle cx="130" cy="70" r="20" fill="#F472B6" />
      <circle cx="100" cy="92" r="16" fill="#34D399" />
      <path d="M70 70h30M100 52v40M100 70h30" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Diagonal slash at the bottom of a colored hero (qr-code.io style). */
export function DiagonalDivider({ fill }: { fill: string }) {
  return (
    <svg
      viewBox="0 0 320 48"
      preserveAspectRatio="none"
      className="block h-10 w-full"
      aria-hidden
    >
      <path d="M0 0 L320 28 L320 48 L0 48 Z" fill={fill} />
    </svg>
  );
}

/** Soft wave divider between a colored hero and the page body. */
export function WaveDivider({ fill }: { fill: string }) {
  return (
    <svg
      viewBox="0 0 320 28"
      preserveAspectRatio="none"
      className="block h-6 w-full"
      aria-hidden
    >
      <path
        d="M0 18 C40 28 80 4 120 12 C160 20 200 28 240 16 C280 4 300 10 320 14 L320 28 L0 28 Z"
        fill={fill}
      />
    </svg>
  );
}
