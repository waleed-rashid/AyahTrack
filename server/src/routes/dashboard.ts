import express from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// GET DASHBOARD DATA
router.get("/", authMiddleware, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      entries: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntry = user.entries.find((entry) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  res.json({
    studentName: user.name,
    progress: {
      juz: 0,
      pages: 0,
      surahs: 0,
    },
    streak: user.streak,
    longestStreak: user.longestStreak,
    todayEntry: todayEntry || null,
    recentEntries: user.entries,
  });
});

export default router;
