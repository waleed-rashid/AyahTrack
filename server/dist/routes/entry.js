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
        orderBy: [{ date: "desc" }, { id: "desc" }],
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
    const undoOperation = canMergeWithExistingEntry
        ? {
            type: "restore",
            entry: existingEntry,
        }
        : {
            type: "delete",
            entryId: entry.id,
        };
    const recentEntries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 7,
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
    const streakStats = (0, streaks_1.calculateStreakStats)(entries, today);
    const weeklyActivity = (0, weeklyActivity_1.calculateWeeklyActivity)(entries, today);
    const sabaqRange = (0, quranProgress_1.normalizeCoverageRange)(coverage?.sabaq) ||
        (sabaq !== undefined ? (0, quranProgress_1.parseCoverageRange)(entry.sabaq) : null);
    const currentJuz = sabaqRange && (0, quranProgress_1.getJuzForAyahReference)(sabaqRange.endSurahNumber, sabaqRange.endAyah);
    const effectiveCurrentJuz = currentJuz ?? user.currentJuz;
    const currentSurah = sabaqRange?.endSurahNumber ?? user.currentSurah;
    const currentAyah = sabaqRange?.endAyah ?? user.currentAyah;
    const currentJuzProgressPercent = (0, quranProgress_1.getJuzProgressPercent)(currentSurah, currentAyah);
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(entries, (0, quranProgress_1.parseMemorizedJuzList)(user.memorizedJuzList), sabaqRange);
    const memorizedSurahs = (0, quranProgress_1.calculateCompletedSurahs)(entries, sabaqRange);
    const latestCoverage = entries.reduce((coverage, savedEntry) => ({
        sabaq: coverage.sabaq ||
            (savedEntry.sabaqSaved && savedEntry.sabaq.trim() ? savedEntry.sabaq : ""),
        sabaqPara: coverage.sabaqPara ||
            (savedEntry.sabaqParaSaved && savedEntry.sabaqPara.trim()
                ? savedEntry.sabaqPara
                : ""),
        manzil: coverage.manzil ||
            (savedEntry.manzilSaved && savedEntry.manzil.trim() ? savedEntry.manzil : ""),
    }), { sabaq: "", sabaqPara: "", manzil: "" });
    const achievementStats = {
        totalEntries: entries.length,
        revisionSessions: entries.filter((savedEntry) => savedEntry.manzilSaved && savedEntry.manzil.trim())
            .length,
    };
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
        recentEntries,
    });
});
// DELETE ENTRY
router.patch("/:id/restore", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const entryId = Number(req.params.id);
    if (!Number.isInteger(entryId)) {
        return res.status(400).json({ message: "Invalid entry id" });
    }
    const { sabaq, sabaqPara, manzil, sabaqSaved, sabaqParaSaved, manzilSaved, notes, } = req.body;
    const restoredEntry = await prisma_1.prisma.dailyEntry.updateMany({
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
router.delete("/:id", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const entryId = Number(req.params.id);
    if (!Number.isInteger(entryId)) {
        return res.status(400).json({ message: "Invalid entry id" });
    }
    const deletedEntry = await prisma_1.prisma.dailyEntry.deleteMany({
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
router.get("/", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const entries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    res.json(entries);
});
exports.default = router;
