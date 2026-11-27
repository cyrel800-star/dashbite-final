import { useEffect, useRef, useState } from "react";
import { api, formatError } from "../lib/api.js";
import Icon from "../ui/Icon.jsx";
import { Empty, toast } from "../ui/components.jsx";

export default function ChatPanel({ role, orders, title = "Order Chat" }) {
  const [selectedOrder, setSelectedOrder] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  // Auto-select first order
  useEffect(() => {
    if (orders?.length && !selectedOrder) {
      setSelectedOrder(String(orders[0].id));
    }
  }, [orders, selectedOrder]);

  // Fetch + poll every 3 seconds
  useEffect(() => {
    if (!selectedOrder) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.getMessages(selectedOrder);
        if (!cancelled) {
          setMessages(Array.isArray(res?.data) ? res.data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(formatError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedOrder]);

  // Auto-scroll to newest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!selectedOrder || !body || sending) return;
    setSending(true);
    try {
      const res = await api.sendChatMessage(selectedOrder, body);
      const created = res?.data;
      if (created) setMessages((prev) => [...prev, created]);
      setText("");
    } catch (err) {
      toast(formatError(err));
    } finally {
      setSending(false);
    }
  };

  if (!orders?.length) {
    return <Empty icon="💬">No orders to chat about yet.</Empty>;
  }

  return (
    <section
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--ln)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg)",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--o)", display: "inline-flex" }}>
              <Icon name="message" size={20} />
            </span>
            {title}
          </h3>
          <small style={{ color: "var(--tx)", opacity: 0.6 }}>
            Messages update every few seconds.
          </small>
        </div>
        <select
          className="text-input"
          style={{ width: "auto", padding: "6px 12px", borderRadius: 8 }}
          value={selectedOrder}
          onChange={(e) => setSelectedOrder(e.target.value)}
        >
          <option value="">Select an order...</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label || `Order #${o.id}`}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {error && (
          <div style={{ color: "#c0392b", fontSize: 13, textAlign: "center" }}>{error}</div>
        )}

        {!selectedOrder ? (
          <Empty icon="☝️">Select an order to view messages.</Empty>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--tx)", opacity: 0.5, marginTop: 40 }}>
            <div style={{ margin: "0 auto 10px", width: 40, height: 40 }}>
              <Icon name="message" size={40} />
            </div>
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_role === role;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  background: isMe ? "var(--o)" : "var(--ln)",
                  color: isMe ? "#fff" : "var(--tx)",
                  padding: "10px 14px",
                  borderRadius: isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "11px",
                    opacity: 0.8,
                    marginBottom: 2,
                  }}
                >
                  {m.sender_name} · {m.sender_role}
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.4" }}>{m.body}</div>
                <div
                  style={{
                    fontSize: "10px",
                    opacity: 0.7,
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })
        )}

        {loading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--tx)", opacity: 0.5 }}>
            Loading…
          </div>
        )}
      </div>

      {selectedOrder && (
        <form
          onSubmit={handleSend}
          style={{
            padding: 16,
            borderTop: "1px solid var(--ln)",
            background: "var(--bg)",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            type="text"
            className="text-input"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            style={{ flex: 1, borderRadius: 24, padding: "12px 20px" }}
          />
          <button
            type="submit"
            className="btn"
            disabled={sending || !text.trim()}
            style={{
              borderRadius: "50%",
              width: 45,
              height: 45,
              padding: 0,
              justifyContent: "center",
            }}
          >
            <Icon name="arrow" size={20} />
          </button>
        </form>
      )}
    </section>
  );
}