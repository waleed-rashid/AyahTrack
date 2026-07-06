import express from "express";
import { prisma } from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import {
  calculateCurrentJuzCompletionEstimate,
  calculateCurrentJuzProgressPercent,
  calculateCompletedJuz,
  calculateCompletedSurahs,
  createIdealLessonCoverage,
  getFirstReferenceAfterMemorizedJuz,
  getJuzForAyahReference,
  getLatestSabaqRange,
  getSurahProgressPercent,
  parseMemorizedAyahRanges,
  parseMemorizedJuzList,
  parseMemorizedSurahList,
} from "../quranProgress";
import { calculateStreakStats } from "../streaks";
import { calculateWeeklyActivity, calculateWeeklyActivityHistory } from "../weeklyActivity";
import { calculateAchievementStats } from "../achievements";
import { attachDeviceSessionSummaries } from "../deviceSessions";

const router = express.Router();

const getCurrentPoint = (
  latestSabaqRange: ReturnType<typeof getLatestSabaqRange>,
  memorizedJuz: number[],
  savedCurrentPoint: {
    currentJuz?: number | null;
    currentSurah?: number | null;
    currentAyah?: number | null;
  }
) => {
  if (!latestSabaqRange) {
    if (
      savedCurrentPoint.currentJuz &&
      savedCurrentPoint.currentSurah &&
      savedCurrentPoint.currentAyah
    ) {
      return {
        currentJuz: savedCurrentPoint.currentJuz,
        currentSurah: savedCurrentPoint.currentSurah,
        currentAyah: savedCurrentPoint.currentAyah,
      };
    }

    return getFirstReferenceAfterMemorizedJuz(memorizedJuz);
  }

  return {
    currentJuz:
      getJuzForAyahReference(latestSabaqRange.endSurahNumber, latestSabaqRange.endAyah) || null,
    currentSurah: latestSabaqRange.endSurahNumber,
    currentAyah: latestSabaqRange.endAyah,
  };
};

// GET DASHBOARD DATA
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      createdAt: true,
      name: true,
      email: true,
      streak: true,
      longestStreak: true,
      lastEntryDate: true,
      memorizedJuzCount: true,
      memorizedJuzList: true,
      onboardingMemorizedJuzList: true,
      onboardingMemorizedSurahList: true,
      onboardingMemorizedAyahRanges: true,
      currentJuz: true,
      currentSurah: true,
      currentAyah: true,
      averageSabaqPages: true,
      averageSabaqParaPages: true,
      averageRevisionJuz: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentEntries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 7,
  });
  const recentEntriesWithSessions = await attachDeviceSessionSummaries({
    prisma,
    userId: req.userId,
    entries: recentEntries,
  });
  const allEntries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      date: true,
      sabaq: true,
      sabaqPara: true,
      manzil: true,
      sabaqSaved: true,
      sabaqParaSaved: true,
      manzilSaved: true,
      notes: true,
    },
  });
  const streakStats = calculateStreakStats(allEntries, today);
  const weeklyActivity = calculateWeeklyActivity(allEntries, today, user.createdAt);
  const weeklyActivityHistory = calculateWeeklyActivityHistory(allEntries, today, user.createdAt);
  const onboardingMemorizedJuz = parseMemorizedJuzList(user.onboardingMemorizedJuzList);
  const onboardingMemorizedSurahs = parseMemorizedSurahList(user.onboardingMemorizedSurahList);
  const onboardingMemorizedAyahRanges = parseMemorizedAyahRanges(
    user.onboardingMemorizedAyahRanges
  );
  const memorizedJuz = calculateCompletedJuz(
    allEntries,
    onboardingMemorizedJuz,
    null,
    onboardingMemorizedSurahs,
    onboardingMemorizedAyahRanges
  );
  const memorizedSurahCount = calculateCompletedSurahs(
    allEntries,
    null,
    onboardingMemorizedJuz,
    onboardingMemorizedSurahs,
    onboardingMemorizedAyahRanges
  );
  const latestSabaqRange = getLatestSabaqRange(allEntries);
  const { currentJuz, currentSurah, currentAyah } = getCurrentPoint(
    latestSabaqRange,
    onboardingMemorizedJuz,
    {
      currentJuz: user.currentJuz,
      currentSurah: user.currentSurah,
      currentAyah: user.currentAyah,
    }
  );
  const currentJuzProgressPercent = calculateCurrentJuzProgressPercent(
    allEntries,
    onboardingMemorizedJuz,
    currentJuz,
    null,
    onboardingMemorizedSurahs,
    onboardingMemorizedAyahRanges
  );
  const currentJuzCompletionEstimate = calculateCurrentJuzCompletionEstimate(
    allEntries,
    onboardingMemorizedJuz,
    currentJuz,
    user.averageSabaqPages,
    null,
    onboardingMemorizedSurahs,
    onboardingMemorizedAyahRanges
  );
  const currentSurahProgressPercent = getSurahProgressPercent(currentSurah, currentAyah);

  if (
    memorizedJuz.length !== user.memorizedJuzCount ||
    JSON.stringify(memorizedJuz) !== user.memorizedJuzList ||
    currentJuz !== user.currentJuz ||
    currentSurah !== user.currentSurah ||
    currentAyah !== user.currentAyah ||
    streakStats.currentStreak !== user.streak ||
    streakStats.longestStreak !== user.longestStreak ||
    streakStats.lastCompletedDate !== user.lastEntryDate?.toISOString()
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        memorizedJuzCount: memorizedJuz.length,
        memorizedJuzList: JSON.stringify(memorizedJuz),
        currentJuz,
        currentSurah,
        currentAyah,
        streak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        lastEntryDate: streakStats.lastCompletedDate
          ? new Date(streakStats.lastCompletedDate)
          : null,
      },
    });
  }

  const todayEntry = recentEntries.find((entry) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });
  const latestCoverage = allEntries.reduce(
    (coverage, entry) => ({
      sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
      sabaqPara:
        coverage.sabaqPara ||
        (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
      manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
    }),
    { sabaq: "", sabaqPara: "", manzil: "" }
  );
  const achievementStats = calculateAchievementStats(
    allEntries,
    user.onboardingMemorizedJuzList
  );
  const sabaqEntries = allEntries
    .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
    .map((entry) => ({ sabaq: entry.sabaq }));
  const idealCoverage = createIdealLessonCoverage({
    latestCoverage,
    sabaqEntries,
    sabaqParaSourceEntries: sabaqEntries,
    memorizedJuz,
    memorizedSurahs: onboardingMemorizedSurahs,
    memorizedAyahRanges: onboardingMemorizedAyahRanges,
    lessonPreferences: {
      averageSabaqPages: user.averageSabaqPages,
      averageSabaqParaPages: user.averageSabaqParaPages,
      averageRevisionJuz: user.averageRevisionJuz,
    },
    onboardingCurrentPoint: {
      currentSurah,
      currentAyah,
    },
  });

  res.json({
    studentName: user.name,
    user: {
      id: user.id,
      createdAt: user.createdAt,
      name: user.name,
      email: user.email,
      lessonPreferences: {
        averageSabaqPages: user.averageSabaqPages,
        averageSabaqParaPages: user.averageSabaqParaPages,
        averageRevisionJuz: user.averageRevisionJuz,
      },
    },
    lessonPreferences: {
      averageSabaqPages: user.averageSabaqPages,
      averageSabaqParaPages: user.averageSabaqParaPages,
      averageRevisionJuz: user.averageRevisionJuz,
    },
    progress: {
      juz: memorizedJuz.length,
      memorizedJuz,
      currentJuz,
      currentSurah,
      currentAyah,
      currentJuzProgressPercent,
      currentJuzCompletionEstimate,
      currentSurahProgressPercent,
      memorizedSurahs: onboardingMemorizedSurahs,
      memorizedAyahRanges: onboardingMemorizedAyahRanges,
      pages: 0,
      surahs: memorizedSurahCount,
    },
    streak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    longestStreakRange: streakStats.longestStreakRange,
    weeklyActivity,
    weeklyActivityHistory,
    achievementStats,
    sabaqEntries,
    latestCoverage,
    idealCoverage,
    todayEntry: todayEntry || null,
    recentEntries: recentEntriesWithSessions,
  });
});

router.patch("/lesson-preferences", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const averageSabaqPages = Number(req.body.averageSabaqPages);
  const averageSabaqParaPages = Number(req.body.averageSabaqParaPages);
  const averageRevisionJuz = Number(req.body.averageRevisionJuz);
  const allowedSabaqPages = [0.25, 0.5, 0.75, 1];
  const allowedSabaqParaPages = Array.from({ length: 10 }, (_, index) => index + 1);
  const allowedRevisionJuz = [0.25, 0.5, 0.75, 1];

  if (
    !allowedSabaqPages.includes(averageSabaqPages) ||
    !allowedSabaqParaPages.includes(averageSabaqParaPages) ||
    !allowedRevisionJuz.includes(averageRevisionJuz)
  ) {
    return res.status(400).json({ message: "Invalid lesson preferences" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      averageSabaqPages,
      averageSabaqParaPages,
      averageRevisionJuz,
    },
    select: {
      averageSabaqPages: true,
      averageSabaqParaPages: true,
      averageRevisionJuz: true,
      onboardingMemorizedJuzList: true,
      onboardingMemorizedSurahList: true,
      onboardingMemorizedAyahRanges: true,
      currentSurah: true,
      currentAyah: true,
    },
  });
  const entries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      date: true,
      sabaq: true,
      sabaqPara: true,
      manzil: true,
      sabaqSaved: true,
      sabaqParaSaved: true,
      manzilSaved: true,
    },
  });
  const latestCoverage = entries.reduce(
    (coverage, entry) => ({
      sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
      sabaqPara:
        coverage.sabaqPara ||
        (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
      manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
    }),
    { sabaq: "", sabaqPara: "", manzil: "" }
  );
  const memorizedJuz = calculateCompletedJuz(
    entries,
    parseMemorizedJuzList(user.onboardingMemorizedJuzList),
    null,
    parseMemorizedSurahList(user.onboardingMemorizedSurahList),
    parseMemorizedAyahRanges(user.onboardingMemorizedAyahRanges)
  );
  const sabaqEntries = entries
    .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
    .map((entry) => ({ sabaq: entry.sabaq }));
  const idealCoverage = createIdealLessonCoverage({
    latestCoverage,
    sabaqEntries,
    sabaqParaSourceEntries: sabaqEntries,
    memorizedJuz,
    memorizedSurahs: parseMemorizedSurahList(user.onboardingMemorizedSurahList),
    memorizedAyahRanges: parseMemorizedAyahRanges(user.onboardingMemorizedAyahRanges),
    lessonPreferences: {
      averageSabaqPages: user.averageSabaqPages,
      averageSabaqParaPages: user.averageSabaqParaPages,
      averageRevisionJuz: user.averageRevisionJuz,
    },
    onboardingCurrentPoint: {
      currentSurah: user.currentSurah,
      currentAyah: user.currentAyah,
    },
  });
  const currentJuzCompletionEstimate = calculateCurrentJuzCompletionEstimate(
    entries,
    parseMemorizedJuzList(user.onboardingMemorizedJuzList),
    user.currentSurah && user.currentAyah
      ? getJuzForAyahReference(user.currentSurah, user.currentAyah)
      : null,
    user.averageSabaqPages,
    null,
    parseMemorizedSurahList(user.onboardingMemorizedSurahList),
    parseMemorizedAyahRanges(user.onboardingMemorizedAyahRanges)
  );

  res.json({
    lessonPreferences: {
      averageSabaqPages: user.averageSabaqPages,
      averageSabaqParaPages: user.averageSabaqParaPages,
      averageRevisionJuz: user.averageRevisionJuz,
    },
    idealCoverage,
    currentJuzCompletionEstimate,
  });
});

export default router;
