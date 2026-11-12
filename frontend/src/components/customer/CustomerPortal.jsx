import { useEffect, useRef, useState } from "react";
import PortalFrame from "../PortalFrame.jsx";
import { CATEGORIES } from "../../data/sample.js";
import { burger, pizza, noodles, chicken, heroBurger } from "../../data/images.js";
import { Empty, Food, RestaurantCard, Tag, toast } from "../../ui/components.jsx";
import { LOCAL_KEYS, usePersistentState } from "../../lib/localData.js";
import { api, formatError } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";

const RESTAURANT_IMAGES = [burger, pizza, noodles, chicken];
const PAYMENT_LABELS = { cod: "Cash on Delivery", gcash: "GCash (Online)", maya: "Maya (Online)" };
const TERMINAL_ORDER_STATUSES = new Set(["delivered", "completed", "rejected", "cancelled", "no_rider"]);
const ORDER_TIMELINE_STEPS = ["Order received", "Confirmed", "Preparing", "Ready for pickup", "Rider assigned", "On the way", "Delivered"];
const ORDER_STATUS_STEP = {
  pending: 0,
  received: 0,
  accepted: 1,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  searching_rider: 3,
  finding_rider: 3,
  rider_assigned: 4,
  picked_up: 5,
  on_the_way: 5,
  out_for_delivery: 5,
  delivered: 6,
  completed: 6,
};

const normalizeOrderStatus = (status) => String(status || "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
const isTerminalOrder = (order) => TERMINAL_ORDER_STATUSES.has(normalizeOrderStatus(order.status));

function OrderTimeline({ order }) {
  const status = normalizeOrderStatus(order.status);
  const terminalMessage = {
    rejected: "The restaurant rejected this order.",
    cancelled: "This order was cancelled.",
    no_rider: "No rider was available within the town service boundary.",
  }[status];
  const step = ORDER_STATUS_STEP[status];
  const riderName = typeof order.rider === "string" ? order.rider : order.rider?.user?.name || order.rider?.name;
  const isLookingForRider = ["ready", "searching_rider", "finding_rider"].includes(status) && !riderName;

  return (
    <section className="order-status" aria-label={`Order status: ${status.replaceAll("_", " ")}`}>
      <div className="order-status-heading">
        <b>Order status</b>
        <Tag tone={terminalMessage ? "c" : status === "delivered" || status === "completed" ? "a" : "w"}>
          {status.replaceAll("_", " ").toUpperCase()}
        </Tag>
      </div>
      {terminalMessage ? (
        <p className="order-terminal-message">{terminalMessage}</p>
      ) : step === undefined ? (
        <p className="order-terminal-message">Status update unavailable. Please check again later.</p>
      ) : (
        <>
          <ol className="order-timeline">
            {ORDER_TIMELINE_STEPS.map((label, index) => {
              const isComplete = index < step || status === "delivered" || status === "completed";
              const isCurrent = index === step && status !== "delivered" && status !== "completed";
              return (
                <li className={`${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""}`} key={label}>
                  <span className="timeline-marker" aria-hidden="true">{isComplete ? <Icon name="check" size={14} /> : index + 1}</span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
          {isLookingForRider ? (
            <p className="order-status-note">
              Searching for available riders in town (1 km expanding blast). No live GPS tracking in MVP.
            </p>
          ) : riderName ? (
            <p className="order-status-note">Rider: {riderName}. Order status updates are active.</p>
          ) : (
            <p className="order-status-note">Order updates are shown here. Live GPS tracking is not available in MVP.</p>
          )}
        </>
      )}
    </section>
  );
}

function CustomerOrderCard({ order, showTimeline = false }) {
  const createdAt = Date.parse(order.placed_at || order.createdAt || order.created_at);
  const status = normalizeOrderStatus(order.status);
  const restaurantName = typeof order.restaurant === "string"
    ? order.restaurant
    : order.restaurant?.name || "Restaurant";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <article className="customer-order-card">
      <div className="customer-order-heading">
        <div>
          <b>Order #{order.id || order.order_id}</b>
          <small>{restaurantName} · {Number.isNaN(createdAt) ? "Just now" : new Date(createdAt).toLocaleString()}</small>
        </div>
        <Tag tone={["rejected", "cancelled", "no_rider"].includes(status) ? "c" : ["delivered", "completed"].includes(status) ? "a" : "w"}>
          {status.replaceAll("_", " ").toUpperCase()}
        </Tag>
      </div>
      <div className="customer-order-items">
        {items.map((item, index) => (
          <span key={item.id ?? `${item.item_name || item.name}-${index}`}>
            {item.quantity}× {item.item_name || item.name}
          </span>
        ))}
        {!items.length && <small>Order item details unavailable.</small>}
      </div>
      <div className="customer-order-total">
        <span>Total</span>
        <b>₱{Number(order.total || order.total_amount || 0).toFixed(2)}</b>
      </div>
      {showTimeline && <OrderTimeline order={order} />}
      {!showTimeline && (
        <small className="order-history-note">
          {status === "no_rider" ? "No rider available" : `Status: ${status.replaceAll("_", " ").toUpperCase()}`}
        </small>
      )}
    </article>
  );
}

// Customer browsing, order placement, favorites, reviews, and chat connected to real API.
export default function CustomerPortal(props) {
  const [cat, setCat] = useState("All");
  const [favs, setFavs] = usePersistentState(LOCAL_KEYS.favorites, ["Burger House"]);
  const [reviews, setReviews] = usePersistentState(LOCAL_KEYS.reviews, []);
  const [messages, setMessages] = usePersistentState(LOCAL_KEYS.messages, []);

  // Backend state
  const [restaurants, setRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restaurantsError, setRestaurantsError] = useState("");

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersTab, setOrdersTab] = useState("current");

  // Cart & Checkout
  const [cart, setCart] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("123 Rizal St, Downtown");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentReference, setPaymentReference] = useState("");
  const [simulateOutOfBounds, setSimulateOutOfBounds] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // Ratings & Chat
  const [reviewOrder, setReviewOrder] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState("5");
  const [chatText, setChatText] = useState("");
  const [chatOrder, setChatOrder] = useState("");

  // Load real restaurants and customer order history from backend
  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    setRestaurantsError("");
    try {
      const res = await api.getRestaurants();
      const list = (res?.data || []).map((r, i) => ({
        ...r,
        rating: 4.8,
        reviews: "50+",
        eta: "20–35",
        fee: 30,
        cuisine: i % 2 === 0 ? "Burgers" : "Pizza",
        img: RESTAURANT_IMAGES[i % RESTAURANT_IMAGES.length],
      }));
      setRestaurants(list);
    } catch (err) {
      setRestaurantsError(formatError(err));
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const res = await api.getOrders();
      setOrders(res?.data || []);
    } catch (err) {
      setOrdersError(formatError(err));
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // refresh orders periodically
    return () => clearInterval(interval);
  }, []);

  const openRestaurant = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    submittingRef.current = false;
    setCart({});
    setCheckoutOpen(false);
    setCheckoutError("");
    setOrderConfirmation(null);
    setLoadingMenu(true);
    setMenuError("");
    try {
      const res = await api.getMenu(restaurant.id, true);
      const items = (res?.data || []).map((item, idx) => ({
        ...item,
        image: RESTAURANT_IMAGES[idx % RESTAURANT_IMAGES.length],
      }));
      setMenu(items);
    } catch (err) {
      setMenuError(formatError(err));
    } finally {
      setLoadingMenu(false);
    }
  };

  const toggleFav = (name) => {
    setFavs((saved) => (saved.includes(name) ? saved.filter((item) => item !== name) : [...saved, name]));
  };

  const adjustCart = (item, delta) => {
    setCart((current) => {
      const quantity = current[item.id] || 0;
      const nextQuantity = Math.max(0, Math.min(50, quantity + delta));
      return { ...current, [item.id]: nextQuantity };
    });
    setCheckoutError("");
  };

  const submitCheckout = async (event) => {
    event.preventDefault();
    if (submittingRef.current || isSubmitting) return;
    setCheckoutError("");

    const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0);
    if (!selectedRestaurant || !lines.length) {
      setCheckoutError("Your cart is empty. Add a menu item before checkout.");
      return;
    }
    const address = deliveryAddress.trim();
    if (!address || address.length > 500) {
      setCheckoutError("Enter a delivery address (up to 500 characters).");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const itemsPayload = lines.map(([menuItemId, quantity]) => ({
        menu_item_id: Number(menuItemId),
        quantity: Number(quantity),
      }));

      // Coordinates: if simulating out of boundary, send 15.5, 121.5 (outside the 14.55-14.65 box)
      // Otherwise send default town coordinates 14.5995, 120.9842
      const payload = {
        restaurant_id: selectedRestaurant.id,
        items: itemsPayload,
        delivery_address: address,
        payment_method: paymentMethod === "cod" ? "cod" : "online",
        delivery_lat: simulateOutOfBounds ? 15.5000 : 14.5995,
        delivery_lng: simulateOutOfBounds ? 121.5000 : 120.9842,
      };

      const res = await api.createOrder(payload);

      // Order created successfully
      setCart({});
      setCheckoutOpen(false);
      setSimulateOutOfBounds(false);
      setOrderConfirmation(res?.data || res);
      toast(`Order #${res?.order_id || res?.data?.id} placed! Status: ${res?.status || "PENDING"}`);
      loadOrders();
    } catch (err) {
      console.error("Order creation failed", err);
      if (err.code === "OUT_OF_STOCK") {
        setCheckoutError(`OUT_OF_STOCK: ${err.message}`);
      } else if (err.code === "OUT_OF_BOUNDARY") {
        setCheckoutError(`OUT_OF_BOUNDARY: ${err.message}`);
      } else if (err.code === "MISSING_FIELD") {
        setCheckoutError(`MISSING_FIELD: ${err.message}`);
      } else {
        setCheckoutError(formatError(err));
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    const order = orders.find((item) => String(item.id) === String(reviewOrder));
    if (!order || !reviewText.trim()) return;

    try {
      await api.rateOrder(order.id, {
        restaurant_rating: Number(rating),
        rider_rating: Number(rating),
        restaurant_comment: reviewText.trim(),
      });
      setReviews((saved) => [
        ...saved,
        {
          id: `review-${Date.now()}`,
          orderId: order.id,
          restaurant: typeof order.restaurant === "string" ? order.restaurant : order.restaurant?.name,
          author: props.user.name,
          rating: Number(rating),
          text: reviewText.trim(),
          status: "PUBLISHED",
          createdAt: new Date().toISOString(),
        },
      ]);
      setReviewText("");
      setReviewOrder("");
      toast("Review & rating saved to database.");
    } catch (err) {
      toast(`Could not save review: ${formatError(err)}`);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!orders.some((order) => String(order.id) === String(chatOrder)) || !text) return;
    setMessages((saved) => [
      ...saved,
      {
        id: `message-${Date.now()}`,
        orderId: chatOrder,
        sender: "customer",
        name: props.user.name,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setChatText("");
    toast("Message sent to the restaurant.");
  };

  const findRestaurants = (q = "") =>
    restaurants.filter(
      (restaurant) =>
        (cat === "All" || restaurant.cuisine === cat) &&
        `${restaurant.name} ${restaurant.cuisine || ""}`.toLowerCase().includes(q.toLowerCase())
    );

  const currentOrders = orders.filter((order) => !isTerminalOrder(order));
  const historyOrders = orders.filter(isTerminalOrder);
  const completedOrders = orders.filter(
    (order) => ["delivered", "completed"].includes(normalizeOrderStatus(order.status)) && !reviews.some((r) => r.orderId === order.id)
  );

  const cards = (list, onSelect) => (
    <div className="grid4">
      {list.map((r) => (
        <RestaurantCard
          key={r.id || r.name}
          r={r}
          fav={favs.includes(r.name)}
          onFav={toggleFav}
          onViewMenu={() => onSelect(r)}
        />
      ))}
    </div>
  );

  // Restaurant menu and checkout views
  const menuView = (restaurant) => {
    const cartLines = menu
      .filter((item) => (cart[item.id] || 0) > 0)
      .map((item) => ({
        ...item,
        quantity: cart[item.id],
        lineTotal: Number(item.price) * cart[item.id],
      }));
    const subtotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
    const deliveryFee = restaurant?.fee ?? 30;
    const total = subtotal + (cartLines.length ? deliveryFee : 0);

    if (orderConfirmation) {
      return (
        <section className="card checkout-confirmation" role="status">
          <span className="confirmation-icon" aria-hidden="true"><Icon name="check" size={28} /></span>
          <h3>Order Placed Successfully!</h3>
          <p>
            Your order is now in the database with contract status:{" "}
            <b><Tag tone="w">{orderConfirmation.status || "PENDING"}</Tag></b>
          </p>
          <div className="confirmation-summary">
            <b>Order #{orderConfirmation.id || orderConfirmation.order_id}</b>
            <span>Restaurant: {restaurant.name}</span>
            <span>Delivery to: {orderConfirmation.delivery_address}</span>
            <span>Payment: {PAYMENT_LABELS[paymentMethod] || paymentMethod}</span>
            <b>Total: ₱{Number(orderConfirmation.total || total).toFixed(2)}</b>
          </div>
          <div className="row">
            <button
              className="btn gh"
              onClick={() => {
                setOrderConfirmation(null);
                setSelectedRestaurant(null);
              }}
            >
              Back to Restaurants
            </button>
            <button
              className="btn"
              onClick={() => {
                setOrderConfirmation(null);
                setSelectedRestaurant(null);
              }}
            >
              Done
            </button>
          </div>
        </section>
      );
    }

    if (checkoutOpen) {
      return (
        <section className="card checkout-page">
          <div className="row">
            <div>
              <h3>Checkout</h3>
              <small>{restaurant.name} · Review your order before placing it.</small>
            </div>
            <button
              type="button"
              className="btn gh sm"
              onClick={() => {
                setCheckoutOpen(false);
                setCheckoutError("");
              }}
            >
              Back to Menu
            </button>
          </div>

          <form className="checkout-form" onSubmit={submitCheckout} noValidate>
            <div className="checkout-lines">
              <h4>Order summary</h4>
              {cartLines.map((item) => (
                <div className="checkout-line" key={item.id}>
                  <span>
                    {item.quantity}× {item.name}
                    {!item.is_available && (
                      <span style={{ color: "#e53e3e", marginLeft: 6, fontWeight: 700 }}>(Sold Out)</span>
                    )}
                  </span>
                  <b>₱{item.lineTotal.toFixed(2)}</b>
                </div>
              ))}
              <div className="checkout-line">
                <span>Subtotal</span>
                <b>₱{subtotal.toFixed(2)}</b>
              </div>
              <div className="checkout-line">
                <span>Town Delivery Fee</span>
                <b>₱{deliveryFee.toFixed(2)}</b>
              </div>
              <div className="checkout-line checkout-total">
                <span>Total</span>
                <b>₱{total.toFixed(2)}</b>
              </div>
            </div>

            <label>
              Delivery Address
              <textarea
                className="text-input"
                name="delivery_address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                maxLength={500}
                required
                placeholder="Enter complete delivery address"
              />
            </label>

            <fieldset className="payment-options">
              <legend>Payment Method</legend>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <label key={value} className="payment-option">
                  <input
                    type="radio"
                    name="payment_method"
                    value={value}
                    checked={paymentMethod === value}
                    onChange={() => {
                      setPaymentMethod(value);
                      if (value === "cod") setPaymentReference("");
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>

            {paymentMethod !== "cod" && (
              <label>
                Payment Reference
                <input
                  className="text-input"
                  type="text"
                  name="payment_reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  maxLength={100}
                  placeholder="Enter online payment reference (e.g., GC-123456)"
                />
              </label>
            )}

            {/* QA Testing Controls */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                padding: "10px 14px",
                margin: "12px 0",
              }}
            >
              <b style={{ display: "block", fontSize: 13, marginBottom: 4 }}>QA Regression Tools:</b>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={simulateOutOfBounds}
                  onChange={(e) => setSimulateOutOfBounds(e.target.checked)}
                />
                <span>Simulate Out-of-Boundary delivery coordinates (Tests contract <code>OUT_OF_BOUNDARY</code>)</span>
              </label>
            </div>

            {checkoutError && (
              <div
                className="checkout-error"
                role="alert"
                style={{
                  background: "#fff5f5",
                  color: "#c53030",
                  border: "1px solid #feb2b2",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                {checkoutError}
              </div>
            )}

            <button
              className="btn checkout-submit"
              type="submit"
              disabled={isSubmitting || !cartLines.length}
            >
              {isSubmitting ? "Placing Order with Server…" : `Place Order · ₱${total.toFixed(2)}`}
            </button>
          </form>
        </section>
      );
    }

    return (
      <section className="card">
        <div className="row">
          <div>
            <h3>{restaurant.name} Menu</h3>
            <small>Live catalog from backend database. Out-of-stock items are flagged.</small>
          </div>
          <button className="btn gh sm" onClick={() => setSelectedRestaurant(null)}>
            Back to Restaurants
          </button>
        </div>

        {loadingMenu ? (
          <Empty icon="⏳">Loading menu from server...</Empty>
        ) : menuError ? (
          <div className="checkout-error" role="alert">{menuError}</div>
        ) : menu.length ? (
          <div className="mg menu-grid">
            {menu.map((item) => (
              <article className="mi menu-item" key={item.id}>
                <Food src={item.image} alt={item.name} />
                <b>{item.name}</b>
                <span>₱{Number(item.price).toFixed(2)}</span>
                {!item.is_available && (
                  <Tag tone="c">Out of stock</Tag>
                )}
                <div className="cart-quantity">
                  <button
                    type="button"
                    className="btn gh sm"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => adjustCart(item, -1)}
                    disabled={!cart[item.id]}
                  >
                    −
                  </button>
                  <span aria-label={`${cart[item.id] || 0} in cart`}>
                    {cart[item.id] || 0}
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => adjustCart(item, 1)}
                    disabled={(cart[item.id] || 0) >= 50}
                  >
                    +
                  </button>
                </div>
                {!item.is_available && (
                  <button
                    type="button"
                    className="btn gh sm"
                    style={{ marginTop: 6, fontSize: 11 }}
                    onClick={() => adjustCart(item, 1)}
                  >
                    Add to Cart (Test OUT_OF_STOCK)
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty icon="🍽️">There are no menu items for this restaurant.</Empty>
        )}

        {cartLines.length > 0 && (
          <div className="cart-summary">
            <div>
              <b>Your Cart</b>
              <span>
                {cartLines.reduce((count, item) => count + item.quantity, 0)} item(s) · ₱{subtotal.toFixed(2)}
              </span>
            </div>
            <button
              className="btn"
              onClick={() => {
                setCheckoutOpen(true);
                setCheckoutError("");
              }}
            >
              Continue to Checkout
            </button>
          </div>
        )}
      </section>
    );
  };

  // Views mapping
  const screens = {
    dash: ({ q, setView }) => {
      const list = findRestaurants(q);
      return (
        <div className="two">
          <div className="col">
            <div className="ban">
              <div>
                <span className="or">Town-Wide Delivery</span>
                <h2>Your Favorite Food <span className="or">Delivered Fast</span></h2>
                <p>Order from approved local restaurants with simultaneous 1 km ring dispatch.</p>
                <button className="btn" onClick={() => setView("browse")}>Order Now →</button>
              </div>
              <Food src={heroBurger} alt="" />
            </div>

            <div>
              <h3>Food Categories</h3>
              <div className="cats">
                {CATEGORIES.map(([c, icon]) => (
                  <button
                    key={c}
                    className={`cat ${cat === c ? "on" : ""}`}
                    onClick={() => setCat(c)}
                  >
                    <em><Icon name={icon} size={21} /></em>{c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3>Approved Local Restaurants</h3>
              {loadingRestaurants ? (
                <Empty icon="⏳">Loading restaurants from server...</Empty>
              ) : restaurantsError ? (
                <div className="checkout-error" role="alert">{restaurantsError}</div>
              ) : selectedRestaurant ? (
                menuView(selectedRestaurant)
              ) : list.length ? (
                cards(list, openRestaurant)
              ) : (
                <Empty icon="🔎">No restaurants match your search.</Empty>
              )}
            </div>
          </div>

          <div className="col">
            <div className="card">
              <h3>Recent Orders</h3>
              {currentOrders.length ? (
                [...currentOrders].reverse().slice(0, 3).map((order) => (
                  <CustomerOrderCard key={order.id || order.order_id} order={order} />
                ))
              ) : (
                <Empty icon="🛍️">You have no active orders. Placed orders will appear here.</Empty>
              )}
            </div>

            <div className="card">
              <h3>Active Order Tracking</h3>
              {currentOrders.length ? (
                <>
                  <CustomerOrderCard order={currentOrders[0]} showTimeline />
                  <button
                    className="btn ol sm"
                    style={{ marginTop: 12 }}
                    onClick={() => setView("orders")}
                  >
                    View All Orders
                  </button>
                </>
              ) : (
                <p>Active order status appears here after placing an order. (No continuous live GPS in MVP).</p>
              )}
            </div>

            <div className="card">
              <h3>My Favorites</h3>
              <div className="qa">
                {favs.map((name) => {
                  const r = restaurants.find((item) => item.name === name);
                  return (
                    <button key={name} onClick={() => r && openRestaurant(r)}>
                      <Icon name="heart" size={16} /> {name}
                    </button>
                  );
                })}
              </div>
              {!favs.length && <small>No favorites yet. Tap a heart on any restaurant.</small>}
            </div>

            <div className="promo">
              <b>DashBite Town Food Delivery</b>
              <span>Simultaneous Ring Dispatch · ₱0 Platform Commission</span>
            </div>
          </div>
        </div>
      );
    },

    browse: ({ q }) => {
      const list = findRestaurants(q);
      return selectedRestaurant ? (
        menuView(selectedRestaurant)
      ) : loadingRestaurants ? (
        <Empty icon="⏳">Loading restaurants...</Empty>
      ) : list.length ? (
        cards(list, openRestaurant)
      ) : (
        <Empty icon="🔎">No restaurants match your search.</Empty>
      );
    },

    favorites: ({ q }) => {
      const list = findRestaurants(q).filter((restaurant) => favs.includes(restaurant.name));
      return selectedRestaurant ? (
        menuView(selectedRestaurant)
      ) : list.length ? (
        cards(list, openRestaurant)
      ) : (
        <Empty icon="🤍">No favorites match. Tap a heart on a restaurant to save it.</Empty>
      );
    },

    orders: () => {
      const visibleOrders = ordersTab === "current" ? currentOrders : historyOrders;
      return (
        <section className="card customer-orders">
          <div className="row">
            <div>
              <h3>My Orders</h3>
              <p className="orders-subtitle">Real-time database order status updates (live GPS not in MVP).</p>
            </div>
            <button className="btn gh sm" onClick={loadOrders} disabled={loadingOrders}>
              {loadingOrders ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          <div className="customer-order-tabs" role="tablist" aria-label="My order views">
            <button
              type="button"
              role="tab"
              aria-selected={ordersTab === "current"}
              className={ordersTab === "current" ? "on" : ""}
              onClick={() => setOrdersTab("current")}
            >
              Current <span>{currentOrders.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ordersTab === "history"}
              className={ordersTab === "history" ? "on" : ""}
              onClick={() => setOrdersTab("history")}
            >
              History <span>{historyOrders.length}</span>
            </button>
          </div>

          {ordersError && <div className="checkout-error" role="alert">{ordersError}</div>}

          {visibleOrders.length ? (
            <div className="customer-order-list">
              {[...visibleOrders]
                .sort(
                  (a, b) =>
                    Date.parse(b.placed_at || b.createdAt || b.created_at) -
                    Date.parse(a.placed_at || a.createdAt || a.created_at)
                )
                .map((order) => (
                  <CustomerOrderCard
                    key={order.id || order.order_id}
                    order={order}
                    showTimeline={ordersTab === "current"}
                  />
                ))}
            </div>
          ) : (
            <Empty icon={ordersTab === "current" ? "📦" : "🧾"}>
              {ordersTab === "current"
                ? "You have no active orders. Browse restaurants to place an order."
                : "Delivered, cancelled, rejected, and no-rider orders will appear here."}
            </Empty>
          )}
        </section>
      );
    },

    reviews: () => (
      <section className="card">
        <h3>Order Ratings &amp; Reviews</h3>
        <p style={{ fontSize: 13, color: "var(--mu)" }}>
          Per contract REQ-08, ratings are recorded separately for restaurant and rider, and never affect dispatch priority.
        </p>

        {completedOrders.length > 0 && (
          <form className="local-form" onSubmit={submitReview}>
            <label>
              Completed Order
              <select
                className="text-input"
                value={reviewOrder}
                onChange={(e) => setReviewOrder(e.target.value)}
                required
              >
                <option value="">Select a delivered order</option>
                {completedOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    Order #{order.id} · {typeof order.restaurant === "string" ? order.restaurant : order.restaurant?.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Rating
              <select
                className="text-input"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </label>

            <label>
              Your Comments
              <textarea
                className="text-input"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={500}
                required
                placeholder="How was the food and delivery service?"
              />
            </label>
            <button className="btn">Submit Rating to Database</button>
          </form>
        )}

        {reviews
          .filter((review) => review.author === props.user.name)
          .map((review) => (
            <div className="li" key={review.id}>
              <div className="f">
                <b>
                  {review.restaurant} · <span className="rating-stars" aria-label={`${review.rating} stars`}>
                    {Array.from({ length: review.rating }, (_, index) => <Icon key={index} name="star" size={14} />)}
                  </span>
                </b>
                <small>{review.text}</small>
              </div>
              <Tag tone={review.status === "HIDDEN" ? "w" : "a"}>{review.status}</Tag>
            </div>
          ))}

        {!completedOrders.length && !reviews.some((r) => r.author === props.user.name) && (
          <Empty icon="⭐">Ratings unlock after an order has been marked DELIVERED.</Empty>
        )}
      </section>
    ),

    chat: () => (
      <section className="card">
        <h3>Restaurant Chat</h3>
        {orders.length ? (
          <>
            <form className="local-form" onSubmit={sendMessage}>
              <label>
                Order
                <select
                  className="text-input"
                  value={chatOrder}
                  onChange={(e) => setChatOrder(e.target.value)}
                  required
                >
                  <option value="">Select an order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Order #{order.id} · {typeof order.restaurant === "string" ? order.restaurant : order.restaurant?.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Message
                <textarea
                  className="text-input"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  maxLength={500}
                  required
                />
              </label>
              <button className="btn">Send Message</button>
            </form>
            {messages
              .filter((message) => orders.some((order) => String(order.id) === String(message.orderId)))
              .map((message) => (
                <div className="li" key={message.id}>
                  <div className="f">
                    <b>{message.name} · Order #{message.orderId}</b>
                    <small>{message.text}</small>
                  </div>
                  <small>{new Date(message.createdAt).toLocaleString()}</small>
                </div>
              ))}
          </>
        ) : (
          <Empty icon="💬">Place an order to start a conversation with the restaurant.</Empty>
        )}
      </section>
    ),
  };

  return <PortalFrame role="CUSTOMER" {...props} placeholder="Search for food, restaurants…" screens={screens} />;
}
