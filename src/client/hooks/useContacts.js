/**
 * useContacts Hook
 * =================
 *
 * Custom hook for managing contacts data and operations.
 * Provides a clean interface for components to interact with contacts.
 *
 * Features:
 * - Automatic data fetching on mount
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
 *     refresh,       // Function to refetch data
 *     createContact, // Function to create new contact
 *     updateContact, // Function to update contact
 *     deleteContact, // Function to delete contact
 *     currentPage,   // Current page number
 *     pageSize,      // Items per page
 *     total,         // Total number of contacts
 *     goToPage,      // Function to go to a specific page
 *   } = useContacts();
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { contactsService } from "../services";

/**
 * Hook for managing contacts state and operations
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoFetch=true] - Whether to fetch on mount
 * @param {number} [options.initialPage=1] - Initial page number
 * @param {number} [options.pageSize=20] - Items per page
 * @returns {Object} Contacts state and operations
 */
export function useContacts(options = {}) {
  const { autoFetch = true, initialPage = 1, pageSize = 20 } = options;

  // State management
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [total, setTotal] = useState(0);

  /**
   * Fetch contacts from the API with pagination
   * Wrapped in useCallback to prevent unnecessary re-renders
   * @param {number} page - Page number to fetch
   * @param {number} size - Number of items per page
   */
  const fetchContacts = useCallback(
    async (page = currentPage, size = pageSize) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await contactsService.getAll(page, size);
        setContacts(response.data.records || []);
        setTotal(response.data.total || 0);
        setCurrentPage(page);
      } catch (err) {
        setError(err);
        console.error("Error fetching contacts:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, pageSize]
  );

  /**
   * Create a new contact
   * @param {Object} data - Contact data (firstName, lastName, email, etc.)
   * @returns {Promise<Object>} Created contact
   */
  const createContact = async (data) => {
    const response = await contactsService.create(data);
    // Refresh the current page to include the new contact and update total
    await fetchContacts(currentPage, pageSize);
    toast.success("Contact created successfully");
    return response.data;
  };

  /**
   * Update an existing contact
   * @param {number|string} id - Contact ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  const updateContact = async (id, data) => {
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
      await fetchContacts();
      throw err;
    }
  };

  /**
   * Delete a contact
   * @param {number|string} id - Contact ID to delete
   * @returns {Promise<void>}
   */
  const deleteContact = useCallback(
    async (id) => {
      try {
        await contactsService.delete(id);
        // Optimistic update - remove from local state
        setContacts((prev) => prev.filter((contact) => contact.id !== Number(id)));
        toast.success("Contact deleted successfully");
        // Refresh the current page to maintain consistency
        try {
          const response = await contactsService.getAll(currentPage, pageSize);
          setContacts(response.data.records || []);
          setTotal(response.data.total || 0);
          // If page is now empty and not on page 1, move to previous page
          if ((response.data.records || []).length === 0 && currentPage > 1) {
            const prevPageResponse = await contactsService.getAll(currentPage - 1, pageSize);
            setContacts(prevPageResponse.data.records || []);
            setTotal(prevPageResponse.data.total || 0);
            setCurrentPage(currentPage - 1);
          }
        } catch (fetchErr) {
          setError(fetchErr);
          console.error("Error fetching contacts:", fetchErr);
        }
      } catch (err) {
        // Revert optimistic update on error by re-fetching
        try {
          const response = await contactsService.getAll(currentPage, pageSize);
          setContacts(response.data.records || []);
          setTotal(response.data.total || 0);
        } catch (refetchErr) {
          setError(refetchErr);
          console.error("Error refetching contacts:", refetchErr);
        }
        throw err;
      }
    },
    [currentPage, pageSize]
  );

  /**
   * Navigate to a specific page
   * @param {number} page - Page number to navigate to
   * @returns {Promise<void>}
   */
  const goToPage = useCallback(
    async (page) => {
      await fetchContacts(page, pageSize);
    },
    [fetchContacts, pageSize]
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchContacts();
    }
  }, [autoFetch, fetchContacts]);

  return {
    // State
    contacts,
    isLoading,
    error,
    currentPage,
    pageSize,
    total,

    // Operations
    refresh: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    goToPage,
  };
}

export default useContacts;
