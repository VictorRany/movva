import {
  AlertTriangle, ArrowLeft, BadgeCheck, Ban, BarChart3, CalendarCheck, Check, CheckCircle2, ChevronRight, ClipboardList, Clock, Crown, Dumbbell,
  Gift, Hourglass, LineChart, Mail, MapPin, MessageCircle, Pin, PlayCircle, Search, Settings2, Sparkles, Star, Ticket, TrendingDown, TrendingUp,
  User, Users, Utensils, Wallet,
} from "lucide-react";

// Ícones da Movva: um único estilo de traço em todo o produto.
const ICONS = {
  alert: AlertTriangle, back: ArrowLeft, badge: BadgeCheck, ban: Ban, chart: BarChart3, calendar: CalendarCheck, check: Check, done: CheckCircle2,
  chevron: ChevronRight, clipboard: ClipboardList, clock: Clock, crown: Crown, dumbbell: Dumbbell, gift: Gift, wait: Hourglass, line: LineChart,
  mail: Mail, pin: MapPin, chat: MessageCircle, note: Pin, play: PlayCircle, search: Search, auto: Settings2, spark: Sparkles, star: Star,
  ticket: Ticket, down: TrendingDown, up: TrendingUp, user: User, users: Users, food: Utensils, wallet: Wallet,
} as const;
export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  const C = ICONS[name];
  return <C size={size} strokeWidth={2} className={`inline-block shrink-0 align-[-0.15em] ${className}`} aria-hidden />;
}
