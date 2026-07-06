"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const quranProgress_1 = require("../quranProgress");
const router = express_1.default.Router();
const getDeviceToken = (req) => {
    const headerToken = req.header("x-device-token");
    const authHeader = req.header("authorization");
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : "";
    return (headerToken || bearerToken || "").trim();
};
const getDeviceUser = async (req) => {
    const deviceToken = getDeviceToken(req);
    if (!deviceToken) {
        return null;
    }
    return prisma_1.prisma.user.findUnique({
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
const getLatestCoverage = (entries) => entries.reduce((coverage, entry) => ({
    sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
    sabaqPara: coverage.sabaqPara ||
        (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
    manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
}), { sabaq: "", sabaqPara: "", manzil: "" });
router.get("/token", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await prisma_1.prisma.user.findUnique({
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
    const entries = await prisma_1.prisma.dailyEntry.findMany({
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
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(entries, (0, quranProgress_1.parseMemorizedJuzList)(user.onboardingMemorizedJuzList), null, (0, quranProgress_1.parseMemorizedSurahList)(user.onboardingMemorizedSurahList), (0, quranProgress_1.parseMemorizedAyahRanges)(user.onboardingMemorizedAyahRanges));
    const latestCoverage = getLatestCoverage(entries);
    const idealCoverage = (0, quranProgress_1.createIdealLessonCoverage)({
        latestCoverage,
        sabaqEntries: entries
            .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
            .map((entry) => ({ sabaq: entry.sabaq })),
        sabaqParaSourceEntries: entries
            .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
            .map((entry) => ({ sabaq: entry.sabaq })),
        memorizedJuz,
        memorizedSurahs: (0, quranProgress_1.parseMemorizedSurahList)(user.onboardingMemorizedSurahList),
        memorizedAyahRanges: (0, quranProgress_1.parseMemorizedAyahRanges)(user.onboardingMemorizedAyahRanges),
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
            sabaq: (0, quranProgress_1.formatCoverageRange)(idealCoverage.sabaq),
            sabaqPara: (0, quranProgress_1.formatCoverageRange)(idealCoverage.sabaqPara),
            revision: (0, quranProgress_1.formatCoverageRange)(idealCoverage.revision),
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
    const session = await prisma_1.prisma.deviceSession.create({
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
exports.default = router;
