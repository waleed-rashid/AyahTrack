import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const router = express.Router();
const EMAIL_CODE_EXPIRATION_MINUTES = 10;
const EMAIL_VERIFICATION_TOKEN_EXPIRATION = "30m";
const MAX_EMAIL_VERIFICATION_ATTEMPTS = 5;

const normalizeEmail = (email: unknown) => String(email || "").trim().toLowerCase();
const createVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));
const getJwtSecret = () => process.env.JWT_SECRET || "secret";

const sendVerificationEmail = async (email: string, code: string) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!resendApiKey || !fromEmail) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured");
    }

    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: "Your AyahTrack verification code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #17201b;">
          <h2>Confirm your AyahTrack email</h2>
          <p>Use this code to continue creating your account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
          <p>This code expires in ${EMAIL_CODE_EXPIRATION_MINUTES} minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send verification email: ${body}`);
  }

  return { skipped: false };
};

router.post("/check-email", async (req, res) => {
  const email = normalizeEmail(req.body.email);

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

router.post("/send-verification", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const code = createVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_EXPIRATION_MINUTES * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email },
      update: {
        codeHash,
        expiresAt,
        attempts: 0,
        createdAt: new Date(),
      },
      create: {
        email,
        codeHash,
        expiresAt,
      },
    });

    const emailResult = await sendVerificationEmail(email, code);

    res.json({
      message: "Verification code sent.",
      ...(emailResult.skipped ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not send verification email. Please try again." });
  }
});

router.post("/verify-email", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();

  if (!email || !code) {
    return res.status(400).json({ message: "Email and verification code are required." });
  }

  const verification = await prisma.emailVerification.findUnique({
    where: { email },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return res.status(400).json({ message: "Verification code expired. Please request a new one." });
  }

  if (verification.attempts >= MAX_EMAIL_VERIFICATION_ATTEMPTS) {
    return res.status(429).json({ message: "Too many attempts. Please request a new code." });
  }

  const isValidCode = await bcrypt.compare(code, verification.codeHash);

  if (!isValidCode) {
    await prisma.emailVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    return res.status(400).json({ message: "Incorrect verification code." });
  }

  const emailVerificationToken = jwt.sign(
    { email, purpose: "email-verification" },
    getJwtSecret(),
    { expiresIn: EMAIL_VERIFICATION_TOKEN_EXPIRATION }
  );

  res.json({
    message: "Email verified.",
    emailVerificationToken,
  });
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
    emailVerificationToken,
  } = req.body;

  const normalizedEmail = normalizeEmail(email);

  try {
    const verificationPayload = jwt.verify(
      String(emailVerificationToken || ""),
      getJwtSecret()
    ) as { email?: string; purpose?: string };

    if (
      verificationPayload.purpose !== "email-verification" ||
      verificationPayload.email !== normalizedEmail
    ) {
      return res.status(400).json({ message: "Please verify your email before signing up." });
    }
  } catch {
    return res.status(400).json({ message: "Please verify your email before signing up." });
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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
      email: normalizedEmail,
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
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  await prisma.emailVerification.deleteMany({
    where: { email: normalizedEmail },
  });

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
  const email = normalizeEmail(req.body.email);
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
    getJwtSecret(),
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
