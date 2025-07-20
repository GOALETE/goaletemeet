/**
 * Centralized pricing configuration for Goalete subscription plans
 * All pricing information should be managed here and imported where needed
 */

export const PLAN_PRICING = {  
  daily: {
    amount: 299,         // Price in INR
    display: "Rs. 299",  // Formatted display price
    duration: 1,         // Duration in days
    name: "Daily Session",
    description: "Experience a transformative daily session that will introduce you to powerful goal-setting techniques. Choose any date that works for you and begin your journey to achieving what matters most in your life."
  },  
  
  monthly: {
    amount: 2499,        // Price in INR
    display: "Rs. 2499", // Formatted display price
    duration: 30,        // Duration in days
    name: "Monthly Plan",
    description: "Maintain momentum with daily access for a full month. This consistent approach delivers superior results, keeping you motivated and accountable every step of your journey. Enjoy significant savings compared to daily sessions."
  },  
  
  comboPlan: {
    amount: 3999,        // Price in INR
    display: "Rs. 3999", // Formatted display price
    duration: 30,        // Duration in days
    name: "Combo Plan",
    description: "Share the journey with someone important in your life! This plan offers full access for two people, with savings over two individual memberships. Perfect for couples, friends, or colleagues who want to achieve goals together."
  }
};

// Types
export type PlanType = "daily" | "monthly" | "comboPlan" | "unlimited";
export type PlanPricing = typeof PLAN_PRICING[Exclude<PlanType, "unlimited">];

// Plan type constants for consistent referencing
export const PLAN_TYPES = {
  DAILY: "daily" as const,
  MONTHLY: "monthly" as const,
  COMBO_PLAN: "comboPlan" as const,
  UNLIMITED: "unlimited" as const,
} as const;

// Plan type keys for dynamic operations
export const PLAN_KEYS = Object.keys(PLAN_PRICING) as (keyof typeof PLAN_PRICING)[];

/**
 * Helper functions for pricing operations
 */

/**
 * Convert price to smallest currency unit (paise for INR)
 * @param amount Price in INR
 * @returns Price in paise
 */
export function toPaise(amount: number): number {
  return amount * 100;
}

/**
 * Convert price from smallest currency unit (paise) to INR
 * @param paise Price in paise
 * @returns Price in INR
 */
export function fromPaise(paise: number): number {
  return Math.round(paise / 100);
}

/**
 * Format price for display with currency symbol
 * @param amount Price in INR
 * @returns Formatted price string
 */
export function formatPrice(amount: number): string {
  return `Rs. ${amount.toFixed(0)}`;
}

/**
 * Get the pricing details for a specific plan
 * @param planType The plan type ("daily", "monthly", or "unlimited")
 * @returns Pricing details for the plan
 */
export function getPlanPricing(planType: PlanType): PlanPricing | null {
  if (planType === 'unlimited') {
    // For unlimited plans, return null or a default pricing
    return null;
  }
  return PLAN_PRICING[planType];
}
