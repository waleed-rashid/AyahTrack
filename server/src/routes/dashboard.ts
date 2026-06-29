import express from "express";
import { prisma } from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import {
  calculateCompletedJuz,
  calculateCompletedSurahs,
  getJuzForAyahReference,
  getJuzProgressPercent,
  getLatestSabaqRange,
  parseMemorizedJuzList,
} from "../quranProgress";
import { calculateStreakStats } from "../streaks";
import { calculateWeeklyActivity } from "../weeklyActivity";

const router = express.Router();

// GET DASHBOARD DATA
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      streak: true,
      longestStreak: true,
      lastEntryDate: true,
      memorizedJuzCount: true,
      memorizedJuzList: true,
      currentJuz: true,
      currentSurah: true,
      currentAyah: true,
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
    },
  });
  const streakStats = calculateStreakStats(allEntries, today);
  const weeklyActivity = calculateWeeklyActivity(allEntries, today);
  const memorizedJuz = calculateCompletedJuz(
    allEntries,
    parseMemorizedJuzList(user.memorizedJuzList)
  );
  const memorizedSurahs = calculateCompletedSurahs(allEntries);
  const latestSabaqRange = getLatestSabaqRange(allEntries);
  const currentJuz =
    latestSabaqRange && getJuzForAyahReference(latestSabaqRange.endSurahNumber, latestSabaqRange.endAyah);
  const effectiveCurrentJuz = currentJuz ?? user.currentJuz;
  const currentSurah = latestSabaqRange?.endSurahNumber ?? user.currentSurah;
  const currentAyah = latestSabaqRange?.endAyah ?? user.currentAyah;
  const currentJuzProgressPercent = getJuzProgressPercent(currentSurah, currentAyah);

  if (
    memorizedJuz.length !== user.memorizedJuzCount ||
    JSON.stringify(memorizedJuz) !== user.memorizedJuzList ||
    effectiveCurrentJuz !== user.currentJuz ||
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
        currentJuz: effectiveCurrentJuz,
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
  const achievementStats = {
    totalEntries: allEntries.length,
    revisionSessions: allEntries.filter((entry) => entry.manzilSaved && entry.manzil.trim())
      .length,
  };

  res.json({
    studentName: user.name,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    progress: {
      juz: memorizedJuz.length,
      memorizedJuz,
      currentJuz: effectiveCurrentJuz,
      currentSurah,
      currentAyah,
      currentJuzProgressPercent,
      pages: 0,
      surahs: memorizedSurahs,
    },
    streak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    longestStreakRange: streakStats.longestStreakRange,
    weeklyActivity,
    achievementStats,
    sabaqEntries: allEntries
      .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
      .map((entry) => ({ sabaq: entry.sabaq })),
    latestCoverage,
    todayEntry: todayEntry || null,
    recentEntries,
  });
});

export default router;
