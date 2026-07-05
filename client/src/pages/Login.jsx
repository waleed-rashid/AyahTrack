import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { saveSession } from "../auth/auth";
import hifzLogo from "../assets/hifz-logo.png";
import { surahs } from "../data/surahs";

const juzOptions = Array.from({ length: 30 }, (_, index) => index + 1);
const formatRevisionPreference = (juzAmount = 0) => {
  const numericJuzAmount = Number(juzAmount) || 0;
  const pages = numericJuzAmount * 20;
  const pageLabel = pages === 1 ? "page" : "pages";

  return `${numericJuzAmount} juz (${pages} ${pageLabel})`;
};
const juzStarts = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];
const surahOffsets = surahs.reduce((offsets, surah, index) => {
  const previousSurah = surahs[index - 1];
  const previousOffset = previousSurah ? offsets[previousSurah.number] + previousSurah.ayahs : 0;

  offsets[surah.number] = previousOffset;
  return offsets;
}, {});
const getSurahByNumber = (surahNumber) =>
  surahs.find((surah) => surah.number === Number(surahNumber)) || surahs[0];
const getGlobalAyahNumber = (surahNumber, ayah) => surahOffsets[Number(surahNumber)] + Number(ayah);
const getPreviousAyahReference = (surahNumber, ayah) => {
  if (ayah > 1) {
    return { surah: surahNumber, ayah: ayah - 1 };
  }

  const previousSurah = getSurahByNumber(surahNumber - 1);

  return { surah: previousSurah.number, ayah: previousSurah.ayahs };
};
const juzIntervals = juzStarts.map((juzStart, index) => {
  const nextJuzStart = juzStarts[index + 1];
  const endReference = nextJuzStart
    ? getPreviousAyahReference(nextJuzStart.surah, nextJuzStart.ayah)
    : { surah: 114, ayah: 6 };

  return {
    juz: juzStart.juz,
    start: getGlobalAyahNumber(juzStart.surah, juzStart.ayah),
    end: getGlobalAyahNumber(endReference.surah, endReference.ayah),
    startReference: juzStart,
    endReference,
  };
});
const getJuzForReference = (surahNumber, ayah) => {
  const globalAyah = getGlobalAyahNumber(surahNumber, ayah);
  return juzIntervals.find((interval) => globalAyah >= interval.start && globalAyah <= interval.end);
};
const isReferenceInMemorizedJuz = (memorizedJuzList, surahNumber, ayah) => {
  const juz = getJuzForReference(surahNumber, ayah)?.juz;
  return memorizedJuzList.includes(juz);
};
const getFirstAvailableCurrentPoint = (memorizedJuzList) => {
  const firstAvailableJuz = juzIntervals.find((interval) => !memorizedJuzList.includes(interval.juz));
  const fallback = firstAvailableJuz || juzIntervals[juzIntervals.length - 1];

  return {
    currentJuz: fallback.juz,
    currentSurah: fallback.startReference.surah,
    currentAyah: fallback.startReference.ayah,
  };
};

export default function Login() {
  const [mode, setMode] = useState("login");
  const [signupStep, setSignupStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signupErrors, setSignupErrors] = useState([]);
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
    averageSabaqPages: 0.5,
    averageSabaqParaPages: 3,
    averageRevisionJuz: 0.25,
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
  const isCurrentSurahFullyMemorized = (surah) =>
    Array.from({ length: surah.ayahs }, (_, index) => index + 1).every((ayah) =>
      isReferenceInMemorizedJuz(signupForm.memorizedJuzList, surah.number, ayah)
    );
  const getFirstAvailableAyahInSurah = (surahNumber) => {
    const surah = getSurahByNumber(surahNumber);

    return (
      Array.from({ length: surah.ayahs }, (_, index) => index + 1).find(
        (ayah) => !isReferenceInMemorizedJuz(signupForm.memorizedJuzList, surah.number, ayah)
      ) || 1
    );
  };
  const setCurrentJuz = (juz) => {
    const juzInterval = juzIntervals.find((interval) => interval.juz === Number(juz));
    const startReference = juzInterval?.startReference || getFirstAvailableCurrentPoint([]);

    setSignupForm((currentForm) => ({
      ...currentForm,
      currentJuz: Number(juz),
      currentSurah: startReference.surah,
      currentAyah: startReference.ayah,
    }));
  };
  const setCurrentSurah = (surahNumber) => {
    const nextAyah = getFirstAvailableAyahInSurah(surahNumber);
    const nextJuz = getJuzForReference(Number(surahNumber), nextAyah)?.juz || signupForm.currentJuz;

    setSignupForm((currentForm) => ({
      ...currentForm,
      currentJuz: nextJuz,
      currentSurah: Number(surahNumber),
      currentAyah: nextAyah,
    }));
  };
  const setCurrentAyah = (ayah) => {
    const nextJuz =
      getJuzForReference(Number(signupForm.currentSurah), Number(ayah))?.juz ||
      signupForm.currentJuz;

    setSignupForm((currentForm) => ({
      ...currentForm,
      currentJuz: nextJuz,
      currentAyah: Number(ayah),
    }));
  };

  const updateLoginForm = (field, value) => {
    setLoginError("");
    setLoginForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateSignupForm = (field, value) => {
    setSignupErrors([]);
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
        ...(isReferenceInMemorizedJuz(
          memorizedJuzList,
          currentForm.currentSurah,
          currentForm.currentAyah
        )
          ? getFirstAvailableCurrentPoint(memorizedJuzList)
          : {}),
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
      const responseMessage = err.response?.data?.message;
      const responseMessages = Array.isArray(err.response?.data?.messages)
        ? err.response.data.messages
        : responseMessage
          ? [responseMessage]
          : [];
      const emailMissingMessage = responseMessages.find((message) =>
        String(message).toLowerCase().includes("email")
      );

      setLoginError(
        emailMissingMessage ||
          responseMessages[0] ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupNext = async () => {
    const validationErrors = [];

    if (
      !signupForm.name.trim() ||
      !signupForm.email.trim() ||
      !signupForm.password ||
      !signupForm.confirmPassword
    ) {
      validationErrors.push("Please fill out every field.");
    }

    if (signupForm.password.length < 7) {
      validationErrors.push("Password must be at least 7 characters.");
    }

    if (
      signupForm.password &&
      signupForm.confirmPassword &&
      signupForm.password !== signupForm.confirmPassword
    ) {
      validationErrors.push("Passwords do not match.");
    }

    if (validationErrors.length > 0) {
      setSignupErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/check-email", { email: signupForm.email.trim() });
      setSignupStep(2);
    } catch (err) {
      setSignupErrors([err.response?.data?.message || "Email is already in use."]);
    } finally {
      setIsLoading(false);
    }
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
        averageSabaqPages: Number(signupForm.averageSabaqPages),
        averageSabaqParaPages: Number(signupForm.averageSabaqParaPages),
        averageRevisionJuz: Number(signupForm.averageRevisionJuz),
      });

      saveSession(res.data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSignupStep(1);
      setSignupErrors([err.response?.data?.message || "Signup failed. Please check your details."]);
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
              <span style={styles.stepLine} />
              <span style={signupStep === 3 ? styles.activeStep : styles.step}>3</span>
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

                {signupErrors.length > 0 ? (
                  <div style={styles.notification}>
                    {signupErrors.map((error) => (
                      <p key={error} style={styles.notificationLine}>
                        {error}
                      </p>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSignupNext}
                  disabled={isLoading}
                  style={{
                    ...styles.button,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? "Checking..." : "Continue"}
                </button>
              </>
            ) : signupStep === 2 ? (
              <>
                <label style={styles.label}>
                  How many ajzaa have you memorized?
                  <input
                    value={signupForm.memorizedJuzCount}
                    type="number"
                    tabIndex={-1}
                    aria-readonly="true"
                    readOnly
                    style={{ ...styles.input, ...styles.memorizedJuzCountInput }}
                  />
                </label>

                <div>
                  <p style={styles.fieldText}>Which ajzaa specifically?</p>
                  <div style={styles.juzGrid}>
                    {juzOptions.map((juz) => {
                      const isSelected = signupForm.memorizedJuzList.includes(juz);

                      return (
                        <button
                          className={`signup-juz-button${isSelected ? " signup-juz-button-selected" : ""}`}
                          key={juz}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            toggleJuz(juz);
                            event.currentTarget.blur();
                          }}
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
                      onChange={(e) => setCurrentJuz(e.target.value)}
                      style={styles.input}
                    >
                      {juzOptions.map((juz) => (
                        <option
                          key={juz}
                          value={juz}
                          disabled={signupForm.memorizedJuzList.includes(juz)}
                        >
                          Juz {juz}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    Current Surah
                    <select
                      value={signupForm.currentSurah}
                      onChange={(e) => setCurrentSurah(e.target.value)}
                      style={styles.input}
                    >
                      {surahs.map((surah) => (
                        <option
                          key={surah.number}
                          value={surah.number}
                          disabled={isCurrentSurahFullyMemorized(surah)}
                        >
                          {surah.number}. {surah.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    Current Ayah
                    <select
                      value={signupForm.currentAyah}
                      onChange={(e) => setCurrentAyah(e.target.value)}
                      style={styles.input}
                    >
                      {currentAyahOptions.map((ayah) => (
                        <option
                          key={ayah}
                          value={ayah}
                          disabled={isReferenceInMemorizedJuz(
                            signupForm.memorizedJuzList,
                            selectedCurrentSurah.number,
                            ayah
                          )}
                        >
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
                    onClick={() => setSignupStep(3)}
                    style={styles.button}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.preferenceGrid}>
                  <label style={styles.label}>
                    <span style={styles.preferenceLabelText}>Average Sabaq</span>
                    <div style={styles.preferenceSliderRow}>
                      <input
                        className="lesson-preference-slider"
                        type="range"
                        min="0.25"
                        max="1"
                        step="0.25"
                        value={signupForm.averageSabaqPages}
                        onChange={(e) =>
                          updateSignupForm("averageSabaqPages", Number(e.target.value))
                        }
                        style={styles.preferenceSlider}
                      />
                      <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                        {signupForm.averageSabaqPages}{" "}
                        {signupForm.averageSabaqPages === 1 ? "page" : "pages"}
                      </span>
                    </div>
                  </label>

                  <label style={styles.label}>
                    <span style={styles.preferenceLabelText}>Average Sabaq Para</span>
                    <div style={styles.preferenceSliderRow}>
                      <input
                        className="lesson-preference-slider"
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={signupForm.averageSabaqParaPages}
                        onChange={(e) =>
                          updateSignupForm("averageSabaqParaPages", Number(e.target.value))
                        }
                        style={styles.preferenceSlider}
                      />
                      <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                        {signupForm.averageSabaqParaPages}{" "}
                        {signupForm.averageSabaqParaPages === 1 ? "page" : "pages"}
                      </span>
                    </div>
                  </label>

                  <label style={styles.label}>
                    <span style={styles.preferenceLabelText}>Average Revision</span>
                    <div style={styles.preferenceSliderRow}>
                      <input
                        className="lesson-preference-slider"
                        type="range"
                        min="0.25"
                        max="1"
                        step="0.25"
                        value={signupForm.averageRevisionJuz}
                        onChange={(e) =>
                          updateSignupForm("averageRevisionJuz", Number(e.target.value))
                        }
                        style={styles.preferenceSlider}
                      />
                      <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                        {formatRevisionPreference(signupForm.averageRevisionJuz)}
                      </span>
                    </div>
                  </label>
                </div>

                <p style={styles.helperText}>
                  These will be used to determine your ideal lesson ranges for the day, they do not affect your progress. You can always change them later.
                </p>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => setSignupStep(2)}
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
    gridTemplateColumns: "32px 1fr 32px 1fr 32px",
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
  notificationLine: {
    margin: 0,
  },
  fieldText: {
    color: "#5b7067",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  helperText: {
    color: "#60756b",
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: -2,
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
  memorizedJuzCountInput: {
    width: 72,
    minHeight: 40,
    justifySelf: "start",
    textAlign: "center",
    pointerEvents: "none",
    userSelect: "none",
    color: "#1f7a55",
    background: "#edf7f1",
    borderColor: "#d8ecdf",
    fontWeight: 850,
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
  preferenceGrid: {
    display: "grid",
    gap: 18,
  },
  preferenceLabelText: {
    display: "block",
    textAlign: "center",
  },
  preferenceSliderRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(132px, auto)",
    alignItems: "center",
    gap: 13,
    minHeight: 40,
  },
  preferenceSlider: {
    width: "100%",
  },
  preferenceSliderValue: {
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 7,
    padding: "7px 9px",
    textAlign: "center",
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
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
