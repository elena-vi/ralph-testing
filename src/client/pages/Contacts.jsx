import { useState, useEffect } from "react";
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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CallToAction from "../components/CallToAction";
import ConfirmationDialog from "../components/ConfirmationDialog";
import AppLoading from "../components/AppLoading";
import Pagination from "../components/Pagination";
import { ContactPage, Group } from "@mui/icons-material";
import { useContacts } from "../hooks";
import { PAGE_SIZE } from "../constants";

const Contacts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // Get page from URL, default to 1, validate as positive integer
  const getPageFromUrl = () => {
    const pageParam = searchParams.get("page");
    if (!pageParam) return 1;
    const parsed = parseInt(pageParam, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  };

  const currentPage = getPageFromUrl();
  const { contacts, isLoading, deleteContact, total, fetchContacts } = useContacts({
    autoFetch: false,
  });

  // Fetch contacts for the current page
  useEffect(() => {
    fetchContacts(currentPage);
  }, [currentPage, fetchContacts]);

  const handleDeleteContact = (id) => {
    setContactToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    await deleteContact(contactToDelete);
    setDeleteDialogOpen(false);
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage });
  };

  // Distinguish between "no contacts exist" and "empty page"
  const showWelcome = total === 0;
  const showEmptyPage = contacts.length === 0 && total > 0;

  return (
    <Container maxWidth="xl" component="main" sx={{ py: 4 }}>
      {isLoading ? (
        <AppLoading />
      ) : showWelcome ? (
        <Card elevation={2} sx={{ borderRadius: 2, py: 8 }}>
          <CallToAction
            heroIcon={Group}
            title="Welcome!"
            subtitle="Let's get started. To add a new contact, click on the button below."
            url="/new-contact"
            buttonName="Add Contact"
          />
        </Card>
      ) : showEmptyPage ? (
        <Card elevation={2} sx={{ borderRadius: 2, py: 4 }}>
          <Box textAlign="center" px={2}>
            <Typography variant="h6" color="textSecondary">
              No contacts on this page
            </Typography>
          </Box>
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
          <Pagination
            page={currentPage}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
          />
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
