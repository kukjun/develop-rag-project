import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat";
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  logger.info(`=`.repeat(60));
  logger.info(`🚀 RAG Backend Server is running on port ${PORT}`);
  logger.info(`=`.repeat(60));
});
