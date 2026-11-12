import { useEffect, useRef, useState } from "react";
import PortalFrame from "../PortalFrame.jsx";
import { heroRider } from "../../data/images.js";
import { Chart, Empty, Food, Tag, toast } from "../../ui/components.jsx";
import { usePersistentState } from "../../lib/localData.js";
import { api, formatError } from "../../lib/api.js";
import Icon from "../../ui/Icon.jsx";

export default function RiderPortal(props) {
  const [online, setOnline] = useState(true);
  const [available, setAvailable] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Location active (14.5995, 120.9842)");

  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const [busyOrderId, setBusyOrderId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [deliveryDrafts, setDeliveryDrafts] = useState({});

  // Chat
  const [messages, setMessages] = usePersistentState("dashbite.rider.messages", []);
  const [chatText, setChatText] = useState("");
  const [chatOrder, setChatOrder] = useState("");

  const approvalStatus = props.session?.status || "APPROVED";
  const approved = approvalStatus === "APPROVED";

  // Load rider status, offers, and assigned deliveries from backend
  const loadStatus = async () => {
    try {
      const res = await api.getRiderStatus();
      if (res?.data) {
        setOnline(Boolean(res.data.is_online));
        setAvailable(Boolean(res.data.is_available));
        if (res.data.is_online && !res.data.has_fresh_location) {
          // Auto-refresh stale location so rider remains eligible
          await api.updateRiderLocation({ lat: 14.5995, lng: 120.9842 });
        }
        if (res.data.current_lat && res.data.current_lng) {
          setLocationStatus(
            `GPS fix: (${Number(res.data.current_lat).toFixed(4)}, ${Number(res.data.current_lng).toFixed(4)}) · Fresh`
          );
        }
      }
    } catch (err) {
      console.error("Could not load rider status", err);
    }
  };

  const loadOffers = async () => {
    if (!approved || !online) return;
    setLoadingOffers(true);
    try {
      const res = await api.getRiderOffers();
      setOffers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Could not load rider offers", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const loadDeliveries = async () => {
    if (!approved) return;
    setLoadingDeliveries(true);
    try {
      const res = await api.getRiderDeliveries();
      setDeliveries(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Could not load rider deliveries", err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadOffers();
    loadDeliveries();

    const interval = setInterval(() => {
      loadOffers();
      loadDeliveries();
    }, 4000); // 4-second polling for blast offers

    return () => clearInterval(interval);
  }, [online, approved]);

  // Periodic location heartbeat so online riders remain eligible for blast dispatch
  useEffect(() => {
    if (!online || !approved) return;
    const heartbeat = setInterval(async () => {
      try {
        await api.updateRiderLocation({ lat: 14.5995, lng: 120.9842 });
      } catch (e) {
        console.error("Location heartbeat failed", e);
      }
    }, 25000);
    return () => clearInterval(heartbeat);
  }, [online, approved]);

  // Online / Offline toggle with backend
  const toggleOnline = async () => {
    setActionError("");
    if (!approved) {
      setActionError("Your rider account is waiting for admin approval. You cannot go online.");
      return;
    }

    const nextState = !online;
    setLoadingStatus(true);
    try {
      await api.setRiderAvailability({
        is_online: nextState,
        is_available: nextState,
      });

      if (nextState) {
        // Send fresh coordinates (~Manila downtown)
        await api.updateRiderLocation({
          lat: 14.5995,
          lng: 120.9842,
        });
        setLocationStatus("GPS coordinates updated: (14.5995, 120.9842)");
        toast("You are online and eligible for 1 km dispatch blast offers.");
      } else {
        toast("You are offline. Location updates paused.");
      }

      setOnline(nextState);
      setAvailable(nextState);
      loadOffers();
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setLoadingStatus(false);
    }
  };

  // Atomic claim offer (Primary Contract Endpoint)
  const acceptOffer = async (offer) => {
    setActionError("");
    setBusyOrderId(offer.order_id);

    try {
      const res = await api.acceptOffer({
        order_id: offer.order_id,
        rider_id: props.user?.id,
      });

      toast(`Winner! You accepted Order #${offer.order_id}. Assigned for pickup.`);
      loadOffers();
      loadDeliveries();
    } catch (err) {
      console.error("Failed to accept offer", err);
      // Contract Pack Endpoint 3: 409 OFFER_ALREADY_CLAIMED
      if (err.code === "OFFER_ALREADY_CLAIMED" || err.status === 409) {
        setActionError(`OFFER_ALREADY_CLAIMED: ${err.message || "Offer closed. Another rider accepted it first."}`);
        toast("Offer was already claimed by another rider!", { tone: "c" });
      } else {
        setActionError(formatError(err));
      }
      loadOffers();
    } finally {
      setBusyOrderId(null);
    }
  };

  // Pickup transition
  const handlePickup = async (order) => {
    setActionError("");
    setBusyOrderId(order.id);
    try {
      await api.markPickedUp(order.id);
      toast(`Order #${order.id} marked as PICKED UP. Proceed to delivery.`);
      loadDeliveries();
    } catch (err) {
      setActionError(`Pickup failed: ${formatError(err)}`);
    } finally {
      setBusyOrderId(null);
    }
  };

  // Delivered transition with cash collection
  const handleDelivered = async (order) => {
    setActionError("");
    setBusyOrderId(order.id);

    const draft = deliveryDrafts[order.id] || { amount: "" };
    const isCod = (order.payment_method || "").toLowerCase() === "cod";
    let cashAmount = null;

    if (isCod) {
      const text = String(draft.amount ?? "").trim();
      if (!text) {
        setActionError(`Please enter the collected cash amount for Order #${order.id}.`);
        setBusyOrderId(null);
        return;
      }
      cashAmount = Number(text);
      if (Number.isNaN(cashAmount) || cashAmount < 0) {
        setActionError(`Enter a valid cash amount for Order #${order.id}.`);
        setBusyOrderId(null);
        return;
      }
    }

    try {
      await api.markDelivered(order.id, cashAmount);
      toast(`Order #${order.id} marked DELIVERED successfully!`);
      setDeliveryDrafts((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      loadDeliveries();
      loadStatus();
    } catch (err) {
      if (err.code === "INVALID_TRANSITION" || err.status === 422) {
        setActionError(`INVALID_TRANSITION: Cannot mark DELIVERED before PICKED_UP.`);
      } else {
        setActionError(`Delivery failed: ${formatError(err)}`);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!chatOrder || !text) return;
    setMessages((saved) => [
      ...saved,
      {
        id: `message-${Date.now()}`,
        orderId: chatOrder,
        sender: "rider",
        name: props.user.name,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setChatText("");
    toast("Message sent.");
  };

  const activeDeliveries = deliveries.filter(
    (d) => !["delivered", "completed", "rejected", "cancelled"].includes((d.status || "").toLowerCase())
  );
  const completedDeliveries = deliveries.filter(
    (d) => ["delivered", "completed"].includes((d.status || "").toLowerCase())
  );

  const approvalMessage =
    approvalStatus === "PENDING_APPROVAL"
      ? "Your rider account is waiting for local admin approval. You can go online once approved."
      : approvalStatus === "DISABLED"
      ? "Your rider account is disabled by the administrator. Sign-in and dispatch are blocked."
      : "";

  // Screens
  const screens = {
    dash: ({ setView }) => (
      <div className="two">
        <div className="col">
          <div className="ban">
            <div>
              <span className="pill">Rider Portal</span>
              <h2>Welcome Back, <span className="or">{props.user.name.split(" ")[0]}!</span></h2>
              <p>Simultaneous 1 km ring blast dispatch. Fast atomic claim on open offers.</p>
              <button className="btn" onClick={toggleOnline} disabled={!approved || loadingStatus}>
                <Icon name="circle" size={12} className={online ? "status-online" : "status-offline"} />
                {online ? "You are Online (Go Offline)" : "You are Offline (Go Online)"}
              </button>
            </div>
            <Food src={heroRider} />
          </div>

          {!approved && (
            <div className="card rider-approval" role="status">
              <h3>Rider Approval Notice</h3>
              <Tag tone="w">{approvalStatus}</Tag>
              <p style={{ marginTop: 8 }}>{approvalMessage}</p>
            </div>
          )}

          {actionError && (
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
              {actionError}
            </div>
          )}

          {/* Incoming Offers */}
          <div className="card">
            <div className="row">
              <div>
                <h3>Incoming Dispatch Blast Offers</h3>
                <small>Simultaneous 1 km ring broadcast from database</small>
              </div>
              <button className="btn gh sm" onClick={loadOffers} disabled={loadingOffers}>
                {loadingOffers ? "Refreshing..." : "↻ Refresh Offers"}
              </button>
            </div>

            {!approved ? (
              <Empty icon="🔒">{approvalMessage}</Empty>
            ) : !online ? (
              <Empty icon="😴">You are offline. Go online to receive blast offers.</Empty>
            ) : offers.length ? (
              <div className="rider-offer-list">
                {offers.map((offer) => (
                  <div className="li order-row rider-offer-row" key={offer.offer_id}>
                    <div className="f">
                      <b>Order #{offer.order_id} · {offer.restaurant?.name || "Restaurant"}</b>
                      <small>
                        {(offer.items || []).map((i) => `${i.quantity}× ${i.item_name || i.name}`).join(", ")}
                      </small>
                      <small>
                        Total: ₱{Number(offer.total_amount || 0).toFixed(2)} · Delivery to: {offer.delivery_address}
                      </small>
                    </div>
                    <Tag tone="w">Ring {offer.ring_radius_km} km</Tag>
                    <button
                      className="btn sm"
                      disabled={busyOrderId === offer.order_id}
                      onClick={() => acceptOffer(offer)}
                    >
                      {busyOrderId === offer.order_id ? "Claiming…" : "Accept Offer (Claim) →"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="🛵">No active blast offers right now. Offers appear when restaurants mark orders READY.</Empty>
            )}
          </div>

          {/* Active Deliveries */}
          <div className="card">
            <div className="row">
              <div>
                <h3>My Active Deliveries</h3>
                <small>Assigned orders to pick up and deliver</small>
              </div>
              <button className="or text-button" onClick={() => setView("deliveries")}>View All →</button>
            </div>

            {activeDeliveries.length ? (
              activeDeliveries.map((order) => {
                const status = (order.status || "").toUpperCase();
                const isCod = (order.payment_method || "").toLowerCase() === "cod";
                const draft = deliveryDrafts[order.id] || { amount: isCod ? Number(order.total || 0).toFixed(2) : "" };

                return (
                  <div className="rider-delivery-card" key={order.id} style={{ borderBottom: "1px solid #eee", paddingBottom: 16, marginBottom: 16 }}>
                    <div className="row">
                      <div>
                        <b>Order #{order.id} · {order.restaurant?.name || "Restaurant"}</b>
                        <p style={{ margin: "4px 0", fontSize: 13 }}><Icon name="mapPin" size={15} /> Deliver to: {order.delivery_address}</p>
                        <small>
                          Payment: {isCod ? "Cash on Delivery (COD)" : "Paid Online"} · Total: ₱{Number(order.total || 0).toFixed(2)}
                        </small>
                      </div>
                      <Tag tone={status === "PICKED_UP" ? "b" : "w"}>{status}</Tag>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {status !== "PICKED_UP" ? (
                        <button
                          className="btn sm"
                          disabled={busyOrderId === order.id}
                          onClick={() => handlePickup(order)}
                        >
                          {busyOrderId === order.id ? "Updating…" : <><Icon name="check" size={16} /> Confirm Pickup (PICKED_UP)</>}
                        </button>
                      ) : (
                        <>
                          {isCod && (
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                              <b>Cash Collected: ₱</b>
                              <input
                                className="text-input"
                                type="number"
                                step="0.01"
                                style={{ width: 100, padding: "4px 8px" }}
                                value={draft.amount}
                                onChange={(e) =>
                                  setDeliveryDrafts({
                                    ...deliveryDrafts,
                                    [order.id]: { amount: e.target.value },
                                  })
                                }
                              />
                            </label>
                          )}
                          <button
                            className="btn sm"
                            style={{ background: "#38a169", borderColor: "#38a169" }}
                            disabled={busyOrderId === order.id}
                            onClick={() => handleDelivered(order)}
                          >
                            {busyOrderId === order.id ? "Completing…" : <><Icon name="check" size={16} /> Confirm Delivery (DELIVERED)</>}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <small>No active deliveries. Accept an incoming offer to start a delivery.</small>
            )}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3>Rider Status</h3>
            <div className="row">
              <b>{approved ? <><Icon name="circle" size={11} className={online ? "status-online" : "status-offline"} /> {online ? "Online" : "Offline"}</> : "Awaiting Approval"}</b>
              <button
                className={`sw ${online ? "on" : ""}`}
                role="switch"
                aria-checked={online}
                aria-label="Online status"
                disabled={!approved}
                onClick={toggleOnline}
              />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <span>
                <Icon name="motorcycle" size={16} /> <b>{completedDeliveries.length}</b>
                <small style={{ display: "block" }}>Completed Deliveries</small>
              </span>
              <span>
                <Icon name="star" size={16} /> <b>5.0</b>
                <small style={{ display: "block" }}>Rider Rating</small>
              </span>
            </div>
          </div>

          <div className="card">
            <h3>Location &amp; Dispatch Status</h3>
            <p className="rider-location-note" role="status">
              {locationStatus}
            </p>
            <p style={{ fontSize: 12, color: "var(--mu)", marginTop: 4 }}>
              Eligible for simultaneous 1 km ring blasts centered at restaurant origin.
            </p>
          </div>

          <div className="card">
            <h3>Rider Earnings</h3>
            <b style={{ fontSize: 28 }}>
              ₱{completedDeliveries.reduce((sum, d) => sum + Number(d.delivery_fee || 30), 0).toFixed(2)}
            </b>
            <small className="subtle" style={{ display: "block", marginTop: 4 }}>
              Full 100% delivery fee to rider (₱0 platform commission per Decision W1.02)
            </small>
            <Chart
              points={
                completedDeliveries.length
                  ? completedDeliveries.slice(-7).map((_, i) => 30 * (i + 1))
                  : [0, 0, 0, 0, 0, 0, 0]
              }
              h={70}
            />
          </div>
        </div>
      </div>
    ),

    offers: () => (
      <section className="card">
        <div className="row">
          <div>
            <h3>Available Blast Offers</h3>
            <small>Rider race-safe assignment: first valid accept wins (HTTP 200), subsequent claims receive HTTP 409</small>
          </div>
          <button className="btn gh sm" onClick={loadOffers} disabled={loadingOffers}>
            {loadingOffers ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {actionError && (
          <div
            className="checkout-error"
            role="alert"
            style={{
              background: "#fff5f5",
              color: "#c53030",
              border: "1px solid #feb2b2",
              borderRadius: 6,
              padding: 10,
              margin: "12px 0",
              fontWeight: 600,
            }}
          >
            {actionError}
          </div>
        )}

        {!approved ? (
          <Empty icon="🔒">{approvalMessage}</Empty>
        ) : !online ? (
          <Empty icon="🛵">Go online to view and accept incoming delivery offers.</Empty>
        ) : offers.length ? (
          offers.map((offer) => (
            <div className="li order-row rider-offer-row" key={offer.offer_id}>
              <div className="f">
                <b>Order #{offer.order_id} · {offer.restaurant?.name || "Restaurant"}</b>
                <small>
                  {(offer.items || []).map((i) => `${i.quantity}× ${i.item_name || i.name}`).join(", ")}
                </small>
                <small>Total: ₱{Number(offer.total_amount || 0).toFixed(2)} · Address: {offer.delivery_address}</small>
              </div>
              <Tag tone="w">Ring {offer.ring_radius_km} km</Tag>
              <button
                className="btn sm"
                disabled={busyOrderId === offer.order_id}
                onClick={() => acceptOffer(offer)}
              >
                {busyOrderId === offer.order_id ? "Claiming…" : "Accept Offer →"}
              </button>
            </div>
          ))
        ) : (
          <Empty icon="🛵">No current offers. Offers appear when a restaurant marks an order ready.</Empty>
        )}
      </section>
    ),

    deliveries: () => (
      <section className="card">
        <div className="row">
          <div>
            <h3>My Deliveries</h3>
            <small>Active and completed delivery assignments</small>
          </div>
          <button className="btn gh sm" onClick={loadDeliveries} disabled={loadingDeliveries}>
            {loadingDeliveries ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {actionError && (
          <div
            className="checkout-error"
            role="alert"
            style={{
              background: "#fff5f5",
              color: "#c53030",
              border: "1px solid #feb2b2",
              borderRadius: 6,
              padding: 10,
              margin: "12px 0",
              fontWeight: 600,
            }}
          >
            {actionError}
          </div>
        )}

        {deliveries.length ? (
          deliveries.map((order) => {
            const status = (order.status || "").toUpperCase();
            const isCod = (order.payment_method || "").toLowerCase() === "cod";
            const draft = deliveryDrafts[order.id] || { amount: isCod ? Number(order.total || 0).toFixed(2) : "" };

            return (
              <div className="rider-delivery-card" key={order.id} style={{ borderBottom: "1px solid #eee", padding: "16px 0" }}>
                <div className="row">
                  <div>
                    <h4>Order #{order.id} · {order.restaurant?.name || "Restaurant"}</h4>
                    <p style={{ margin: "4px 0" }}><Icon name="mapPin" size={15} /> {order.delivery_address}</p>
                    <small>
                      Payment: {isCod ? "Cash on Delivery" : "Paid Online"} · Amount: ₱{Number(order.total || 0).toFixed(2)}
                    </small>
                  </div>
                  <Tag tone={status === "DELIVERED" ? "a" : status === "PICKED_UP" ? "b" : "w"}>{status}</Tag>
                </div>

                {status !== "DELIVERED" && status !== "REJECTED" && status !== "CANCELLED" && (
                  <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {status !== "PICKED_UP" ? (
                      <button
                        className="btn sm"
                        disabled={busyOrderId === order.id}
                        onClick={() => handlePickup(order)}
                      >
                        {busyOrderId === order.id ? "Updating…" : "Confirm Pickup (PICKED_UP)"}
                      </button>
                    ) : (
                      <>
                        {isCod && (
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <b>Cash Collected (₱):</b>
                            <input
                              className="text-input"
                              type="number"
                              step="0.01"
                              style={{ width: 110, padding: "4px 8px" }}
                              value={draft.amount}
                              onChange={(e) =>
                                setDeliveryDrafts({
                                  ...deliveryDrafts,
                                  [order.id]: { amount: e.target.value },
                                })
                              }
                            />
                            <small style={{ color: "var(--mu)" }}>Expected: ₱{Number(order.total || 0).toFixed(2)}</small>
                          </label>
                        )}
                        <button
                          className="btn sm"
                          style={{ background: "#38a169", borderColor: "#38a169" }}
                          disabled={busyOrderId === order.id}
                          onClick={() => handleDelivered(order)}
                        >
                          {busyOrderId === order.id ? "Updating…" : "Confirm Delivered (DELIVERED)"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <Empty icon="📦">No delivery records found.</Empty>
        )}
      </section>
    ),

    earnings: () => (
      <section className="card">
        <h3>Rider Earnings Breakdown</h3>
        <p style={{ fontSize: 13, color: "var(--mu)" }}>
          100% of delivery fee is paid to rider (₱0 platform commission).
        </p>
        <div className="stats">
          <div>
            <small>Completed Deliveries</small>
            <h2>{completedDeliveries.length}</h2>
          </div>
          <div>
            <small>Total Delivery Earnings</small>
            <h2>₱{completedDeliveries.reduce((sum, d) => sum + Number(d.delivery_fee || 30), 0).toFixed(2)}</h2>
          </div>
        </div>
        <Chart
          points={
            completedDeliveries.length
              ? completedDeliveries.map((_, i) => 30 * (i + 1))
              : [0, 0, 0, 0, 0, 0, 0]
          }
        />
      </section>
    ),

    chat: () => (
      <section className="card">
        <h3>Customer Chat</h3>
        {activeDeliveries.length ? (
          <>
            <form className="local-form" onSubmit={sendMessage}>
              <label>
                Delivery
                <select className="text-input" value={chatOrder} onChange={(e) => setChatOrder(e.target.value)} required>
                  <option value="">Select a delivery</option>
                  {activeDeliveries.map((d) => (
                    <option key={d.id} value={d.id}>
                      Order #{d.id} · {d.restaurant?.name || "Restaurant"}
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
              .filter((m) => activeDeliveries.some((d) => String(d.id) === String(m.orderId)))
              .map((m) => (
                <div className="li" key={m.id}>
                  <div className="f">
                    <b>{m.name} · Order #{m.orderId}</b>
                    <small>{m.text}</small>
                  </div>
                  <small>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))}
          </>
        ) : (
          <Empty icon="💬">Chat becomes available after you accept an active delivery.</Empty>
        )}
      </section>
    ),
  };

  return <PortalFrame role="RIDER" {...props} placeholder="Search orders, deliveries, or locations…" screens={screens} />;
}
