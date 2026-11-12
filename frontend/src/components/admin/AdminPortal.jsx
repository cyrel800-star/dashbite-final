import { useEffect, useState } from "react";
import PortalFrame from "../PortalFrame.jsx";
import { heroSteak } from "../../data/images.js";
import { Chart, Empty, Food, StatCard, Tag, toast } from "../../ui/components.jsx";
import { api, formatError } from "../../lib/api.js";

const RANGES = {
  "7 Days": [30, 55, 78, 95, 120, 96, 122],
  "30 Days": [60, 80, 70, 110, 130, 125, 160],
  "90 Days": [90, 100, 140, 130, 170, 190, 210],
};

export default function AdminPortal(props) {
  const [range, setRange] = useState("7 Days");

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // Settings state
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [feeInput, setFeeInput] = useState("30.00");
  const [boundaryInput, setBoundaryInput] = useState({
    lat_center: 14.5995,
    lng_center: 120.9842,
    radius_km: 5,
    lat_min: 14.55,
    lat_max: 14.65,
    lng_min: 120.94,
    lng_max: 121.03,
  });

  // Payments & Discrepancies
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [resolveNotes, setResolveNotes] = useState({});

  // Error and busy states
  const [adminError, setAdminError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Loaders
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load admin users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.getAdminSettings();
      if (res?.data) {
        setSettings(res.data);
        if (res.data.delivery_fee !== undefined) {
          setFeeInput(Number(res.data.delivery_fee).toFixed(2));
        }
        if (res.data.service_boundary) {
          setBoundaryInput({
            lat_center: res.data.service_boundary.lat_center ?? 14.5995,
            lng_center: res.data.service_boundary.lng_center ?? 120.9842,
            radius_km: res.data.service_boundary.radius_km ?? 5,
            lat_min: res.data.service_boundary.lat_min ?? 14.55,
            lat_max: res.data.service_boundary.lat_max ?? 14.65,
            lng_min: res.data.service_boundary.lng_min ?? 120.94,
            lng_max: res.data.service_boundary.lng_max ?? 121.03,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load admin settings", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadDiscrepancies = async () => {
    setLoadingDiscrepancies(true);
    try {
      const res = await api.getDiscrepancies();
      setDiscrepancies(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load discrepancies", err);
    } finally {
      setLoadingDiscrepancies(false);
    }
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await api.getAdminPayments();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPayments(list);
    } catch (err) {
      console.error("Failed to load admin payments", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadSettings();
    loadDiscrepancies();
    loadPayments();
  }, []);

  // Actions
  const handleApprove = async (userId) => {
    setBusyId(userId);
    setAdminError("");
    try {
      await api.approveUser(userId);
      toast("User account approved successfully.");
      loadUsers();
    } catch (err) {
      setAdminError(`Approval failed: ${formatError(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (userId) => {
    setBusyId(userId);
    setAdminError("");
    try {
      const res = await api.toggleUserStatus(userId);
      toast(res?.message || "Account status updated.");
      loadUsers();
    } catch (err) {
      setAdminError(`Status update failed: ${formatError(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveFee = async (e) => {
    e.preventDefault();
    const fee = Number(feeInput);
    if (!Number.isFinite(fee) || fee < 0) {
      setAdminError("Please enter a valid positive delivery fee.");
      return;
    }
    setAdminError("");
    try {
      await api.updateDeliveryFee(fee);
      toast(`Town delivery fee updated to ₱${fee.toFixed(2)}.`);
      loadSettings();
    } catch (err) {
      setAdminError(`Fee update failed: ${formatError(err)}`);
    }
  };

  const handleSaveBoundary = async (e) => {
    e.preventDefault();
    setAdminError("");
    try {
      await api.updateServiceBoundary(boundaryInput);
      toast("Town service boundary updated successfully.");
      loadSettings();
    } catch (err) {
      setAdminError(`Boundary update failed: ${formatError(err)}`);
    }
  };

  const handleResolveDiscrepancy = async (paymentId) => {
    const notes = resolveNotes[paymentId]?.trim() || "Resolved by Admin review";
    setBusyId(paymentId);
    try {
      await api.resolveDiscrepancy(paymentId, { notes });
      toast(`Payment #${paymentId} discrepancy marked resolved.`);
      loadDiscrepancies();
      loadPayments();
    } catch (err) {
      toast(`Resolution failed: ${formatError(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const pendingUsers = users.filter((u) => u.account_status === "PENDING_APPROVAL" || u.status === "PENDING_APPROVAL");
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === "ALL") return true;
    if (userRoleFilter === "PENDING") return u.account_status === "PENDING_APPROVAL" || u.status === "PENDING_APPROVAL";
    return u.role === userRoleFilter;
  });

  const searchable = (query, value) => String(value || "").toLowerCase().includes(query.toLowerCase());

  // Screens
  const screens = {
    dash: ({ setView }) => (
      <div className="col">
        <div className="ban">
          <div>
            <span className="pill">System Admin</span>
            <h2>DashBite <span className="or">Administration</span></h2>
            <p>Full town delivery oversight: user approvals, fee/boundary settings, and payment discrepancy reconciliation.</p>
            <button className="btn" onClick={() => setView("discrepancies")}>View Discrepancy Queue →</button>
          </div>
          <Food src={heroSteak} />
        </div>

        <div className="stats">
          <StatCard icon="👥" label="Registered Users" value={String(users.length)} />
          <StatCard icon="⏳" label="Pending Approvals" value={String(pendingUsers.length)} delta="Action required" />
          <StatCard icon="⚠️" label="Flagged Discrepancies" value={String(discrepancies.length)} delta="COD Queue" />
          <StatCard icon="₱" label="Town Delivery Fee" value={`₱${Number(settings?.delivery_fee || 30).toFixed(2)}`} />
        </div>

        <div className="stats admin-grid">
          {/* Pending Approvals Widget */}
          <div className="card">
            <div className="row">
              <div>
                <h3>Pending Approvals</h3>
                <small>Rider and Restaurant onboarding queue</small>
              </div>
              <button className="or text-button" onClick={() => setView("users")}>View All →</button>
            </div>
            {pendingUsers.length ? (
              pendingUsers.slice(0, 5).map((user) => (
                <div className="li" key={user.id}>
                  <div className="f">
                    <b>{user.name}</b>
                    <small>{user.role} · {user.email}</small>
                  </div>
                  <button
                    className="btn sm"
                    disabled={busyId === user.id}
                    onClick={() => handleApprove(user.id)}
                  >
                    {busyId === user.id ? "Approving…" : "✓ Approve"}
                  </button>
                </div>
              ))
            ) : (
              <Empty icon="🎉">No pending accounts waiting for approval.</Empty>
            )}
          </div>

          {/* Discrepancy Queue Widget */}
          <div className="card">
            <div className="row">
              <div>
                <h3>COD Discrepancy Queue</h3>
                <small>Decision W1.02 Strict Reconciliation</small>
              </div>
              <button className="or text-button" onClick={() => setView("discrepancies")}>Manage →</button>
            </div>
            {discrepancies.length ? (
              discrepancies.slice(0, 4).map((p) => (
                <div className="li" key={p.id}>
                  <div className="f">
                    <b>Payment #{p.id} · Order #{p.order_id}</b>
                    <small>
                      Expected: ₱{Number(p.amount || 0).toFixed(2)} · Status: {p.status}
                    </small>
                  </div>
                  <Tag tone="c">FLAGGED</Tag>
                </div>
              ))
            ) : (
              <Empty icon="✓">Discrepancy queue is clear. No flagged payments.</Empty>
            )}
          </div>

          {/* Sales Analytics */}
          <div className="card">
            <div className="row">
              <h3>System Activity</h3>
              <span className="tabs">
                {Object.keys(RANGES).map((item) => (
                  <button key={item} className={range === item ? "on" : ""} onClick={() => setRange(item)}>
                    {item}
                  </button>
                ))}
              </span>
            </div>
            <Chart points={RANGES[range]} />
            <div className="steps">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    users: ({ q }) => {
      const matches = filteredUsers.filter((u) =>
        searchable(q, `${u.name} ${u.email} ${u.role} ${u.account_status}`)
      );

      return (
        <section className="card">
          <div className="row">
            <div>
              <h3>User Accounts Management</h3>
              <small>Approve, inspect, and manage role-based user access</small>
            </div>
            <button className="btn gh sm" onClick={loadUsers} disabled={loadingUsers}>
              {loadingUsers ? "Refreshing..." : "↻ Refresh Users"}
            </button>
          </div>

          {adminError && (
            <div className="checkout-error" role="alert" style={{ margin: "10px 0" }}>
              {adminError}
            </div>
          )}

          <div className="tabs" style={{ margin: "12px 0" }}>
            {[
              ["ALL", "All Users"],
              ["PENDING", `Pending (${pendingUsers.length})`],
              ["RIDER", "Riders"],
              ["RESTAURANT", "Restaurants"],
              ["CUSTOMER", "Customers"],
            ].map(([k, label]) => (
              <button
                key={k}
                className={userRoleFilter === k ? "on" : ""}
                onClick={() => setUserRoleFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>

          {matches.length ? (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((u) => {
                    const isPending = u.account_status === "PENDING_APPROVAL" || u.status === "PENDING_APPROVAL";
                    const isApproved = u.account_status === "APPROVED" || u.status === "APPROVED";

                    return (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td><b>{u.name}</b></td>
                        <td>{u.email}</td>
                        <td><Tag tone="w">{u.role}</Tag></td>
                        <td>
                          <Tag tone={isApproved ? "a" : isPending ? "w" : "c"}>
                            {u.account_status}
                          </Tag>
                        </td>
                        <td>
                          {isPending ? (
                            <button
                              className="btn sm"
                              disabled={busyId === u.id}
                              onClick={() => handleApprove(u.id)}
                            >
                              {busyId === u.id ? "Approving…" : "✓ Approve Account"}
                            </button>
                          ) : (
                            <button
                              className="btn gh sm"
                              disabled={busyId === u.id || u.role === "ADMIN"}
                              onClick={() => handleToggleStatus(u.id)}
                            >
                              {isApproved ? "Disable" : "Enable"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="👥">No users match this filter.</Empty>
          )}
        </section>
      );
    },

    discrepancies: () => (
      <section className="card">
        <div className="row">
          <div>
            <h3>COD Discrepancy Queue</h3>
            <small>Decision Log W1.02: Strict reconciliation queue for mismatched COD collections</small>
          </div>
          <button className="btn gh sm" onClick={loadDiscrepancies} disabled={loadingDiscrepancies}>
            {loadingDiscrepancies ? "Refreshing..." : "↻ Refresh Queue"}
          </button>
        </div>

        {discrepancies.length ? (
          <div className="tw" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Expected Total</th>
                  <th>Rider Cut</th>
                  <th>Restaurant Share</th>
                  <th>Status</th>
                  <th>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td><b>Order #{p.order_id}</b></td>
                    <td>₱{Number(p.amount || 0).toFixed(2)}</td>
                    <td>₱{Number(p.rider_cut || 0).toFixed(2)}</td>
                    <td>₱{Number(p.restaurant_share || 0).toFixed(2)}</td>
                    <td><Tag tone="c">{p.status?.toUpperCase()}</Tag></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="text-input"
                          style={{ width: 180, padding: "4px 8px" }}
                          placeholder="Resolution notes"
                          value={resolveNotes[p.id] || ""}
                          onChange={(e) =>
                            setResolveNotes({ ...resolveNotes, [p.id]: e.target.value })
                          }
                        />
                        <button
                          className="btn sm"
                          disabled={busyId === p.id}
                          onClick={() => handleResolveDiscrepancy(p.id)}
                        >
                          {busyId === p.id ? "Resolving…" : "Resolve"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="✓">Discrepancy queue is clear. No unflagged COD mismatches.</Empty>
        )}
      </section>
    ),

    payments: () => (
      <section className="card">
        <div className="row">
          <div>
            <h3>Payments &amp; Settlement Ledger</h3>
            <small>100% rider delivery cut, ₱0 platform commission, full subtotal to restaurant</small>
          </div>
          <button className="btn gh sm" onClick={loadPayments} disabled={loadingPayments}>
            {loadingPayments ? "Refreshing..." : "↻ Refresh Ledger"}
          </button>
        </div>

        {payments.length ? (
          <div className="tw" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Order</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Rider Cut</th>
                  <th>Platform Fee</th>
                  <th>Restaurant Share</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>Order #{p.order_id}</td>
                    <td>{p.method?.toUpperCase()}</td>
                    <td><b>₱{Number(p.amount || 0).toFixed(2)}</b></td>
                    <td>₱{Number(p.rider_cut || 0).toFixed(2)}</td>
                    <td>₱0.00</td>
                    <td>₱{Number(p.restaurant_share || 0).toFixed(2)}</td>
                    <td>
                      <Tag tone={p.status === "settled" ? "a" : p.status === "flagged_discrepancy" ? "c" : "w"}>
                        {p.status?.toUpperCase()}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="💳">No payment records yet.</Empty>
        )}
      </section>
    ),

    system_settings: () => screens.settings(),
    settings: () => (
      <div className="col">
        {adminError && <div className="checkout-error" role="alert">{adminError}</div>}

        {/* Delivery Fee Card */}
        <section className="card">
          <div className="row">
            <div>
              <h3>Town-Wide Delivery Fee</h3>
              <small>System baseline delivery fee (REQ-08). Note: Active placed orders retain their frozen fee.</small>
            </div>
            <Tag tone="a">Live Setting</Tag>
          </div>

          <form onSubmit={handleSaveFee} style={{ marginTop: 14 }}>
            <label>
              Delivery Fee (₱)
              <input
                className="text-input"
                type="number"
                min="0"
                max="500"
                step="1"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                required
              />
            </label>
            <button className="btn" type="submit" style={{ marginTop: 10 }}>
              Update Delivery Fee
            </button>
          </form>
        </section>

        {/* Service Boundary Card */}
        <section className="card">
          <div className="row">
            <div>
              <h3>Service Boundary Area</h3>
              <small>Town bounding coordinates and center for 1 km dispatch blast stops (REQ-08)</small>
            </div>
            <Tag tone="a">Live Boundary</Tag>
          </div>

          <form onSubmit={handleSaveBoundary} style={{ marginTop: 14 }}>
            <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Center Latitude
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lat_center}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lat_center: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Center Longitude
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lng_center}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lng_center: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Latitude Min (South)
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lat_min}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lat_min: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Latitude Max (North)
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lat_max}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lat_max: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Longitude Min (West)
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lng_min}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lng_min: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Longitude Max (East)
                <input
                  className="text-input"
                  type="number"
                  step="0.0001"
                  value={boundaryInput.lng_max}
                  onChange={(e) => setBoundaryInput({ ...boundaryInput, lng_max: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <button className="btn" type="submit" style={{ marginTop: 14 }}>
              Update Service Boundary
            </button>
          </form>
        </section>
      </div>
    ),

    orders: () => (
      <section className="card">
        <h3>All Town Orders</h3>
        <p style={{ fontSize: 13, color: "var(--mu)" }}>
          Full visibility into town orders across all restaurants and riders.
        </p>
        <div className="tw" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Restaurant</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><b>Order #{p.order_id}</b></td>
                  <td>{p.order?.restaurant?.name || "Restaurant"}</td>
                  <td>₱{Number(p.amount || 0).toFixed(2)}</td>
                  <td><Tag tone="w">{p.order?.status || p.status}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ),

    restaurants: () => (
      <section className="card">
        <h3>Approved Town Restaurants</h3>
        <div className="tw" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.role === "RESTAURANT")
                .map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td><Tag tone={u.account_status === "APPROVED" ? "a" : "w"}>{u.account_status}</Tag></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    ),

    riders: () => (
      <section className="card">
        <h3>Town Riders Roster</h3>
        <div className="tw" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.role === "RIDER")
                .map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td><Tag tone={u.account_status === "APPROVED" ? "a" : "w"}>{u.account_status}</Tag></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    ),

    reports: () => (
      <section className="card">
        <h3>Platform Reports &amp; Financials</h3>
        <div className="stats">
          <StatCard icon="👥" label="Total Users" value={String(users.length)} />
          <StatCard icon="🛍️" label="Total Orders" value={String(payments.length)} />
          <StatCard
            icon="₱"
            label="Gross Sales"
            value={`₱${payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}`}
          />
          <StatCard
            icon="💰"
            label="Platform Commission"
            value="₱0.00"
            delta="0% Hardcoded per W1.02"
          />
        </div>
        <Chart points={RANGES[range]} />
      </section>
    ),

    logs: () => (
      <section className="card">
        <h3>Audit &amp; System Event Logs</h3>
        <div className="tw" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Event Time</th>
                <th>Subject</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((u) => (
                <tr key={u.id}>
                  <td><small>{new Date(u.created_at || Date.now()).toLocaleString()}</small></td>
                  <td>User #{u.id} · {u.name}</td>
                  <td>Account registered as {u.role} ({u.account_status})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ),
  };

  return <PortalFrame role="ADMIN" {...props} placeholder="Search users, orders, or records…" screens={screens} />;
}
