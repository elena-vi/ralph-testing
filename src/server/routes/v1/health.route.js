import express from "express";
import { successResponse, errorResponse } from "../../utils/response.js";
import healthService from "../../services/health.service.js";

const router = express.Router();

/**
 * GET /health
 * Returns the server health status including uptime and version.
 * This endpoint is not rate limited to allow continuous monitoring.
 */
router.get("/health", async (req, res) => {
  try {
    const health = await healthService.getHealth();
    res.status(200).json(successResponse(health));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to retrieve health status"));
  }
});

/**
 * GET /ready
 * Returns the server readiness status, specifically database connectivity.
 * Returns 503 if the database is unavailable.
 * This endpoint is not rate limited to allow continuous monitoring.
 */
router.get("/ready", async (req, res) => {
  try {
    const ready = await healthService.getReady();
    res.status(200).json(successResponse(ready));
  } catch (err) {
    console.error(err);
    // Return 503 for database/readiness errors, not 500
    const message = err.reason || "Service not ready";
    res.status(503).json(errorResponse(message));
  }
});

export default router;
