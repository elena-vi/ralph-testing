import { Box, Pagination as MuiPagination } from "@mui/material";

/**
 * Pagination Component
 * ====================
 *
 * Renders Material UI pagination controls.
 * Calculates total pages and hides when only one page or no results.
 *
 * @param {Object} props - Component props
 * @param {number} props.page - Current page (1-indexed)
 * @param {number} props.total - Total number of items
 * @param {number} props.pageSize - Items per page
 * @param {Function} props.onChange - Called with new page number when user navigates
 * @returns {JSX.Element|null}
 */
const Pagination = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);

  // Hide pagination if no results or only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box display="flex" justifyContent="center" my={4}>
      <MuiPagination
        count={totalPages}
        page={page}
        onChange={(_, newPage) => onChange(newPage)}
        color="primary"
        size="large"
      />
    </Box>
  );
};

export default Pagination;
