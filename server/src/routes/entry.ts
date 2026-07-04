import express from "express";
import { prisma } from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import {
  calculateCompletedJuz,
  calculateCompletedSurahs,
  getJuzForAyahReference,
  getJuzProgressPercent,
  normalizeCoverageRange,
  parseCoverageRange,
  parseMemorizedJuzList,
} from "../quranProgress";
import { calculateStreakStats } from "../streaks";
import { calculateWeeklyActivity } from "../weeklyActivity";
import { calculateAchievementStats } from "../achievements";
import { attachDeviceSessionSummaries } from "../deviceSessions";

const router = express.Router();

// CREATE DAILY ENTRY
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { sabaq, sabaqPara, manzil, notes, coverage } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingEntry = await prisma.dailyEntry.findFirst({
    where: {
      userId: req.userId,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  const entryData = {
    ...(sabaq !== undefined ? { sabaq, sabaqSaved: true } : {}),
    ...(sabaqPara !== undefined ? { sabaqPara, sabaqParaSaved: true } : {}),
    ...(manzil !== undefined ? { manzil, manzilSaved: true } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
  const canMergeWithExistingEntry =
    existingEntry &&
    (sabaq === undefined || !existingEntry.sabaqSaved) &&
    (sabaqPara === undefined || !existingEntry.sabaqParaSaved) &&
    (manzil === undefined || !existingEntry.manzilSaved);

  const entry = canMergeWithExistingEntry
    ? await prisma.dailyEntry.update({
        where: { id: existingEntry.id },
        data: entryData,
      })
    : await prisma.dailyEntry.create({
        data: {
          userId: req.userId,
          sabaq: sabaq || "",
          sabaqPara: sabaqPara || "",
          manzil: manzil || "",
          sabaqSaved: sabaq !== undefined,
          sabaqParaSaved: sabaqPara !== undefined,
          manzilSaved: manzil !== undefined,
          notes,
        },
      });
  const undoOperation = canMergeWithExistingEntry
    ? {
        type: "restore",
        entry: existingEntry,
      }
    : {
        type: "delete",
        entryId: entry.id,
      };

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
  const streakStats = calculateStreakStats(entries, today);
  const weeklyActivity = calculateWeeklyActivity(entries, today, user.createdAt);
  const sabaqRange =
    normalizeCoverageRange(coverage?.sabaq) ||
    (sabaq !== undefined ? parseCoverageRange(entry.sabaq) : null);
  const currentJuz =
    sabaqRange && getJuzForAyahReference(sabaqRange.endSurahNumber, sabaqRange.endAyah);
  const effectiveCurrentJuz = currentJuz ?? user.currentJuz;
  const currentSurah = sabaqRange?.endSurahNumber ?? user.currentSurah;
  const currentAyah = sabaqRange?.endAyah ?? user.currentAyah;
  const currentJuzProgressPercent = getJuzProgressPercent(currentSurah, currentAyah);
  const memorizedJuz = calculateCompletedJuz(
    entries,
    parseMemorizedJuzList(user.onboardingMemorizedJuzList),
    sabaqRange
  );
  const memorizedSurahs = calculateCompletedSurahs(entries, sabaqRange);
  const latestCoverage = entries.reduce(
    (coverage, savedEntry) => ({
      sabaq:
        coverage.sabaq ||
        (savedEntry.sabaqSaved && savedEntry.sabaq.trim() ? savedEntry.sabaq : ""),
      sabaqPara:
        coverage.sabaqPara ||
        (savedEntry.sabaqParaSaved && savedEntry.sabaqPara.trim()
          ? savedEntry.sabaqPara
          : ""),
      manzil:
        coverage.manzil ||
        (savedEntry.manzilSaved && savedEntry.manzil.trim() ? savedEntry.manzil : ""),
    }),
    { sabaq: "", sabaqPara: "", manzil: "" }
  );
  const achievementStats = calculateAchievementStats(entries, user.onboardingMemorizedJuzList);

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

  res.json({
    entry,
    undoOperation,
    streak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    longestStreakRange: streakStats.longestStreakRange,
    weeklyActivity,
    achievementStats,
    sabaqEntries: entries
      .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
      .map((entry) => ({ sabaq: entry.sabaq })),
    latestCoverage,
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
    recentEntries: recentEntriesWithSessions,
  });
});

// DELETE ENTRY
router.patch("/:id/restore", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const entryId = Number(req.params.id);

  if (!Number.isInteger(entryId)) {
    return res.status(400).json({ message: "Invalid entry id" });
  }

  const {
    sabaq,
    sabaqPara,
    manzil,
    sabaqSaved,
    sabaqParaSaved,
    manzilSaved,
    notes,
  } = req.body;

  const restoredEntry = await prisma.dailyEntry.updateMany({
    where: {
      id: entryId,
      userId: req.userId,
    },
    data: {
      sabaq: sabaq || "",
      sabaqPara: sabaqPara || "",
      manzil: manzil || "",
      sabaqSaved: Boolean(sabaqSaved),
      sabaqParaSaved: Boolean(sabaqParaSaved),
      manzilSaved: Boolean(manzilSaved),
      notes,
    },
  });

  if (restoredEntry.count === 0) {
    return res.status(404).json({ message: "Entry not found" });
  }

  res.json({ message: "Entry restored" });
});

// DELETE ENTRY
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const entryId = Number(req.params.id);

  if (!Number.isInteger(entryId)) {
    return res.status(400).json({ message: "Invalid entry id" });
  }

  const deletedEntry = await prisma.dailyEntry.deleteMany({
    where: {
      id: entryId,
      userId: req.userId,
    },
  });

  if (deletedEntry.count === 0) {
    return res.status(404).json({ message: "Entry not found" });
  }

  res.json({ message: "Entry deleted" });
});

// GET MY ENTRIES
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const entries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  res.json(entries);
});

export default router;
