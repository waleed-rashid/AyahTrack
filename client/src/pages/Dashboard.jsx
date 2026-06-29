import { useEffect, useRef, useState } from "react";
import {
  createDailyEntry,
  deleteDailyEntry,
  getDashboardData,
  restoreDailyEntry,
} from "../api/api";
import { surahs } from "../data/surahs";
import {
  coverageTypes,
  buildSabaqCoverageMap,
  createNextCoverageFromLatest,
  createNextSabaqCoverage,
  createDefaultCoverage,
  formatCoverageRange,
  formatRecentCoverage,
  getAvailableAyahsForSabaq,
  getSurahByNumber,
  hasSavedCoverage,
  isSabaqRangeAvailable,
  isVisibleRecentEntry,
} from "../utils/coverage";
import { formatEntryDate } from "../utils/dates";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [coverage, setCoverage] = useState(createDefaultCoverage);
  const [activeCoverageKeys, setActiveCoverageKeys] = useState([]);
  const [notes, setNotes] = useState("");
  const [pendingUndo, setPendingUndo] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const undoTimeoutRef = useRef(null);
  const deleteNoticeTimeoutRef = useRef(null);

  const applyDashboardData = (dashboardData) => {
    const sabaqCoverageMap = buildSabaqCoverageMap(dashboardData.sabaqEntries);
    const nextCoverage = createNextCoverageFromLatest(dashboardData.latestCoverage);

    setData(dashboardData);
    setCoverage({
      ...nextCoverage,
      sabaq: createNextSabaqCoverage(sabaqCoverageMap, nextCoverage.sabaq) || nextCoverage.sabaq,
    });
  };

  const showUndoPrompt = (undoOperation) => {
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
    }

    setPendingUndo(undoOperation);
    undoTimeoutRef.current = window.setTimeout(() => {
      setPendingUndo(null);
      undoTimeoutRef.current = null;
    }, 7000);
  };

  const dismissUndoPrompt = () => {
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    setPendingUndo(null);
  };

  const showDeleteNotice = () => {
    if (deleteNoticeTimeoutRef.current) {
      window.clearTimeout(deleteNoticeTimeoutRef.current);
    }

    setDeleteNotice("Entry deleted.");
    deleteNoticeTimeoutRef.current = window.setTimeout(() => {
      setDeleteNotice("");
      deleteNoticeTimeoutRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getDashboardData();
        applyDashboardData(dashboardData);
      } catch (error) {
        setLoadError(error.response?.data?.message || "Dashboard failed to load.");
      }
    };

    fetchData();

    return () => {
      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }

      if (deleteNoticeTimeoutRef.current) {
        window.clearTimeout(deleteNoticeTimeoutRef.current);
      }
    };
  }, []);

  const updateCoverage = (typeKey, field, value) => {
    setCoverage((currentCoverage) => {
      const currentEntry = currentCoverage[typeKey];

      if (field === "startSurahNumber") {
        const selectedSurah = getSurahByNumber(value);
        const availableAyahs =
          typeKey === "sabaq"
            ? getAvailableAyahsForSabaq(buildSabaqCoverageMap(data?.sabaqEntries), selectedSurah.number)
            : [];
        const firstAvailableAyah = availableAyahs[0] || 1;
        const nextEntry = {
          ...currentEntry,
          startSurahNumber: selectedSurah.number,
          startAyah: typeKey === "sabaq" ? firstAvailableAyah : 1,
        };

        if (selectedSurah.number > nextEntry.endSurahNumber) {
          nextEntry.endSurahNumber = selectedSurah.number;
          nextEntry.endAyah =
            typeKey === "sabaq"
              ? availableAyahs[availableAyahs.length - 1] || selectedSurah.ayahs
              : selectedSurah.ayahs;
        }

        return {
          ...currentCoverage,
          [typeKey]: nextEntry,
        };
      }

      if (field === "endSurahNumber") {
        const selectedSurah = getSurahByNumber(value);
        const availableAyahs =
          typeKey === "sabaq"
            ? getAvailableAyahsForSabaq(buildSabaqCoverageMap(data?.sabaqEntries), selectedSurah.number)
            : [];
        const lastAvailableAyah = availableAyahs[availableAyahs.length - 1] || selectedSurah.ayahs;
        const nextEntry = {
          ...currentEntry,
          endSurahNumber: selectedSurah.number,
          endAyah: typeKey === "sabaq" ? lastAvailableAyah : selectedSurah.ayahs,
        };

        if (selectedSurah.number < nextEntry.startSurahNumber) {
          nextEntry.startSurahNumber = selectedSurah.number;
          nextEntry.startAyah = typeKey === "sabaq" ? availableAyahs[0] || 1 : 1;
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

  const toggleCoverageSection = (typeKey) => {
    setActiveCoverageKeys((currentKeys) =>
      currentKeys.includes(typeKey)
        ? currentKeys.filter((key) => key !== typeKey)
        : [...currentKeys, typeKey]
    );
  };

  const saveEntry = async () => {
    const trimmedNotes = notes.trim();

    if (activeCoverageKeys.length === 0 && !trimmedNotes) {
      alert("Choose Sabaq, Sabaq Para, Revision, or add a note first.");
      return;
    }

    const selectedCoverage = activeCoverageKeys.reduce((selected, typeKey) => {
      selected[typeKey] = coverage[typeKey];
      return selected;
    }, {});
    const entryPayload = {
      coverage: selectedCoverage,
    };

    if (trimmedNotes) {
      entryPayload.notes = trimmedNotes;
    }

    if (activeCoverageKeys.includes("sabaq")) {
      const sabaqCoverageMap = buildSabaqCoverageMap(data.sabaqEntries);

      if (!isSabaqRangeAvailable(sabaqCoverageMap, coverage.sabaq)) {
        alert("That Sabaq range includes ayahs already saved. Choose only available ayahs.");
        return;
      }

      entryPayload.sabaq = formatCoverageRange(coverage.sabaq);
    }

    if (activeCoverageKeys.includes("sabaqPara")) {
      entryPayload.sabaqPara = formatCoverageRange(coverage.sabaqPara);
    }

    if (activeCoverageKeys.includes("revision")) {
      entryPayload.manzil = formatCoverageRange(coverage.revision);
    }

    setIsSaving(true);

    try {
      const savedEntry = await createDailyEntry(entryPayload);
      const returnedRecentEntries = Array.isArray(savedEntry.recentEntries)
        ? savedEntry.recentEntries
        : [];

      setData((currentData) => {
        const currentRecentEntries = Array.isArray(currentData.recentEntries)
          ? currentData.recentEntries
          : [];
        const nextRecentEntries = [
          savedEntry.entry,
          ...returnedRecentEntries,
          ...currentRecentEntries,
        ]
          .filter(
            (entry, index, entries) =>
              entry?.id && entries.findIndex((candidate) => candidate.id === entry.id) === index
          )
          .slice(0, 7);

        return {
          ...currentData,
          streak: savedEntry.streak,
          longestStreak: savedEntry.longestStreak,
          longestStreakRange: savedEntry.longestStreakRange,
          weeklyActivity: savedEntry.weeklyActivity,
          achievementStats: savedEntry.achievementStats,
          progress: savedEntry.progress,
          sabaqEntries: savedEntry.sabaqEntries || currentData.sabaqEntries,
          latestCoverage: savedEntry.latestCoverage || currentData.latestCoverage,
          recentEntries: nextRecentEntries,
        };
      });
      setCoverage((currentCoverage) => {
        const nextSabaqCoverageMap = buildSabaqCoverageMap(savedEntry.sabaqEntries);
        const nextCoverage = createNextCoverageFromLatest(savedEntry.latestCoverage);

        return {
          ...nextCoverage,
          sabaq:
            createNextSabaqCoverage(nextSabaqCoverageMap, nextCoverage.sabaq) ||
            currentCoverage.sabaq,
        };
      });
      setActiveCoverageKeys([]);
      setNotes("");
      showUndoPrompt(savedEntry.undoOperation);
    } catch (error) {
      alert(error.response?.data?.message || "Entry failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const undoSavedEntry = async () => {
    if (!pendingUndo) {
      return;
    }

    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const undoOperation = pendingUndo;
    setPendingUndo(null);

    try {
      if (undoOperation.type === "restore") {
        await restoreDailyEntry(undoOperation.entry);
      } else {
        await deleteDailyEntry(undoOperation.entryId);
      }

      const dashboardData = await getDashboardData();
      applyDashboardData(dashboardData);
      showDeleteNotice();
    } catch (error) {
      alert(error.response?.data?.message || "Undo failed. Please try again.");
    }
  };

  const renderLoadingScreen = (message) => (
    <div style={styles.loading}>
      <div style={styles.loadingCard}>
        <div style={styles.loaderRing}>
          <span style={styles.loaderDot} />
        </div>
        <p style={styles.loadingText}>{message}</p>
        <div style={styles.loadingDots} aria-hidden="true">
          <span style={styles.loadingDot} />
          <span style={{ ...styles.loadingDot, animationDelay: "120ms" }} />
          <span style={{ ...styles.loadingDot, animationDelay: "240ms" }} />
        </div>
      </div>
    </div>
  );

  if (loadError) return renderLoadingScreen(loadError);
  if (!data) return renderLoadingScreen("Loading your dashboard");

  const studentName = data.studentName || data.user?.name || "Student";
  const progress = data.progress || {};
  const savedEntries = Array.isArray(data.recentEntries) ? data.recentEntries : [];
  const recentEntries = savedEntries.filter(isVisibleRecentEntry).slice(0, 7);
  const sabaqCoverageMap = buildSabaqCoverageMap(data.sabaqEntries);
  const currentSurah = progress.currentSurah
    ? surahs.find((surah) => surah.number === Number(progress.currentSurah))
    : null;
  const currentProgressText =
    currentSurah && progress.currentAyah
      ? Number(progress.currentAyah) === currentSurah.ayahs
        ? currentSurah.name
        : `${currentSurah.name} ${progress.currentAyah}`
      : "Not set";
  const longestStreakRangeText = data.longestStreakRange
    ? `${formatEntryDate(data.longestStreakRange.startDate)} - ${formatEntryDate(
        data.longestStreakRange.endDate
      )}`
    : "No streak yet";
  const weeklyActivity = Array.isArray(data.weeklyActivity) ? data.weeklyActivity : [];
  const weeklyActivityColors = {
    0: "#c94a3d",
    1: "#e6c45b",
    2: "#a7d8b8",
    3: "#1f7a55",
  };
  const weeklyLegendItems = [
    { count: 3, label: "3/3" },
    { count: 2, label: "2/3" },
    { count: 1, label: "1/3" },
    { count: 0, label: "0/3" },
  ];
  const achievementStats = data.achievementStats || {};
  const achievementBadges = [
    {
      title: "First Entry",
      mark: "1",
      achieved: (achievementStats.totalEntries || 0) >= 1,
      description: "Save your first dashboard entry.",
      achievedDescription: "You saved your first dashboard entry.",
    },
    {
      title: "One Week Strong",
      mark: "7 🔥",
      achieved: data.longestStreak >= 7,
      description: "Complete all 3 daily sections 7 days in a row.",
      achievedDescription: "You reached a 7 day streak.",
    },
    {
      title: "30 Day Streak",
      mark: "30 🔥",
      achieved: data.longestStreak >= 30,
      description: "Complete all 3 daily sections 30 days in a row.",
      achievedDescription: "You reached a 30 day streak.",
    },
    {
      title: "First Juz",
      mark: "1/30",
      achieved: (progress.juz || 0) >= 1,
      description: "Finish every ayah in a juz through Sabaq.",
      achievedDescription: "You memorized one juz.",
    },
    {
      title: "5 Ajzaa",
      mark: "5/30",
      achieved: (progress.juz || 0) >= 5,
      description: "Memorize 5 ajzaa.",
      achievedDescription: "You memorized 5 ajzaa.",
    },
    {
      title: "15 Ajzaa",
      mark: "15",
      achieved: (progress.juz || 0) >= 15,
      description: "Memorize 15 ajzaa.",
      achievedDescription: "You memorized 15 ajzaa.",
    },
    {
      title: "First Surah",
      mark: "1/114",
      achieved: (progress.surahs || 0) >= 1,
      description: "Finish every ayah in a surah through Sabaq.",
      achievedDescription: "You completed at least one surah.",
    },
    {
      title: "50 Revisions",
      mark: "50",
      achieved: (achievementStats.revisionSessions || 0) >= 50,
      description: "Save 50 Revision sessions.",
      achievedDescription: "You saved 50 Revision sessions.",
    },
    {
      title: "100 Revisions",
      mark: "100",
      achieved: (achievementStats.revisionSessions || 0) >= 100,
      description: "Save 100 Revision sessions.",
      achievedDescription: "You saved 100 Revision sessions.",
    },
  ];
  const canSaveEntry = activeCoverageKeys.length > 0 || notes.trim().length > 0;

  return (
    <div className={darkMode ? "dashboard-page dashboard-dark" : "dashboard-page"} style={styles.page}>
      <div style={styles.topActions}>
        <button
          type="button"
          onClick={() => setShowBadges(true)}
          aria-label="Open achievement badges"
          title="Achievement badges"
          style={{
            ...styles.topActionButton,
            ...(darkMode ? styles.themeToggleDark : {}),
          }}
        >
          🏅
        </button>
        <button
          type="button"
          onClick={() => setDarkMode((currentMode) => !currentMode)}
          aria-label={darkMode ? "Turn off dark mode" : "Turn on dark mode"}
          title={darkMode ? "Light mode" : "Dark mode"}
          style={{
            ...styles.topActionButton,
            ...(darkMode ? styles.themeToggleDark : {}),
          }}
        >
          ☾
        </button>
      </div>

      <header style={styles.header}>
        <p style={styles.kicker}>وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ</p>
        <p style={styles.verseReference}>54:17</p>
        <p style={styles.verseTranslation}>
          And We have certainly made the Quran easy to remember.
          <br />
          So is there anyone who will be mindful?
        </p>
        <h1 style={styles.greeting}>
          Assalamu Alaikum, <span style={styles.studentName}>{studentName}</span>.
        </h1>
        <p style={styles.subtitle}>Let's stay consistent today.</p>
      </header>

      <main style={styles.content}>
        <div style={styles.dashboardGrid}>
          <div style={styles.leftColumn}>
            <section style={{ ...styles.panel, ...styles.panelIntroOne }}>
              <h2 style={styles.panelTitle}>Progress Overview 📝</h2>

              <div style={styles.progressList}>
                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Ajzaa Memorized</span>
                  <strong style={styles.progressValue}>{progress.juz || 0}</strong>
                </div>

                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Surahs Memorized</span>
                  <strong style={styles.progressValue}>{progress.surahs || 0}</strong>
                </div>

                <div style={styles.progressItem}>
                  <span style={styles.progressLabel}>Current Ayah</span>
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
                  <span style={styles.streakDateRange}>{longestStreakRangeText}</span>
                </div>
              </div>
            </section>

            <section style={{ ...styles.panel, ...styles.weeklyPanel, ...styles.panelIntroTwo }}>
              <h2 style={styles.smallPanelTitle}>Weekly Activity</h2>

              <div style={styles.weeklyGrid}>
                {weeklyActivity.map((day) => (
                  <div key={day.date} style={styles.weeklyDay}>
                    <span style={styles.weeklyDate}>{formatEntryDate(day.date).slice(0, 5)}</span>
                    <span
                      title={`${day.completedCount}/3 completed`}
                      style={{
                        ...styles.weeklyBox,
                        background:
                          weeklyActivityColors[day.completedCount] || weeklyActivityColors[0],
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={styles.weeklyLegend}>
                {weeklyLegendItems.map((item) => (
                  <span key={item.count} style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.legendSwatch,
                        background: weeklyActivityColors[item.count],
                      }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section style={{ ...styles.panel, ...styles.panelIntroThree }}>
            <h2 style={styles.panelTitle}>What did you cover today? 🧠</h2>

            <div style={styles.addButtonRow}>
              {coverageTypes.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => toggleCoverageSection(type.key)}
                  style={{
                    ...styles.addCoverageButton,
                    ...(activeCoverageKeys.includes(type.key) ? styles.addCoverageButtonActive : {}),
                  }}
                >
                  + {type.label}
                </button>
              ))}
            </div>

            <div style={styles.coverageList}>
              {activeCoverageKeys.length === 0 ? (
                <p style={styles.emptyCoverageText}>Choose what you'd like to add.</p>
              ) : null}

              {coverageTypes
                .filter((type) => activeCoverageKeys.includes(type.key))
                .map((type) => {
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
                const hasSabaqOptions =
                  type.key !== "sabaq" ||
                  surahs.some((surah) => (sabaqCoverageMap[surah.number]?.size || 0) < surah.ayahs);

                return (
                  <div key={type.key} style={styles.coverageGroup}>
                    <h3 style={styles.coverageTitle}>{type.label}</h3>

                    {!hasSabaqOptions ? (
                      <p style={styles.emptyCoverageText}>
                        All available Sabaq ayahs have already been saved.
                      </p>
                    ) : null}

                    <div style={styles.rangeGrid}>
                      <label style={styles.label}>
                        Starting Surah
                        <select
                          className="dashboard-select"
                          value={entry.startSurahNumber}
                          disabled={!hasSabaqOptions}
                          onChange={(event) =>
                            updateCoverage(type.key, "startSurahNumber", event.target.value)
                          }
                          style={styles.input}
                        >
                          {surahs.map((surah) => (
                            <option
                              key={surah.number}
                              value={surah.number}
                              disabled={
                                type.key === "sabaq" &&
                                (sabaqCoverageMap[surah.number]?.size || 0) >= surah.ayahs
                              }
                            >
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
                          disabled={!hasSabaqOptions}
                          onChange={(event) =>
                            updateCoverage(type.key, "startAyah", event.target.value)
                          }
                          style={styles.input}
                        >
                          {startAyahOptions.map((ayah) => (
                            <option
                              key={ayah}
                              value={ayah}
                              disabled={
                                type.key === "sabaq" &&
                                sabaqCoverageMap[startSurah.number]?.has(ayah)
                              }
                            >
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
                          disabled={!hasSabaqOptions}
                          onChange={(event) =>
                            updateCoverage(type.key, "endSurahNumber", event.target.value)
                          }
                          style={styles.input}
                        >
                          {surahs.map((surah) => (
                            <option
                              key={surah.number}
                              value={surah.number}
                              disabled={
                                type.key === "sabaq" &&
                                (sabaqCoverageMap[surah.number]?.size || 0) >= surah.ayahs
                              }
                            >
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
                          disabled={!hasSabaqOptions}
                          onChange={(event) =>
                            updateCoverage(type.key, "endAyah", event.target.value)
                          }
                          style={styles.input}
                        >
                          {endAyahOptions.map((ayah) => (
                            <option
                              key={ayah}
                              value={ayah}
                              disabled={
                                type.key === "sabaq" &&
                                sabaqCoverageMap[endSurah.number]?.has(ayah)
                              }
                            >
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

            <label style={{ ...styles.label, ...styles.notesLabel }}>
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional lesson notes..."
                style={{ ...styles.input, ...styles.notesInput }}
              />
            </label>

            <button
              type="button"
              style={{
                ...styles.button,
                opacity: isSaving || !canSaveEntry ? 0.7 : 1,
                cursor: isSaving || !canSaveEntry ? "not-allowed" : "pointer",
              }}
              onClick={saveEntry}
              disabled={isSaving || !canSaveEntry}
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
                  {hasSavedCoverage(entry.sabaq, entry.sabaqSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Sabaq:</b> {formatRecentCoverage(entry.sabaq)}
                    </p>
                  ) : null}
                  {hasSavedCoverage(entry.sabaqPara, entry.sabaqParaSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Sabaq Para:</b> {formatRecentCoverage(entry.sabaqPara)}
                    </p>
                  ) : null}
                  {hasSavedCoverage(entry.manzil, entry.manzilSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Revision:</b> {formatRecentCoverage(entry.manzil)}
                    </p>
                  ) : null}
                  {entry.notes?.trim() ? (
                    <p style={styles.entryNote}>
                      <b>Notes:</b> {entry.notes}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </section>
        </div>
      </main>

      {pendingUndo ? (
        <div style={styles.undoToast}>
          <span style={styles.undoText}>Entry saved</span>
          <button type="button" onClick={undoSavedEntry} style={styles.undoButton}>
            Undo
          </button>
          <button
            type="button"
            onClick={dismissUndoPrompt}
            aria-label="Dismiss undo"
            style={styles.undoCloseButton}
          >
            ✖
          </button>
        </div>
      ) : null}

      {deleteNotice ? <div style={styles.deleteNoticeToast}>{deleteNotice}</div> : null}

      {showBadges ? (
        <div style={styles.badgeOverlay} onClick={() => setShowBadges(false)}>
          <section style={styles.badgeModal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.badgeHeader}>
              <div>
                <p style={styles.badgeEyebrow}>Milestones</p>
                <h2 style={styles.badgeTitle}>Achievement Badges</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBadges(false)}
                aria-label="Close badges"
                style={styles.badgeCloseButton}
              >
                X
              </button>
            </div>

            <div style={styles.badgeGrid}>
              {achievementBadges.map((badge) => (
                <div
                  key={badge.title}
                  className="achievement-badge-card"
                  style={{
                    ...styles.badgeCard,
                    ...(badge.achieved ? styles.badgeCardAchieved : styles.badgeCardLocked),
                  }}
                >
                  <div style={styles.badgeMark}>{badge.mark}</div>
                  <h3 style={styles.badgeName}>{badge.title}</h3>
                  <p className="achievement-badge-description" style={styles.badgeDescription}>
                    {badge.achieved ? badge.achievedDescription : badge.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
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
  topActions: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 30,
    display: "flex",
    gap: 8,
  },
  topActionButton: {
    width: 38,
    minHeight: 36,
    display: "grid",
    placeItems: "center",
    color: "#1f7a55",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #d8e3dc",
    borderRadius: 8,
    padding: 0,
    fontSize: 18,
    fontWeight: 850,
    lineHeight: 1,
    boxShadow: "0 12px 26px rgba(32, 63, 48, 0.1)",
    cursor: "pointer",
  },
  themeToggleDark: {
    color: "#d9f5e7",
    background: "rgba(24, 36, 31, 0.92)",
    borderColor: "rgba(119, 154, 135, 0.35)",
    boxShadow: "0 14px 30px rgba(0, 0, 0, 0.24)",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#557166",
    background: "#eef3ef",
  },
  loadingCard: {
    display: "grid",
    justifyItems: "center",
    gap: 14,
    padding: "28px 32px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid #dce6df",
    borderRadius: 8,
    boxShadow: "0 18px 45px rgba(32, 63, 48, 0.08)",
    animation: "dashboard-dissolve-in 1050ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
  },
  loaderRing: {
    position: "relative",
    width: 46,
    height: 46,
    border: "2px solid rgba(31, 122, 85, 0.16)",
    borderTopColor: "#1f7a55",
    borderRadius: "50%",
    animation: "loader-spin 900ms linear infinite",
  },
  loaderDot: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    background: "#d7ad4f",
    borderRadius: "50%",
    boxShadow: "0 0 0 4px rgba(215, 173, 79, 0.12)",
  },
  loadingText: {
    color: "#40534b",
    fontSize: 15,
    fontWeight: 800,
  },
  loadingDots: {
    display: "flex",
    gap: 5,
  },
  loadingDot: {
    width: 6,
    height: 6,
    background: "#1f7a55",
    borderRadius: "50%",
    animation: "loader-dot-pulse 900ms ease-in-out infinite",
  },
  header: {
    maxWidth: 1120,
    margin: "0 auto 24px",
    textAlign: "center",
    opacity: 0,
    animation: "dashboard-dissolve-in 1250ms cubic-bezier(0.22, 1, 0.36, 1) 80ms forwards",
  },
  kicker: {
    color: "#4d7c65",
    fontSize: 17,
    fontWeight: 750,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  verseReference: {
    color: "#1f7a55",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 5,
  },
  verseTranslation: {
    maxWidth: 640,
    margin: "0 auto 18px",
    color: "#5b7067",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 650,
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
    animation: "dashboard-dissolve-in 1250ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
  },
  panelIntroOne: {
    animationDelay: "180ms",
  },
  panelIntroTwo: {
    animationDelay: "340ms",
  },
  panelIntroThree: {
    animationDelay: "260ms",
  },
  panelIntroFour: {
    animationDelay: "460ms",
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
    display: "block",
    color: "#1f7a55",
    fontSize: 22,
    lineHeight: 1,
  },
  streakDateRange: {
    display: "block",
    color: "#6d7c75",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.25,
    marginTop: 7,
  },
  weeklyPanel: {
    padding: 16,
  },
  weeklyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 7,
    alignItems: "end",
  },
  weeklyDay: {
    display: "grid",
    gap: 6,
    justifyItems: "center",
  },
  weeklyDate: {
    color: "#64766d",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
  },
  weeklyBox: {
    width: "100%",
    aspectRatio: "1 / 1",
    maxWidth: 28,
    border: "1px solid rgba(23, 32, 27, 0.1)",
    borderRadius: 5,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  },
  weeklyLegend: {
    display: "grid",
    gridTemplateColumns: "repeat(4, auto)",
    justifyContent: "center",
    gap: 8,
    marginTop: 13,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#64766d",
    fontSize: 10,
    fontWeight: 800,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
    border: "1px solid rgba(23, 32, 27, 0.08)",
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
  addButtonRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 16,
  },
  addCoverageButton: {
    minHeight: 38,
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 7,
    fontWeight: 750,
    cursor: "pointer",
  },
  addCoverageButtonActive: {
    color: "white",
    background: "#1f7a55",
    borderColor: "#1b6f4d",
    cursor: "pointer",
  },
  coverageList: {
    display: "grid",
    gap: 16,
    marginBottom: 18,
  },
  emptyCoverageText: {
    color: "#64766d",
    fontSize: 14,
    background: "#fbfdfb",
    border: "1px dashed #d8e3dc",
    borderRadius: 8,
    padding: 14,
    textAlign: "center",
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
  notesLabel: {
    margin: "0 0 18px",
  },
  notesInput: {
    minHeight: 86,
    resize: "none",
    lineHeight: 1.45,
    fontFamily: "inherit",
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
  entryNote: {
    color: "#40534b",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 9,
    paddingTop: 9,
    borderTop: "1px solid #edf2ee",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  undoToast: {
    position: "fixed",
    left: "50%",
    bottom: 26,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 46,
    color: "#17201b",
    background: "rgba(251, 253, 251, 0.96)",
    border: "1px solid #d8e3dc",
    borderRadius: 8,
    padding: "9px 10px 9px 16px",
    boxShadow: "0 18px 36px rgba(23, 32, 27, 0.14)",
    transform: "translateX(-50%)",
    animation: "undo-dissolve-life 7000ms ease-in-out forwards",
  },
  undoText: {
    color: "#40534b",
    fontSize: 14,
    fontWeight: 750,
    whiteSpace: "nowrap",
  },
  undoButton: {
    minHeight: 32,
    color: "white",
    background: "#1f7a55",
    border: "1px solid #1b6f4d",
    borderRadius: 7,
    padding: "6px 13px",
    fontWeight: 800,
    cursor: "pointer",
  },
  undoCloseButton: {
    width: 32,
    minWidth: 32,
    minHeight: 32,
    color: "#5f7068",
    background: "transparent",
    border: 0,
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },
  deleteNoticeToast: {
    position: "fixed",
    left: "50%",
    bottom: 26,
    zIndex: 20,
    minHeight: 42,
    color: "#1f7a55",
    background: "rgba(251, 253, 251, 0.96)",
    border: "1px solid #d8e3dc",
    borderRadius: 8,
    padding: "11px 17px",
    fontSize: 14,
    fontWeight: 800,
    boxShadow: "0 18px 36px rgba(23, 32, 27, 0.14)",
    transform: "translateX(-50%)",
    animation: "notice-dissolve-life 2600ms ease-in-out forwards",
  },
  badgeOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "rgba(13, 21, 17, 0.42)",
    backdropFilter: "blur(7px)",
    animation: "modal-dissolve-in 220ms ease-out forwards",
  },
  badgeModal: {
    width: "min(720px, 100%)",
    maxHeight: "min(760px, 88vh)",
    overflowY: "auto",
    background: "rgba(255,255,255,0.97)",
    border: "1px solid #dce6df",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 28px 70px rgba(13, 21, 17, 0.24)",
  },
  badgeHeader: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },
  badgeEyebrow: {
    color: "#1f7a55",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  badgeTitle: {
    color: "#17201b",
    fontSize: 24,
    lineHeight: 1.15,
    fontWeight: 850,
  },
  badgeCloseButton: {
    color: "#5f7068",
    background: "transparent",
    border: 0,
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  },
  badgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },
  badgeCard: {
    position: "relative",
    minHeight: 178,
    display: "grid",
    alignContent: "start",
    justifyItems: "center",
    gap: 8,
    textAlign: "center",
    border: "1px solid #dce6df",
    borderRadius: 8,
    padding: "18px 14px",
    overflow: "hidden",
  },
  badgeCardAchieved: {
    color: "#17201b",
    background: "linear-gradient(180deg, #fbfdfb 0%, #edf7f1 100%)",
    borderColor: "#cfe5d8",
  },
  badgeCardLocked: {
    color: "#7b8983",
    background: "#f0f3f1",
    filter: "grayscale(1)",
    opacity: 0.68,
  },
  badgeMark: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    color: "white",
    background: "#1f7a55",
    borderRadius: "50%",
    fontSize: 15,
    fontWeight: 900,
    boxShadow: "0 10px 18px rgba(31, 122, 85, 0.18)",
  },
  badgeName: {
    color: "inherit",
    fontSize: 15,
    fontWeight: 850,
    lineHeight: 1.2,
  },
  badgeDescription: {
    position: "absolute",
    inset: "auto 10px 10px",
    minHeight: 52,
    display: "grid",
    placeItems: "center",
    color: "#40534b",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #dce6df",
    borderRadius: 7,
    padding: "8px 9px",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 750,
    opacity: 0,
    transform: "translateY(8px)",
    pointerEvents: "none",
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
