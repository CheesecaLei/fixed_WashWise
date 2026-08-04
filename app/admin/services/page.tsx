"use client";

import { useState, useMemo, memo } from "react";
import { 
	Plus, 
	Search, 
	Edit2, 
	Trash2, 
	Waves, 
	SunMedium, 
	Flame, 
	Settings2
} from "lucide-react";
import { toast } from "react-toastify";
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	Typography,
	CircularProgress,
	Alert,
	FormControl,
	InputLabel,
	Select,
	MenuItem as MuiMenuItem,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import PremiumPagination from "../../components/pagination";
import { useServices } from "../../hooks/use-services";
import { formatPeso } from "../../lib/currency";
import { Service, ServiceIconName } from "../../types/new-order";

function getServiceIcon(iconName: ServiceIconName) {
	switch (iconName) {
		case "waves": return <Waves size={20} />;
		case "sun": return <SunMedium size={20} />;
		case "flame": return <Flame size={20} />;
		default: return <Settings2 size={20} />;
	}
}

// Separate component for the form to prevent full page re-renders on every keystroke
interface ServiceFormInput {
	label: string;
	description: string;
	price: number;
	unitLabel: "kg" | "pc";
	iconName: ServiceIconName;
	inputLabel: string;
	placeholder: string;
}

const ServiceFormDialog = memo(({ 
	open, 
	onClose, 
	onSubmit, 
	service, 
	isSubmitting, 
	actionError 
}: { 
	open: boolean; 
	onClose: () => void; 
	onSubmit: (data: ServiceFormInput) => Promise<void>; 
	service: Service | null;
	isSubmitting: boolean;
	actionError: string | null;
}) => {
	const [formData, setFormData] = useState({
		label: service?.label || "",
		description: service?.description || "",
		price: service?.price?.toString() || "",
		unitLabel: service?.unitLabel || "kg",
		iconName: service?.iconName || "waves",
		inputLabel: service?.inputLabel || "Weight",
		placeholder: service?.placeholder || "0"
	});

	// Update local state when service prop changes (e.g. when opening for edit)
	useState(() => {
		if (service) {
			setFormData({
				label: service.label,
				description: service.description,
				price: service.price.toString(),
				unitLabel: service.unitLabel,
				iconName: service.iconName,
				inputLabel: service.inputLabel,
				placeholder: service.placeholder
			});
		}
	});

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// Allow empty string or numbers
		if (value === "" || /^\d*\.?\d*$/.test(value)) {
			handleChange("price", value);
		}
	};

	const handleSubmit = () => {
		onSubmit({
			...formData,
			price: formData.price === "" ? 0 : Number(formData.price)
		});
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ fontWeight: 800 }}>
				{service ? "Edit Service" : "Add New Service"}
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={3} sx={{ mt: 1 }}>
					{actionError && <Alert severity="error">{actionError}</Alert>}
					
					<TextField
						label="Service Name"
						fullWidth
						value={formData.label}
						onChange={(e) => handleChange("label", e.target.value)}
						placeholder="e.g. Wash & Fold Premium"
					/>
					
					<TextField
						label="Description"
						fullWidth
						multiline
						rows={3}
						value={formData.description}
						onChange={(e) => handleChange("description", e.target.value)}
						placeholder="Describe what's included in this service..."
					/>

					<Grid container spacing={2}>
						<Grid size={{ xs: 6 }}>
							<TextField
								label="Price"
								fullWidth
								value={formData.price}
								onChange={handlePriceChange}
								placeholder="0.00"
								InputProps={{
									startAdornment: <InputAdornment position="start">₱</InputAdornment>,
								}}
								sx={{
									"& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
										WebkitAppearance: "none",
										margin: 0,
									},
									"& input[type=number]": {
										MozAppearance: "textfield",
									},
								}}
							/>
						</Grid>
						<Grid size={{ xs: 6 }}>
							<FormControl fullWidth>
								<InputLabel>Unit</InputLabel>
								<Select
									value={formData.unitLabel}
									label="Unit"
									onChange={(e) => handleChange("unitLabel", e.target.value as "kg" | "pc")}
								>
									<MuiMenuItem value="kg">Kilogram (kg)</MuiMenuItem>
									<MuiMenuItem value="pc">Piece (pc)</MuiMenuItem>
								</Select>
							</FormControl>
						</Grid>
					</Grid>

					<Grid container spacing={2}>
						<Grid size={{ xs: 6 }}>
							<FormControl fullWidth>
								<InputLabel>Icon</InputLabel>
								<Select
									value={formData.iconName}
									label="Icon"
									onChange={(e) => handleChange("iconName", e.target.value as ServiceIconName)}
								>
									<MuiMenuItem value="waves"><Stack direction="row" spacing={1} alignItems="center"><Waves size={16}/> <Typography>Waves</Typography></Stack></MuiMenuItem>
									<MuiMenuItem value="sun"><Stack direction="row" spacing={1} alignItems="center"><SunMedium size={16}/> <Typography>Sun</Typography></Stack></MuiMenuItem>
									<MuiMenuItem value="flame"><Stack direction="row" spacing={1} alignItems="center"><Flame size={16}/> <Typography>Flame</Typography></Stack></MuiMenuItem>
									<MuiMenuItem value="settings"><Stack direction="row" spacing={1} alignItems="center"><Settings2 size={16}/> <Typography>Settings</Typography></Stack></MuiMenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid size={{ xs: 6 }}>
							<TextField
								label="Input Label"
								fullWidth
								value={formData.inputLabel}
								onChange={(e) => handleChange("inputLabel", e.target.value)}
								placeholder="e.g. Weight"
							/>
						</Grid>
					</Grid>
				</Stack>
			</DialogContent>
			<DialogActions sx={{ p: 3 }}>
				<Button onClick={onClose} color="inherit">Cancel</Button>
				<Button 
					onClick={handleSubmit} 
					variant="contained" 
					disabled={isSubmitting || !formData.label || formData.price === ""}
					sx={{ px: 4 }}
				>
					{isSubmitting ? <CircularProgress size={24} /> : service ? "Save Changes" : "Add Service"}
				</Button>
			</DialogActions>
		</Dialog>
	);
});

ServiceFormDialog.displayName = "ServiceFormDialog";

export default function AdminServicesPage() {
	const { services, isLoading, error, page, setPage, pagination, addService, updateService, deleteService } = useServices(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingService, setEditingService] = useState<Service | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const filteredServices = useMemo(() => 
		services.filter(s => 
			s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.description.toLowerCase().includes(searchQuery.toLowerCase())
		), [services, searchQuery]
	);

	const handleOpenDialog = (service: Service | null = null) => {
		setEditingService(service);
		setIsDialogOpen(true);
		setActionError(null);
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setEditingService(null);
		setActionError(null);
	};

	const handleFormSubmit = async (data: ServiceFormInput) => {
		setIsSubmitting(true);
		setActionError(null);
		
		let result;
		if (editingService && editingService._id) {
			result = await updateService(editingService._id, data);
		} else {
			result = await addService(data);
		}

		if (!result.success) {
			setActionError(result.error || "An error occurred");
			setIsSubmitting(false);
			return;
		}

		toast.success(`Service successfully ${editingService ? "updated" : "added"}!`);
		handleCloseDialog();
		setIsSubmitting(false);
	};

	const handleDelete = async (id: string) => {
		if (confirm("Are you sure you want to delete this service?")) {
			const result = await deleteService(id);
			if (result.success) {
				toast.success("Service deleted successfully!");
			} else {
				toast.error(result.error || "Failed to delete service.");
			}
		}
	};


	return (
		<Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
			<Sidebar isAdmin />

			{/* minWidth:0 lets the table scroll internally instead of stretching the
			    page and forcing a horizontal scrollbar. */}
			<Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
				<Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, flexGrow: 1 }}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						justifyContent="space-between"
						alignItems={{ xs: "stretch", sm: "center" }}
						gap={2}
						mb={{ xs: 2.5, md: 4 }}
					>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
								Service Management
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Manage laundry services, pricing, and availability.
							</Typography>
						</Box>
						<Button
							variant="contained"
							startIcon={<Plus size={18} />}
							onClick={() => handleOpenDialog()}
							sx={{ borderRadius: 2, px: 3, flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
						>
							Add New Service
						</Button>
					</Stack>

					<Card sx={{ borderRadius: 3, mb: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
						<CardContent sx={{ p: 0 }}>
							<Box sx={{ p: { xs: 2, md: 3 }, borderBottom: 1, borderColor: "divider" }}>
								<TextField
									placeholder="Search services..."
									fullWidth
									size="small"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Search size={18} color="#94a3b8" />
											</InputAdornment>
										),
									}}
									sx={{ maxWidth: 400 }}
								/>
							</Box>

							{isLoading && services.length === 0 ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
									<CircularProgress />
								</Box>
							) : error ? (
								<Box sx={{ p: 3 }}>
									<Alert severity="error">{error}</Alert>
								</Box>
							) : (
								<TableContainer>
									{/* minWidth keeps columns legible; TableContainer scrolls horizontally below it. */}
									<Table sx={{ minWidth: 700 }}>
										<TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
											<TableRow>
												<TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
												<TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
												<TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{filteredServices.length === 0 ? (
												<TableRow>
													<TableCell colSpan={5} align="center" sx={{ py: 8 }}>
														<Typography color="text.secondary">
															No services found. Click &quot;Add New Service&quot; to get started.
														</Typography>
													</TableCell>
												</TableRow>
											) : (
												filteredServices.map((service) => (
													<TableRow key={service._id} hover>
														<TableCell>
															<Stack direction="row" spacing={2} alignItems="center">
																<Box sx={{ 
																	p: 1, 
																	borderRadius: 2, 
																	bgcolor: "primary.lighter", 
																	color: "primary.main",
																	display: "flex"
																}}>
																	{getServiceIcon(service.iconName)}
																</Box>
																<Typography sx={{ fontWeight: 600 }}>{service.label}</Typography>
															</Stack>
														</TableCell>
														<TableCell sx={{ maxWidth: 300 }}>
															<Typography variant="body2" color="text.secondary" noWrap title={service.description}>
																{service.description}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography sx={{ fontWeight: 700, color: "primary.main" }}>
																{formatPeso(service.price)}
															</Typography>
														</TableCell>
														<TableCell>
															<Chip 
																label={service.unitLabel} 
																size="small" 
																variant="outlined"
																sx={{ fontWeight: 600 }}
															/>
														</TableCell>
														<TableCell align="right">
															<Stack direction="row" spacing={1} justifyContent="flex-end">
																<IconButton 
																	size="small" 
																	onClick={() => handleOpenDialog(service)}
																	sx={{ color: "text.secondary", "&:hover": { color: "primary.main", bgcolor: "primary.lighter" } }}
																>
																	<Edit2 size={16} />
																</IconButton>
																<IconButton 
																	size="small" 
																	onClick={() => service._id && handleDelete(service._id)}
																	sx={{ color: "text.secondary", "&:hover": { color: "error.main", bgcolor: "error.lighter" } }}
																>
																	<Trash2 size={16} />
																</IconButton>
															</Stack>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</TableContainer>
							)}

							{pagination && pagination.totalPages > 1 && (
								<Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
									<PremiumPagination
										page={page}
										count={pagination.totalPages}
										onChange={(_, value) => setPage(value)}
										totalItems={pagination.total}
										rowsPerPage={pagination.limit}
										loading={isLoading}
									/>
								</Box>
							)}
						</CardContent>
					</Card>
				</Container>
				<Footer />
			</Box>

			{isDialogOpen && (
				<ServiceFormDialog 
					open={isDialogOpen}
					onClose={handleCloseDialog}
					onSubmit={handleFormSubmit}
					service={editingService}
					isSubmitting={isSubmitting}
					actionError={actionError}
				/>
			)}
		</Box>
	);
}
