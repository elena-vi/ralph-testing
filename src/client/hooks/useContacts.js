/**
 * useContacts Hook
 * =================
 *
 * Custom hook for managing contacts data and operations.
 * Provides a clean interface for components to interact with contacts.
 *
 * Features:
 * - Automatic data fetching on mount (optional)
 * - Loading and error states
 * - CRUD operations with automatic refresh
 * - Optimistic updates for better UX
 * - Stale-response guard to prevent out-of-order API responses
 *
 * Usage:
 *   const {
 *     contacts,      // Array of contacts
 *     isLoading,     // Boolean loading state
 *     error,         // Error object if any
 *     createContact, // Function to create new contact
 *     updateContact, // Function to update contact
 *     deleteContact, // Function to delete contact
 *     fetchContacts, // Function to fetch specific page
 *   } = useContacts({ autoFetch: false });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { contactsService } from "../services";
import { PAGE_SIZE } from "../constants";

/**
 * Hook for managing contacts state and operations
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoFetch=true] - Whether to fetch on mount
 * @param {number} [options.pageSize=PAGE_SIZE] - Contacts per page
 * @returns {Object} Contacts state and operations
 */
export function useContacts(options = {}) {
  const { autoFetch = true, pageSize = PAGE_SIZE } = options;

  // State management
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Track the latest request to prevent stale-response issues
  const requestIdRef = useRef(0);
  // Track the current page for CRUD operations that need to refetch
  const currentPageRef = useRef(1);

  /**
   * Fetch contacts from the paginated API endpoint
   * The envelope payload is { data: Contact[], total: number }
   * Uses a request ID to guard against out-of-order responses.
   * @param {number} [fetchPage=1] - Page to fetch
   */
  const fetchContacts = useCallback(
    async (fetchPage = 1) => {
      const currentRequestId = ++requestIdRef.current;
      try {
        setIsLoading(true);
        setError(null);
        const response = await contactsService.getAll(fetchPage, pageSize);
        // Only update state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setContacts(response.data?.data || []);
          setTotal(response.data?.total || 0);
          currentPageRef.current = fetchPage;
        }
      } catch (err) {
        // Only update error state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setError(err);
          toast.error("Failed to fetch contacts");
          console.error("Error fetching contacts:", err);
        }
      } finally {
        // Only clear loading if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
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
    await fetchContacts(currentPageRef.current);
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
      // Revert optimistic update on error by refetching the current page
      await fetchContacts(currentPageRef.current);
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
      // Decrement total count
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("Contact deleted successfully");
    } catch (err) {
      // Revert optimistic update on error by refetching the current page
      await fetchContacts(currentPageRef.current);
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
    total,

    // Operations
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

export default useContacts;
