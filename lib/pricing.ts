/**
 * Centralized pricing configuration for GoAlete subscription plans
 * All pricing information should be managed here and imported where needed
 */

export const PLAN_PRICING = {
  single: {
    amount: 299,         // Price in INR
    display: "Rs. 299",  // Formatted display price
    duration: 1,         // Duration in days
    name: "Single Session"
  },
  monthly: {
    amount: 2999,        // Price in INR
    display: "Rs. 2999", // Formatted display price
    duration: 30,        // Duration in days
    name: "Monthly Plan"
  }
};

// Types
export type PlanType = "single" | "monthly";
export type PlanPricing = typeof PLAN_PRICING[PlanType];

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
 * @param planType The plan type ("single" or "monthly")
 * @returns Pricing details for the plan
 */
export function getPlanPricing(planType: PlanType): PlanPricing {
  return PLAN_PRICING[planType];
}
