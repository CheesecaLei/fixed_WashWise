"use client";

import { useEffect, useState, useRef } from "react";
import {
	Box,
	Paper,
	Typography,
	Grid,
	Card,
	CardContent,
	Chip,
	Stack,
	TextField,
	Button,
	List,
	ListItemButton,
	ListItemText,
	Badge,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Alert,
	CircularProgress,
	Tabs,
	Tab,
	InputAdornment,
	IconButton,
} from "@mui/material";
import {
	MessageSquare,
	AlertCircle,
	Send,
	Search,
	Timer,
	ThumbsUp,
	CheckCircle2,
	ArrowLeft,
} from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useSupport, useSupportChat } from "../../hooks/use-support";
import type { SupportTicket, TicketStatus, TicketPriority } from "../../types/support";

/**
 * Chat panels fill the viewport minus the surrounding page chrome.
 * `dvh` (not `vh`) so a mobile browser's collapsing toolbar can't push the
 * message composer off-screen.
 */
const CHAT_PANEL_HEIGHT = { xs: "calc(100dvh - 260px)", md: "calc(100dvh - 310px)" };
const CHAT_PANEL_MIN_HEIGHT = 360;

interface StatCardProps {
	icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
	label: string;
	value: string | number;
	color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
	return (
		<Card elevation={0} sx={{ border: 1, borderColor: "divider", height: "100%" }}>
			<CardContent>
				<Stack direction="row" alignItems="center" spacing={2}>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 2,
							bgcolor: `${color}.50`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Icon size={24} style={{ color: `var(--mui-palette-${color}-main)` }} />
					</Box>
					<Box>
						<Typography variant="h4" fontWeight={700}>
							{value}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{label}
						</Typography>
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
}

function TicketListItem({ ticket, isSelected, onClick }: { ticket: SupportTicket; isSelected: boolean; onClick: () => void }) {
	const statusColors: Record<TicketStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
		open: "error",
		"in-progress": "warning",
		resolved: "success",
		closed: "default",
	};

	const priorityColors: Record<TicketPriority, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
		low: "default",
		medium: "info",
		high: "warning",
		urgent: "error",
	};

	return (
		<ListItemButton
			selected={isSelected}
			onClick={onClick}
			sx={{
				borderRadius: 1,
				mb: 0.5,
				border: 1,
				borderColor: isSelected ? "primary.main" : "divider",
				bgcolor: isSelected ? "primary.50" : "background.paper",
			}}
		>
			<ListItemText
				primaryTypographyProps={{ component: "div" }}
				secondaryTypographyProps={{ component: "div" }}
				primary={
					<Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
						<Typography variant="subtitle2" component="div" fontWeight={700} sx={{ flex: 1 }}>
							{ticket.ticketNumber}
						</Typography>
						{ticket.unreadCount > 0 && (
							<Badge badgeContent={ticket.unreadCount} color="error" />
						)}
					</Stack>
				}
				secondary={
					<Box component="div" sx={{ display: "block" }}>
						<Typography variant="body2" component="div" noWrap sx={{ mb: 0.5, display: "block" }}>
							{ticket.subject}
						</Typography>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} component="div" sx={{ display: "flex" }}>
							<Chip
								label={ticket.status.replace("-", " ")}
								size="small"
								color={statusColors[ticket.status]}
								sx={{ textTransform: "capitalize", height: 20, fontSize: 10 }}
							/>
							<Chip
								label={ticket.priority}
								size="small"
								color={priorityColors[ticket.priority]}
								variant="outlined"
								sx={{ textTransform: "capitalize", height: 20, fontSize: 10 }}
							/>
						</Stack>
						<Typography variant="caption" component="div" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
							{ticket.userName} • {new Date(ticket.lastMessageTime || ticket.createdAt).toLocaleString()}
						</Typography>
					</Box>
				}
			/>
		</ListItemButton>
	);
}

export default function SupportPage() {
	const { tickets, stats, isLoading, error, fetchTickets, updateTicket } = useSupport();
	const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [tabValue, setTabValue] = useState(0);
	const [isUpdating, setIsUpdating] = useState(false);

	const { messages, isSending, sendMessage } = useSupportChat(selectedTicket?.id || null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		console.log('[Admin Support] Fetching tickets with filters:', { statusFilter, priorityFilter });
		fetchTickets(statusFilter, priorityFilter);
	}, [fetchTickets, statusFilter, priorityFilter]);

	useEffect(() => {
		console.log('[Admin Support] Tickets updated:', tickets.length, 'tickets');
		console.log('[Admin Support] Stats:', stats);
	}, [tickets, stats]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSendMessage = async () => {
		if (!messageInput.trim() || !selectedTicket) return;

		const result = await sendMessage(messageInput);
		if (result.success) {
			setMessageInput("");
			
			// Refresh tickets to get updated status (backend auto-updates to in-progress)
			await fetchTickets(statusFilter, priorityFilter);
			
			// Update local selected ticket if status changed
			if (selectedTicket.status === 'open') {
				setSelectedTicket({
					...selectedTicket,
					status: 'in-progress',
					updatedAt: new Date().toISOString()
				});
			}
		}
	};

	const handleUpdateStatus = async (status: TicketStatus) => {
		if (!selectedTicket || isUpdating) return;
		
		console.log('[Admin Support] Updating status:', { ticketId: selectedTicket.id, status });
		setIsUpdating(true);
		
		const result = await updateTicket(selectedTicket.id, { status });
		
		console.log('[Admin Support] Update result:', result);
		
		if (result.success) {
			// Update the selected ticket locally for immediate UI feedback
			setSelectedTicket({
				...selectedTicket,
				status,
				updatedAt: new Date().toISOString()
			});
		} else {
			console.error('[Admin Support] Failed to update status:', result.error);
		}
		setIsUpdating(false);
	};

	const filteredTickets = tickets.filter((ticket) => {
		const matchesSearch =
			ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ticket.userName.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesTab =
			tabValue === 0 ||
			(tabValue === 1 && ticket.status === "open") ||
			(tabValue === 2 && ticket.status === "in-progress") ||
			(tabValue === 3 && (ticket.status === "resolved" || ticket.status === "closed"));

		return matchesSearch && matchesTab;
	});

	return (
		<Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
			<Sidebar />

			<Box
				component="main"
				sx={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Box sx={{ flex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
					{/* Header */}
					<Box mb={{ xs: 2, md: 3 }}>
						<Typography variant="h4" fontWeight={700} gutterBottom>
							WashPal AI
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Manage customer support tickets and provide real-time assistance
						</Typography>
					</Box>

					{/* Stats */}
					{stats && (
						<Grid container spacing={2} mb={3}>
							<Grid size={{ xs: 12, sm: 6, md: 3 }}>
								<StatCard icon={MessageSquare} label="Total Tickets" value={stats.total} color="primary" />
							</Grid>
							<Grid size={{ xs: 12, sm: 6, md: 3 }}>
								<StatCard icon={AlertCircle} label="Open Tickets" value={stats.open} color="error" />
							</Grid>
							<Grid size={{ xs: 12, sm: 6, md: 3 }}>
								<StatCard icon={Timer} label="Avg Response Time" value={stats.avgResponseTime} color="info" />
							</Grid>
							<Grid size={{ xs: 12, sm: 6, md: 3 }}>
								<StatCard icon={ThumbsUp} label="Satisfaction Rate" value={stats.satisfactionRate} color="success" />
							</Grid>
						</Grid>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{/* Main Content */}
					<Grid container spacing={2}>
						{/* Tickets List — hidden on mobile while a conversation is open */}
						<Grid size={{ xs: 12, md: 4 }} sx={{ display: selectedTicket ? { xs: "none", md: "block" } : "block" }}>
							<Paper
								elevation={0}
								sx={{
									border: 1,
									borderColor: "divider",
									// On mobile the list stacks above the chat panel, so cap it
									// instead of giving it a full screen of its own.
									height: { xs: "auto", md: CHAT_PANEL_HEIGHT.md },
									maxHeight: { xs: "60dvh", md: "none" },
									display: "flex",
									flexDirection: "column",
								}}
							>
								<Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: "divider" }}>
									<Tabs
										value={tabValue}
										onChange={(_, v) => setTabValue(v)}
										variant="scrollable"
										scrollButtons="auto"
										allowScrollButtonsMobile
									>
										<Tab label="All" />
										<Tab label="Open" />
										<Tab label="In Progress" />
										<Tab label="Resolved" />
									</Tabs>

									<TextField
										fullWidth
										size="small"
										placeholder="Search tickets..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										sx={{ mt: 2 }}
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<Search size={18} />
												</InputAdornment>
											),
										}}
									/>

									<Stack direction="row" spacing={1} mt={1}>
										<FormControl size="small" fullWidth>
											<InputLabel>Status</InputLabel>
											<Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
												<MenuItem value="all">All Status</MenuItem>
												<MenuItem value="open">Open</MenuItem>
												<MenuItem value="in-progress">In Progress</MenuItem>
												<MenuItem value="resolved">Resolved</MenuItem>
												<MenuItem value="closed">Closed</MenuItem>
											</Select>
										</FormControl>
										<FormControl size="small" fullWidth>
											<InputLabel>Priority</InputLabel>
											<Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} label="Priority">
												<MenuItem value="all">All Priority</MenuItem>
												<MenuItem value="low">Low</MenuItem>
												<MenuItem value="medium">Medium</MenuItem>
												<MenuItem value="high">High</MenuItem>
												<MenuItem value="urgent">Urgent</MenuItem>
											</Select>
										</FormControl>
									</Stack>
								</Box>

								<List sx={{ flex: 1, overflow: "auto", p: 1 }}>
									{isLoading ? (
										<Box display="flex" justifyContent="center" p={3}>
											<CircularProgress />
										</Box>
									) : filteredTickets.length === 0 ? (
										<Box p={3} textAlign="center">
											<Typography variant="body2" color="text.secondary">
												No tickets found
											</Typography>
										</Box>
									) : (
										filteredTickets.map((ticket) => (
											<TicketListItem
												key={ticket.id}
												ticket={ticket}
												isSelected={selectedTicket?.id === ticket.id}
												onClick={() => setSelectedTicket(ticket)}
											/>
										))
									)}
								</List>
							</Paper>
						</Grid>

						{/* Chat Area */}
						<Grid size={{ xs: 12, md: 8 }}>
							{selectedTicket ? (
								<Paper
									elevation={0}
									sx={{
										border: 1,
										borderColor: "divider",
										height: CHAT_PANEL_HEIGHT,
										minHeight: CHAT_PANEL_MIN_HEIGHT,
										display: "flex",
										flexDirection: "column",
									}}
								>
									{/* Chat Header */}
									<Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: "divider" }}>
										<Stack
											direction="row"
											alignItems="center"
											justifyContent="space-between"
											flexWrap="wrap"
											useFlexGap
											gap={1}
										>
											<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0, flex: "1 1 240px" }}>
												<IconButton
													size="small"
													aria-label="Back to tickets"
													onClick={() => setSelectedTicket(null)}
													sx={{ display: { xs: "inline-flex", md: "none" }, ml: -0.5 }}
												>
													<ArrowLeft size={18} />
												</IconButton>
												<Box sx={{ minWidth: 0 }}>
												<Stack direction="row" alignItems="center" spacing={1} mb={0.5} flexWrap="wrap" useFlexGap>
													<Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 15, md: 20 }, overflowWrap: "anywhere" }}>
														{selectedTicket.ticketNumber} - {selectedTicket.subject}
													</Typography>
													{selectedTicket.escalated && (
														<Chip
															icon={<AlertCircle size={14} />}
															label="Escalated from AI"
															size="small"
															color="warning"
															sx={{ height: 22, fontSize: 11 }}
														/>
													)}
												</Stack>
												<Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
													{selectedTicket.userName} ({selectedTicket.userEmail})
												</Typography>
												{selectedTicket.escalationReason && (
													<Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
														Reason: {selectedTicket.escalationReason}
													</Typography>
												)}
												</Box>
											</Box>
											<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
												{/* Status Badge */}
												<Chip
													label={selectedTicket.status.replace("-", " ")}
													size="medium"
													color={
														selectedTicket.status === "open" ? "error" :
														selectedTicket.status === "in-progress" ? "warning" :
														selectedTicket.status === "resolved" ? "success" : "default"
													}
													sx={{ textTransform: "capitalize", fontWeight: 600 }}
												/>
												
												{/* Priority Badge (Auto-assigned) */}
												<Chip
													label={`${selectedTicket.priority} priority`}
													size="medium"
													variant="outlined"
													color={
														selectedTicket.priority === "urgent" ? "error" :
														selectedTicket.priority === "high" ? "warning" :
														selectedTicket.priority === "medium" ? "info" : "default"
													}
													sx={{ textTransform: "capitalize" }}
												/>
												
												{/* Mark as Resolved Button */}
												{selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
													<Button
														variant="contained"
														color="success"
														size="small"
														onClick={() => handleUpdateStatus('resolved')}
														disabled={isUpdating}
														startIcon={isUpdating ? <CircularProgress size={16} /> : <CheckCircle2 size={16} />}
														sx={{ minWidth: 140 }}
													>
														{isUpdating ? 'Updating...' : 'Mark Resolved'}
													</Button>
												)}
												
												{/* Close Button (only for resolved tickets) */}
												{selectedTicket.status === 'resolved' && (
													<Button
														variant="outlined"
														color="inherit"
														size="small"
														onClick={() => handleUpdateStatus('closed')}
														disabled={isUpdating}
														sx={{ minWidth: 100 }}
													>
														Close Ticket
													</Button>
												)}
											</Stack>
										</Stack>
									</Box>

									{/* Messages */}
									<Box sx={{ flex: 1, overflow: "auto", p: { xs: 1.5, md: 2 }, bgcolor: "grey.50" }}>
										{messages.map((msg) => (
											<Box
												key={msg.id}
												sx={{
													display: "flex",
													justifyContent: msg.sender === "admin" ? "flex-end" : "flex-start",
													mb: 2,
												}}
											>
												<Box
													sx={{
														maxWidth: { xs: "88%", sm: "80%", md: "70%" },
														overflowWrap: "anywhere",
														bgcolor: msg.sender === "admin" ? "primary.main" : "background.paper",
														color: msg.sender === "admin" ? "primary.contrastText" : "text.primary",
														p: 1.5,
														borderRadius: 2,
														border: msg.sender === "user" ? 1 : 0,
														borderColor: "divider",
													}}
												>
													<Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
														{msg.senderName}
													</Typography>
													<Typography variant="body2">{msg.message}</Typography>
													<Typography variant="caption" display="block" mt={0.5} sx={{ opacity: 0.7 }}>
														{new Date(msg.timestamp).toLocaleTimeString()}
													</Typography>
												</Box>
											</Box>
										))}
										<div ref={messagesEndRef} />
									</Box>

									{/* Message Input */}
									<Box sx={{ p: { xs: 1.25, md: 2 }, borderTop: 1, borderColor: "divider" }}>
										{selectedTicket.status === 'closed' ? (
											<Alert severity="info" icon={false}>
												<Typography variant="body2" fontWeight={600}>
													This ticket is closed. No further messages can be sent.
												</Typography>
											</Alert>
										) : (
											<Stack direction="row" spacing={1}>
												<TextField
													fullWidth
													size="small"
													placeholder="Type your message..."
													value={messageInput}
													onChange={(e) => setMessageInput(e.target.value)}
													onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
													multiline
													maxRows={3}
													disabled={isSending}
												/>
												<Button
													variant="contained"
													onClick={handleSendMessage}
													disabled={!messageInput.trim() || isSending}
													sx={{ minWidth: { xs: 56, sm: 100 }, px: { xs: 1.5, sm: 2 } }}
												>
													{isSending ? <CircularProgress size={20} /> : <Send size={18} />}
												</Button>
											</Stack>
										)}
									</Box>
								</Paper>
							) : (
								<Paper
									elevation={0}
									sx={{
										border: 1,
										borderColor: "divider",
										height: { xs: 200, md: CHAT_PANEL_HEIGHT.md },
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Box textAlign="center">
										<MessageSquare size={64} style={{ opacity: 0.3 }} />
										<Typography variant="h6" color="text.secondary" mt={2}>
											Select a ticket to view conversation
										</Typography>
									</Box>
								</Paper>
							)}
						</Grid>
					</Grid>
				</Box>

				<Footer />
			</Box>
		</Box>
	);
}
