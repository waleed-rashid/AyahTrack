"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
router.post("/check-email", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (existing) {
        return res.status(409).json({ message: "Email is already in use." });
    }
    res.json({ available: true });
});
// SIGNUP
router.post("/signup", async (req, res) => {
    const { name, email, password, memorizedJuzCount = 0, memorizedJuzList = [], currentJuz, currentSurah, currentAyah, averageSabaqPages = 0.5, averageSabaqParaPages = 3, averageRevisionJuz = 0.25, } = req.body;
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (existing) {
        return res.status(400).json({ message: "User already exists" });
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            memorizedJuzCount,
            memorizedJuzList: JSON.stringify(memorizedJuzList),
            currentJuz,
            currentSurah,
            currentAyah,
            averageSabaqPages: Number(averageSabaqPages),
            averageSabaqParaPages: Number(averageSabaqParaPages),
            averageRevisionJuz: Number(averageRevisionJuz),
        },
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
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
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    const isValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isValid) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
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
exports.default = router;
