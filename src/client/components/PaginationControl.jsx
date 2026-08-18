/**
 * PaginationControl Component
 * ============================
 *
 * Material-UI based pagination control for navigating through paginated data.
 * Displays page numbers and previous/next buttons.
 *
 * Usage:
 *   <PaginationControl
 *     page={currentPage}
 *     pageSize={20}
 *     total={100}
 *     onPageChange={(page) => handlePageChange(page)}
 *   />
 */

import { Box, Pagination } from "@mui/material";

/**
 * PaginationControl component for navigating pages
 *
 * @param {Object} props - Component props
 * @param {number} props.page - Current page number (1-indexed)
 * @param {number} props.pageSize - Number of records per page
 * @param {number} props.total - Total number of records
 * @param {Function} props.onPageChange - Callback when page changes
 * @returns {JSX.Element} Pagination control component
 */
const PaginationControl = ({ page, pageSize, total, onPageChange }) => {
  // Calculate total number of pages
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 4 }}>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(event, value) => onPageChange(value)}
        color="primary"
        size="large"
      />
    </Box>
  );
};

export default PaginationControl;
