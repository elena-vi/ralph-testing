import express from "express";
import { contactValidation, paginationQuerySchema } from "../../middleware/validate.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import contactService from "../../services/contact.service.js";

const router = express.Router();

/**
 * Custom pagination validation middleware
 */
const validatePagination = (req, res, next) => {
  try {
    const { error, value } = paginationQuerySchema.validate({
      page: req.query.page !== undefined ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize !== undefined ? Number(req.query.pageSize) : undefined,
    });

    if (error) {
      const details = error.details[0];
      const fieldName = details.context?.key;
      const message = `Invalid ${fieldName} parameter`;
      return res.status(400).json(errorResponse(message));
    }

    // Store validated numeric values on request
    req.paginationParams = value;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /list
 * Retrieve a paginated list of contacts.
 */
router.get("/list", validatePagination, async (req, res) => {
  try {
    const { page, pageSize } = req.paginationParams;

    const result = await contactService.findAllPaginated(page, pageSize);

    res.status(200).json(
      successResponse(
        {
          records: result.records,
          total: result.total,
        },
        null
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to retrieve contacts"));
  }
});

/**
 * GET /:id
 * Retrieve a contact by ID.
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await contactService.findById(id);

    if (!contact) {
      return res.status(404).json(errorResponse("Contact not found"));
    }

    res.status(200).json(successResponse(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to retrieve contact"));
  }
});

/**
 * POST /create
 * Create a new contact.
 */
router.post("/", contactValidation.create, async (req, res) => {
  const { firstName, lastName, email } = req.body;

  try {
    const contact = await contactService.create({ firstName, lastName, email });

    res.status(201).json(successResponse(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to create contact"));
  }
});

/**
 * PUT /update/:id
 * Update an existing contact by ID.
 */
router.put("/:id", contactValidation.update, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email } = req.body;

  try {
    const contact = await contactService.update(Number(id), { firstName, lastName, email });

    res.status(200).json(successResponse(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to update contact"));
  }
});

/**
 * DELETE /delete/:id
 * Delete a contact by ID.
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await contactService.delete(Number(id));

    res.status(200).json(successResponse(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse("Failed to delete contact"));
  }
});

export default router;
