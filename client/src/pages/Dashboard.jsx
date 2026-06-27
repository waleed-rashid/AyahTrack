import { useEffect, useState } from "react";
import { createDailyEntry, getDashboardData } from "../api/api";
import { surahs } from "../data/surahs";
import {
  coverageTypes,
  createCoverageFromEntry,
  createDefaultCoverage,
  formatCoverageRange,
  formatRecentCoverage,
  getSurahByNumber,
  isVisibleRecentEntry,
} from "../utils/coverage";
import { formatEntryDate } from "../utils/dates";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [coverage, setCoverage] = useState(createDefaultCoverage);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getDashboardData();
        const latestVisibleEntry = dashboardData.recentEntries?.find(isVisibleRecentEntry);

        setData(dashboardData);
        setCoverage(createCoverageFromEntry(latestVisibleEntry));
      } catch (error) {
        setLoadError(error.response?.data?.message || "Dashboard failed to load.");
      }
    };

    fetchData();
  }, []);

  const updateCoverage = (typeKey, field, value) => {
    setCoverage((currentCoverage) => {
      const currentEntry = currentCoverage[typeKey];

      if (field === "startSurahNumber") {
        const selectedSurah = getSurahByNumber(value);
        const nextEntry = {
          ...currentEntry,
          startSurahNumber: selectedSurah.number,
          startAyah: 1,
        };

        if (selectedSurah.number > nextEntry.endSurahNumber) {
          nextEntry.endSurahNumber = selectedSurah.number;
          nextEntry.endAyah = selectedSurah.ayahs;
        }

        return {
          ...currentCoverage,
          [typeKey]: nextEntry,
        };
      }

      if (field === "endSurahNumber") {
        const selectedSurah = getSurahByNumber(value);
        const nextEntry = {
          ...currentEntry,
          endSurahNumber: selectedSurah.number,
          endAyah: selectedSurah.ayahs,
        };

        if (selectedSurah.number < nextEntry.startSurahNumber) {
          nextEntry.startSurahNumber = selectedSurah.number;
          nextEntry.startAyah = 1;
        }

        return {
          ...currentCoverage,
          [typeKey]: nextEntry,
        };
      }

      const numericValue = Number(value);
      const nextEntry = {
        ...currentEntry,
        [field]: numericValue,
      };

      if (
        field === "startAyah" &&
        nextEntry.startSurahNumber === nextEntry.endSurahNumber &&
        numericValue > nextEntry.endAyah
      ) {
        nextEntry.endAyah = numericValue;
      }

      if (
        field === "endAyah" &&
        nextEntry.startSurahNumber === nextEntry.endSurahNumber &&
        numericValue < nextEntry.startAyah
      ) {
        nextEntry.startAyah = numericValue;
      }

      return {
        ...currentCoverage,
        [typeKey]: nextEntry,
      };
    });
  };

  const saveEntry = async () => {
    const sabaq = formatCoverageRange(coverage.sabaq);
    const sabaqPara = formatCoverageRange(coverage.sabaqPara);
    const revision = formatCoverageRange(coverage.revision);

    setIsSaving(true);

    try {
      const savedEntry = await createDailyEntry({
        sabaq,
        sabaqPara,
        manzil: revision,
        notes: "",
        coverage,
      });

      setData((currentData) => ({
        ...currentData,
        streak: savedEntry.streak,
        longestStreak: savedEntry.longestStreak,
        progress: savedEntry.progress,
        recentEntries: [
          savedEntry.entry,
          ...(Array.isArray(currentData.recentEntries) ? currentData.recentEntries : []),
        ].slice(0, 7),
      }));
      setCoverage(createCoverageFromEntry(savedEntry.entry));
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) return <p style={styles.loading}>{loadError}</p>;
  if (!data) return <p style={styles.loading}>Loading...</p>;

  const studentName = data.studentName || data.user?.name || "Student";
  const progress = data.progress || {};
  const savedEntries = Array.isArray(data.recentEntries) ? data.recentEntries : [];
  const recentEntries = savedEntries.filter(isVisibleRecentEntry).slice(0, 7);
  const currentSurah = progress.currentSurah
    ? surahs.find((surah) => surah.number === Number(progress.currentSurah))
    : null;
  const currentProgressText =
    currentSurah && progress.currentAyah
      ? `${currentSurah.name} ${progress.currentAyah}`
      : "Not set";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <p style={styles.kicker}>وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ</p>
        <h1 style={styles.greeting}>
          Assalamu Alaikum, <span style={styles.studentName}>{studentName}</span>.
        </h1>
        <p style={styles.subtitle}>Let's stay consistent with your Hifz today.</p>
      </header>

      <main style={styles.content}>
        <div style={styles.dashboardGrid}>
          <div style={styles.leftColumn}>
            <section style={{ ...styles.panel, ...styles.panelIntroOne }}>
              <h2 style={styles.panelTitle}>Progress Overview 📝</h2>

              <div style={styles.progressList}>
                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Ajza Memorized</span>
                  <strong style={styles.progressValue}>{progress.juz || 0}</strong>
                </div>

                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Surahs Memorized</span>
                  <strong style={styles.progressValue}>{progress.surahs || 0}</strong>
                </div>

                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Current Point</span>
                  <strong style={styles.progressTextValue}>{currentProgressText}</strong>
                </div>

                <div style={styles.currentJuzItem}>
                  <div style={styles.currentJuzHeader}>
                    <span style={styles.progressLabel}>Current Juz</span>
                    <strong style={styles.progressTextValue}>
                      {progress.currentJuz ? `Juz ${progress.currentJuz}` : "Not set"}
                    </strong>
                  </div>
                  <div style={styles.progressBarTrack}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${progress.currentJuzProgressPercent || 0}%`,
                      }}
                    />
                  </div>
                  <p style={styles.progressPercentText}>
                    {progress.currentJuzProgressPercent || 0}% complete
                  </p>
                </div>
              </div>
            </section>

            <section style={{ ...styles.panel, ...styles.streakPanel, ...styles.panelIntroTwo }}>
              <h2 style={styles.smallPanelTitle}>Streaks 🔥</h2>

              <div style={styles.streakGrid}>
                <div style={styles.streakCard}>
                  <span style={styles.streakLabel}>Current</span>
                  <strong style={styles.streakValue}>{data.streak}</strong>
                </div>

                <div style={styles.streakCard}>
                  <span style={styles.streakLabel}>Longest</span>
                  <strong style={styles.streakValue}>{data.longestStreak}</strong>
                </div>
              </div>
            </section>
          </div>

          <section style={{ ...styles.panel, ...styles.panelIntroThree }}>
            <h2 style={styles.panelTitle}>What did you cover today? 🧠</h2>

            <div style={styles.coverageList}>
              {coverageTypes.map((type) => {
                const entry = coverage[type.key];
                const startSurah = getSurahByNumber(entry.startSurahNumber);
                const endSurah = getSurahByNumber(entry.endSurahNumber);
                const startAyahOptions = Array.from(
                  { length: startSurah.ayahs },
                  (_, index) => index + 1
                );
                const endAyahOptions = Array.from(
                  { length: endSurah.ayahs },
                  (_, index) => index + 1
                );

                return (
                  <div key={type.key} style={styles.coverageGroup}>
                    <h3 style={styles.coverageTitle}>{type.label}</h3>

                    <div style={styles.rangeGrid}>
                      <label style={styles.label}>
                        Starting Surah
                        <select
                          className="dashboard-select"
                          value={entry.startSurahNumber}
                          onChange={(event) =>
                            updateCoverage(type.key, "startSurahNumber", event.target.value)
                          }
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
                        Starting Ayah
                        <select
                          className="dashboard-select"
                          value={entry.startAyah}
                          onChange={(event) =>
                            updateCoverage(type.key, "startAyah", event.target.value)
                          }
                          style={styles.input}
                        >
                          {startAyahOptions.map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={styles.label}>
                        Ending Surah
                        <select
                          className="dashboard-select"
                          value={entry.endSurahNumber}
                          onChange={(event) =>
                            updateCoverage(type.key, "endSurahNumber", event.target.value)
                          }
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
                        Ending Ayah
                        <select
                          className="dashboard-select"
                          value={entry.endAyah}
                          onChange={(event) =>
                            updateCoverage(type.key, "endAyah", event.target.value)
                          }
                          style={styles.input}
                        >
                          {endAyahOptions.map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              style={{
                ...styles.button,
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
              onClick={saveEntry}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Entry"}
            </button>
          </section>

          <section style={{ ...styles.panel, ...styles.panelIntroFour }}>
            <h2 style={styles.panelTitle}>Recent Entries</h2>

            {recentEntries.length === 0 ? (
              <p style={styles.emptyText}>No recent entries yet.</p>
            ) : (
              recentEntries.map((entry) => (
                <div key={entry.id} style={styles.entry}>
                  <p style={styles.entryDate}>{formatEntryDate(entry.date)}</p>
                  <p style={styles.entryLine}>
                    <b>Sabaq:</b> {formatRecentCoverage(entry.sabaq)}
                  </p>
                  <p style={styles.entryLine}>
                    <b>Sabaq Para:</b> {formatRecentCoverage(entry.sabaqPara)}
                  </p>
                  <p style={styles.entryLine}>
                    <b>Revision:</b> {formatRecentCoverage(entry.manzil)}
                  </p>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "34px 28px 48px",
    background: "linear-gradient(180deg, #f3f7f4 0%, #eaf1ed 100%)",
    color: "#17201b",
    fontFamily: 'Aptos, "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
    overflowX: "auto",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#557166",
    background: "#eef3ef",
  },
  header: {
    maxWidth: 1120,
    margin: "0 auto 24px",
    textAlign: "center",
    opacity: 0,
    animation: "dashboard-dissolve-in 700ms ease-out 80ms forwards",
  },
  kicker: {
    color: "#4d7c65",
    fontSize: 13,
    fontWeight: 750,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  greeting: {
    color: "#111815",
    fontFamily: '"Aptos Display", Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    fontSize: 36,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  studentName: {
    color: "#1f7a55",
  },
  subtitle: {
    color: "#60756b",
    fontSize: 16,
    lineHeight: 1.5,
    marginTop: 10,
  },
  content: {
    maxWidth: 1120,
    margin: "0 auto",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.85fr) minmax(360px, 1.15fr) minmax(260px, 0.95fr)",
    gap: 18,
    alignItems: "start",
    minWidth: 880,
  },
  leftColumn: {
    display: "grid",
    gap: 14,
  },
  panel: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #dce6df",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 18px 45px rgba(32, 63, 48, 0.08)",
    opacity: 0,
    animation: "dashboard-dissolve-in 760ms ease-out forwards",
  },
  panelIntroOne: {
    animationDelay: "180ms",
  },
  panelIntroTwo: {
    animationDelay: "300ms",
  },
  panelIntroThree: {
    animationDelay: "240ms",
  },
  panelIntroFour: {
    animationDelay: "360ms",
  },
  panelTitle: {
    color: "#18231f",
    fontFamily: '"Aptos Display", Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 800,
    marginBottom: 18,
  },
  smallPanelTitle: {
    color: "#18231f",
    fontFamily: '"Aptos Display", Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    fontSize: 16,
    lineHeight: 1.2,
    fontWeight: 800,
    marginBottom: 12,
  },
  streakPanel: {
    padding: 16,
  },
  streakGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  streakCard: {
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 8,
    padding: "10px 8px",
    textAlign: "center",
  },
  streakLabel: {
    display: "block",
    color: "#64766d",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  streakValue: {
    color: "#1f7a55",
    fontSize: 22,
    lineHeight: 1,
  },
  progressList: {
    display: "grid",
    gap: 2,
  },
  progressItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: "13px 0",
    borderBottom: "1px solid #edf2ee",
  },
  progressLabel: {
    color: "#64766d",
    fontSize: 14,
  },
  progressValue: {
    minWidth: 38,
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 6,
    padding: "4px 9px",
    textAlign: "center",
    fontSize: 18,
    lineHeight: 1.2,
  },
  progressTextValue: {
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 6,
    padding: "4px 9px",
    textAlign: "right",
    fontSize: 13,
    lineHeight: 1.2,
  },
  currentJuzItem: {
    padding: "13px 0",
    borderBottom: "1px solid #edf2ee",
  },
  currentJuzHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 8,
    background: "#edf3ef",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#1f7a55",
    borderRadius: 999,
  },
  progressPercentText: {
    color: "#64766d",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 7,
    textAlign: "right",
  },
  coverageList: {
    display: "grid",
    gap: 16,
    marginBottom: 18,
  },
  coverageGroup: {
    padding: "0 0 16px",
    borderBottom: "1px solid #edf2ee",
  },
  coverageTitle: {
    color: "#25352f",
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 11,
  },
  rangeGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 0.7fr",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 7,
    color: "#5b7067",
    fontSize: 12,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: 40,
    color: "#17201b",
    background: "#fbfdfb",
    border: "1px solid #d8e3dc",
    borderRadius: 7,
    padding: "8px 10px",
    outlineColor: "#65a985",
  },
  button: {
    width: "100%",
    minHeight: 42,
    color: "white",
    background: "#1f7a55",
    border: "1px solid #1b6f4d",
    borderRadius: 7,
    fontWeight: 750,
    boxShadow: "0 10px 18px rgba(31, 122, 85, 0.18)",
  },
  entry: {
    background: "#fbfdfb",
    border: "1px solid #e3ece6",
    borderRadius: 8,
    padding: 13,
    marginBottom: 10,
  },
  entryDate: {
    color: "#7a8d84",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  entryLine: {
    color: "#2a3833",
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 4,
  },
  emptyText: {
    color: "#64766d",
    fontSize: 14,
    background: "#fbfdfb",
    border: "1px dashed #d8e3dc",
    borderRadius: 8,
    padding: 16,
    textAlign: "center",
  },
};
