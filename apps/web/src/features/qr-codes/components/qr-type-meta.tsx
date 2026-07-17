import {
  CalendarIcon,
  FileTextIcon,
  LinkIcon,
  Share2Icon,
  TicketPercentIcon,
  UtensilsCrossedIcon,
  UserRoundIcon,
  WifiIcon,
  type LucideIcon,
} from "lucide-react";
import { QR_TYPE_DESCRIPTION, QR_TYPE_LABEL } from "@/lib/qr-codes/content";
import { QR_CODE_TYPES, type QrCodeType } from "@/lib/qr-codes/types";

export const QR_TYPE_ICON: Record<QrCodeType, LucideIcon> = {
  LINK: LinkIcon,
  PDF: FileTextIcon,
  VCARD: UserRoundIcon,
  EVENT: CalendarIcon,
  MENU: UtensilsCrossedIcon,
  WIFI: WifiIcon,
  SOCIAL: Share2Icon,
  COUPON: TicketPercentIcon,
};

export type QrTypeMeta = {
  type: QrCodeType;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const QR_TYPE_META: QrTypeMeta[] = QR_CODE_TYPES.map((type) => ({
  type,
  label: QR_TYPE_LABEL[type],
  description: QR_TYPE_DESCRIPTION[type],
  icon: QR_TYPE_ICON[type],
}));
