let apiBase = getInitialApiBase();

export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getInitialApiBase() {
  const requestedBase = new URLSearchParams(window.location.search).get("api");
  const savedBase = window.localStorage.getItem("dashbite.apiBase");
  // Default to relative /api which is proxied by Vite or served by web server
  return (requestedBase || savedBase || "/api").trim().replace(/\/+$/, "") || "/api";
}

export function getAuthToken() {
  return window.localStorage.getItem("dashbite.auth_token") || null;
}

export function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem("dashbite.auth_token", token);
  } else {
    window.localStorage.removeItem("dashbite.auth_token");
  }
}

export async function request(path, { method = "GET", body } = {}) {
  const token = getAuthToken();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${normalizedPath}`;

  const headers = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response;
  try {
    response = await window.fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network request failed.";
    throw new ApiError(`Could not reach ${url}. ${reason}`, {
      code: "NETWORK_ERROR",
    });
  }

  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiError("The server returned a response that is not valid JSON.", {
          status: response.status,
          code: "INVALID_RESPONSE",
        });
      }
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new ApiError(data?.message || `Request failed with HTTP ${response.status}.`, {
      status: response.status,
      code: data?.error || (response.status === 401 ? "INVALID_CREDENTIALS" : "HTTP_ERROR"),
      details: data,
    });
  }

  return data;
}

export const api = Object.freeze({
  // Auth
  login(credentials) {
    return request("/auth/login", { method: "POST", body: credentials });
  },
  requestOtp(payload) {
    return request("/auth/otp/request", { method: "POST", body: payload });
  },
  logout() {
    return request("/auth/logout", { method: "POST" });
  },
  me() {
    return request("/auth/me");
  },

  // Catalog
  getRestaurants() {
    return request("/catalog/restaurants");
  },
  getRestaurant(id) {
    return request(`/catalog/restaurants/${id}`);
  },
  getMenu(restaurantId, includeUnavailable = true) {
    return request(`/catalog/restaurants/${restaurantId}/menu${includeUnavailable ? "?include_unavailable=1" : ""}`);
  },

  // Orders
  createOrder(payload) {
    return request("/orders", { method: "POST", body: payload });
  },
  getOrders() {
    return request("/orders");
  },
  getOrder(id) {
    return request(`/orders/${id}`);
  },
  rateOrder(id, payload) {
    return request(`/orders/${id}/rate`, { method: "POST", body: payload });
  },
  fileComplaint(payload) {
    return request("/checkout/complaints", { method: "POST", body: payload });
  },

  // Restaurant
  getRestaurantMenu() {
    return request("/restaurant/menu");
  },
  addMenuItem(payload) {
    return request("/restaurant/menu/items", { method: "POST", body: payload });
  },
  updateMenuItem(id, payload) {
    return request(`/restaurant/menu/items/${id}`, { method: "PUT", body: payload });
  },
  toggleItemAvailability(id) {
    return request(`/restaurant/menu/items/${id}/availability`, { method: "PATCH" });
  },
  deleteMenuItem(id) {
    return request(`/restaurant/menu/items/${id}`, { method: "DELETE" });
  },
  getRestaurantOrders(status) {
    return request(`/restaurant/orders${status ? `?status=${status}` : ""}`);
  },
  acceptOrder(id, prepMinutes) {
    return request(`/restaurant/orders/${id}/accept`, {
      method: "POST",
      body: prepMinutes ? { prep_minutes: prepMinutes } : {},
    });
  },
  rejectOrder(id, reason) {
    return request(`/restaurant/orders/${id}/reject`, { method: "POST", body: { reason } });
  },
  markPreparing(id) {
    return request(`/restaurant/orders/${id}/preparing`, { method: "PATCH" });
  },
  markReady(id) {
    return request(`/restaurant/orders/${id}/ready`, { method: "PATCH" });
  },
  createExternalOrder(payload) {
    return request("/restaurant/orders/external", { method: "POST", body: payload });
  },

  // Rider
  getRiderStatus() {
    return request("/rider/status");
  },
  setRiderAvailability(payload) {
    return request("/rider/availability", { method: "POST", body: payload });
  },
  updateRiderLocation(payload) {
    return request("/rider/location", { method: "PATCH", body: payload });
  },
  getRiderOffers() {
    return request("/rider/offers");
  },
  getRiderDeliveries() {
    return request("/rider/deliveries");
  },
  acceptOffer(payload) {
    return request("/dispatch/accept-offer", { method: "POST", body: payload });
  },
  timeoutRing(orderId) {
    return request(`/dispatch/orders/${orderId}/timeout`, { method: "POST" });
  },
  markPickedUp(orderId) {
    return request(`/rider/orders/${orderId}/pickup`, { method: "PATCH" });
  },
  markDelivered(orderId, cashCollected) {
    return request(`/rider/orders/${orderId}/delivered`, {
      method: "PATCH",
      body: cashCollected !== undefined ? { cash_collected: cashCollected } : {},
    });
  },

  // Admin
  getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  approveUser(id) {
    return request(`/admin/users/${id}/approve`, { method: "POST" });
  },
  toggleUserStatus(id) {
    return request(`/admin/users/${id}/toggle-status`, { method: "POST" });
  },
  getAdminSettings() {
    return request("/admin/settings");
  },
  updateDeliveryFee(fee) {
    return request("/admin/settings/fee", { method: "PATCH", body: { delivery_fee: fee } });
  },
  updateServiceBoundary(boundary) {
    return request("/admin/settings/boundary", { method: "PATCH", body: boundary });
  },
  getAdminPayments() {
    return request("/admin/payments");
  },
  getDiscrepancies() {
    return request("/admin/payments/discrepancies");
  },
  recordRemittance(paymentId, payload) {
    return request(`/admin/payments/${paymentId}/remittance`, { method: "POST", body: payload });
  },
  recordPayout(paymentId, payload) {
    return request(`/admin/payments/${paymentId}/payout`, { method: "POST", body: payload });
  },
  resolveDiscrepancy(paymentId, payload) {
    return request(`/admin/payments/${paymentId}/resolve-discrepancy`, { method: "POST", body: payload });
  },
  getRatings() {
    return request("/admin/ratings");
  },
  getAttendance() {
    return request("/admin/attendance");
  },
  getComplaints() {
    return request("/admin/complaints");
  },
  resolveComplaint(id, notes) {
    return request(`/admin/complaints/${id}/resolve`, { method: "POST", body: { resolution_notes: notes } });
  },
});

export function getApiBaseUrl() {
  return apiBase;
}

export function setApiBaseUrl(value) {
  const base = value.trim().replace(/\/+$/, "");
  const isRelativePath = base.startsWith("/") && !base.startsWith("//");
  if (!base || (!isRelativePath && !/^https?:\/\//i.test(base))) {
    throw new Error("Enter an /api path or an absolute HTTP(S) API URL.");
  }
  if (!isRelativePath) {
    const parsed = new URL(base);
    if (parsed.username || parsed.password) {
      throw new Error("API URLs must not contain embedded credentials.");
    }
  }
  window.localStorage.setItem("dashbite.apiBase", base);
  apiBase = base;
  return apiBase;
}

export function formatError(error) {
  if (!(error instanceof Error)) return "The request failed unexpectedly.";
  if (typeof error.code === "string" && error.code !== "API_ERROR" && error.code !== "NETWORK_ERROR") {
    return `${error.code}: ${error.message}`;
  }
  return error.message;
}
