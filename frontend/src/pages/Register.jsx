import { useState } from "react";
import { api, setToken } from "../lib/api";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("KZ");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/register", { email, password, country });
      setToken(res.data.token);
      navigate("/products");
    } catch (err) {
      setError(err?.response?.data?.message || "Register error");
    }
  }

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="country" />
        <button type="submit">Register</button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>

      <p>
        Have account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}