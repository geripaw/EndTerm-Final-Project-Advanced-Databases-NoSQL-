import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [cart, setCart] = useState({}); // productId -> qty
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setError("");
    try {
      const res = await api.get("/products", { params: { q, limit: 20, page: 1 } });
      setItems(res.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Load error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  function addToCart(productId) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  }

  function decFromCart(productId) {
    setCart((prev) => {
      const next = { ...prev };
      const v = (next[productId] || 0) - 1;
      if (v <= 0) delete next[productId];
      else next[productId] = v;
      return next;
    });
  }

  const cartItems = useMemo(() => {
    const map = new Map(items.map((p) => [p._id, p]));
    return Object.entries(cart).map(([id, qty]) => ({
      product: map.get(id) || { _id: id, name: id },
      qty,
    }));
  }, [cart, items]);

  async function createOrder() {
    setError("");
    setCreating(true);
    try {
      const payload = {
        items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
      };
      const res = await api.post("/orders", payload);
      setCart({});
      navigate(`/orders/${res.data._id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Create order error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h2>Products</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search..." />
        <button onClick={load}>Search</button>
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div>
          <h3>List</h3>
          <ul>
            {items.map((p) => (
              <li key={p._id} style={{ marginBottom: 6 }}>
                {p.name} — {p.unitPrice} ({p.stockCode}){" "}
                <button onClick={() => addToCart(p._id)}>Add</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Cart</h3>
          {cartItems.length === 0 ? (
            <div>Empty</div>
          ) : (
            <>
              <ul>
                {cartItems.map((c) => (
                  <li key={c.product._id}>
                    {c.product.name} — qty {c.qty}{" "}
                    <button onClick={() => addToCart(c.product._id)}>+</button>{" "}
                    <button onClick={() => decFromCart(c.product._id)}>-</button>
                  </li>
                ))}
              </ul>
              <button disabled={creating} onClick={createOrder}>
                {creating ? "Creating..." : "Create Order"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
