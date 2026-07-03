"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_2 = require("./middleware/auth");
const entry_1 = __importDefault(require("./routes/entry"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const device_1 = __importDefault(require("./routes/device"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// routes
app.use("/auth", auth_1.default);
app.use("/entries", entry_1.default);
app.use("/dashboard", dashboard_1.default);
app.use("/device", device_1.default);
// public route
app.get("/", (req, res) => {
    res.json({ message: "Hifz Tracker API running 🚀" });
});
//
// ✅ ADD TEST ROUTE HERE
//
app.get("/me", auth_2.authMiddleware, (req, res) => {
    res.json({
        message: "You are authenticated",
        userId: req.userId
    });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
