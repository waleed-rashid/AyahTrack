import express from "express";
import { prisma } from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import {
  calculateCompletedJuz,
  getJuzForAyahReference,
  getJuzProgressPercent,
  normalizeCoverageRange,
  parseCoverageRange,
  parseMemorizedJuzList,
} from "../quranProgress";

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

  const last = user.lastEntryDate
    ? new Date(user.lastEntryDate)
    : null;

  let newStreak = user.streak;

  if (last) {
    last.setHours(0, 0, 0, 0);

    const diffDays =
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      newStreak += 1; // continued streak
    } else if (diffDays > 1) {
      newStreak = 1; // reset streak
    }
  } else {
    newStreak = 1;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      streak: newStreak,
      longestStreak: Math.max(user.longestStreak, newStreak),
      lastEntryDate: today,
    },
  });

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
    orderBy: { date: "desc" },
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

  const recentEntries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: { date: "desc" },
    take: 7,
  });

  const entries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    select: {
      sabaq: true,
      sabaqPara: true,
      manzil: true,
    },
  });
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
    parseMemorizedJuzList(user.memorizedJuzList),
    sabaqRange
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      memorizedJuzCount: memorizedJuz.length,
      memorizedJuzList: JSON.stringify(memorizedJuz),
      currentJuz: effectiveCurrentJuz,
      currentSurah,
      currentAyah,
    },
  });

  res.json({
    entry,
    streak: updatedUser.streak,
    longestStreak: updatedUser.longestStreak,
    progress: {
      juz: memorizedJuz.length,
      memorizedJuz,
      currentJuz: effectiveCurrentJuz,
      currentSurah,
      currentAyah,
      currentJuzProgressPercent,
      pages: 0,
      surahs: 0,
    },
    recentEntries,
  });
});

// GET MY ENTRIES
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const entries = await prisma.dailyEntry.findMany({
    where: { userId: req.userId },
    orderBy: { date: "desc" },
  });

  res.json(entries);
});

export default router;
