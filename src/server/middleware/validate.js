import { celebrate, Joi } from "celebrate";
import config from "../config/index.js";

/**
 * Validation schemas for contact-related requests
 * Uses celebrate/Joi for request validation
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

  /**
   * Validation for contact list pagination
   * Validates page and pageSize query parameters
   */
  list: celebrate({
    query: Joi.object({
      page: Joi.number()
        .integer()
        .positive()
        .default(1)
        .description("Page number (1-based)")
        .messages({
          "number.base": "page must be a positive number",
          "number.positive": "page must be a positive number",
          "number.integer": "page must be a positive integer",
        }),
      pageSize: Joi.number()
        .integer()
        .positive()
        .default(config.pagination.defaultPageSize)
        .description(`Items per page (max ${config.pagination.maxPageSize})`),
    }),
  }),
};
