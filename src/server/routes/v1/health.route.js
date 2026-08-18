import express from "express";
import { successResponse, errorResponse } from "../../utils/response.js";
import healthService from "../../services/health.service.js";

const router = express.Router();

/**
 * GET /health
 * Health check endpoint returning uptime and version
 */
router.get("/", async (req, res) => {
  try {
    const health = healthService.getHealth(req.app.locals.startTime);
    res.status(200).json(successResponse(health, "Health check successful"));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Health check failed"));
  }
});

/**
 * GET /ready
 * Readiness check endpoint verifying database connectivity
 */
router.get("/ready", async (req, res) => {
  try {
    const ready = await healthService.checkReady();
    res.status(200).json(successResponse(ready, "Service is ready"));
  } catch (err) {
    console.error(err);
    res.status(503).json(errorResponse("Service is not ready"));
  }
});

export default router;
