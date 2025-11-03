// Stripe client-side utilities
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Plan configurations
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfekt för ett barn',
    price: 79,
    yearlyPrice: 790,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
    features: [
      '1 barn',
      'Alla läraktiviteter',
      'AI-lärare Sinus',
      'Bokstäver & Matematik',
      'Utforska ämnen',
      'Grundläggande rapporter',
    ],
    maxProfiles: 1,
  },
  family: {
    id: 'family',
    name: 'Familj',
    description: 'Mest populär för familjer',
    price: 149,
    yearlyPrice: 1490,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY,
    popular: true,
    features: [
      'Upp till 5 barn',
      'Allt i Starter',
      'Detaljerade framstegsrapporter',
      'Veckovisa e-postrapporter',
      'Aktivitetshistorik',
      'Prioriterad support',
    ],
    maxProfiles: 5,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'För större familjer och förskolor',
    price: 249,
    yearlyPrice: 2490,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY,
    features: [
      'Obegränsat antal barn',
      'Allt i Familj',
      'Avancerad AI-personalisering',
      'Anpassade lärplaner',
      'Tidig åtkomst till nya funktioner',
      'Personlig onboarding',
      'Dedikerad support',
    ],
    maxProfiles: 999,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanById(planId: string): typeof PLANS[PlanId] | null {
  return PLANS[planId as PlanId] || null;
}

export function formatPrice(price: number): string {
  return `${price} SEK`;
}

export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const monthlyCost = monthlyPrice * 12;
  const savings = monthlyCost - yearlyPrice;
  const percentage = Math.round((savings / monthlyCost) * 100);
  return percentage;
}





