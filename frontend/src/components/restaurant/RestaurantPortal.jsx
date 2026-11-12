import { useEffect, useState } from "react";
import PortalFrame from "../PortalFrame.jsx";
import ImageAdjuster from "../ImageAdjuster.jsx";
import { heroBurger, burger, pizza, noodles, chicken } from "../../data/images.js";
import { Chart, Empty, Food, StatCard, Tag, toast } from "../../ui/components.jsx";
import { readLocalImage, usePersistentState } from "../../lib/localData.js";
import { api, formatError } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";

const RESTAURANT_IMAGES = [burger, pizza, noodles, chicken];

const ORDER_STEPS = {
  PENDING: ["Pending", "w", "Accept Order"],
  ACCEPTED: ["Accepted", "a", "Start Preparing"],
  PREPARING: ["Preparing", "b", "Mark Ready"],
  READY: ["Ready for pickup", "w", "Waiting for rider"],
  SEARCHING_RIDER: ["Searching for rider", "w", "Dispatching"],
  RIDER_ASSIGNED: ["Rider assigned", "c", "Pickup pending"],
  PICKED_UP: ["Picked up", "c", "Delivery in progress"],
  ON_THE_WAY: ["On the way", "c", "Delivery in progress"],
  DELIVERED: ["Delivered", "a", "Completed"],
  REJECTED: ["Rejected", "c", "Rejected"],
  CANCELLED: ["Cancelled", "c", "Cancelled"],
  NO_RIDER: ["No rider found", "c", "Expired"],
};

const PREPARATION_TIMES = [10, 15, 20, 25, 30, 45, 60];
const ACTIVE_ORDER_STATUSES = ["ACCEPTED", "PREPARING", "READY", "SEARCHING_RIDER"];
const HISTORY_ORDER_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "REJECTED", "CANCELLED", "NO_RIDER"];

// Restaurant portal connected directly to backend API
export default function RestaurantPortal(props) {
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderView, setOrderView] = useState("incoming");
  const [prepTimes, setPrepTimes] = useState({});

  // Restaurant detail modal state: review all order line items before accepting a customer order.
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Menu editor modal
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", category: "Burgers", image: "", available: true });
  const [formError, setFormError] = useState("");
  const [imageDraft, setImageDraft] = useState("");

  // External order modal (Phone / Walk-in / Message)
  const [externalOrderModal, setExternalOrderModal] = useState(false);
  const [externalForm, setExternalForm] = useState({
    source: "phone",
    external_customer_name: "",
    external_customer_phone: "",
    delivery_address: "",
    payment_method: "cod",
    selected_item_id: "",
    quantity: 1,
  });
  const [externalError, setExternalError] = useState("");
  const [submittingExternal, setSubmittingExternal] = useState(false);

  // Reviews and chat
  const [reviews] = usePersistentState("dashbite.restaurant.reviews", []);
  const [messages, setMessages] = usePersistentState("dashbite.restaurant.messages", []);
  const [replyOrder, setReplyOrder] = useState("");
  const [replyText, setReplyText] = useState("");

  // Load menu and orders from backend
  const loadMenu = async () => {
    setLoadingMenu(true);
    try {
      const res = await api.getRestaurantMenu();
      const items = (res?.data || []).map((item, idx) => ({
        ...item,
        available: item.is_available,
        image: RESTAURANT_IMAGES[idx % RESTAURANT_IMAGES.length],
      }));
      setMenu(items);
    } catch (err) {
      console.error("Could not load restaurant menu", err);
    } finally {
      setLoadingMenu(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.getRestaurantOrders();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);
      setOrderError("");
    } catch (err) {
      setOrderError(formatError(err));
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadMenu();
    loadOrders();
    const interval = setInterval(loadOrders, 8000); // Poll for new orders
    return () => clearInterval(interval);
  }, []);

  // Menu item actions
  const startAdd = () => {
    setForm({ name: "", price: "", category: "Burgers", image: "", available: true });
    setFormError("");
    setEditor("new");
  };

  const startEdit = (item) => {
    setForm({ ...item, price: String(item.price) });
    setFormError("");
    setEditor(item.id);
  };

  const saveItem = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) return setFormError("Enter a food item name.");
    if (!Number.isFinite(price) || price <= 0) return setFormError("Enter a valid price greater than zero.");

    try {
      if (editor === "new") {
        await api.addMenuItem({
          name,
          price,
          description: form.category,
          is_available: true,
        });
        toast("Food item created in database.");
      } else {
        await api.updateMenuItem(editor, {
          name,
          price,
          description: form.category,
        });
        toast("Food item updated in database.");
      }
      setEditor(null);
      loadMenu();
    } catch (err) {
      setFormError(formatError(err));
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.toggleItemAvailability(item.id);
      toast(`Item '${item.name}' availability updated.`);
      loadMenu();
    } catch (err) {
      toast(`Could not update availability: ${formatError(err)}`);
    }
  };

  const removeItem = async (id) => {
    if (window.confirm("Remove this food item from your menu?")) {
      try {
        await api.deleteMenuItem(id);
        toast("Food item removed.");
        loadMenu();
      } catch (err) {
        toast(`Could not delete item: ${formatError(err)}`);
      }
    }
  };

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await readLocalImage(file);
      setImageDraft(image);
      setFormError("");
    } catch (error) {
      setFormError(error.message);
    } finally {
      event.target.value = "";
    }
  };

  // Order lifecycle actions
  const acceptOrder = async (order) => {
    const prepMinutes = prepTimes[order.id] ?? 25;
    try {
      await api.acceptOrder(order.id, prepMinutes);
      toast(`Order #${order.id} accepted. Estimated preparation time: ${prepMinutes} mins.`);
      loadOrders();
    } catch (err) {
      setOrderError(`Failed to accept order: ${formatError(err)}`);
    }
  };

  const rejectOrder = async (order) => {
    const reason = window.prompt("Reason for rejecting order:", "Kitchen busy / out of ingredients");
    if (!reason) return;
    try {
      await api.rejectOrder(order.id, reason);
      toast(`Order #${order.id} rejected.`);
      loadOrders();
    } catch (err) {
      setOrderError(`Failed to reject order: ${formatError(err)}`);
    }
  };

  const startPreparing = async (order) => {
    try {
      await api.markPreparing(order.id);
      toast(`Order #${order.id} marked as PREPARING.`);
      loadOrders();
    } catch (err) {
      setOrderError(`Failed to mark preparing: ${formatError(err)}`);
    }
  };

  const markReady = async (order) => {
    try {
      await api.markReady(order.id);
      toast(`Order #${order.id} marked READY! Rider dispatch blast started (SEARCHING_RIDER).`);
      loadOrders();
    } catch (err) {
      setOrderError(`Failed to mark ready: ${formatError(err)}`);
    }
  };

  const submitExternalOrder = async (e) => {
    e.preventDefault();
    setExternalError("");
    if (!externalForm.external_customer_name.trim()) return setExternalError("Enter customer name.");
    if (!externalForm.external_customer_phone.trim()) return setExternalError("Enter customer phone number.");
    if (!externalForm.delivery_address.trim()) return setExternalError("Enter delivery address.");
    if (!externalForm.selected_item_id) return setExternalError("Select a menu item.");

    setSubmittingExternal(true);
    try {
      await api.createExternalOrder({
        source: externalForm.source,
        external_customer_name: externalForm.external_customer_name.trim(),
        external_customer_phone: externalForm.external_customer_phone.trim(),
        delivery_address: externalForm.delivery_address.trim(),
        payment_method: externalForm.payment_method,
        items: [
          {
            menu_item_id: Number(externalForm.selected_item_id),
            quantity: Number(externalForm.quantity) || 1,
          },
        ],
      });
      toast("External phone/walk-in order entered successfully!");
      setExternalOrderModal(false);
      setExternalForm({
        source: "phone",
        external_customer_name: "",
        external_customer_phone: "",
        delivery_address: "",
        payment_method: "cod",
        selected_item_id: "",
        quantity: 1,
      });
      loadOrders();
    } catch (err) {
      setExternalError(formatError(err));
    } finally {
      setSubmittingExternal(false);
    }
  };

  const sendReply = (event) => {
    event.preventDefault();
    const text = replyText.trim();
    if (!replyOrder || !text) return;
    setMessages((saved) => [
      ...saved,
      {
        id: `message-${Date.now()}`,
        orderId: replyOrder,
        sender: "restaurant",
        name: props.user.name || "Restaurant",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setReplyText("");
    toast("Reply saved.");
  };

  const sortedOrders = [...orders].sort(
    (a, b) => Date.parse(b.placed_at || b.created_at) - Date.parse(a.placed_at || a.created_at)
  );

  // Screens
  const screens = {
    dash: ({ setView }) => (
      <div className="two">
        <div className="col">
          <div className="ban">
            <div>
              <span className="pill">Restaurant Portal</span>
              <h2>{props.user.name || "Restaurant"}</h2>
              <p>Manage incoming customer orders, kitchen prep, and live menu inventory.</p>
              <button className="btn" onClick={() => setView("orders")}>Manage Orders →</button>
            </div>
            <Food src={heroBurger} />
          </div>

          <div className="stats">
            <StatCard icon="🛍️" label="Total Orders" value={String(orders.length)} delta="Database orders" />
            <StatCard icon="🍽️" label="Menu Items" value={String(menu.length)} delta="Live items" />
            <StatCard
              icon="⏳"
              label="Action Required"
              value={String(
                orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING"].includes((o.status || "").toUpperCase())).length
              )}
              delta="Active orders"
            />
          </div>

          <div className="card">
            <div className="row">
              <h3>Live Menu Inventory</h3>
              <button className="or text-button" onClick={() => setView("menu")}>View All →</button>
            </div>
            <div className="mg">
              {menu.slice(0, 4).map((item) => (
                <div className="mi" key={item.id}>
                  <Food src={item.image} alt={item.name} />
                  <b>{item.name}</b>
                  ₱{Number(item.price).toFixed(2)}
                  <small className={`dot ${item.available ? "" : "off"}`}>
                    ● {item.available ? "Available" : "Sold Out"}
                  </small>
                  <span>
                    <button className="btn gh sm" onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`}><Icon name="edit" size={16} /></button>
                    <button className="btn gh sm" onClick={() => toggleAvailability(item)}>
                      {item.available ? "Pause" : "Enable"}
                    </button>
                  </span>
                </div>
              ))}
              <button className="card add-item" onClick={startAdd}><Icon name="plus" size={24} /><br />Add Item</button>
            </div>
          </div>

          <div className="card">
            <div className="row">
              <h3>Weekly Summary</h3>
              <Tag tone="w">Real-time DB</Tag>
            </div>
            <Chart points={[35, 60, 80, 75, 100, 132, 105]} />
            <div className="steps">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
          </div>
        </div>

        <div className="col">
          <section className="card">
            <div className="row">
              <div>
                <h3>Incoming Orders</h3>
                <small>Auto-polling every 8 seconds</small>
              </div>
              <button className="btn gh sm" onClick={loadOrders} disabled={loadingOrders}>
                {loadingOrders ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
            {sortedOrders
              .filter((order) => (order.status || "").toUpperCase() === "PENDING")
              .slice(0, 4)
              .map((order) => (
                <OrderSummary key={order.id} order={order} onViewDetails={() => setSelectedOrder(order)} />
              ))}
            {!sortedOrders.some((order) => (order.status || "").toUpperCase() === "PENDING") && (
              <Empty icon="🛍️">No incoming pending orders. Placed orders will appear here.</Empty>
            )}
          </section>

          <div className="card">
            <div className="row">
              <div>
                <h3>External Orders</h3>
                <small>Phone, walk-in, or messaging orders</small>
              </div>
              <button className="btn sm" onClick={() => setExternalOrderModal(true)}>+ New External Order</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--mu)", marginTop: 8 }}>
              External orders are tracked under the same lifecycle (REQ-04) and follow identical kitchen and dispatch rules.
            </p>
          </div>

          <div className="card">
            <h3>Restaurant Info</h3>
            <b>{props.user.name || "Restaurant"}</b> <Tag tone="a">APPROVED</Tag>
            <p>
              <Icon name="mapPin" size={15} /> Manila Service Boundary Area<br />
              <Icon name="motorcycle" size={15} /> Dispatch: 1 km Ring Blasts upon READY status<br />
              <Icon name="coins" size={15} /> Commission: ₱0.00 (100% payout to restaurant)
            </p>
          </div>
        </div>
      </div>
    ),

    menu: ({ q }) => {
      const filteredMenu = menu.filter((item) =>
        `${item.name} ${item.description || ""}`.toLowerCase().includes(q.toLowerCase())
      );
      return (
        <section className="col">
          <div className="card">
            <div className="row">
              <div>
                <h3>Menu Inventory Management</h3>
                <small>Live database records. Toggling an item availability updates the Customer PWA immediately.</small>
              </div>
              <button className="btn" onClick={startAdd}>＋ Add Menu Item</button>
            </div>
            {loadingMenu ? (
              <Empty icon="⏳">Loading menu from server...</Empty>
            ) : filteredMenu.length ? (
              <div className="mg menu-grid">
                {filteredMenu.map((item) => (
                  <article className="mi menu-item" key={item.id}>
                    <Food src={item.image} alt={item.name} />
                    <b>{item.name}</b>
                    <span>₱{Number(item.price).toFixed(2)}</span>
                    <small className={`dot ${item.available ? "" : "off"}`}>
                      ● {item.available ? "Available" : "Unavailable (Sold Out)"}
                    </small>
                    <div className="row" style={{ marginTop: 8, gap: 4 }}>
                      <button className="btn gh sm" onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn gh sm" onClick={() => toggleAvailability(item)}>
                        {item.available ? "Pause" : "Enable"}
                      </button>
                      <button className="btn gh sm" onClick={() => removeItem(item.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty icon="🍽️">No food items match your search. Add a new item or change your search.</Empty>
            )}
          </div>
        </section>
      );
    },

    orders: () => (
      <RestaurantOrders
        orders={sortedOrders}
        view={orderView}
        setView={setOrderView}
        error={orderError}
        loading={loadingOrders}
        onRefresh={loadOrders}
        prepTimes={prepTimes}
        setPrepTimes={setPrepTimes}
        onAccept={acceptOrder}
        onReject={rejectOrder}
        onStartPreparing={startPreparing}
        onReady={markReady}
      />
    ),

    hours: () => <HoursPanel />,

    analytics: () => (
      <div className="card">
        <h3>Restaurant Analytics</h3>
        <p>Live transaction data from database.</p>
        <div className="stats">
          <StatCard icon="🛍️" label="Total Orders" value={String(orders.length)} />
          <StatCard
            icon="₱"
            label="Gross Sales"
            value={`₱${orders
              .filter((o) => (o.status || "").toUpperCase() === "DELIVERED")
              .reduce((sum, o) => sum + Number(o.subtotal || o.total || 0), 0)
              .toFixed(2)}`}
          />
          <StatCard icon="🍽️" label="Active Menu Items" value={String(menu.filter((m) => m.available).length)} />
        </div>
        <Chart points={orders.length ? orders.slice(-7).map((o) => Number(o.total || 0)) : [0, 20, 10, 30, 20, 40, 35]} />
      </div>
    ),

    reviews: () => (
      <section className="card">
        <h3>Customer Reviews &amp; Ratings</h3>
        <p style={{ fontSize: 13, color: "var(--mu)" }}>
          Per REQ-08, customer ratings for food quality are recorded separately from rider delivery ratings.
        </p>
        {reviews.length ? (
          reviews.map((review) => (
            <div className="li" key={review.id}>
              <div className="f">
                <b>{review.author} · <span className="rating-stars" aria-label={`${review.rating} stars`}>
                  {Array.from({ length: review.rating }, (_, index) => <Icon key={index} name="star" size={14} />)}
                </span></b>
                <small>{review.text}</small>
                <small>Order #{review.orderId}</small>
              </div>
              <small>{new Date(review.createdAt).toLocaleDateString()}</small>
            </div>
          ))
        ) : (
          <Empty icon="⭐">Customer reviews appear here after delivered orders are rated.</Empty>
        )}
      </section>
    ),

    chat: () => (
      <section className="card">
        <h3>Customer Chat</h3>
        {orders.length ? (
          <>
            <form className="local-form" onSubmit={sendReply}>
              <label>
                Order
                <select
                  className="text-input"
                  value={replyOrder}
                  onChange={(e) => setReplyOrder(e.target.value)}
                  required
                >
                  <option value="">Select an order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Order #{order.id} · {order.customer?.name || "Customer"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reply
                <textarea
                  className="text-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={500}
                  required
                />
              </label>
              <button className="btn">Send Reply</button>
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
          <Empty icon="💬">Customer messages about your orders will appear here.</Empty>
        )}
      </section>
    ),
  };

  return (
    <>
      <PortalFrame role="RESTAURANT" {...props} placeholder="Search orders, menu items…" screens={screens} />

      {/* Menu Item Editor Modal */}
      {editor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setEditor(null)}
        >
          <form className="card item-editor" onSubmit={saveItem}>
            <div className="row">
              <h3>{editor === "new" ? "Add Menu Item" : "Edit Menu Item"}</h3>
              <button type="button" className="ib" onClick={() => setEditor(null)} aria-label="Close">×</button>
            </div>
            <label>
              Food Name
              <input
                className="text-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={70}
                required
              />
            </label>
            <label>
              Price (₱)
              <input
                className="text-input"
                type="number"
                min="1"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </label>
            <label>
              Category
              <select
                className="text-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {["Burgers", "Pizza", "Noodles", "Chicken", "Dessert", "Drinks", "Other"].map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="upload-field">
              Food Image
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
            </label>
            {form.image && <Food src={form.image} alt="Selected food preview" className="upload-preview" />}
            {formError && <div className="msg" role="alert">{formError}</div>}
            <button className="btn" type="submit">Save Menu Item to Database</button>
          </form>
        </div>
      )}

      {/* Order details modal: show the full item list and customer information before restaurant action. */}
      {selectedOrder && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
        >
          <div className="card item-editor" style={{ maxWidth: 560 }}>
            <div className="row">
              <div>
                <h3>Order #{selectedOrder.id} Details</h3>
                <small>
                  {selectedOrder.customer?.name || selectedOrder.external_customer_name || "Customer"} · {selectedOrder.delivery_address || "No address provided"}
                </small>
              </div>
              <button type="button" className="ib" onClick={() => setSelectedOrder(null)} aria-label="Close">×</button>
            </div>

            <div className="order-items" style={{ marginTop: 16 }}>
              {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).length ? (
                (Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item) => (
                  <div key={item.id || `${item.item_name || item.name}-${item.quantity}`} className="li" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span>
                      {item.quantity}× {item.item_name || item.name}
                    </span>
                    <strong>₱{Number(item.line_total || item.unit_price * item.quantity || 0).toFixed(2)}</strong>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "var(--mu)" }}>No items recorded for this order.</p>
              )}
            </div>

            <div className="order-total" style={{ marginTop: 18 }}>
              <span>Total</span>
              <b>₱{Number(selectedOrder.total || 0).toFixed(2)}</b>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div className="li"><span>Status</span><strong>{selectedOrder.status || "PENDING"}</strong></div>
              <div className="li"><span>Customer</span><strong>{selectedOrder.customer?.name || selectedOrder.external_customer_name || "Customer"}</strong></div>
              {selectedOrder.delivery_address && (
                <div className="li"><span>Address</span><strong>{selectedOrder.delivery_address}</strong></div>
              )}
              {selectedOrder.customer?.phone && (
                <div className="li"><span>Phone</span><strong>{selectedOrder.customer.phone}</strong></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* External Order Modal (REQ-04) */}
      {externalOrderModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setExternalOrderModal(false)}
        >
          <form className="card item-editor" onSubmit={submitExternalOrder}>
            <div className="row">
              <div>
                <h3>Create External Order</h3>
                <small>Enter phone, messaging, or walk-in orders into the system</small>
              </div>
              <button type="button" className="ib" onClick={() => setExternalOrderModal(false)} aria-label="Close">×</button>
            </div>

            <label>
              Order Source
              <select
                className="text-input"
                value={externalForm.source}
                onChange={(e) => setExternalForm({ ...externalForm, source: e.target.value })}
              >
                <option value="phone">Phone Call</option>
                <option value="message">Messaging (FB / SMS / Viber)</option>
                <option value="walk_in">Walk-in Customer</option>
              </select>
            </label>

            <label>
              Customer Full Name
              <input
                className="text-input"
                value={externalForm.external_customer_name}
                onChange={(e) => setExternalForm({ ...externalForm, external_customer_name: e.target.value })}
                required
              />
            </label>

            <label>
              Customer Phone Number
              <input
                className="text-input"
                value={externalForm.external_customer_phone}
                onChange={(e) => setExternalForm({ ...externalForm, external_customer_phone: e.target.value })}
                required
              />
            </label>

            <label>
              Delivery Address
              <textarea
                className="text-input"
                value={externalForm.delivery_address}
                onChange={(e) => setExternalForm({ ...externalForm, delivery_address: e.target.value })}
                required
              />
            </label>

            <label>
              Menu Item
              <select
                className="text-input"
                value={externalForm.selected_item_id}
                onChange={(e) => setExternalForm({ ...externalForm, selected_item_id: e.target.value })}
                required
              >
                <option value="">Select menu item</option>
                {menu
                  .filter((m) => m.available)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} - ₱{Number(m.price).toFixed(2)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Quantity
              <input
                className="text-input"
                type="number"
                min="1"
                max="50"
                value={externalForm.quantity}
                onChange={(e) => setExternalForm({ ...externalForm, quantity: e.target.value })}
                required
              />
            </label>

            <label>
              Payment Method
              <select
                className="text-input"
                value={externalForm.payment_method}
                onChange={(e) => setExternalForm({ ...externalForm, payment_method: e.target.value })}
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="online">Online / Paid upfront</option>
              </select>
            </label>

            {externalError && <div className="msg" role="alert">{externalError}</div>}
            <button className="btn" type="submit" disabled={submittingExternal}>
              {submittingExternal ? "Saving..." : "Create Order in Database"}
            </button>
          </form>
        </div>
      )}

      {imageDraft && (
        <ImageAdjuster
          src={imageDraft}
          aspect={4 / 3}
          title="food image"
          onCancel={() => setImageDraft("")}
          onSave={(image) => {
            setForm((current) => ({ ...current, image }));
            setImageDraft("");
          }}
          onError={setFormError}
        />
      )}
    </>
  );
}

// Summary card for incoming orders: exposes the new detail action next to the status badge.
function OrderSummary({ order, onViewDetails }) {
  const status = (order.status || "").toUpperCase();
  const [label, tone] = ORDER_STEPS[status] || [status, "w"];
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <div className="li">
      <div className="f">
        <b>Order #{order.id}</b>
        <small>{items.map((item) => `${item.quantity}× ${item.item_name || item.name}`).join(", ")}</small>
        <small>₱{Number(order.total || 0).toFixed(2)} · {order.customer?.name || order.external_customer_name || "Customer"}</small>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="btn gh sm" type="button" onClick={onViewDetails}>View Details</button>
        <Tag tone={tone}>{label}</Tag>
      </div>
    </div>
  );
}

function RestaurantOrders({
  orders,
  view,
  setView,
  error,
  loading,
  onRefresh,
  prepTimes,
  setPrepTimes,
  onAccept,
  onReject,
  onStartPreparing,
  onReady,
}) {
  const incoming = orders.filter((o) => (o.status || "").toUpperCase() === "PENDING");
  const active = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes((o.status || "").toUpperCase()));
  const history = orders.filter((o) => HISTORY_ORDER_STATUSES.includes((o.status || "").toUpperCase()));
  const currentOrders = { incoming, active, history }[view] || incoming;
  const counts = { incoming: incoming.length, active: active.length, history: history.length };
  const emptyMessages = {
    incoming: "No incoming pending orders. Placed customer orders will appear here.",
    active: "No active orders being prepared or waiting for rider pickup.",
    history: "No completed, rejected, or expired orders yet.",
  };

  const preparationControl = (order) => (
    <div className="prep-time">
      <label htmlFor={`prep-time-${order.id}`}>Preparation Time</label>
      <select
        id={`prep-time-${order.id}`}
        className="text-input"
        value={prepTimes[order.id] ?? 25}
        onChange={(e) => setPrepTimes({ ...prepTimes, [order.id]: Number(e.target.value) })}
      >
        {PREPARATION_TIMES.map((minutes) => (
          <option value={minutes} key={minutes}>
            {minutes} minutes
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="card restaurant-orders">
      <div className="row">
        <div>
          <h3>Restaurant Orders Queue</h3>
          <small>Connected to backend API. Status changes update dispatch and customer views.</small>
        </div>
        <button className="btn gh sm" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "↻ Refresh Orders"}
        </button>
      </div>

      <div className="order-view-tabs" role="tablist" aria-label="Order views">
        {[
          ["incoming", "Incoming (Decision Required)"],
          ["active", "Active (Kitchen / Dispatch)"],
          ["history", "History"],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            className={view === key ? "on" : ""}
            onClick={() => setView(key)}
          >
            {label} <span>{counts[key]}</span>
          </button>
        ))}
      </div>

      {error && <div className="order-error" role="alert">{error}</div>}

      {currentOrders.length ? (
        <div className="restaurant-order-list">
          {currentOrders.map((order) => {
            const status = (order.status || "").toUpperCase();
            const [label, tone] = ORDER_STEPS[status] || [status, "w"];
            const createdAt = Date.parse(order.placed_at || order.created_at);
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <article className="restaurant-order" key={order.id}>
                <div className="row order-heading">
                  <div>
                    <h4>Order #{order.id}</h4>
                    <small>
                      {order.customer?.name || order.external_customer_name || "Customer"} ·{" "}
                      {Number.isNaN(createdAt) ? "Time unavailable" : new Date(createdAt).toLocaleString()}
                    </small>
                    {order.delivery_address && (
                      <div style={{ fontSize: 12, color: "var(--mu)", marginTop: 2 }}>
                        <Icon name="mapPin" size={14} /> {order.delivery_address}
                      </div>
                    )}
                  </div>
                  <Tag tone={tone}>{label}</Tag>
                </div>

                <ul className="order-items">
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.item_name || item.name}{" "}
                      <span>₱{Number(item.line_total || item.unit_price * item.quantity || 0).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="order-total">
                  <span>Total (incl. ₱30 delivery fee)</span>
                  <b>₱{Number(order.total || 0).toFixed(2)}</b>
                </div>

                {status === "PENDING" && (
                  <div className="order-actions">
                    {preparationControl(order)}
                    <div className="order-action-buttons">
                      <button className="btn gh sm" type="button" onClick={() => setSelectedOrder(order)}>
                        View Details
                      </button>
                      <button className="btn gh sm" onClick={() => onReject(order)}>
                        Reject
                      </button>
                      <button className="btn sm" onClick={() => onAccept(order)}>
                        Accept Order
                      </button>
                    </div>
                  </div>
                )}

                {status === "ACCEPTED" && (
                  <div className="order-actions">
                    <span>Order accepted. Ready for kitchen preparation.</span>
                    <button className="btn sm" onClick={() => onStartPreparing(order)}>
                      Start Preparing →
                    </button>
                  </div>
                )}

                {status === "PREPARING" && (
                  <div className="order-actions">
                    <span>Order is currently being cooked/prepared in the kitchen.</span>
                    <button
                      className="btn sm"
                      style={{ background: "#2b6cb0", borderColor: "#2b6cb0" }}
                      onClick={() => onReady(order)}
                    >
                      Mark READY &amp; Blast Riders →
                    </button>
                  </div>
                )}

                {(status === "READY" || status === "SEARCHING_RIDER") && (
                  <p className="order-ready-note" style={{ color: "#2b6cb0", fontWeight: 600 }}>
                    <Icon name="check" size={16} /> Order marked READY! 1 km simultaneous blast active (SEARCHING_RIDER). Waiting for rider acceptance.
                  </p>
                )}

                {status === "RIDER_ASSIGNED" && (
                  <p className="order-ready-note">
                    Rider assigned to order. Rider is heading to restaurant for pickup.
                  </p>
                )}

                {status === "PICKED_UP" && (
                  <p className="order-ready-note">
                    Order picked up by rider. En route to customer.
                  </p>
                )}

                {status === "REJECTED" && (
                  <p className="order-ready-note" style={{ color: "#c53030" }}>
                    Rejected by restaurant.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <Empty icon={view === "incoming" ? "🛍️" : view === "active" ? "🍳" : "📋"}>
          {emptyMessages[view]}
        </Empty>
      )}
    </section>
  );
}

function HoursPanel() {
  const [hours, setHours] = usePersistentState("dashbite.restaurant.hours", {
    opening: "09:00",
    closing: "23:00",
    open: true,
  });

  return (
    <section className="card">
      <h3>Operating Hours</h3>
      <p>Set the hours customers can order from your restaurant.</p>
      <div className="hours-form">
        <label>
          Opening Time
          <input
            className="text-input"
            type="time"
            value={hours.opening}
            onChange={(e) => setHours({ ...hours, opening: e.target.value })}
          />
        </label>
        <label>
          Closing Time
          <input
            className="text-input"
            type="time"
            value={hours.closing}
            onChange={(e) => setHours({ ...hours, closing: e.target.value })}
          />
        </label>
        <label className="li">
          <span className="f">Accepting Orders</span>
          <button
            className={`sw ${hours.open ? "on" : ""}`}
            role="switch"
            aria-checked={hours.open}
            aria-label="Accepting orders"
            onClick={() => setHours({ ...hours, open: !hours.open })}
          />
        </label>
      </div>
      <p className="msg ok">Operating hours configured.</p>
    </section>
  );
}
