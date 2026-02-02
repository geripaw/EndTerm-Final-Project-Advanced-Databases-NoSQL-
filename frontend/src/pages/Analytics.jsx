import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Analytics() {
  const [top, setTop] = useState([]);
  const [countries, setCountries] = useState([]);
  const [months, setMonths] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [a, b, c] = await Promise.all([
        api.get("/analytics/top-products", { params: { limit: 10 } }),
        api.get("/analytics/revenue-by-country", { params: { limit: 10 } }),
        api.get("/analytics/revenue-by-month", { params: { year: 2011 } }),
      ]);
      setTop(a.data.data || []);
      setCountries(b.data.data || []);
      setMonths(c.data.data || []);
    } catch (err) {
  setError(
    err?.response?.data?.message === "Admin only"
      ? "You are not admin. Change your role in Compass."
      : (err?.response?.data?.message || "Analytics error")
  );
}

}

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2>Analytics (admin)</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <h3>Top products</h3>
      <ol>
        {top.map((x, i) => (
          <li key={i}>
            {x.name || x.stockCode || x.productId} — revenue {Math.round(x.revenue)}
          </li>
        ))}
      </ol>

      <h3>Revenue by country</h3>
      <ol>
        {countries.map((x, i) => (
          <li key={i}>
            {x.country || "(empty)"} — revenue {Math.round(x.revenue)} — orders {x.orders}
          </li>
        ))}
      </ol>

      <h3>Revenue by month (2011)</h3>
      <ol>
        {months.map((x, i) => (
          <li key={i}>
            month {x.month}: revenue {Math.round(x.revenue)} — orders {x.orders}
          </li>
        ))}
      </ol>
    </div>
  );
}

