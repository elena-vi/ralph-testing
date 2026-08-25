import { Router } from "express";
import contactRoutes from "./contact.route.js";
import taskRoutes from "./task.route.js";
import projectRoutes from "./project.route.js";
import { errorResponse } from "../../utils/response.js";

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
// Converts celebrate errors to the standard response envelope
router.use((err, req, res, next) => {
  // Check if this is a celebrate validation error
  if (err.details && err.details instanceof Map) {
    // Extract the first validation error message from the details Map
    let message = "Validation failed";
    for (const details of err.details.values()) {
      if (details && details.message) {
        message = details.message;
        break;
      }
    }
    const status = err.statusCode || err.status || 400;
    return res.status(status).json(errorResponse(message));
  }

  // Pass non-celebrate errors to the next error handler
  next(err);
});

// General error handling middleware
router.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json(errorResponse(message));
});

export default router;
