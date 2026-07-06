import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const router = express.Router();

router.post("/check-email", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return res.status(409).json({ message: "Email is already in use." });
  }

  res.json({ available: true });
});

// SIGNUP
router.post("/signup", async (req, res) => {
  const {
    name,
    email,
    password,
    memorizedJuzCount = 0,
    memorizedJuzList = [],
    memorizedSurahList = [],
    currentJuz,
    currentSurah,
    currentAyah,
    averageSabaqPages = 0.5,
    averageSabaqParaPages = 3,
    averageRevisionJuz = 0.25,
  } = req.body;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const currentSurahNumber = Number(currentSurah);
  const currentAyahNumber = Number(currentAyah);
  const onboardingMemorizedAyahRanges =
    Number.isInteger(currentSurahNumber) &&
    Number.isInteger(currentAyahNumber) &&
    currentSurahNumber > 0 &&
    currentAyahNumber > 0
      ? [
          {
            startSurahNumber: currentSurahNumber,
            startAyah: 1,
            endSurahNumber: currentSurahNumber,
            endAyah: currentAyahNumber,
          },
        ]
      : [];

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      memorizedJuzCount,
      memorizedJuzList: JSON.stringify(memorizedJuzList),
      onboardingMemorizedJuzList: JSON.stringify(memorizedJuzList),
      onboardingMemorizedSurahList: JSON.stringify(memorizedSurahList),
      onboardingMemorizedAyahRanges: JSON.stringify(onboardingMemorizedAyahRanges),
      currentJuz,
      currentSurah,
      currentAyah,
      averageSabaqPages: Number(averageSabaqPages),
      averageSabaqParaPages: Number(averageSabaqParaPages),
      averageRevisionJuz: Number(averageRevisionJuz),
    },
  });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      lessonPreferences: {
        averageSabaqPages: user.averageSabaqPages,
        averageSabaqParaPages: user.averageSabaqParaPages,
        averageRevisionJuz: user.averageRevisionJuz,
      },
    },
  });
});

// LOGIN
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(400).json({ message: "No account exists with that email." });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return res.status(400).json({ message: "Incorrect password." });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      lessonPreferences: {
        averageSabaqPages: user.averageSabaqPages,
        averageSabaqParaPages: user.averageSabaqParaPages,
        averageRevisionJuz: user.averageRevisionJuz,
      },
    },
  });
});

export default router;
