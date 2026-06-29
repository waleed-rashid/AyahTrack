import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { saveSession } from "../auth/auth";
import hifzLogo from "../assets/hifz-logo.png";
import { surahs } from "../data/surahs";

const juzOptions = Array.from({ length: 30 }, (_, index) => index + 1);

export default function Login() {
  const [mode, setMode] = useState("login");
  const [signupStep, setSignupStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    memorizedJuzCount: 0,
    memorizedJuzList: [],
    currentJuz: 1,
    currentSurah: 1,
    currentAyah: 1,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";

  const selectedCurrentSurah =
    surahs.find((surah) => surah.number === Number(signupForm.currentSurah)) || surahs[0];
  const currentAyahOptions = Array.from(
    { length: selectedCurrentSurah.ayahs },
    (_, index) => index + 1
  );

  const updateLoginForm = (field, value) => {
    setLoginError("");
    setLoginForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateSignupForm = (field, value) => {
    setSignupForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const toggleJuz = (juz) => {
    setSignupForm((currentForm) => {
      const hasJuz = currentForm.memorizedJuzList.includes(juz);
      const memorizedJuzList = hasJuz
        ? currentForm.memorizedJuzList.filter((item) => item !== juz)
        : [...currentForm.memorizedJuzList, juz].sort((a, b) => a - b);

      return {
        ...currentForm,
        memorizedJuzList,
        memorizedJuzCount: memorizedJuzList.length,
      };
    });
  };

  const handleLogin = async () => {
    setLoginError("");
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", loginForm);

      saveSession(res.data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setLoginError(err.response?.data?.message || "Login failed. Please check your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupNext = () => {
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      alert("Please fill out your name, email, and password.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setSignupStep(2);
  };

  const handleSignup = async () => {
    setIsLoading(true);

    try {
      const res = await api.post("/auth/signup", {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        memorizedJuzCount: signupForm.memorizedJuzCount,
        memorizedJuzList: signupForm.memorizedJuzList,
        currentJuz: Number(signupForm.currentJuz),
        currentSurah: Number(signupForm.currentSurah),
        currentAyah: Number(signupForm.currentAyah),
      });

      saveSession(res.data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const showLogin = mode === "login";

  return (
    <div style={styles.page}>
      <main style={styles.card}>
        <img src={hifzLogo} alt="Hifz Tracker" style={styles.logo} />
        <p style={styles.kicker}>AyahTrack</p>
        <h1 style={styles.title}>{showLogin ? "Welcome Back" : "Create Your Account"}</h1>
        <p style={styles.subtitle}>
          {showLogin
            ? "Sign in to continue your memorization journey."
            : "Start with your current Hifz progress so your dashboard feels personal."}
        </p>

        <div style={styles.segmentedControl}>
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              ...styles.segmentButton,
              ...(showLogin ? styles.activeSegmentButton : {}),
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setSignupStep(1);
            }}
            style={{
              ...styles.segmentButton,
              ...(!showLogin ? styles.activeSegmentButton : {}),
            }}
          >
            Sign Up
          </button>
        </div>

        {showLogin ? (
          <div style={styles.form}>
            <label style={styles.label}>
              Email
              <input
                value={loginForm.email}
                type="email"
                placeholder="Enter your email"
                onChange={(e) => updateLoginForm("email", e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Password
              <input
                value={loginForm.password}
                type="password"
                placeholder="Enter your password"
                onChange={(e) => updateLoginForm("password", e.target.value)}
                style={styles.input}
              />
            </label>

            {loginError ? <p style={styles.notification}>{loginError}</p> : null}

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
        ) : (
          <div style={styles.form}>
            <div style={styles.stepRow}>
              <span style={signupStep === 1 ? styles.activeStep : styles.step}>1</span>
              <span style={styles.stepLine} />
              <span style={signupStep === 2 ? styles.activeStep : styles.step}>2</span>
            </div>

            {signupStep === 1 ? (
              <>
                <label style={styles.label}>
                  Name
                  <input
                    value={signupForm.name}
                    placeholder="Your name"
                    onChange={(e) => updateSignupForm("name", e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Email
                  <input
                    value={signupForm.email}
                    type="email"
                    placeholder="you@example.com"
                    onChange={(e) => updateSignupForm("email", e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Create Password
                  <input
                    value={signupForm.password}
                    type="password"
                    placeholder="Create a password"
                    onChange={(e) => updateSignupForm("password", e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Confirm Password
                  <input
                    value={signupForm.confirmPassword}
                    type="password"
                    placeholder="Confirm your password"
                    onChange={(e) => updateSignupForm("confirmPassword", e.target.value)}
                    style={styles.input}
                  />
                </label>

                <button type="button" onClick={handleSignupNext} style={styles.button}>
                  Continue
                </button>
              </>
            ) : (
              <>
                <label style={styles.label}>
                  How many ajza have you memorized?
                  <input
                    value={signupForm.memorizedJuzCount}
                    type="number"
                    readOnly
                    style={styles.input}
                  />
                </label>

                <div>
                  <p style={styles.fieldText}>Which ajza specifically?</p>
                  <div style={styles.juzGrid}>
                    {juzOptions.map((juz) => {
                      const isSelected = signupForm.memorizedJuzList.includes(juz);

                      return (
                        <button
                          key={juz}
                          type="button"
                          onClick={() => toggleJuz(juz)}
                          style={{
                            ...styles.juzButton,
                            ...(isSelected ? styles.selectedJuzButton : {}),
                          }}
                        >
                          {juz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.currentProgressGrid}>
                  <label style={styles.label}>
                    Current Juz
                    <select
                      value={signupForm.currentJuz}
                      onChange={(e) => updateSignupForm("currentJuz", e.target.value)}
                      style={styles.input}
                    >
                      {juzOptions.map((juz) => (
                        <option key={juz} value={juz}>
                          Juz {juz}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    Current Surah
                    <select
                      value={signupForm.currentSurah}
                      onChange={(e) => {
                        updateSignupForm("currentSurah", Number(e.target.value));
                        updateSignupForm("currentAyah", 1);
                      }}
                      style={styles.input}
                    >
                      {surahs.map((surah) => (
                        <option key={surah.number} value={surah.number}>
                          {surah.number}. {surah.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    Current Ayah
                    <select
                      value={signupForm.currentAyah}
                      onChange={(e) => updateSignupForm("currentAyah", Number(e.target.value))}
                      style={styles.input}
                    >
                      {currentAyahOptions.map((ayah) => (
                        <option key={ayah} value={ayah}>
                          {ayah}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    style={styles.secondaryButton}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSignup}
                    disabled={isLoading}
                    style={{
                      ...styles.button,
                      opacity: isLoading ? 0.7 : 1,
                      cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
    maxWidth: 560,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #dce6df",
    borderRadius: 10,
    padding: 32,
    boxShadow: "0 18px 45px rgba(32, 63, 48, 0.1)",
  },
  logo: {
    display: "block",
    width: 92,
    height: 92,
    objectFit: "cover",
    borderRadius: 18,
    margin: "0 auto 16px",
    boxShadow: "0 12px 24px rgba(21, 86, 57, 0.18)",
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
    marginBottom: 22,
  },
  segmentedControl: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    background: "#edf3ef",
    border: "1px solid #d8e3dc",
    borderRadius: 8,
    padding: 5,
    marginBottom: 22,
  },
  segmentButton: {
    minHeight: 36,
    color: "#5b7067",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    fontWeight: 750,
    cursor: "pointer",
  },
  activeSegmentButton: {
    color: "#17201b",
    background: "#ffffff",
    boxShadow: "0 6px 14px rgba(32, 63, 48, 0.08)",
  },
  form: {
    display: "grid",
    gap: 15,
  },
  stepRow: {
    display: "grid",
    gridTemplateColumns: "32px 1fr 32px",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  step: {
    display: "grid",
    placeItems: "center",
    height: 32,
    borderRadius: 16,
    color: "#64766d",
    background: "#edf3ef",
    fontWeight: 800,
  },
  activeStep: {
    display: "grid",
    placeItems: "center",
    height: 32,
    borderRadius: 16,
    color: "white",
    background: "#1f7a55",
    fontWeight: 800,
  },
  stepLine: {
    height: 1,
    background: "#d8e3dc",
  },
  label: {
    display: "grid",
    gap: 7,
    color: "#5b7067",
    fontSize: 13,
    fontWeight: 700,
  },
  notification: {
    color: "#9a3d34",
    background: "#fff4f2",
    border: "1px solid #f1c7c1",
    borderRadius: 8,
    padding: "11px 13px",
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.4,
  },
  fieldText: {
    color: "#5b7067",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
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
  juzGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: 6,
  },
  juzButton: {
    minHeight: 32,
    color: "#5b7067",
    background: "#fbfdfb",
    border: "1px solid #d8e3dc",
    borderRadius: 6,
    fontWeight: 750,
    cursor: "pointer",
  },
  selectedJuzButton: {
    color: "white",
    background: "#1f7a55",
    borderColor: "#1b6f4d",
  },
  currentProgressGrid: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.4fr 0.8fr",
    gap: 10,
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "0.7fr 1fr",
    gap: 10,
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
  secondaryButton: {
    width: "100%",
    minHeight: 44,
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 7,
    fontWeight: 750,
    marginTop: 4,
    cursor: "pointer",
  },
};
