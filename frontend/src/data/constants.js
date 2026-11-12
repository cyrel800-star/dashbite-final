// Canonical role and workflow values for frontend demo data.
export const ROLES = Object.freeze(["CUSTOMER", "RESTAURANT", "RIDER", "ADMIN"]);

// Order lifecycle and payment/dispatch enums used by future API-backed flows.
export const ORDER_STATUSES = Object.freeze([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "SEARCHING_RIDER",
  "NO_RIDER",
  "PICKED_UP",
  "DELIVERED",
  "CANCELLED",
]);

export const ACCOUNT_STATUSES = Object.freeze(["APPROVED", "PENDING_APPROVAL", "DISABLED"]);

export const PAYMENT_STATUSES = Object.freeze([
  "UNPAID",
  "COLLECTED_BY_RIDER",
  "REMITTED_TO_ADMIN",
  "SETTLED_TO_RESTAURANT",
  "FLAGGED_DISCREPANCY",
]);

export const OFFER_STATUSES = Object.freeze(["BLASTED", "ACCEPTED", "EXPIRED", "CLOSED"]);

export const PAYMENT_METHODS = Object.freeze(["COD", "ONLINE"]);
