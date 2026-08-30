import React from 'react';
import { 
  UtensilsCrossed, 
  Car, 
  Home, 
  ShoppingBag, 
  HeartPulse, 
  Gamepad2, 
  GraduationCap, 
  Shirt, 
  Plane, 
  Briefcase, 
  Coins, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Landmark,
  Smartphone,
  Banknote,
  Wallet,
  Receipt,
  HelpCircle,
  LucideIcon
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  // Categories
  'utensils': UtensilsCrossed,
  'car': Car,
  'home': Home,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'gamepad': Gamepad2,
  'graduation-cap': GraduationCap,
  'shirt': Shirt,
  'plane': Plane,
  'briefcase': Briefcase,
  'coins': Coins,
  'trending-up': TrendingUp,
  'gift': Gift,
  'refresh-cw': RefreshCw,
  'wallet': Wallet,
  'receipt': Receipt,
  // Accounts / Wallets
  'landmark': Landmark,
  'smartphone': Smartphone,
  'banknote': Banknote,
};

// Fallback lookup by common names / keys
export function getCategoryIconComponent(iconKey: string): LucideIcon {
  if (ICON_MAP[iconKey]) return ICON_MAP[iconKey];

  // Map legacy emoji or names to vector icon
  switch (iconKey) {
    case '🍔':
    case 'food':
    case 'makanan':
      return UtensilsCrossed;
    case '🚗':
    case 'transport':
      return Car;
    case '🏠':
    case 'housing':
      return Home;
    case '🛒':
    case 'shopping':
      return ShoppingBag;
    case '💊':
    case 'health':
      return HeartPulse;
    case '🎮':
    case 'entertainment':
      return Gamepad2;
    case '📚':
    case 'education':
      return GraduationCap;
    case '👔':
    case 'fashion':
      return Shirt;
    case '✈️':
    case 'travel':
      return Plane;
    case '💼':
    case 'salary':
      return Briefcase;
    case '💰':
    case 'freelance':
      return Coins;
    case '📈':
    case 'investment':
      return TrendingUp;
    case '🎁':
    case 'gift':
      return Gift;
    case '🏦':
    case 'bank':
      return Landmark;
    case '📱':
    case '🟢':
    case 'ewallet':
      return Smartphone;
    case '💵':
    case 'cash':
      return Banknote;
    default:
      return Receipt;
  }
}

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ name, className = 'w-4 h-4', size }: CategoryIconProps) {
  const IconComponent = getCategoryIconComponent(name);
  return <IconComponent className={className} size={size} />;
}
