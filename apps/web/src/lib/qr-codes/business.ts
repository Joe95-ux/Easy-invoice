import type { LucideIcon } from "lucide-react";
import {
  AccessibilityIcon,
  ArmchairIcon,
  BabyIcon,
  BedDoubleIcon,
  BusIcon,
  CarFrontIcon,
  CircleParkingIcon,
  CoffeeIcon,
  DumbbellIcon,
  MartiniIcon,
  PawPrintIcon,
  ToiletIcon,
  TreesIcon,
  UtensilsCrossedIcon,
  WifiIcon,
} from "lucide-react";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type TimeSlot = {
  open: string;
  close: string;
};

export type DayHours = {
  closed: boolean;
  slots: TimeSlot[];
};

export type OpeningHours = Record<Weekday, DayHours>;

export const BUSINESS_FACILITIES = [
  "wifi",
  "seating",
  "accessible",
  "restroom",
  "child_friendly",
  "pet_friendly",
  "parking",
  "public_transport",
  "taxi",
  "lodging",
  "coffee",
  "bar",
  "restaurant",
  "gym",
  "outdoor_terrace",
] as const;

export type BusinessFacility = (typeof BUSINESS_FACILITIES)[number];

export const BUSINESS_FACILITY_META: {
  id: BusinessFacility;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "wifi", label: "Wi-Fi", icon: WifiIcon },
  { id: "seating", label: "Seating", icon: ArmchairIcon },
  { id: "accessible", label: "Accessible", icon: AccessibilityIcon },
  { id: "restroom", label: "Restroom", icon: ToiletIcon },
  { id: "child_friendly", label: "Child-friendly", icon: BabyIcon },
  { id: "pet_friendly", label: "Pet-friendly", icon: PawPrintIcon },
  { id: "parking", label: "Parking", icon: CircleParkingIcon },
  { id: "public_transport", label: "Public transport", icon: BusIcon },
  { id: "taxi", label: "Taxi", icon: CarFrontIcon },
  { id: "lodging", label: "Lodging", icon: BedDoubleIcon },
  { id: "coffee", label: "Coffee", icon: CoffeeIcon },
  { id: "bar", label: "Bar", icon: MartiniIcon },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossedIcon },
  { id: "gym", label: "Gym", icon: DumbbellIcon },
  { id: "outdoor_terrace", label: "Outdoor terrace", icon: TreesIcon },
];

export function emptyDayHours(closed = true): DayHours {
  return { closed, slots: [{ open: "09:00", close: "17:00" }] };
}

export function emptyOpeningHours(): OpeningHours {
  return {
    monday: emptyDayHours(false),
    tuesday: emptyDayHours(false),
    wednesday: emptyDayHours(false),
    thursday: emptyDayHours(false),
    friday: emptyDayHours(false),
    saturday: emptyDayHours(true),
    sunday: emptyDayHours(true),
  };
}

export function formatTimeLabel(value: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return value;
  const [hoursRaw, minutes] = value.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minutes} ${period}`;
}

/** JS getDay(): 0 = Sunday … 6 = Saturday */
const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function toMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || m === undefined) return null;
  return h * 60 + m;
}

export function isOpenNow(hours: OpeningHours | null | undefined, now = new Date()): boolean {
  if (!hours) return false;
  const day = WEEKDAY_BY_JS_DAY[now.getDay()];
  if (!day) return false;
  const today = hours[day];
  if (!today || today.closed || today.slots.length === 0) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return today.slots.some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    if (open === null || close === null) return false;
    if (close < open) return current >= open || current <= close;
    return current >= open && current <= close;
  });
}
