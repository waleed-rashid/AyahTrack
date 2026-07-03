import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import entryRoutes from "./routes/entry";
import dashboardRoutes from "./routes/dashboard";
import deviceRoutes from "./routes/device";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/device", deviceRoutes);

// public route
app.get("/", (req, res) => {
  res.json({ message: "Hifz Tracker API running 🚀" });
});

//
// ✅ ADD TEST ROUTE HERE
//
app.get("/me", authMiddleware, (req: any, res) => {
  res.json({
    message: "You are authenticated",
    userId: req.userId
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
