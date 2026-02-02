import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useParams } from "react-router-dom";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Load error");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div>
      <h2>Order Details</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {!order ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div>Invoice: {order.invoiceNo}</div>
          <div>Status: {order.status}</div>
          <div>Total: {order.total}</div>

          <h3>Items</h3>
          <ul>
            {(order.items || []).map((it, idx) => (
              <li key={idx}>
                {it?.productId?.name || String(it.productId)} — qty {it.quantity} — price {it.price}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
