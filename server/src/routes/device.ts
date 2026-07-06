import express from "express";
import { prisma } from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import {
  calculateCompletedJuz,
  createIdealLessonCoverage,
  formatCoverageRange,
  parseMemorizedAyahRanges,
  parseMemorizedJuzList,
  parseMemorizedSurahList,
} from "../quranProgress";

const router = express.Router();

const getDeviceToken = (req: express.Request) => {
  const headerToken = req.header("x-device-token");
  const authHeader = req.header("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";

  return (headerToken || bearerToken || "").trim();
};

const getDeviceUser = async (req: express.Request) => {
  const deviceToken = getDeviceToken(req);

  if (!deviceToken) {
    return null;
  }

  return prisma.user.findUnique({
    where: { deviceToken },
    select: {
      id: true,
      name: true,
      deviceToken: true,
      onboardingMemorizedJuzList: true,
      onboardingMemorizedSurahList: true,
      onboardingMemorizedAyahRanges: true,
      currentSurah: true,
      currentAyah: true,
      averageSabaqPages: true,
      averageSabaqParaPages: true,
      averageRevisionJuz: true,
    },
  });
};

const getLatestCoverage = (
  entries: { sabaq: string; sabaqPara: string; manzil: string; sabaqSaved: boolean; sabaqParaSaved: boolean; manzilSaved: boolean }[]
) =>
  entries.reduce(
    (coverage, entry) => ({
      sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
      sabaqPara:
        coverage.sabaqPara ||
        (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
      manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
    }),
    { sabaq: "", sabaqPara: "", manzil: "" }
  );

router.get("/token", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { deviceToken: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ deviceToken: user.deviceToken });
});

router.get("/today", async (req, res) => {
  const user = await getDeviceUser(req);

  if (!user) {
    return res.status(401).json({ message: "Invalid device token" });
  }

  const entries = await prisma.dailyEntry.findMany({
    where: { userId: user.id },
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
  const memorizedJuz = calculateCompletedJuz(
    entries,
    parseMemorizedJuzList(user.onboardingMemorizedJuzList),
    null,
    parseMemorizedSurahList(user.onboardingMemorizedSurahList),
    parseMemorizedAyahRanges(user.onboardingMemorizedAyahRanges)
  );
  const latestCoverage = getLatestCoverage(entries);
  const idealCoverage = createIdealLessonCoverage({
    latestCoverage,
    sabaqEntries: entries
      .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
      .map((entry) => ({ sabaq: entry.sabaq })),
    sabaqParaSourceEntries: entries
      .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
    .map((entry) => ({ sabaq: entry.sabaq })),
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

  res.json({
    studentName: user.name,
    generatedAt: new Date().toISOString(),
    lessons: {
      sabaq: formatCoverageRange(idealCoverage.sabaq),
      sabaqPara: formatCoverageRange(idealCoverage.sabaqPara),
      revision: formatCoverageRange(idealCoverage.revision),
    },
    lessonPreferences: {
      averageSabaqPages: user.averageSabaqPages,
      averageSabaqParaPages: user.averageSabaqParaPages,
      averageRevisionJuz: user.averageRevisionJuz,
    },
  });
});

router.post("/session", async (req, res) => {
  const user = await getDeviceUser(req);

  if (!user) {
    return res.status(401).json({ message: "Invalid device token" });
  }

  const sabaqSeconds = Math.max(0, Math.round(Number(req.body.sabaqSeconds || 0)));
  const sabaqParaSeconds = Math.max(0, Math.round(Number(req.body.sabaqParaSeconds || 0)));
  const revisionSeconds = Math.max(0, Math.round(Number(req.body.revisionSeconds || 0)));

  if (sabaqSeconds + sabaqParaSeconds + revisionSeconds <= 0) {
    return res.status(400).json({ message: "At least one session duration is required" });
  }

  const session = await prisma.deviceSession.create({
    data: {
      userId: user.id,
      sabaqSeconds,
      sabaqParaSeconds,
      revisionSeconds,
    },
  });

  res.status(201).json({
    message: "Session uploaded",
    session,
  });
});

export default router;
