import express from "express";
import { successResponse, errorResponse } from "../utils/response.js";
import healthCheckService from "../services/healthCheck.service.js";

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint - returns server health status
 * Does not require database connectivity
 */
router.get("/health", async (req, res) => {
  try {
    const health = await healthCheckService.getHealth();
    res.status(200).json(successResponse(health, "Health check passed"));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Health check failed"));
  }
});

/**
 * GET /api/ready
 * Readiness probe endpoint - verifies database connectivity
 * Returns 503 if database is unavailable
 */
router.get("/ready", async (req, res) => {
  try {
    const readiness = await healthCheckService.getReadiness();
    res.status(200).json(successResponse(readiness, "Ready to accept traffic"));
  } catch (err) {
    console.error(err);
    res.status(503).json(errorResponse("Database unavailable"));
  }
});

export default router;
