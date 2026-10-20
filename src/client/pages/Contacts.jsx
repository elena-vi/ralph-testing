import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Card,
  Pagination,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CallToAction from "../components/CallToAction";
import ConfirmationDialog from "../components/ConfirmationDialog";
import AppLoading from "../components/AppLoading";
import { ContactPage, Group } from "@mui/icons-material";
import { useContacts } from "../hooks";

// Helper to parse and validate page parameter from URL
const parsePageParam = (param) => {
  if (!param) return 1;
  const parsed = Number.parseInt(param, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const Contacts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // Derive page from URL (source of truth)
  const currentPage = parsePageParam(searchParams.get("page"));

  // Handle page changes from pagination control
  const handlePageChangeUrl = useCallback(
    (page) => {
      setSearchParams({ page: page.toString() });
    },
    [setSearchParams]
  );

  // Fetch contacts for current page from URL
  const { contacts, isLoading, deleteContact, pageSize, total, goToPage } = useContacts({
    currentPage,
    onPageChange: handlePageChangeUrl,
  });

  const handleDeleteContact = (id) => {
    setContactToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    await deleteContact(contactToDelete);
    setDeleteDialogOpen(false);
  };

  const handlePageChange = (event, page) => {
    goToPage(page);
  };

  // Calculate total pages
  const totalPages = Math.ceil(total / pageSize);

  // Clamp page to valid range [1, maxPages] only after data loads
  const maxPage = Math.max(1, totalPages);
  const clampedPage = !isLoading && total > 0 ? Math.min(currentPage, maxPage) : currentPage;

  // Sync clamped page back to URL if needed (only after data loads)
  useEffect(() => {
    if (!isLoading && total > 0 && clampedPage !== currentPage) {
      setSearchParams({ page: clampedPage.toString() }, { replace: true });
    }
  }, [clampedPage, currentPage, isLoading, total, setSearchParams]);

  return (
    <Container maxWidth="xl" component="main" sx={{ py: 4 }}>
      {isLoading ? (
        <AppLoading />
      ) : contacts.length === 0 ? (
        <Card elevation={2} sx={{ borderRadius: 2, py: 8 }}>
          <CallToAction
            heroIcon={Group}
            title="Welcome!"
            subtitle="Let's get started. To add a new contact, click on the button below."
            url="/new-contact"
            buttonName="Add Contact"
          />
        </Card>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box display="flex" alignItems="center">
              <ContactPage sx={{ fontSize: 32, color: "primary.main", mr: 2 }} />
              <Typography variant="h4" component="h1" fontWeight="medium">
                Contacts
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/new-contact"
              startIcon={<AddCircleOutlineIcon />}
              sx={{ borderRadius: 2, px: 3, py: 1 }}
            >
              New Contact
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }} width={80}>
                    ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} width={120}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>{contact.id}</TableCell>
                    <TableCell>{contact.firstName}</TableCell>
                    <TableCell>{contact.lastName}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>
                      <IconButton
                        component={Link}
                        to={`/contact/${contact.id}`}
                        color="primary"
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteContact(contact.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteContact}
        title="Confirm Delete"
        message="Are you sure you want to delete this contact? This action cannot be undone."
      />
    </Container>
  );
};

export default Contacts;
