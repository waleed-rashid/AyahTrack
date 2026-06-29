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
// GET DASHBOARD DATA
router.get("/", auth_1.authMiddleware, async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await prisma_1.prisma.user.findUnique({
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
    const recentEntries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
        take: 7,
    });
    const allEntries = await prisma_1.prisma.dailyEntry.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
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
    const memorizedJuz = (0, quranProgress_1.calculateCompletedJuz)(allEntries, (0, quranProgress_1.parseMemorizedJuzList)(user.memorizedJuzList));
    const latestSabaqRange = (0, quranProgress_1.getLatestSabaqRange)(allEntries);
    const currentJuz = latestSabaqRange && (0, quranProgress_1.getJuzForAyahReference)(latestSabaqRange.endSurahNumber, latestSabaqRange.endAyah);
    const effectiveCurrentJuz = currentJuz ?? user.currentJuz;
    const currentSurah = latestSabaqRange?.endSurahNumber ?? user.currentSurah;
    const currentAyah = latestSabaqRange?.endAyah ?? user.currentAyah;
    const currentJuzProgressPercent = (0, quranProgress_1.getJuzProgressPercent)(currentSurah, currentAyah);
    if (memorizedJuz.length !== user.memorizedJuzCount ||
        JSON.stringify(memorizedJuz) !== user.memorizedJuzList ||
        effectiveCurrentJuz !== user.currentJuz ||
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
            surahs: 0,
        },
        streak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        longestStreakRange: streakStats.longestStreakRange,
        todayEntry: todayEntry || null,
        recentEntries,
    });
});
exports.default = router;
