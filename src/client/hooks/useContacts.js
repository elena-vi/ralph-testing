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
 *   } = useContacts();
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { contactsService } from "../services";

/**
 * Hook for managing contacts state and operations
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoFetch=true] - Whether to fetch on mount
 * @param {number} [options.pageSize=20] - Contacts per page
 * @returns {Object} Contacts state and operations
 */
export function useContacts(options = {}) {
  const { autoFetch = true, pageSize = 20 } = options;

  // State management
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  /**
   * Fetch contacts from the paginated API endpoint
   * The envelope payload is { data: Contact[], total: number }
   * Wrapped in useCallback to prevent unnecessary re-renders
   * @param {number} [fetchPage=1] - Page to fetch
   */
  const fetchContacts = useCallback(
    async (fetchPage = 1) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await contactsService.getAll(fetchPage, pageSize);
        setContacts(response.data?.data || []);
        setTotal(response.data?.total || 0);
        setPage(fetchPage);
      } catch (err) {
        setError(err);
        toast.error("Failed to fetch contacts");
        console.error("Error fetching contacts:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  /**
   * Create a new contact
   * @param {Object} data - Contact data (firstName, lastName, email, etc.)
   * @returns {Promise<Object>} Created contact
   */
  const createContact = async (data) => {
    const response = await contactsService.create(data);
    // Refresh the list to include the new contact
    await fetchContacts();
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
  const deleteContact = async (id) => {
    try {
      await contactsService.delete(id);
      // Optimistic update - remove from local state
      setContacts((prev) => prev.filter((contact) => contact.id !== Number(id)));
      toast.success("Contact deleted successfully");
    } catch (err) {
      // Revert optimistic update on error
      await fetchContacts();
      throw err;
    }
  };

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
    page,
    total,

    // Operations
    fetchContacts,
    refresh: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

export default useContacts;
