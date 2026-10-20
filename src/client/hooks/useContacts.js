/**
 * useContacts Hook
 * =================
 *
 * Custom hook for managing contacts data and operations.
 * Provides a clean interface for components to interact with contacts.
 *
 * Features:
 * - Automatic data fetching on mount and when page changes
 * - Loading and error states
 * - CRUD operations with automatic refresh
 * - Optimistic updates for better UX
 * - Pagination support
 *
 * Usage:
 *   const {
 *     contacts,      // Array of contacts
 *     isLoading,     // Boolean loading state
 *     error,         // Error object if any
 *     refresh,       // Function to refetch current page
 *     createContact, // Function to create new contact
 *     updateContact, // Function to update contact
 *     deleteContact, // Function to delete contact
 *     pageSize,      // Items per page
 *     total,         // Total number of contacts
 *   } = useContacts({ currentPage: 2 });
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { contactsService } from "../services";

/**
 * Hook for managing contacts state and operations
 * @param {Object} options - Configuration options
 * @param {number} options.currentPage - Current page number (required, from URL)
 * @param {Function} [options.onPageChange] - Callback to handle page changes (called with page number)
 * @param {boolean} [options.autoFetch=true] - Whether to fetch on mount
 * @param {number} [options.pageSize=20] - Items per page
 * @returns {Object} Contacts state and operations
 */
export function useContacts(options = {}) {
  const { currentPage = 1, onPageChange, autoFetch = true, pageSize = 20 } = options;

  // State management
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  /**
   * Load a page of contacts from the API
   * @param {number} page - Page number to load
   */
  const loadPage = useCallback(
    async (page) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await contactsService.getAll(page, pageSize);
        setContacts(response.data.records || []);
        setTotal(response.data.total || 0);
      } catch (err) {
        setError(err);
        console.error("Error fetching contacts:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  /**
   * Refresh the current page
   */
  const refresh = useCallback(() => {
    loadPage(currentPage);
  }, [loadPage, currentPage]);

  /**
   * Create a new contact and refresh current page
   * @param {Object} data - Contact data (firstName, lastName, email, etc.)
   * @returns {Promise<Object>} Created contact
   */
  const createContact = useCallback(
    async (data) => {
      const response = await contactsService.create(data);
      // Refresh current page to include new contact and update total
      await loadPage(currentPage);
      toast.success("Contact created successfully");
      return response.data;
    },
    [loadPage, currentPage]
  );

  /**
   * Update an existing contact
   * @param {number|string} id - Contact ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  const updateContact = useCallback(
    async (id, data) => {
      try {
        const response = await contactsService.update(id, data);
        // Optimistic update - update local state immediately
        setContacts((prev) =>
          prev.map((contact) => (contact.id === Number(id) ? { ...contact, ...data } : contact))
        );
        toast.success("Contact updated successfully");
        return response.data;
      } catch (err) {
        // Revert optimistic update on error
        await loadPage(currentPage);
        throw err;
      }
    },
    [loadPage, currentPage]
  );

  /**
   * Delete a contact and refresh page
   * If page becomes empty, move to previous page by returning new page number
   * @param {number|string} id - Contact ID to delete
   * @returns {Promise<void>}
   */
  const deleteContact = useCallback(
    async (id) => {
      try {
        await contactsService.delete(id);
        // Optimistic removal - will be confirmed by refetch
        setContacts((prev) => prev.filter((contact) => contact.id !== Number(id)));
        toast.success("Contact deleted successfully");

        // Refresh current page after deletion to update total and verify delete
        // Component's clamp effect will handle moving to valid page if this page becomes empty
        await loadPage(currentPage);
      } catch (err) {
        // Revert optimistic removal on error
        await loadPage(currentPage);
        throw err;
      }
    },
    [currentPage, loadPage]
  );

  /**
   * Navigate to a specific page (calls onPageChange callback)
   * @param {number} page - Page number to navigate to
   */
  const goToPage = useCallback(
    (page) => {
      if (onPageChange) {
        onPageChange(page);
      }
    },
    [onPageChange]
  );

  // Fetch when currentPage changes
  useEffect(() => {
    if (autoFetch) {
      loadPage(currentPage);
    }
  }, [currentPage, autoFetch, loadPage]);

  return {
    // State
    contacts,
    isLoading,
    error,
    currentPage,
    pageSize,
    total,

    // Operations
    refresh,
    createContact,
    updateContact,
    deleteContact,
    goToPage,
  };
}

export default useContacts;
