import express from "express";
import { successResponse, errorResponse } from "../../utils/response.js";
import healthService from "../../services/health.service.js";

const router = express.Router();

/**
 * GET /ready
 * Readiness check endpoint verifying database connectivity
 */
router.get("/", async (req, res) => {
  try {
    const ready = await healthService.checkReady();
    res.status(200).json(successResponse(ready, "Service is ready"));
  } catch (err) {
    console.error(err);
    res.status(503).json(errorResponse("Service is not ready", null, err.message));
  }
});

export default router;
