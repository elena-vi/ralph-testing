import { Router } from "express";
import contactRoutes from "./contact.route.js";
import taskRoutes from "./task.route.js";
import projectRoutes from "./project.route.js";
import { errorResponse } from "../../utils/response.js";
import { celebrateErrorHandler } from "../../middleware/errorHandler.js";

const router = Router();

router.use("/contact", contactRoutes);
router.use("/task", taskRoutes);
router.use("/project", projectRoutes);

/**
 * GET /health
 * Health check endpoint.
 */
router.get("/health", (req, res) => {
  res.send("Ok");
});

// Celebrate validation error handler (must come before general error handler)
router.use(celebrateErrorHandler);

// General error handling middleware
router.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json(errorResponse(message));
});

export default router;
