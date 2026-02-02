import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

export default function Orders() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await api.get("/orders", { params: { limit: 20, page: 1 } });
      setItems(res.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Load error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2>Orders</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <ul>
        {items.map((o) => (
          <li key={o._id}>
            <Link to={`/orders/${o._id}`}>{o.invoiceNo}</Link> — {o.status} — total: {o.total}
          </li>
        ))}
      </ul>
    </div>
  );
}
