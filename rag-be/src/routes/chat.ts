import express, { Request, Response } from "express";
import { generateAnswerStream } from "../services/ragService";
import { generateAnswerWithAgentStream } from "../services/agentService";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * POST /api/chat/default
 * Default mode - 직접 검색 방식 (Streaming)
 */
router.post("/default", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    logger.info(`[Default Mode] Query: ${query}`);

    // SSE 헤더 설정
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 스트리밍 시작
    for await (const result of generateAnswerStream(query)) {
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    }

    res.end();
  } catch (error) {
    logger.error("Error in default mode:", error);
    res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/agent
 * AI Agent mode - Tool 사용 방식 (Streaming)
 */
router.post("/agent", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    logger.info(`[Agent Mode] Query: ${query}`);

    // SSE 헤더 설정
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 스트리밍 시작
    for await (const result of generateAnswerWithAgentStream(query)) {
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    }

    res.end();
  } catch (error) {
    logger.error("Error in agent mode:", error);
    res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
    res.end();
  }
});

export default router;
