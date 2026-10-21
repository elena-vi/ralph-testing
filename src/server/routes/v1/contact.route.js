import express from "express";
import { contactValidation } from "../../middleware/validate.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import contactService from "../../services/contact.service.js";

const router = express.Router();

/**
 * GET /list
 * Retrieve a paginated list of contacts.
 *
 * Pagination:
 * - Validates query parameters (page, pageSize) using custom middleware
 * - contactValidation.paginate is a custom middleware (not celebrate)
 *   that validates query parameters against the paginationQuerySchema
 *   and stores validated numeric values in req.paginationParams
 * - This approach allows precise control over error messages for pagination
 *
 * Query Parameters:
 * - page: integer >= 1 (default: 1)
 * - pageSize: integer >= 1 (default: 20, max: 100)
 *
 * Response:
 * - 200: { success: true, data: { records: Contact[], total: number } }
 * - 400: Invalid page or pageSize parameter
 * - 500: Database error
 */
router.get("/list", contactValidation.paginate, async (req, res) => {
  try {
    const { page, pageSize } = req.paginationParams;

    const result = await contactService.findAllPaginated(page, pageSize);

    res.status(200).json(
      successResponse(
        {
          records: result.records,
          total: result.total,
          clampedPageSize: result.clampedPageSize,
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
