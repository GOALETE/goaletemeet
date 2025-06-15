"use strict";
/**
 * Centralized pricing configuration for Goalete subscription plans
 * All pricing information should be managed here and imported where needed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_PRICING = void 0;
exports.toPaise = toPaise;
exports.fromPaise = fromPaise;
exports.formatPrice = formatPrice;
exports.getPlanPricing = getPlanPricing;
exports.PLAN_PRICING = {
    daily: {
        amount: 299, // Price in INR
        display: "Rs. 299", // Formatted display price
        duration: 1, // Duration in days
        name: "Daily Session"
    },
    monthly: {
        amount: 2999, // Price in INR
        display: "Rs. 2999", // Formatted display price
        duration: 30, // Duration in days
        name: "Monthly Plan"
    },
    monthlyFamily: {
        amount: 4499, // Price in INR
        display: "Rs. 4499 (Family, 2 users)", // Formatted display price
        duration: 30, // Duration in days
        name: "Monthly Family Plan"
    }
};
/**
 * Helper functions for pricing operations
 */
/**
 * Convert price to smallest currency unit (paise for INR)
 * @param amount Price in INR
 * @returns Price in paise
 */
function toPaise(amount) {
    return amount * 100;
}
/**
 * Convert price from smallest currency unit (paise) to INR
 * @param paise Price in paise
 * @returns Price in INR
 */
function fromPaise(paise) {
    return Math.round(paise / 100);
}
/**
 * Format price for display with currency symbol
 * @param amount Price in INR
 * @returns Formatted price string
 */
function formatPrice(amount) {
    return "Rs. ".concat(amount.toFixed(0));
}
/**
 * Get the pricing details for a specific plan
 * @param planType The plan type ("daily", "monthly", or "unlimited")
 * @returns Pricing details for the plan
 */
function getPlanPricing(planType) {
    if (planType === 'unlimited') {
        // For unlimited plans, return null or a default pricing
        return null;
    }
    return exports.PLAN_PRICING[planType];
}
