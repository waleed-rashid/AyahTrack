import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { saveSession } from "../auth/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      saveSession(res.data);

      navigate(redirectTo, { replace: true });
    } catch (err) {
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <main style={styles.card}>
        <p style={styles.kicker}>Hifz Tracker</p>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue your memorization journey.</p>

        <div style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              value={email}
              type="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              value={password}
              type="password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </label>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              ...styles.button,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 28,
    background: "linear-gradient(180deg, #f3f7f4 0%, #eaf1ed 100%)",
    color: "#17201b",
    fontFamily: 'Aptos, "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #dce6df",
    borderRadius: 10,
    padding: 32,
    boxShadow: "0 18px 45px rgba(32, 63, 48, 0.1)",
  },
  kicker: {
    color: "#4d7c65",
    fontSize: 13,
    fontWeight: 750,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
  },
  title: {
    color: "#111815",
    fontFamily: '"Aptos Display", Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    fontSize: 34,
    lineHeight: 1.15,
    fontWeight: 800,
    textAlign: "center",
  },
  subtitle: {
    color: "#60756b",
    fontSize: 15,
    lineHeight: 1.5,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 26,
  },
  form: {
    display: "grid",
    gap: 15,
  },
  label: {
    display: "grid",
    gap: 7,
    color: "#5b7067",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: 44,
    color: "#17201b",
    background: "#fbfdfb",
    border: "1px solid #d8e3dc",
    borderRadius: 7,
    padding: "9px 11px",
    outlineColor: "#65a985",
  },
  button: {
    width: "100%",
    minHeight: 44,
    color: "white",
    background: "#1f7a55",
    border: "1px solid #1b6f4d",
    borderRadius: 7,
    fontWeight: 750,
    boxShadow: "0 10px 18px rgba(31, 122, 85, 0.18)",
    marginTop: 4,
  },
};
