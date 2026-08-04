"use client";

import { Box, Pagination, PaginationItem, Typography, alpha } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PremiumPaginationProps {
	page: number;
	count: number;
	onChange: (event: React.ChangeEvent<unknown>, value: number) => void;
	totalItems?: number;
	rowsPerPage?: number;
	loading?: boolean;
}

export default function PremiumPagination({
	page,
	count,
	onChange,
	totalItems,
	rowsPerPage,
	loading,
}: PremiumPaginationProps) {
	if (count <= 1 && !loading) return null;

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: { xs: "column", sm: "row" },
				alignItems: "center",
				justifyContent: "space-between",
				gap: 2,
				mt: 3,
				mb: 2,
				px: 2,
				py: 1.5,
				borderRadius: 3,
				bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
				border: "1px solid",
				borderColor: "divider",
				backdropFilter: "blur(8px)",
			}}
		>
			<Box>
				{totalItems !== undefined && rowsPerPage !== undefined && (
					<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
						Showing {Math.min((page - 1) * rowsPerPage + 1, totalItems)} to{" "}
						{Math.min(page * rowsPerPage, totalItems)} of {totalItems} entries
					</Typography>
				)}
			</Box>

			<Pagination
				page={page}
				count={count}
				onChange={onChange}
				disabled={loading}
				renderItem={(item) => (
					<PaginationItem
						slots={{ previous: ChevronLeft, next: ChevronRight }}
						{...item}
						sx={{
							borderRadius: 1.5,
							fontWeight: 700,
							fontSize: 13,
							"&.Mui-selected": {
								bgcolor: "primary.main",
								color: "primary.contrastText",
								"&:hover": {
									bgcolor: "primary.dark",
								},
							},
							"&:hover": {
								bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
							},
						}}
					/>
				)}
			/>
		</Box>
	);
}
