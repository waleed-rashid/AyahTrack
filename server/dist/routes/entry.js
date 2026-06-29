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
const router = express_1.default.Router();
// CREATE DAILY ENTRY
router.post("/", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const { sabaq, sabaqPara, manzil, notes, coverage } = req.body;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
    });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const existingEntry = await prisma_1.prisma.dailyEntry.findFirst({
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
    const canMergeWithExistingEntry = existingEntry &&
        (sabaq === undefined || !existingEntry.sabaqSaved) &&
        (sabaqPara === undefined || !existingEntry.sabaqParaSaved) &&
        (manzil === undefined || !existingEntry.manzilSaved);
    const entry = canMergeWithExistingEntry
        ? await prisma_1.prisma.dailyEntry.update({
            where: { id: existingEntry.id },
            data: entryData,
        })
        : await prisma_1.prisma.dailyEntry.create({
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
    const recentEntries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
        take: 7,
    });
    const entries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
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
    const streakStats = (0, streaks_1.calculateStreakStats)(entries, today);
    const sabaqRange = (0, quranProgress_1.normalizeCoverageRange)(coverage?.sabaq) ||
        (sabaq !== undefined ? (0, quranProgress_1.parseCoverageRange)(entry.sabaq) : null);
    const currentJuz = sabaqRange && (0, quranProgress_1.getJuzForAyahReference)(sabaqRange.endSurahNumber, sabaqRange.endAyah);
    const effectiveCurrentJuz = currentJuz ?? user.currentJuz;
    const currentSurah = sabaqRange?.endSurahNumber ?? user.currentSurah;
    const currentAyah = sabaqRange?.endAyah ?? user.currentAyah;
    const currentJuzProgressPercent = (0, quranProgress_1.getJuzProgressPercent)(currentSurah, currentAyah);
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(entries, (0, quranProgress_1.parseMemorizedJuzList)(user.memorizedJuzList), sabaqRange);
    await prisma_1.prisma.user.update({
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
        streak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        longestStreakRange: streakStats.longestStreakRange,
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
router.get("/", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const entries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
    });
    res.json(entries);
});
exports.default = router;
