import { useEffect, useRef, useState } from "react";
import {
  createDailyEntry,
  deleteDailyEntry,
  getDashboardData,
  restoreDailyEntry,
  updateLessonPreferences,
} from "../api/api";
import { surahs } from "../data/surahs";
import {
  coverageTypes,
  buildSabaqCoverageMap,
  createDefaultCoverage,
  createIdealCoverageFromLatest,
  defaultLessonPreferences,
  formatCoverageRange,
  formatRecentCoverage,
  getAvailableAyahsForSabaq,
  getSurahByNumber,
  hasSavedCoverage,
  isSabaqRangeAvailable,
  isVisibleRecentEntry,
} from "../utils/coverage";
import { formatEntryDate } from "../utils/dates";

function BadgeIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4.6" />
      <path d="m9.2 12.1-1 7.2L12 17.4l3.8 1.9-1-7.2" />
      <circle cx="12" cy="8" r="1.7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.9 14.6A8.2 8.2 0 0 1 9.4 3.1a9.1 9.1 0 1 0 11.5 11.5Z" />
    </svg>
  );
}

function LessonPreferencesIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

const getAchievementBadges = (dashboardData = {}) => {
  const progress = dashboardData.progress || {};
  const achievementStats = dashboardData.achievementStats || {};
  const awardedDates = achievementStats.awardedDates || {};
  const memorizedJuz = Array.isArray(progress.memorizedJuz)
    ? progress.memorizedJuz.map(Number).filter(Boolean).sort((a, b) => a - b)
    : [];
  const memorizedSurahs = Array.isArray(progress.memorizedSurahs)
    ? progress.memorizedSurahs.map(Number).filter(Boolean).sort((a, b) => a - b)
    : [];
  const firstCompletedJuz = memorizedJuz[0] || null;
  const sabaqCoverageMap = buildSabaqCoverageMap(
    dashboardData.sabaqEntries,
    memorizedJuz,
    memorizedSurahs,
    progress.memorizedAyahRanges
  );
  const firstCompletedSurah = surahs.find(
    (surah) => (sabaqCoverageMap[surah.number]?.size || 0) >= surah.ayahs
  );
  const firstJuzDetail =
    awardedDates.firstJuz && firstCompletedJuz ? `Juz ${firstCompletedJuz}` : "";
  const firstSurahDetail = awardedDates.firstSurah ? firstCompletedSurah?.name || "" : "";

  return [
    {
      key: "firstEntry",
      title: "First Entry",
      mark: "1",
      achieved: (achievementStats.totalEntries || 0) >= 1,
      awardedDate: awardedDates.firstEntry,
      description: "Save your first dashboard entry.",
      achievedDescription: "You saved your first dashboard entry.",
    },
    {
      key: "sevenDayStreak",
      title: "One Week Strong",
      mark: "7 🔥",
      achieved: (dashboardData.longestStreak || 0) >= 7,
      awardedDate: awardedDates.sevenDayStreak,
      description: "Log all 3 daily sections 7 days in a row.",
      achievedDescription: "You reached a 7 day streak.",
    },
    {
      key: "thirtyDayStreak",
      title: "30 Day Streak",
      mark: "30 🔥",
      achieved: (dashboardData.longestStreak || 0) >= 30,
      awardedDate: awardedDates.thirtyDayStreak,
      description: "Log all 3 daily sections 30 days in a row.",
      achievedDescription: "You reached a 30 day streak.",
    },
    {
      key: "firstJuz",
      title: "First Juz",
      mark: "1/30",
      achieved: (progress.juz || 0) >= 1,
      awardedDate: awardedDates.firstJuz,
      description: "Memorize 1 juz.",
      achievedDescription: firstJuzDetail
        ? `You memorized your first juz (${firstJuzDetail}).`
        : "You memorized 1 juz.",
    },
    {
      key: "fiveAjzaa",
      title: "5 Ajzaa",
      mark: "5/30",
      achieved: (progress.juz || 0) >= 5,
      awardedDate: awardedDates.fiveAjzaa,
      description: "Memorize 5 ajzaa.",
      achievedDescription: "You memorized 5 ajzaa.",
    },
    {
      key: "fifteenAjzaa",
      title: "15 Ajzaa",
      mark: "15/30",
      achieved: (progress.juz || 0) >= 15,
      awardedDate: awardedDates.fifteenAjzaa,
      description: "Memorize 15 ajzaa.",
      achievedDescription: "You memorized 15 ajzaa.",
    },
    {
      key: "firstSurah",
      title: "First Surah",
      mark: "1/114",
      achieved: (progress.surahs || 0) >= 1,
      awardedDate: awardedDates.firstSurah,
      description: "Finish memorizing a surah.",
      achievedDescription: firstSurahDetail
        ? `You memorized your first surah (${firstSurahDetail}).`
        : "You memorized your first surah.",
    },
    {
      key: "fiftyRevisions",
      title: "50 Revisions",
      mark: "50",
      achieved: (achievementStats.revisionSessions || 0) >= 50,
      awardedDate: awardedDates.fiftyRevisions,
      description: "Save 50 Revision sessions.",
      achievedDescription: "You logged 50 Revision sessions.",
    },
    {
      key: "hundredRevisions",
      title: "100 Revisions",
      mark: "100",
      achieved: (achievementStats.revisionSessions || 0) >= 100,
      awardedDate: awardedDates.hundredRevisions,
      description: "Save 100 Revision sessions.",
      achievedDescription: "You logged 100 Revision sessions.",
    },
  ];
};

const formatSessionDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));

  if (totalSeconds <= 0) {
    return "";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

const formatRevisionPreference = (juzAmount = 0) => {
  const numericJuzAmount = Number(juzAmount) || 0;
  const pages = numericJuzAmount * 20;
  const pageLabel = pages === 1 ? "page" : "pages";

  return `${numericJuzAmount} juz (${pages} ${pageLabel})`;
};

const renderSessionDuration = (seconds) => {
  const duration = formatSessionDuration(seconds);

  if (!duration) {
    return null;
  }

  return (
    <span className="entry-duration-chip" style={styles.entryDuration}>
      {duration}
    </span>
  );
};

const formatIdealCoverageRange = (coverageRange) => {
  const formattedRange = formatCoverageRange(coverageRange);

  return formattedRange ? formatRecentCoverage(formattedRange) : "";
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [coverage, setCoverage] = useState(createDefaultCoverage);
  const [activeCoverageKeys, setActiveCoverageKeys] = useState([]);
  const [notes, setNotes] = useState("");
  const [pendingUndo, setPendingUndo] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState("");
  const [badgeNotice, setBadgeNotice] = useState("");
  const [streakNotice, setStreakNotice] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showWeeklyHistory, setShowWeeklyHistory] = useState(false);
  const [weeklyActivityTab, setWeeklyActivityTab] = useState("weekly");
  const [selectedActivityMonth, setSelectedActivityMonth] = useState("");
  const [showLessonPreferences, setShowLessonPreferences] = useState(false);
  const [lessonPreferences, setLessonPreferences] = useState(defaultLessonPreferences);
  const [lessonPreferenceDraft, setLessonPreferenceDraft] = useState(defaultLessonPreferences);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const undoTimeoutRef = useRef(null);
  const deleteNoticeTimeoutRef = useRef(null);
  const badgeNoticeTimeoutRef = useRef(null);
  const streakNoticeTimeoutRef = useRef(null);

  const applyDashboardData = (dashboardData) => {
    const sabaqCoverageMap = buildSabaqCoverageMap(
      dashboardData.sabaqEntries,
      dashboardData.progress?.memorizedJuz,
      dashboardData.progress?.memorizedSurahs,
      dashboardData.progress?.memorizedAyahRanges
    );
    const preferences = {
      ...defaultLessonPreferences,
      ...(dashboardData.lessonPreferences || dashboardData.user?.lessonPreferences || {}),
    };
    const nextCoverage =
      dashboardData.idealCoverage ||
      createIdealCoverageFromLatest(dashboardData.latestCoverage, preferences, sabaqCoverageMap);

    setData(dashboardData);
    setLessonPreferences(preferences);
    setLessonPreferenceDraft(preferences);
    setCoverage(nextCoverage);
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

  const showBadgeNotice = (badgeTitle) => {
    if (badgeNoticeTimeoutRef.current) {
      window.clearTimeout(badgeNoticeTimeoutRef.current);
    }

    setBadgeNotice(`New Badge Unlocked: ${badgeTitle}`);
    badgeNoticeTimeoutRef.current = window.setTimeout(() => {
      setBadgeNotice("");
      badgeNoticeTimeoutRef.current = null;
    }, 7000);
  };

  const showStreakNotice = (streakLength) => {
    if (streakNoticeTimeoutRef.current) {
      window.clearTimeout(streakNoticeTimeoutRef.current);
    }

    setStreakNotice(`Streak started: ${streakLength} days`);
    streakNoticeTimeoutRef.current = window.setTimeout(() => {
      setStreakNotice("");
      streakNoticeTimeoutRef.current = null;
    }, 7000);
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

      if (badgeNoticeTimeoutRef.current) {
        window.clearTimeout(badgeNoticeTimeoutRef.current);
      }

      if (streakNoticeTimeoutRef.current) {
        window.clearTimeout(streakNoticeTimeoutRef.current);
      }
    };
  }, []);

  const getCurrentSabaqCoverageMap = () =>
    buildSabaqCoverageMap(
      data?.sabaqEntries,
      data?.progress?.memorizedJuz,
      data?.progress?.memorizedSurahs,
      data?.progress?.memorizedAyahRanges
    );

  const isSurahFullyMemorized = (coverageMap, surah) =>
    (coverageMap[surah.number]?.size || 0) >= surah.ayahs;

  const getMemorizedAyahsForSurah = (coverageMap, surahNumber) => {
    const surah = getSurahByNumber(surahNumber);
    const memorizedAyahs = coverageMap[surah.number] || new Set();

    return Array.from({ length: surah.ayahs }, (_, index) => index + 1).filter((ayah) =>
      memorizedAyahs.has(ayah)
    );
  };

  const getFirstFullyMemorizedSurah = (coverageMap) =>
    surahs.find((surah) => isSurahFullyMemorized(coverageMap, surah));

  const createDefaultRevisionCoverage = (coverageMap) => {
    const firstMemorizedSurah = getFirstFullyMemorizedSurah(coverageMap);

    if (!firstMemorizedSurah) {
      return createDefaultCoverage().revision;
    }

    return {
      startSurahNumber: firstMemorizedSurah.number,
      startAyah: 1,
      endSurahNumber: firstMemorizedSurah.number,
      endAyah: firstMemorizedSurah.ayahs,
    };
  };

  const isRevisionRangeMemorized = (coverageMap, entry) => {
    for (
      let surahNumber = Number(entry.startSurahNumber);
      surahNumber <= Number(entry.endSurahNumber);
      surahNumber += 1
    ) {
      const surah = getSurahByNumber(surahNumber);
      const memorizedAyahs = coverageMap[surah.number] || new Set();
      const firstAyah = surahNumber === Number(entry.startSurahNumber) ? Number(entry.startAyah) : 1;
      const lastAyah =
        surahNumber === Number(entry.endSurahNumber) ? Number(entry.endAyah) : surah.ayahs;

      for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
        if (!memorizedAyahs.has(ayah)) {
          return false;
        }
      }
    }

    return true;
  };

  const updateCoverage = (typeKey, field, value) => {
    setCoverage((currentCoverage) => {
      const currentEntry = currentCoverage[typeKey] || createDefaultCoverage()[typeKey];

      if (field === "startSurahNumber") {
        const selectedSurah = getSurahByNumber(value);
        const coverageMap = getCurrentSabaqCoverageMap();
        const availableAyahs =
          typeKey === "sabaq"
            ? getAvailableAyahsForSabaq(coverageMap, selectedSurah.number)
            : typeKey === "revision"
              ? getMemorizedAyahsForSurah(coverageMap, selectedSurah.number)
              : [];
        const firstAvailableAyah = availableAyahs[0] || 1;
        const nextEntry = {
          ...currentEntry,
          startSurahNumber: selectedSurah.number,
          startAyah: typeKey === "sabaq" || typeKey === "revision" ? firstAvailableAyah : 1,
        };

        if (selectedSurah.number > nextEntry.endSurahNumber) {
          nextEntry.endSurahNumber = selectedSurah.number;
          nextEntry.endAyah =
            typeKey === "sabaq" || typeKey === "revision"
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
        const coverageMap = getCurrentSabaqCoverageMap();
        const availableAyahs =
          typeKey === "sabaq"
            ? getAvailableAyahsForSabaq(coverageMap, selectedSurah.number)
            : typeKey === "revision"
              ? getMemorizedAyahsForSurah(coverageMap, selectedSurah.number)
              : [];
        const lastAvailableAyah = availableAyahs[availableAyahs.length - 1] || selectedSurah.ayahs;
        const nextEntry = {
          ...currentEntry,
          endSurahNumber: selectedSurah.number,
          endAyah:
            typeKey === "sabaq" || typeKey === "revision" ? lastAvailableAyah : selectedSurah.ayahs,
        };

        if (selectedSurah.number < nextEntry.startSurahNumber) {
          nextEntry.startSurahNumber = selectedSurah.number;
          nextEntry.startAyah =
            typeKey === "sabaq" || typeKey === "revision" ? availableAyahs[0] || 1 : 1;
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
    const coverageMap = getCurrentSabaqCoverageMap();

    setCoverage((currentCoverage) => ({
      ...currentCoverage,
      [typeKey]:
        currentCoverage[typeKey] ||
        (typeKey === "revision"
          ? createDefaultRevisionCoverage(coverageMap)
          : createDefaultCoverage()[typeKey]),
    }));
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
      const sabaqCoverageMap = buildSabaqCoverageMap(
        data.sabaqEntries,
        data.progress?.memorizedJuz,
        data.progress?.memorizedSurahs,
        data.progress?.memorizedAyahRanges
      );

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
      const sabaqCoverageMap = getCurrentSabaqCoverageMap();

      if (!isRevisionRangeMemorized(sabaqCoverageMap, coverage.revision)) {
        alert("Choose only ayahs you have already memorized for Revision.");
        return;
      }

      entryPayload.manzil = formatCoverageRange(coverage.revision);
    }

    setIsSaving(true);

    try {
      const savedEntry = await createDailyEntry(entryPayload);
      const returnedRecentEntries = Array.isArray(savedEntry.recentEntries)
        ? savedEntry.recentEntries
        : [];
      const currentRecentEntries = Array.isArray(data.recentEntries) ? data.recentEntries : [];
      const nextRecentEntries = [
        ...returnedRecentEntries,
        savedEntry.entry,
        ...currentRecentEntries,
      ]
        .filter(
          (entry, index, entries) =>
            entry?.id && entries.findIndex((candidate) => candidate.id === entry.id) === index
        )
        .slice(0, 7);
      const nextDashboardData = {
        ...data,
        streak: savedEntry.streak,
        longestStreak: savedEntry.longestStreak,
        longestStreakRange: savedEntry.longestStreakRange,
        weeklyActivity: savedEntry.weeklyActivity,
        weeklyActivityHistory: savedEntry.weeklyActivityHistory || data.weeklyActivityHistory,
        activityMonths: savedEntry.activityMonths || data.activityMonths,
        achievementStats: savedEntry.achievementStats,
        progress: savedEntry.progress,
        sabaqEntries: savedEntry.sabaqEntries || data.sabaqEntries,
        latestCoverage: savedEntry.latestCoverage || data.latestCoverage,
        idealCoverage: savedEntry.idealCoverage || data.idealCoverage,
        recentEntries: nextRecentEntries,
      };
      const unlockedBeforeSave = new Set(
        getAchievementBadges(data)
          .filter((badge) => badge.achieved)
          .map((badge) => badge.title)
      );
      const newlyUnlockedBadge = getAchievementBadges(nextDashboardData).find(
        (badge) => badge.achieved && !unlockedBeforeSave.has(badge.title)
      );
      const streakJustStarted = (data.streak || 0) === 0 && (nextDashboardData.streak || 0) >= 3;

      setData(nextDashboardData);

      if (newlyUnlockedBadge) {
        showBadgeNotice(newlyUnlockedBadge.title);
      }

      if (streakJustStarted) {
        showStreakNotice(nextDashboardData.streak);
      }
      setCoverage((currentCoverage) => {
        const nextSabaqCoverageMap = buildSabaqCoverageMap(
          nextDashboardData.sabaqEntries,
          nextDashboardData.progress?.memorizedJuz,
          nextDashboardData.progress?.memorizedSurahs,
          nextDashboardData.progress?.memorizedAyahRanges
        );
        const nextCoverage =
          nextDashboardData.idealCoverage ||
          createIdealCoverageFromLatest(
            nextDashboardData.latestCoverage,
            lessonPreferences,
            nextSabaqCoverageMap
          );

        return nextCoverage || currentCoverage;
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
      setBadgeNotice("");
      setStreakNotice("");
      showDeleteNotice();
    } catch (error) {
      alert(error.response?.data?.message || "Undo failed. Please try again.");
    }
  };

  const openLessonPreferences = () => {
    setLessonPreferenceDraft(lessonPreferences);
    setShowLessonPreferences(true);
  };

  const updateLessonPreferenceDraft = (field, value) => {
    setLessonPreferenceDraft((currentDraft) => ({
      ...currentDraft,
      [field]: Number(value),
    }));
  };

  const saveLessonPreferences = async () => {
    setIsSavingPreferences(true);

    try {
      const response = await updateLessonPreferences(lessonPreferenceDraft);
      const nextPreferences = {
        ...defaultLessonPreferences,
        ...(response.lessonPreferences || lessonPreferenceDraft),
      };
      const nextSabaqCoverageMap = buildSabaqCoverageMap(
        data.sabaqEntries,
        data.progress?.memorizedJuz,
        data.progress?.memorizedSurahs,
        data.progress?.memorizedAyahRanges
      );
      const nextCoverage =
        response.idealCoverage ||
        createIdealCoverageFromLatest(data.latestCoverage, nextPreferences, nextSabaqCoverageMap);

      setLessonPreferences(nextPreferences);
      setLessonPreferenceDraft(nextPreferences);
      setData((currentData) => ({
        ...currentData,
        lessonPreferences: nextPreferences,
        idealCoverage: response.idealCoverage || currentData.idealCoverage,
        progress: {
          ...currentData.progress,
          currentJuzCompletionEstimate:
            response.currentJuzCompletionEstimate ||
            currentData.progress?.currentJuzCompletionEstimate,
        },
        user: {
          ...currentData.user,
          lessonPreferences: nextPreferences,
        },
      }));
      setCoverage(nextCoverage);
      setShowLessonPreferences(false);
    } catch (error) {
      alert(error.response?.data?.message || "Could not update lesson preferences.");
    } finally {
      setIsSavingPreferences(false);
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
  const sabaqCoverageMap = buildSabaqCoverageMap(
    data.sabaqEntries,
    progress.memorizedJuz,
    progress.memorizedSurahs,
    progress.memorizedAyahRanges
  );
  const currentSurah = progress.currentSurah
    ? surahs.find((surah) => surah.number === Number(progress.currentSurah))
    : null;
  const currentSurahText = currentSurah ? currentSurah.name : "Not set";
  const currentJuzCompletionEstimate = progress.currentJuzCompletionEstimate;
  const currentJuzCompletionText = currentJuzCompletionEstimate?.estimatedCompletionDate
    ? formatEntryDate(currentJuzCompletionEstimate.estimatedCompletionDate)
    : "Not set";
  const longestStreakRangeText = data.longestStreakRange
    ? `${formatEntryDate(data.longestStreakRange.startDate)} - ${formatEntryDate(
        data.longestStreakRange.endDate
      )}`
    : "No streak yet";
  const weeklyActivity = Array.isArray(data.weeklyActivity) ? data.weeklyActivity : [];
  const displayedIdealCoverage = data.idealCoverage || coverage;
  const idealLessonSummary = coverageTypes.map((type) => ({
    ...type,
    value: formatIdealCoverageRange(displayedIdealCoverage?.[type.key]),
  }));
  const weeklyActivityColors = {
    0: "#c94a3d",
    1: "#e6c45b",
    2: "#a7d8b8",
    3: "#1f7a55",
  };
  const weeklyLegendItems = [
    { count: 0, label: "0/3" },
    { count: 1, label: "1/3" },
    { count: 2, label: "2/3" },
    { count: 3, label: "3/3" },
  ];
  const formatWeeklyDay = (date) =>
    new Date(date).toLocaleDateString("en-US", { weekday: "short" });
  const formatShortDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatDayOfMonth = (date) => String(new Date(date).getDate());
  const getMonthKey = (dateValue) => {
    const date = new Date(dateValue);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  const formatWeekRange = (week) =>
    `${formatShortDate(week.weekStart)} - ${formatShortDate(week.weekEnd)}`;
  const rawWeeklyActivityHistory = Array.isArray(data.weeklyActivityHistory)
    ? data.weeklyActivityHistory
    : [];
  const rawMonthlyActivityDays = rawWeeklyActivityHistory.flatMap((week) => week.days || []);
  const signupDate = new Date(data.user?.createdAt || rawMonthlyActivityDays[0]?.date || new Date());
  signupDate.setHours(0, 0, 0, 0);
  const todayForActivity = new Date();
  todayForActivity.setHours(0, 0, 0, 0);
  const weeklyActivityDayMap = new Map(
    rawMonthlyActivityDays.map((day) => {
      const date = new Date(day.date);
      date.setHours(0, 0, 0, 0);
      return [date.toISOString(), day];
    })
  );
  const weeklyActivityHistory = [];
  const firstHistoryWeekStart = new Date(signupDate);
  firstHistoryWeekStart.setDate(signupDate.getDate() - signupDate.getDay());

  for (
    const weekCursor = new Date(firstHistoryWeekStart);
    weekCursor.getTime() <= todayForActivity.getTime();
    weekCursor.setDate(weekCursor.getDate() + 7)
  ) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekCursor);
      date.setDate(weekCursor.getDate() + index);
      date.setHours(0, 0, 0, 0);
      return date;
    })
      .filter((date) => date.getTime() >= signupDate.getTime() && date.getTime() <= todayForActivity.getTime())
      .map((date) => {
        const dayKey = date.toISOString();
        return (
          weeklyActivityDayMap.get(dayKey) || {
            date: dayKey,
            completedCount: 0,
            entries: [],
          }
        );
      });

    if (days.length > 0) {
      weeklyActivityHistory.push({
        weekStart: days[0].date,
        weekEnd: days[days.length - 1].date,
        days,
      });
    }
  }
  const monthlyActivityDays = weeklyActivityHistory.flatMap((week) => week.days || []);
  const inferredActivityMonths = [];

  for (
    const monthCursor = new Date(signupDate.getFullYear(), signupDate.getMonth(), 1);
    monthCursor.getTime() <= todayForActivity.getTime();
    monthCursor.setMonth(monthCursor.getMonth() + 1)
  ) {
    inferredActivityMonths.push({
      key: getMonthKey(monthCursor),
      label: monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  const monthlyActivityMonths = Array.isArray(data.activityMonths) && data.activityMonths.length > 0
    ? data.activityMonths
    : inferredActivityMonths;

  const activeActivityMonth =
    selectedActivityMonth ||
    monthlyActivityMonths[monthlyActivityMonths.length - 1]?.key ||
    "";
  const monthlyActivityByDate = new Map(
    monthlyActivityDays.map((day) => {
      const date = new Date(day.date);
      date.setHours(0, 0, 0, 0);
      return [date.toISOString(), day];
    })
  );
  const [activeActivityYear, activeActivityMonthNumber] = activeActivityMonth
    .split("-")
    .map(Number);
  const activeMonthStart = activeActivityMonth
    ? new Date(activeActivityYear, activeActivityMonthNumber - 1, 1)
    : null;
  const activeMonthEnd = activeActivityMonth
    ? new Date(activeActivityYear, activeActivityMonthNumber, 0)
    : null;
  const monthlyGraphStart = activeMonthStart;
  const monthlyGraphEnd = activeMonthEnd;
  const monthlyGraphDays =
    monthlyGraphStart && monthlyGraphEnd
      ? Array.from(
          {
            length:
              Math.max(
                0,
                Math.round(
                  (monthlyGraphEnd.getTime() - monthlyGraphStart.getTime()) /
                    (24 * 60 * 60 * 1000)
                )
              ) + 1,
          },
          (_, index) => {
            const date = new Date(monthlyGraphStart);
            date.setDate(monthlyGraphStart.getDate() + index);
            const dayKey = date.toISOString();
            return (
              monthlyActivityByDate.get(dayKey) || {
                date: dayKey,
                completedCount: 0,
                entries: [],
              }
            );
          }
        )
      : [];
  const graphPadding = { left: 74, right: 28, top: 26, bottom: 66 };
  const graphWidth = Math.max(700, monthlyGraphDays.length * 22 + graphPadding.left + graphPadding.right);
  const graphHeight = 300;
  const plotWidth = graphWidth - graphPadding.left - graphPadding.right;
  const plotHeight = graphHeight - graphPadding.top - graphPadding.bottom;
  const getGraphX = (index) =>
    graphPadding.left +
    (monthlyGraphDays.length <= 1 ? plotWidth / 2 : (index / (monthlyGraphDays.length - 1)) * plotWidth);
  const getGraphY = (count) =>
    graphPadding.top + plotHeight - (Math.max(0, Math.min(3, count)) / 3) * plotHeight;
  const monthlyGraphPoints = monthlyGraphDays.map((day, index) => ({
    ...day,
    x: getGraphX(index),
    y: getGraphY(day.completedCount),
  }));
  const monthlyPolylinePoints = monthlyGraphPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const monthlyAreaPoints =
    monthlyGraphPoints.length > 1
      ? [
          `${monthlyGraphPoints[0].x},${graphPadding.top + plotHeight}`,
          ...monthlyGraphPoints.map((point) => `${point.x},${point.y}`),
          `${monthlyGraphPoints[monthlyGraphPoints.length - 1].x},${graphPadding.top + plotHeight}`,
        ].join(" ")
      : "";
  const achievementBadges = getAchievementBadges(data);
  /*
  const achievementStats = data.achievementStats || {};
  const unusedAchievementBadges = [
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
  */
  const canSaveEntry = activeCoverageKeys.length > 0 || notes.trim().length > 0;

  return (
    <div className={darkMode ? "dashboard-page dashboard-dark" : "dashboard-page"} style={styles.page}>
      <div style={styles.topActions}>
        <button
          className="top-icon-button"
          type="button"
          onClick={openLessonPreferences}
          aria-label="Open lesson preferences"
          title="Lesson preferences"
          style={{
            ...styles.topActionButton,
            ...(darkMode ? styles.themeToggleDark : {}),
          }}
        >
          <LessonPreferencesIcon />
        </button>
        <button
          className="top-icon-button"
          type="button"
          onClick={() => setShowBadges(true)}
          aria-label="Open achievement badges"
          title="Achievement badges"
          style={{
            ...styles.topActionButton,
            ...(darkMode ? styles.themeToggleDark : {}),
          }}
        >
          <BadgeIcon />
        </button>
        <button
          className="top-icon-button"
          type="button"
          onClick={() => setDarkMode((currentMode) => !currentMode)}
          aria-label={darkMode ? "Turn off dark mode" : "Turn on dark mode"}
          title={darkMode ? "Light mode" : "Dark mode"}
          style={{
            ...styles.topActionButton,
            ...(darkMode ? styles.themeToggleDark : {}),
          }}
        >
          <MoonIcon />
        </button>
      </div>

      <header style={styles.header}>
        <p style={styles.kicker}>وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ</p>
        <p className="dashboard-green-text" style={styles.verseReference}>54:17</p>
        <p style={styles.verseTranslation}>
          And We have certainly made the Quran easy to remember.
          <br />
          So is there anyone who will be mindful?
        </p>
        <h1 style={styles.greeting}>
          Assalamu Alaikum, <span className="dashboard-green-text" style={styles.studentName}>{studentName}</span>.
        </h1>
        <p style={styles.subtitle}>Let's stay consistent today.</p>
      </header>

      <main style={styles.content}>
        <div style={styles.dashboardGrid}>
          <div style={styles.leftColumn}>
            <section style={{ ...styles.panel, ...styles.panelIntroOne }}>
              <h2 style={styles.panelTitle}>Progress Overview 📝</h2>

              <div style={styles.progressList}>
                <div className="progress-overview-divider" style={styles.progressItem}>
                  <span style={styles.progressLabel}>Ajzaa Memorized</span>
                  <strong className="dashboard-soft-green dashboard-green-text" style={styles.progressValue}>
                    {progress.juz || 0}
                  </strong>
                </div>

                <div className="progress-overview-divider" style={styles.progressItem}>
                  <span style={styles.progressLabel}>Surahs Memorized</span>
                  <strong className="dashboard-soft-green dashboard-green-text" style={styles.progressValue}>
                    {progress.surahs || 0}
                  </strong>
                </div>

                <div
                  className="progress-overview-divider"
                  style={{ ...styles.currentJuzItem, ...styles.progressOverviewDivider }}
                >
                  <div style={styles.currentJuzHeader}>
                    <span style={styles.progressLabel}>Current Surah</span>
                    <strong className="dashboard-soft-green dashboard-green-text" style={styles.progressTextValue}>
                      {currentSurahText}
                    </strong>
                  </div>
                  <div style={styles.progressBarTrack}>
                    <div
                      className="dashboard-green-bg"
                      style={{
                        ...styles.progressBarFill,
                        width: `${progress.currentSurahProgressPercent || 0}%`,
                      }}
                    />
                  </div>
                  <p style={styles.progressPercentText}>
                    {progress.currentSurahProgressPercent || 0}% complete
                  </p>
                </div>

                <div style={styles.currentJuzItem}>
                  <div style={styles.currentJuzHeader}>
                    <span style={styles.progressLabel}>Current Juz</span>
                    <strong className="dashboard-soft-green dashboard-green-text" style={styles.progressTextValue}>
                      {progress.currentJuz ? `Juz ${progress.currentJuz}` : "Not set"}
                    </strong>
                  </div>
                  <div style={styles.progressBarTrack}>
                    <div
                      className="dashboard-green-bg"
                      style={{
                        ...styles.progressBarFill,
                        width: `${progress.currentJuzProgressPercent || 0}%`,
                      }}
                    />
                  </div>
                  <p style={styles.progressPercentText}>
                    {progress.currentJuzProgressPercent || 0}% complete
                  </p>
                  <p style={styles.progressSubstatText}>
                    Est. completion: {currentJuzCompletionText}
                  </p>
                </div>
              </div>
            </section>

            <section style={{ ...styles.panel, ...styles.streakPanel, ...styles.panelIntroTwo }}>
              <h2 style={styles.smallPanelTitle}>Streaks 🔥</h2>

              <div style={styles.streakGrid}>
                <div className="dashboard-soft-green" style={styles.streakCard}>
                  <span style={styles.streakLabel}>Current</span>
                  <strong className="dashboard-green-text" style={styles.streakValue}>{data.streak}</strong>
                </div>

                <div className="dashboard-soft-green" style={styles.streakCard}>
                  <span style={styles.streakLabel}>Longest</span>
                  <strong className="dashboard-green-text" style={styles.streakValue}>{data.longestStreak}</strong>
                  <span style={styles.streakDateRange}>{longestStreakRangeText}</span>
                </div>
              </div>
            </section>

            <section style={{ ...styles.panel, ...styles.weeklyPanel, ...styles.panelIntroTwo }}>
              <div style={styles.weeklyPanelHeader}>
                <h2 style={styles.smallPanelTitle}>Weekly Activity</h2>
                <button
                  className="weekly-history-button"
                  type="button"
                  onClick={() => setShowWeeklyHistory(true)}
                  style={styles.weeklyHistoryButton}
                >
                  View all
                </button>
              </div>

              <div style={styles.weeklyGrid}>
                {weeklyActivity.map((day) => (
                  <div key={day.date} style={styles.weeklyDay}>
                    <span style={styles.weeklyDate}>{formatWeeklyDay(day.date)}</span>
                    <span
                      className={
                        day.isOutsideRange
                          ? "weekly-activity-box weekly-future-box"
                          : day.completedCount === 3
                          ? "weekly-activity-box dashboard-green-bg"
                          : "weekly-activity-box"
                      }
                      title={`${day.completedCount}/3 completed`}
                      style={{
                        ...styles.weeklyBox,
                        ...(day.isOutsideRange ? styles.futureWeeklyBox : {}),
                        background: day.isOutsideRange
                          ? styles.futureWeeklyBox.background
                          : weeklyActivityColors[day.completedCount] || weeklyActivityColors[0],
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={styles.weeklyLegend}>
                <span style={styles.weeklyLegendEndpoint}>0/3</span>
                <div style={styles.weeklySpectrum} aria-label="Weekly activity legend from 0 of 3 to 3 of 3">
                  {weeklyLegendItems.map((item) => (
                    <span
                      key={item.count}
                      className={
                        item.count === 3
                          ? "weekly-legend-swatch dashboard-green-bg"
                          : "weekly-legend-swatch"
                      }
                      title={item.label}
                      style={{
                        ...styles.legendSwatch,
                        background: weeklyActivityColors[item.count],
                      }}
                    />
                  ))}
                </div>
                <span style={styles.weeklyLegendEndpoint}>3/3</span>
              </div>
            </section>
          </div>

          <section style={{ ...styles.panel, ...styles.panelIntroThree }}>
            <h2 style={styles.panelTitle}>What did you cover today? 🧠</h2>

            <div style={styles.addButtonRow}>
              {coverageTypes.map((type) => (
                  <button
                    className={
                      activeCoverageKeys.includes(type.key)
                        ? "entry-toggle-button coverage-toggle-active dashboard-green-bg"
                        : "entry-toggle-button dashboard-soft-green dashboard-green-text"
                    }
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

            <div className="dashboard-dark-inner" style={styles.idealLessonBox}>
              <p style={styles.idealLessonTitle}>Ideal for today</p>
              <div style={styles.idealLessonGrid}>
                {idealLessonSummary.map((item) => (
                  <span key={item.key} style={styles.idealLessonItem}>
                    <b>{item.label}:</b> {item.value}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.coverageList}>
              {activeCoverageKeys.length === 0 ? (
                <p className="dashboard-dark-inner" style={styles.emptyCoverageText}>
                  Choose what you'd like to add.
                </p>
              ) : null}

              {coverageTypes
                .filter((type) => activeCoverageKeys.includes(type.key))
                .map((type) => {
                const entry = coverage[type.key] || createDefaultCoverage()[type.key];
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
                const hasRevisionOptions =
                  type.key !== "revision" ||
                  surahs.some((surah) => isSurahFullyMemorized(sabaqCoverageMap, surah));
                const hasCoverageOptions = hasSabaqOptions && hasRevisionOptions;

                return (
                  <div key={type.key} style={styles.coverageGroup}>
                    <h3 style={styles.coverageTitle}>{type.label}</h3>

                    {!hasSabaqOptions ? (
                      <p className="dashboard-dark-inner" style={styles.emptyCoverageText}>
                        All available Sabaq ayahs have already been saved.
                      </p>
                    ) : null}

                    {!hasRevisionOptions ? (
                      <p className="dashboard-dark-inner" style={styles.emptyCoverageText}>
                        Save Sabaq first before adding Revision.
                      </p>
                    ) : null}

                    <div style={styles.rangeGrid}>
                      <label style={styles.label}>
                        Starting Surah
                        <select
                          className="dashboard-select"
                          value={entry.startSurahNumber}
                          disabled={!hasCoverageOptions}
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
                                (type.key === "sabaq" &&
                                  (sabaqCoverageMap[surah.number]?.size || 0) >= surah.ayahs) ||
                                (type.key === "revision" &&
                                  !isSurahFullyMemorized(sabaqCoverageMap, surah))
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
                          disabled={!hasCoverageOptions}
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
                                (type.key === "sabaq" &&
                                  sabaqCoverageMap[startSurah.number]?.has(ayah)) ||
                                (type.key === "revision" &&
                                  !sabaqCoverageMap[startSurah.number]?.has(ayah))
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
                          disabled={!hasCoverageOptions}
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
                                (type.key === "sabaq" &&
                                  (sabaqCoverageMap[surah.number]?.size || 0) >= surah.ayahs) ||
                                (type.key === "revision" &&
                                  !isSurahFullyMemorized(sabaqCoverageMap, surah))
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
                          disabled={!hasCoverageOptions}
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
                                (type.key === "sabaq" &&
                                  sabaqCoverageMap[endSurah.number]?.has(ayah)) ||
                                (type.key === "revision" &&
                                  !sabaqCoverageMap[endSurah.number]?.has(ayah))
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
                ...(!canSaveEntry ? styles.disabledSaveButton : {}),
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
              <p className="recent-empty-text" style={styles.emptyText}>No recent entries yet.</p>
            ) : (
              recentEntries.map((entry) => (
                <div key={entry.id} className="recent-entry-card" style={styles.entry}>
                  <p style={styles.entryDate}>{formatEntryDate(entry.date)}</p>
                  {hasSavedCoverage(entry.sabaq, entry.sabaqSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Sabaq:</b> {formatRecentCoverage(entry.sabaq)}
                      {renderSessionDuration(entry.deviceSession?.sabaqSeconds)}
                    </p>
                  ) : null}
                  {hasSavedCoverage(entry.sabaqPara, entry.sabaqParaSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Sabaq Para:</b> {formatRecentCoverage(entry.sabaqPara)}
                      {renderSessionDuration(entry.deviceSession?.sabaqParaSeconds)}
                    </p>
                  ) : null}
                  {hasSavedCoverage(entry.manzil, entry.manzilSaved) ? (
                    <p style={styles.entryLine}>
                      <b>Revision:</b> {formatRecentCoverage(entry.manzil)}
                      {renderSessionDuration(entry.deviceSession?.revisionSeconds)}
                    </p>
                  ) : null}
                  {entry.notes?.trim() ? (
                    <p className="entry-note" style={styles.entryNote}>
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
        <div className="dashboard-toast undo-toast" style={styles.undoToast}>
          <span className="dashboard-toast-text" style={styles.undoText}>Entry saved</span>
          <button className="dashboard-toast-action" type="button" onClick={undoSavedEntry} style={styles.undoButton}>
            Undo
          </button>
          <button
            className="dashboard-toast-close"
            type="button"
            onClick={dismissUndoPrompt}
            aria-label="Dismiss undo"
            style={styles.undoCloseButton}
          >
            ✖
          </button>
        </div>
      ) : null}

      {deleteNotice ? (
        <div className="dashboard-toast delete-notice-toast" style={styles.deleteNoticeToast}>
          {deleteNotice}
        </div>
      ) : null}

      {badgeNotice ? (
        <div className="dashboard-toast badge-notice-toast" style={styles.badgeNoticeToast}>
          {badgeNotice}
        </div>
      ) : null}

      {streakNotice ? (
        <div className="dashboard-toast streak-notice-toast" style={styles.streakNoticeToast}>
          {streakNotice}
        </div>
      ) : null}

      {showLessonPreferences ? (
        <div style={styles.badgeOverlay} onClick={() => setShowLessonPreferences(false)}>
          <section
            className="achievement-badge-modal"
            style={styles.preferencesModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.badgeHeader}>
              <div>
                <p style={styles.badgeEyebrow}>Daily Plan</p>
                <h2 style={styles.badgeTitle}>Lesson Preferences</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLessonPreferences(false)}
                aria-label="Close lesson preferences"
                style={styles.badgeCloseButton}
              >
                X
              </button>
            </div>

            <div style={styles.preferencesForm}>
              <label style={styles.label}>
                <span style={styles.preferenceLabelText}>Average Sabaq</span>
                <div style={styles.preferenceSliderRow}>
                  <input
                    className="lesson-preference-slider"
                    type="range"
                    min="0.25"
                    max="1"
                    step="0.25"
                    value={lessonPreferenceDraft.averageSabaqPages}
                    onChange={(event) =>
                      updateLessonPreferenceDraft("averageSabaqPages", event.target.value)
                    }
                    style={styles.preferenceSlider}
                  />
                  <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                    {lessonPreferenceDraft.averageSabaqPages}{" "}
                    {lessonPreferenceDraft.averageSabaqPages === 1 ? "page" : "pages"}
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
                    value={lessonPreferenceDraft.averageSabaqParaPages}
                    onChange={(event) =>
                      updateLessonPreferenceDraft("averageSabaqParaPages", event.target.value)
                    }
                    style={styles.preferenceSlider}
                  />
                  <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                    {lessonPreferenceDraft.averageSabaqParaPages}{" "}
                    {lessonPreferenceDraft.averageSabaqParaPages === 1 ? "page" : "pages"}
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
                    value={lessonPreferenceDraft.averageRevisionJuz}
                    onChange={(event) =>
                      updateLessonPreferenceDraft("averageRevisionJuz", event.target.value)
                    }
                    style={styles.preferenceSlider}
                  />
                  <span className="preference-slider-value" style={styles.preferenceSliderValue}>
                    {formatRevisionPreference(lessonPreferenceDraft.averageRevisionJuz)}
                  </span>
                </div>
              </label>
            </div>

            <div style={styles.preferenceActions}>
              <button
                className="preference-cancel-button"
                type="button"
                onClick={() => setShowLessonPreferences(false)}
                style={styles.preferenceSecondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLessonPreferences}
                disabled={isSavingPreferences}
                style={{
                  ...styles.preferencePrimaryButton,
                  opacity: isSavingPreferences ? 0.7 : 1,
                  cursor: isSavingPreferences ? "not-allowed" : "pointer",
                }}
              >
                {isSavingPreferences ? "Saving..." : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showWeeklyHistory ? (
        <div style={styles.badgeOverlay} onClick={() => setShowWeeklyHistory(false)}>
          <section
            className="achievement-badge-modal"
            style={styles.weeklyHistoryModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.badgeHeader}>
              <div>
                <p style={styles.badgeEyebrow}>Consistency</p>
                <h2 style={styles.badgeTitle}>Weekly Activity History</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyHistory(false)}
                aria-label="Close weekly activity"
                style={styles.badgeCloseButton}
              >
                X
              </button>
            </div>

            <div style={styles.activityTabs}>
              <button
                className={
                  weeklyActivityTab === "weekly"
                    ? "activity-history-tab activity-history-tab-active"
                    : "activity-history-tab"
                }
                type="button"
                onClick={() => setWeeklyActivityTab("weekly")}
                style={{
                  ...styles.activityTab,
                  ...(weeklyActivityTab === "weekly" ? styles.activityTabActive : {}),
                }}
              >
                <span style={styles.activityTabText}>Weekly Activity History</span>
              </button>
              <button
                className={
                  weeklyActivityTab === "monthly"
                    ? "activity-history-tab activity-history-tab-active"
                    : "activity-history-tab"
                }
                type="button"
                onClick={() => setWeeklyActivityTab("monthly")}
                style={{
                  ...styles.activityTab,
                  ...(weeklyActivityTab === "monthly" ? styles.activityTabActive : {}),
                }}
              >
                <span style={styles.activityTabText}>Monthly Activity</span>
              </button>
            </div>

            {weeklyActivityTab === "weekly" ? (
              <div style={styles.weeklyHistoryList}>
                {weeklyActivityHistory.length === 0 ? (
                  <p className="dashboard-dark-inner" style={styles.emptyText}>
                    No activity yet.
                  </p>
                ) : (
                  weeklyActivityHistory.map((week) => (
                    <section
                      className="dashboard-dark-inner"
                      key={week.weekStart}
                      style={styles.weeklyHistoryWeek}
                    >
                      <div style={styles.weeklyHistoryWeekHeader}>
                        <strong style={styles.weeklyHistoryWeekTitle}>{formatWeekRange(week)}</strong>
                      </div>
                      <div style={styles.weeklyHistoryGrid}>
                        {week.days.map((day) => (
                          <div key={day.date} style={styles.weeklyHistoryDay}>
                            <span style={styles.weeklyHistoryDayLabel}>
                              {formatEntryDate(day.date)}
                            </span>
                            <span
                              className={
                                day.completedCount === 3
                                  ? "weekly-activity-box dashboard-green-bg"
                                  : "weekly-activity-box"
                              }
                              title={`${day.completedCount}/3 completed`}
                              style={{
                                ...styles.weeklyHistoryBox,
                                background:
                                  weeklyActivityColors[day.completedCount] ||
                                  weeklyActivityColors[0],
                              }}
                            />
                            <div style={styles.weeklyHistoryEntryList}>
                              {day.entries?.length ? (
                                day.entries.map((entry, index) => (
                                  <div key={`${day.date}-${index}`} style={styles.weeklyHistoryEntry}>
                                    {entry.sabaqSaved && entry.sabaq?.trim() ? (
                                      <p style={styles.weeklyHistoryEntryLine}>
                                        <b>Sabaq:</b> {formatRecentCoverage(entry.sabaq)}
                                      </p>
                                    ) : null}
                                    {entry.sabaqParaSaved && entry.sabaqPara?.trim() ? (
                                      <p style={styles.weeklyHistoryEntryLine}>
                                        <b>Sabaq Para:</b> {formatRecentCoverage(entry.sabaqPara)}
                                      </p>
                                    ) : null}
                                    {entry.manzilSaved && entry.manzil?.trim() ? (
                                      <p style={styles.weeklyHistoryEntryLine}>
                                        <b>Revision:</b> {formatRecentCoverage(entry.manzil)}
                                      </p>
                                    ) : null}
                                    {entry.notes?.trim() ? (
                                      <p style={styles.weeklyHistoryEntryLine}>
                                        <b>Notes:</b> {entry.notes}
                                      </p>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <p style={styles.weeklyHistoryEmptyDay}>No entries</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            ) : (
              <div style={styles.monthlyActivityLayout}>
                <div className="dashboard-dark-inner" style={styles.monthlyGraphPanel}>
                  {monthlyGraphDays.length === 0 ? (
                    <p style={styles.emptyText}>No activity for this month.</p>
                  ) : (
                    <div style={styles.monthlyGraphScroller}>
                      <svg
                        role="img"
                        aria-label="Monthly activity graph"
                        width={graphWidth}
                        height={graphHeight}
                        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                        style={styles.monthlyGraph}
                      >
                        <line
                          className="monthly-graph-axis-line"
                          x1={graphPadding.left}
                          y1={graphPadding.top}
                          x2={graphPadding.left}
                          y2={graphPadding.top + plotHeight}
                          stroke="#7f9289"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line
                          className="monthly-graph-axis-line"
                          x1={graphPadding.left}
                          y1={graphPadding.top + plotHeight}
                          x2={graphPadding.left + plotWidth}
                          y2={graphPadding.top + plotHeight}
                          stroke="#7f9289"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {[1, 2, 3].map((tick) => (
                          <text
                            key={tick}
                            x={graphPadding.left - 16}
                            y={getGraphY(tick) + 4}
                            textAnchor="end"
                            style={styles.monthlyGraphTick}
                          >
                            {tick}
                          </text>
                        ))}
                        <text
                          x={24}
                          y={graphPadding.top + plotHeight / 2 - 8}
                          textAnchor="middle"
                          style={styles.monthlyGraphAxisLabel}
                        >
                          # of
                        </text>
                        <text
                          x={24}
                          y={graphPadding.top + plotHeight / 2 + 14}
                          textAnchor="middle"
                          style={styles.monthlyGraphAxisLabel}
                        >
                          entries
                        </text>
                        {monthlyPolylinePoints ? (
                          <>
                            {monthlyAreaPoints ? (
                              <polygon
                                className="monthly-graph-area-fill"
                                points={monthlyAreaPoints}
                                fill="rgba(31, 122, 85, 0.14)"
                              />
                            ) : null}
                            <polyline
                              points={monthlyPolylinePoints}
                              fill="none"
                              stroke="#24a84f"
                              strokeWidth="3"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                            />
                          </>
                        ) : null}
                        {monthlyGraphPoints.map((point) => (
                          <circle
                            key={point.date}
                            cx={point.x}
                            cy={point.y}
                            r="4.5"
                            fill="#24a84f"
                          />
                        ))}
                        {monthlyGraphPoints.map((point) => (
                          <text
                            key={`${point.date}-label`}
                            x={point.x}
                            y={graphPadding.top + plotHeight + 28}
                            textAnchor="middle"
                            style={styles.monthlyGraphDateLabel}
                          >
                            {formatDayOfMonth(point.date)}
                          </text>
                        ))}
                        <text
                          x={graphPadding.left + plotWidth / 2}
                          y={graphHeight - 10}
                          textAnchor="middle"
                          style={styles.monthlyGraphXAxisLabel}
                        >
                          Day
                        </text>
                      </svg>
                    </div>
                  )}
                </div>

                <div style={styles.monthSelector} aria-label="Choose activity month">
                  {monthlyActivityMonths.map((month) => (
                    <button
                      className={
                        activeActivityMonth === month.key
                          ? "activity-month-button activity-month-button-active"
                          : "activity-month-button"
                      }
                      key={month.key}
                      type="button"
                      onClick={() => setSelectedActivityMonth(month.key)}
                      style={{
                        ...styles.monthSelectorButton,
                        ...(activeActivityMonth === month.key
                          ? styles.monthSelectorButtonActive
                          : {}),
                      }}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {showBadges ? (
        <div style={styles.badgeOverlay} onClick={() => setShowBadges(false)}>
          <section
            className="achievement-badge-modal"
            style={styles.badgeModal}
            onClick={(event) => event.stopPropagation()}
          >
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
                  className={
                    badge.achieved
                      ? "achievement-badge-card achievement-badge-achieved"
                      : "achievement-badge-card achievement-badge-locked"
                  }
                  style={{
                    ...styles.badgeCard,
                    ...(badge.achieved ? styles.badgeCardAchieved : styles.badgeCardLocked),
                  }}
                >
                  <div className="dashboard-green-bg" style={styles.badgeMark}>{badge.mark}</div>
                  <h3 style={styles.badgeName}>{badge.title}</h3>
                  {badge.achieved && badge.awardedDate ? (
                    <p style={styles.badgeAwardDate}>{formatEntryDate(badge.awardedDate)}</p>
                  ) : null}
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
    width: 52,
    height: 52,
    minHeight: 52,
    display: "grid",
    placeItems: "center",
    color: "#1f7a55",
    background: "#e7f4ed",
    border: "1px solid #c5dfd0",
    borderRadius: "50%",
    padding: 0,
    fontSize: 22,
    fontWeight: 850,
    lineHeight: 1,
    boxShadow: "0 12px 26px rgba(32, 63, 48, 0.1)",
    cursor: "pointer",
  },
  themeToggleDark: {
    color: "#ffffff",
    background: "#0b2017",
    borderColor: "rgba(79, 122, 98, 0.5)",
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
  weeklyPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 11,
  },
  weeklyHistoryButton: {
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 7,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
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
  futureWeeklyBox: {
    background: "#ffffff",
    border: "1px solid #17201b",
    boxShadow: "none",
  },
  weeklyLegend: {
    display: "grid",
    gridTemplateColumns: "auto auto auto",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 13,
  },
  weeklyLegendEndpoint: {
    color: "#64766d",
    fontSize: 10,
    fontWeight: 850,
    lineHeight: 1,
  },
  weeklySpectrum: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 10px)",
    gap: 3,
    alignItems: "center",
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
    width: 10,
    height: 10,
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
  },
  progressOverviewDivider: {
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
  progressSubstatText: {
    color: "#64766d",
    fontSize: 11,
    fontWeight: 700,
    marginTop: 4,
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
  idealLessonBox: {
    display: "grid",
    gap: 8,
    color: "#40534b",
    background: "#fbfdfb",
    border: "1px solid #e3ece6",
    borderRadius: 8,
    padding: "12px 13px",
    marginBottom: 16,
  },
  idealLessonTitle: {
    color: "#1f7a55",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  idealLessonGrid: {
    display: "grid",
    gap: 6,
  },
  idealLessonItem: {
    color: "#40534b",
    fontSize: 12,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
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
  disabledSaveButton: {
    color: "#6f7d76",
    background: "#dfe5e1",
    borderColor: "#c8d1cc",
    boxShadow: "none",
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
    fontStyle: "italic",
    marginBottom: 8,
  },
  entryLine: {
    color: "#2a3833",
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 4,
  },
  entryDuration: {
    display: "inline-flex",
    alignItems: "center",
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 999,
    padding: "1px 7px",
    marginLeft: 7,
    fontSize: 11,
    fontWeight: 850,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
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
  badgeNoticeToast: {
    position: "fixed",
    right: 24,
    bottom: 24,
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
    animation: "corner-notice-dissolve-life 7000ms ease-in-out forwards",
  },
  streakNoticeToast: {
    position: "fixed",
    left: "50%",
    bottom: 86,
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
    animation: "notice-dissolve-life 7000ms ease-in-out forwards",
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
  preferencesModal: {
    width: "min(460px, 100%)",
    background: "rgba(255,255,255,0.97)",
    border: "1px solid #dce6df",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 28px 70px rgba(13, 21, 17, 0.24)",
  },
  weeklyHistoryModal: {
    width: "min(1040px, 100%)",
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
  preferencesForm: {
    display: "grid",
    gap: 18,
    marginBottom: 18,
  },
  activityTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 18,
  },
  activityTab: {
    color: "#64766d",
    background: "transparent",
    border: 0,
    padding: "8px 6px",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
  },
  activityTabText: {
    display: "inline-block",
    borderBottom: "2px solid transparent",
    paddingBottom: 5,
  },
  activityTabActive: {
    color: "#17201b",
    fontWeight: 850,
  },
  weeklyHistoryList: {
    display: "grid",
    gap: 12,
  },
  weeklyHistoryWeek: {
    background: "#fbfdfb",
    border: "1px solid #e3ece6",
    borderRadius: 8,
    padding: 13,
  },
  weeklyHistoryWeekHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  weeklyHistoryWeekTitle: {
    color: "#2a3833",
    fontSize: 13,
    fontWeight: 850,
  },
  weeklyHistoryGrid: {
    display: "grid",
    gap: 8,
  },
  weeklyHistoryDay: {
    display: "grid",
    gridTemplateColumns: "92px 30px minmax(0, 1fr)",
    alignItems: "start",
    gap: 10,
    padding: "8px 0",
    borderTop: "1px solid #edf2ee",
  },
  weeklyHistoryDayLabel: {
    color: "#64766d",
    fontSize: 11,
    fontWeight: 850,
    lineHeight: "30px",
  },
  weeklyHistoryBox: {
    width: 24,
    height: 24,
    border: "1px solid rgba(23, 32, 27, 0.1)",
    borderRadius: 5,
  },
  weeklyHistoryOutsideBox: {
    background: "#edf2ee",
    border: "1px solid #d8e3dc",
  },
  weeklyHistoryEntryList: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  weeklyHistoryEntry: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  weeklyHistoryEntryLine: {
    color: "#2a3833",
    fontSize: 12,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  weeklyHistoryEmptyDay: {
    color: "#7a8d84",
    fontSize: 12,
    lineHeight: 1.45,
    fontStyle: "italic",
  },
  monthlyActivityLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 150px",
    gap: 20,
    alignItems: "start",
  },
  monthlyGraphPanel: {
    minWidth: 0,
    background: "#fbfdfb",
    border: "1px solid #e3ece6",
    borderRadius: 8,
    padding: 14,
  },
  monthlyGraphScroller: {
    overflowX: "hidden",
    paddingBottom: 4,
  },
  monthlyGraph: {
    display: "block",
    width: "100%",
  },
  monthlyGraphTick: {
    fill: "#64766d",
    fontSize: 13,
    fontWeight: 650,
  },
  monthlyGraphAxisLabel: {
    fill: "#64766d",
    fontSize: 13,
    fontWeight: 650,
  },
  monthlyGraphDateLabel: {
    fill: "#64766d",
    fontSize: 12,
    fontWeight: 650,
  },
  monthlyGraphXAxisLabel: {
    fill: "#64766d",
    fontSize: 14,
    fontWeight: 700,
  },
  monthSelector: {
    display: "grid",
    gap: 8,
    paddingTop: 48,
  },
  monthSelectorButton: {
    color: "#66766f",
    background: "transparent",
    border: 0,
    textAlign: "left",
    fontSize: 15,
    fontWeight: 650,
    cursor: "pointer",
    padding: "3px 0",
  },
  monthSelectorButtonActive: {
    color: "#17201b",
    fontWeight: 900,
  },
  preferenceSliderRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(132px, auto)",
    alignItems: "center",
    gap: 13,
    minHeight: 40,
  },
  preferenceLabelText: {
    display: "block",
    textAlign: "center",
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
  preferenceActions: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1fr",
    gap: 10,
  },
  preferencePrimaryButton: {
    minHeight: 42,
    color: "white",
    background: "#1f7a55",
    border: "1px solid #1b6f4d",
    borderRadius: 7,
    fontWeight: 800,
    cursor: "pointer",
  },
  preferenceSecondaryButton: {
    minHeight: 42,
    color: "#1f7a55",
    background: "#edf7f1",
    border: "1px solid #d8ecdf",
    borderRadius: 7,
    fontWeight: 800,
    cursor: "pointer",
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
  badgeAwardDate: {
    color: "#6d7c75",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.2,
    fontStyle: "italic",
    marginTop: -2,
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
