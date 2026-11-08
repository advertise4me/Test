import {
  MessageCircle,
  MousePointerClick,
  Package,
  Phone,
  ShoppingBag,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { KpiTile } from "@/lib/kpiConfig";

export const KPI_ICONS: Record<KpiTile["icon"], LucideIcon> = {
  spend: Wallet,
  sales: ShoppingBag,
  orders: Package,
  roas: TrendingUp,
  leads: UserPlus,
  costPerLead: Tag,
  reach: Users,
  conversations: MessageCircle,
  calls: Phone,
  costPerContact: Tag,
  clicks: MousePointerClick,
  costPerClick: Tag,
};
