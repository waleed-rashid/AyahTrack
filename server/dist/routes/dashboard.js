"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
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
            juz: user.memorizedJuzCount,
            memorizedJuz: JSON.parse(user.memorizedJuzList),
            currentJuz: user.currentJuz,
            currentSurah: user.currentSurah,
            currentAyah: user.currentAyah,
            pages: 0,
            surahs: 0,
        },
        streak: user.streak,
        longestStreak: user.longestStreak,
        todayEntry: todayEntry || null,
        recentEntries,
    });
});
exports.default = router;
