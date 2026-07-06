"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const quranProgress_1 = require("../quranProgress");
const streaks_1 = require("../streaks");
const weeklyActivity_1 = require("../weeklyActivity");
const achievements_1 = require("../achievements");
const deviceSessions_1 = require("../deviceSessions");
const router = express_1.default.Router();
const getCurrentPoint = (latestSabaqRange, memorizedJuz, savedCurrentPoint) => {
    if (!latestSabaqRange) {
        if (savedCurrentPoint.currentJuz &&
            savedCurrentPoint.currentSurah &&
            savedCurrentPoint.currentAyah) {
            return {
                currentJuz: savedCurrentPoint.currentJuz,
                currentSurah: savedCurrentPoint.currentSurah,
                currentAyah: savedCurrentPoint.currentAyah,
            };
        }
        return (0, quranProgress_1.getFirstReferenceAfterMemorizedJuz)(memorizedJuz);
    }
    return {
        currentJuz: (0, quranProgress_1.getJuzForAyahReference)(latestSabaqRange.endSurahNumber, latestSabaqRange.endAyah) || null,
        currentSurah: latestSabaqRange.endSurahNumber,
        currentAyah: latestSabaqRange.endAyah,
    };
};
// GET DASHBOARD DATA
router.get("/", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await prisma_1.prisma.user.findUnique({
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
    const recentEntries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 7,
    });
    const recentEntriesWithSessions = await (0, deviceSessions_1.attachDeviceSessionSummaries)({
        prisma: prisma_1.prisma,
        userId: req.userId,
        entries: recentEntries,
    });
    const allEntries = await prisma_1.prisma.dailyEntry.findMany({
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
    const streakStats = (0, streaks_1.calculateStreakStats)(allEntries, today);
    const weeklyActivity = (0, weeklyActivity_1.calculateWeeklyActivity)(allEntries, today, user.createdAt);
    const onboardingMemorizedJuz = (0, quranProgress_1.parseMemorizedJuzList)(user.onboardingMemorizedJuzList);
    const onboardingMemorizedSurahs = (0, quranProgress_1.parseMemorizedSurahList)(user.onboardingMemorizedSurahList);
    const onboardingMemorizedAyahRanges = (0, quranProgress_1.parseMemorizedAyahRanges)(user.onboardingMemorizedAyahRanges);
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(allEntries, onboardingMemorizedJuz, null, onboardingMemorizedSurahs, onboardingMemorizedAyahRanges);
    const memorizedSurahCount = (0, quranProgress_1.calculateCompletedSurahs)(allEntries, null, onboardingMemorizedJuz, onboardingMemorizedSurahs, onboardingMemorizedAyahRanges);
    const latestSabaqRange = (0, quranProgress_1.getLatestSabaqRange)(allEntries);
    const { currentJuz, currentSurah, currentAyah } = getCurrentPoint(latestSabaqRange, onboardingMemorizedJuz, {
        currentJuz: user.currentJuz,
        currentSurah: user.currentSurah,
        currentAyah: user.currentAyah,
    });
    const currentJuzProgressPercent = (0, quranProgress_1.calculateCurrentJuzProgressPercent)(allEntries, onboardingMemorizedJuz, currentJuz, null, onboardingMemorizedSurahs, onboardingMemorizedAyahRanges);
    const currentJuzCompletionEstimate = (0, quranProgress_1.calculateCurrentJuzCompletionEstimate)(allEntries, onboardingMemorizedJuz, currentJuz, user.averageSabaqPages, null, onboardingMemorizedSurahs, onboardingMemorizedAyahRanges);
    const currentSurahProgressPercent = (0, quranProgress_1.getSurahProgressPercent)(currentSurah, currentAyah);
    if (memorizedJuz.length !== user.memorizedJuzCount ||
        JSON.stringify(memorizedJuz) !== user.memorizedJuzList ||
        currentJuz !== user.currentJuz ||
        currentSurah !== user.currentSurah ||
        currentAyah !== user.currentAyah ||
        streakStats.currentStreak !== user.streak ||
        streakStats.longestStreak !== user.longestStreak ||
        streakStats.lastCompletedDate !== user.lastEntryDate?.toISOString()) {
        await prisma_1.prisma.user.update({
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
    const latestCoverage = allEntries.reduce((coverage, entry) => ({
        sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
        sabaqPara: coverage.sabaqPara ||
            (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
        manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
    }), { sabaq: "", sabaqPara: "", manzil: "" });
    const achievementStats = (0, achievements_1.calculateAchievementStats)(allEntries, user.onboardingMemorizedJuzList);
    const sabaqEntries = allEntries
        .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
        .map((entry) => ({ sabaq: entry.sabaq }));
    const idealCoverage = (0, quranProgress_1.createIdealLessonCoverage)({
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
        achievementStats,
        sabaqEntries,
        latestCoverage,
        idealCoverage,
        todayEntry: todayEntry || null,
        recentEntries: recentEntriesWithSessions,
    });
});
router.patch("/lesson-preferences", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const averageSabaqPages = Number(req.body.averageSabaqPages);
    const averageSabaqParaPages = Number(req.body.averageSabaqParaPages);
    const averageRevisionJuz = Number(req.body.averageRevisionJuz);
    const allowedSabaqPages = [0.25, 0.5, 0.75, 1];
    const allowedSabaqParaPages = Array.from({ length: 10 }, (_, index) => index + 1);
    const allowedRevisionJuz = [0.25, 0.5, 0.75, 1];
    if (!allowedSabaqPages.includes(averageSabaqPages) ||
        !allowedSabaqParaPages.includes(averageSabaqParaPages) ||
        !allowedRevisionJuz.includes(averageRevisionJuz)) {
        return res.status(400).json({ message: "Invalid lesson preferences" });
    }
    const user = await prisma_1.prisma.user.update({
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
    const entries = await prisma_1.prisma.dailyEntry.findMany({
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
    const latestCoverage = entries.reduce((coverage, entry) => ({
        sabaq: coverage.sabaq || (entry.sabaqSaved && entry.sabaq.trim() ? entry.sabaq : ""),
        sabaqPara: coverage.sabaqPara ||
            (entry.sabaqParaSaved && entry.sabaqPara.trim() ? entry.sabaqPara : ""),
        manzil: coverage.manzil || (entry.manzilSaved && entry.manzil.trim() ? entry.manzil : ""),
    }), { sabaq: "", sabaqPara: "", manzil: "" });
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(entries, (0, quranProgress_1.parseMemorizedJuzList)(user.onboardingMemorizedJuzList), null, (0, quranProgress_1.parseMemorizedSurahList)(user.onboardingMemorizedSurahList), (0, quranProgress_1.parseMemorizedAyahRanges)(user.onboardingMemorizedAyahRanges));
    const sabaqEntries = entries
        .filter((entry) => entry.sabaqSaved && entry.sabaq.trim())
        .map((entry) => ({ sabaq: entry.sabaq }));
    const idealCoverage = (0, quranProgress_1.createIdealLessonCoverage)({
        latestCoverage,
        sabaqEntries,
        sabaqParaSourceEntries: sabaqEntries,
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
    const currentJuzCompletionEstimate = (0, quranProgress_1.calculateCurrentJuzCompletionEstimate)(entries, (0, quranProgress_1.parseMemorizedJuzList)(user.onboardingMemorizedJuzList), user.currentSurah && user.currentAyah
        ? (0, quranProgress_1.getJuzForAyahReference)(user.currentSurah, user.currentAyah)
        : null, user.averageSabaqPages, null, (0, quranProgress_1.parseMemorizedSurahList)(user.onboardingMemorizedSurahList), (0, quranProgress_1.parseMemorizedAyahRanges)(user.onboardingMemorizedAyahRanges));
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
exports.default = router;
