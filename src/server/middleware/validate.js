import { celebrate, Joi } from "celebrate";
import { errorResponse } from "../utils/response.js";
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_PAGE_SIZE } from "../config/index.js";

/**
 * Pagination query parameters schema
 * Exported for testing purposes
 */
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(PAGINATION_DEFAULT_PAGE).description("Page number"),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .default(PAGINATION_DEFAULT_PAGE_SIZE)
    .description("Page size"),
});

/**
 * Custom pagination validation middleware
 * Validates query parameters and stores validated numeric values on request
 * Exported for reuse across multiple route files.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validatePagination = (req, res, next) => {
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
};

/**
 * Validation schemas for contact-related requests
 * `create` and `update` use celebrate. Pagination is validated separately by
 * `validatePagination` above, a plain Joi-backed middleware so the 400 body
 * can name the offending pagination parameter.
 */
export const contactValidation = {
  /**
   * Validation for contact creation
   * Requires firstName, lastName, and valid email
   */
  create: celebrate({
    body: Joi.object({
      firstName: Joi.string().required().description("Contact's first name"),
      lastName: Joi.string().required().description("Contact's last name"),
      email: Joi.string().email().required().description("Contact's email address"),
    }),
  }),

  /**
   * Validation for contact updates
   * All fields are optional, but must be valid if provided
   */
  update: celebrate({
    params: Joi.object({
      id: Joi.number().required().description("Contact ID"),
    }),
    body: Joi.object({
      firstName: Joi.string().description("Updated first name"),
      lastName: Joi.string().description("Updated last name"),
      email: Joi.string().email().description("Updated email address"),
    }),
  }),
};
