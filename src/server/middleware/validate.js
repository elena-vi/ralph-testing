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
   * Validation for paginated list
   * page: positive integer, defaults from config.pagination.defaultPage
   * pageSize: positive integer, defaults from config.pagination.defaultPageSize
   */
  list: celebrate({
    query: Joi.object({
      page: Joi.number()
        .integer()
        .positive()
        .default(config.pagination.defaultPage)
        .description("Page number (1-indexed)"),
      pageSize: Joi.number()
        .integer()
        .positive()
        .default(config.pagination.defaultPageSize)
        .description("Number of records per page"),
    }).unknown(true),
  }),
};
