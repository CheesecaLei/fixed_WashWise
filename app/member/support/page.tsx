"use client";

import { useEffect, useState, useRef } from "react";
import {
	Box,
	Paper,
	Typography,
	Grid,
	Chip,
	Stack,
	TextField,
	Button,
	List,
	ListItemButton,
	ListItemText,
	Badge,
	Alert,
	CircularProgress,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Tabs,
	Tab,
	InputAdornment,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import {
	Send,
	HelpCircle,
	ChevronDown,
	Search,
	BookOpen,
	MessageCircle,
	Package,
	CreditCard,
	Truck,
	Shield,
	Bot,
	Trash2,
	ArrowLeft,
} from "lucide-react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import { useMemberSupport, useMemberSupportChat } from "../../hooks/use-member-support";
import type { TicketStatus } from "../../types/support";

/**
 * Chat panels fill the viewport minus the surrounding page chrome.
 * `dvh` (not `vh`) so a mobile browser's collapsing toolbar can't push the
 * message composer off-screen.
 */
const CHAT_PANEL_HEIGHT = { xs: "calc(100dvh - 270px)", md: "calc(100dvh - 290px)" };
const CHAT_PANEL_MIN_HEIGHT = 360;

// FAQ Data
const faqCategories = [
	{
		id: "orders",
		title: "Orders & Services",
		icon: Package,
		faqs: [
			{
				question: "How do I place a new order?",
				answer: "To place a new order, navigate to the 'New Order' section from the main menu. Select your desired service (Wash & Fold, Dry Cleaning, etc.), choose pickup/delivery options, and proceed to checkout. You can track your order status in the 'My Orders' section."
			},
			{
				question: "What services do you offer?",
				answer: "We offer a comprehensive range of laundry services including Wash & Fold, Dry Cleaning, Ironing, Deluxe Comforter Cleaning, and specialized garment care. Each service has different pricing and turnaround times which you can view in the services section."
			},
			{
				question: "How long does it take to process my order?",
				answer: "Standard Wash & Fold orders typically take 24-48 hours. Dry cleaning services take 2-3 business days. Express service is available for an additional fee with same-day or next-day delivery options."
			},
			{
				question: "Can I modify or cancel my order?",
				answer: "You can modify or cancel your order within 2 hours of placement if it hasn't been picked up yet. Go to 'My Orders', select your order, and click 'Modify' or 'Cancel'. After pickup, modifications are not possible."
			}
		]
	},
	{
		id: "delivery",
		title: "Pickup & Delivery",
		icon: Truck,
		faqs: [
			{
				question: "What are your pickup and delivery hours?",
				answer: "We offer pickup and delivery Monday through Saturday, 8:00 AM to 8:00 PM. Sunday service is available in select areas from 10:00 AM to 6:00 PM. You can schedule your preferred time slot during checkout."
			},
			{
				question: "How do I schedule a pickup?",
				answer: "When placing an order, select 'Schedule Pickup' and choose your preferred date and time slot. You'll receive a confirmation and a notification 30 minutes before the driver arrives. Make sure your items are ready at the designated location."
			},
			{
				question: "What if I'm not home during delivery?",
				answer: "If you're not available, our driver will leave your items in a secure location you've specified in your delivery preferences. You can also reschedule delivery through the 'My Orders' section or contact support for assistance."
			},
			{
				question: "Do you offer contactless pickup and delivery?",
				answer: "Yes! We offer completely contactless service. Leave your items in a designated safe location for pickup, and we'll deliver them back the same way. You'll receive notifications at each step of the process."
			}
		]
	},
	{
		id: "payment",
		title: "Payment & Billing",
		icon: CreditCard,
		faqs: [
			{
				question: "What payment methods do you accept?",
				answer: "We accept all major credit cards (Visa, Mastercard, American Express), debit cards, GCash, PayMaya, and cash on delivery. You can save your preferred payment method in your profile for faster checkout."
			},
			{
				question: "When will I be charged?",
				answer: "For card payments, you'll be charged when your order is confirmed. For cash on delivery, payment is collected upon delivery. You'll receive a detailed invoice via email after each transaction."
			},
			{
				question: "Can I get a receipt for my order?",
				answer: "Yes, a digital receipt is automatically sent to your registered email after each order. You can also view and download all your receipts from the 'My Orders' section under order history."
			},
			{
				question: "Do you offer refunds?",
				answer: "If you're not satisfied with our service, please contact support within 48 hours of delivery. We'll review your case and offer a refund, re-cleaning, or service credit based on the situation."
			}
		]
	},
	{
		id: "account",
		title: "Account & Security",
		icon: Shield,
		faqs: [
			{
				question: "How do I update my profile information?",
				answer: "Go to 'Profile Settings' from the account menu. You can update your name, contact number, email, and default address. Make sure to save changes before exiting."
			},
			{
				question: "How do I change my password?",
				answer: "Navigate to 'Profile Settings' and click on 'Change Password'. Enter your current password and your new password twice for confirmation. We recommend using a strong password with at least 8 characters."
			},
			{
				question: "Can I have multiple delivery addresses?",
				answer: "Yes! Go to 'Saved Addresses' to add multiple addresses. You can set a default address and choose different addresses for each order during checkout."
			},
			{
				question: "Is my personal information secure?",
				answer: "Absolutely. We use industry-standard encryption to protect your data. Your payment information is processed through secure payment gateways and never stored on our servers. Read our Privacy Policy for more details."
			}
		]
	}
];

interface TicketItemType {
	ticketNumber: string;
	unreadCount: number;
	subject: string;
	status: TicketStatus;
	lastMessageTime?: string | Date;
	createdAt: string | Date;
	id: string;
	handledBy?: string;
	escalated?: boolean;
}

function TicketListItem({ 
	ticket, 
	isSelected, 
	onClick, 
	onDelete 
}: { 
	ticket: TicketItemType; 
	isSelected: boolean; 
	onClick: () => void;
	onDelete: (e: React.MouseEvent) => void;
}) {
	const statusColors: Record<TicketStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
		open: "error",
		"in-progress": "warning",
		resolved: "success",
		closed: "default",
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
				position: "relative",
				pr: 6, // Make room for delete button
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
						</Stack>
						<Typography variant="caption" component="div" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
							{new Date(ticket.lastMessageTime || ticket.createdAt).toLocaleString()}
						</Typography>
					</Box>
				}
			/>
			<IconButton
				size="small"
				onClick={onDelete}
				sx={{
					position: "absolute",
					right: 8,
					top: "50%",
					transform: "translateY(-50%)",
					color: "error.main",
					"&:hover": {
						bgcolor: "error.50",
					},
				}}
			>
				<Trash2 size={16} />
			</IconButton>
		</ListItemButton>
	);
}

export default function MemberSupportPage() {
	const { tickets, isLoading, error, fetchTickets, deleteTicket } = useMemberSupport();
	const [selectedTicket, setSelectedTicket] = useState<TicketItemType | null>(null);
	const [mainTab, setMainTab] = useState(1); // Start with Support Tickets tab
	const [faqSearch, setFaqSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("orders");

	// New conversation state
	const [newConversationMessage, setNewConversationMessage] = useState("");
	const [isCreatingTicket, setIsCreatingTicket] = useState(false);
	const [showQuickOptions, setShowQuickOptions] = useState(true);
	const [aiTyping, setAiTyping] = useState(false);
	const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);

	// Delete confirmation dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [ticketToDelete, setTicketToDelete] = useState<TicketItemType | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const { messages, isSending, sendMessage } = useMemberSupportChat(selectedTicket?.id || null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchTickets();
	}, [fetchTickets]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Auto-select newly created ticket when it appears in the list
	useEffect(() => {
		if (pendingTicketId && tickets.length > 0) {
			const newTicket = tickets.find(t => t.id === pendingTicketId);
			if (newTicket) {
				setSelectedTicket(newTicket);
				setPendingTicketId(null);
			}
		}
	}, [tickets, pendingTicketId]);

	const handleSendMessage = async () => {
		if (!messageInput.trim() || !selectedTicket) return;

		// Check if ticket is handled by AI
		const isAIHandled = selectedTicket.handledBy === 'ai' && !selectedTicket.escalated;

		if (isAIHandled) {
			// Send to AI chatbot
			setAiTyping(true);
			try {
				const response = await fetch('/api/member/support/ai-chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						ticketId: selectedTicket.id,
						message: messageInput
					})
				});

				const data = await response.json();

				if (data.success) {
					setMessageInput("");
					
					// Show escalation notification if needed
					if (data.escalated) {
						console.log('Conversation escalated to human agent:', data.escalationReason);
						// Refresh tickets to update escalation status
						await fetchTickets();
						
						// Update selected ticket with new status
						const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
						if (updatedTicket) {
							setSelectedTicket(updatedTicket);
						}
					}
				}
			} catch (error) {
				console.error('Error sending message to AI:', error);
			} finally {
				setAiTyping(false);
			}
		} else {
			// Send to human agent (existing logic)
			const result = await sendMessage(messageInput);
			if (result.success) {
				setMessageInput("");
			}
		}
	};

	// Handle new conversation - auto-create ticket with AI chat
	const handleStartNewConversation = async () => {
		if (!newConversationMessage.trim()) return;

		setIsCreatingTicket(true);
		setShowQuickOptions(false);
		setAiTyping(true);

		try {
			// Send message to AI chatbot
			const response = await fetch('/api/member/support/ai-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					ticketId: null, // New conversation
					message: newConversationMessage
				})
			});

			const data = await response.json();

			if (data.success) {
				setNewConversationMessage("");
				
				// Set pending ticket ID so useEffect can select it when tickets refresh
				setPendingTicketId(data.ticketId);
				
				// Refresh tickets to get the new conversation
				await fetchTickets();

				// Show escalation alert if needed
				if (data.escalated) {
					console.log('Ticket escalated to human agent:', data.escalationReason);
				}
			}
		} catch (error) {
			console.error('Error starting conversation:', error);
		} finally {
			setIsCreatingTicket(false);
			setAiTyping(false);
		}
	};

	const handleQuickQuestion = (question: string) => {
		setNewConversationMessage(question);
		setShowQuickOptions(false);
	};

	// Handle delete conversation
	const handleDeleteClick = (e: React.MouseEvent, ticket: TicketItemType) => {
		e.stopPropagation(); // Prevent selecting the ticket
		setTicketToDelete(ticket);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!ticketToDelete) return;

		setIsDeleting(true);
		try {
			const result = await deleteTicket(ticketToDelete.id);
			
			if (result.success) {
				// If the deleted ticket was selected, clear selection
				if (selectedTicket?.id === ticketToDelete.id) {
					setSelectedTicket(null);
					setShowQuickOptions(true);
				}
				setDeleteDialogOpen(false);
				setTicketToDelete(null);
			} else {
				console.error('Failed to delete conversation:', result.error);
				alert('Failed to delete conversation. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting conversation:', error);
			alert('An error occurred while deleting the conversation.');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setDeleteDialogOpen(false);
		setTicketToDelete(null);
	};

	// Filter FAQs based on search
	const filteredFaqs = faqCategories.map(category => ({
		...category,
		faqs: category.faqs.filter(faq =>
			faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
			faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
		)
	})).filter(category => category.faqs.length > 0);

	const currentCategory = faqCategories.find(cat => cat.id === selectedCategory);

	// Quick question suggestions
	const quickQuestions = [
		"How do I track my order?",
		"What are your service hours?",
		"How do I change my delivery address?",
		"I have an issue with my recent order",
	];

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
							Find answers to common questions or chat with our support team
						</Typography>

						{/* Main Tabs */}
						<Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, mt: 2 }}>
							<Tabs
								value={mainTab}
								onChange={(_, v) => setMainTab(v)}
								variant="scrollable"
								scrollButtons="auto"
								allowScrollButtonsMobile
								sx={{ borderBottom: 1, borderColor: "divider" }}
							>
								<Tab 
									icon={<BookOpen size={18} />} 
									iconPosition="start" 
									label="FAQs" 
									sx={{ textTransform: "none", fontWeight: 600 }}
								/>
								<Tab 
									icon={<MessageCircle size={18} />} 
									iconPosition="start" 
									label={`Chat Support ${tickets.length > 0 ? `(${tickets.length})` : ''}`}
									sx={{ textTransform: "none", fontWeight: 600 }}
								/>
							</Tabs>
						</Paper>
					</Box>

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{/* FAQ Section */}
					{mainTab === 0 && (
						<Grid container spacing={2}>
							{/* FAQ Categories */}
							<Grid size={{ xs: 12, md: 3 }}>
								<Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: 2 }}>
									<Typography variant="h6" fontWeight={700} mb={2}>
										Categories
									</Typography>
									<Stack spacing={1}>
										{faqCategories.map((category) => {
											const Icon = category.icon;
											return (
												<Button
													key={category.id}
													fullWidth
													variant={selectedCategory === category.id ? "contained" : "outlined"}
													startIcon={<Icon size={18} />}
													onClick={() => setSelectedCategory(category.id)}
													sx={{
														justifyContent: "flex-start",
														textTransform: "none",
														fontWeight: 600,
													}}
												>
													{category.title}
												</Button>
											);
										})}
									</Stack>

									<Box mt={3} p={2} bgcolor="primary.50" borderRadius={2}>
										<Stack spacing={1} alignItems="center" textAlign="center">
											<HelpCircle size={32} color="var(--mui-palette-primary-main)" />
											<Typography variant="subtitle2" fontWeight={700}>
												Still need help?
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Can&apos;t find what you&apos;re looking for? Chat with our support team.
											</Typography>
											<Button
												size="small"
												variant="contained"
												onClick={() => setMainTab(1)}
												sx={{ mt: 1 }}
											>
												Start Chat
											</Button>
										</Stack>
									</Box>
								</Paper>
							</Grid>

							{/* FAQ Content */}
							<Grid size={{ xs: 12, md: 9 }}>
								<Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 1.5, sm: 2, md: 3 } }}>
									<TextField
										fullWidth
										placeholder="Search FAQs..."
										value={faqSearch}
										onChange={(e) => setFaqSearch(e.target.value)}
										sx={{ mb: 3 }}
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<Search size={20} />
												</InputAdornment>
											),
										}}
									/>

									{faqSearch ? (
										<Box>
											<Typography variant="h6" fontWeight={700} mb={2}>
												Search Results ({filteredFaqs.reduce((acc, cat) => acc + cat.faqs.length, 0)})
											</Typography>
											{filteredFaqs.length === 0 ? (
												<Box textAlign="center" py={4}>
													<Search size={48} style={{ opacity: 0.3 }} />
													<Typography variant="body2" color="text.secondary" mt={2}>
														No results found for &quot;{faqSearch}&quot;
													</Typography>
												</Box>
											) : (
												filteredFaqs.map((category) => (
													<Box key={category.id} mb={3}>
														<Typography variant="subtitle1" fontWeight={700} mb={1} color="primary">
															{category.title}
														</Typography>
														{category.faqs.map((faq, index) => (
															<Accordion key={index} elevation={0} sx={{ border: 1, borderColor: "divider", mb: 1 }}>
																<AccordionSummary expandIcon={<ChevronDown size={20} />}>
																	<Typography fontWeight={600}>{faq.question}</Typography>
																</AccordionSummary>
																<AccordionDetails>
																	<Typography variant="body2" color="text.secondary">
																		{faq.answer}
																	</Typography>
																</AccordionDetails>
															</Accordion>
														))}
													</Box>
												))
											)}
										</Box>
									) : (
										currentCategory && (
											<Box>
												<Stack direction="row" alignItems="center" spacing={1} mb={3}>
													{(() => {
														const Icon = currentCategory.icon;
														return <Icon size={24} color="var(--mui-palette-primary-main)" />;
													})()}
													<Typography variant="h5" fontWeight={700}>
														{currentCategory.title}
													</Typography>
												</Stack>

												{currentCategory.faqs.map((faq, index) => (
													<Accordion key={index} elevation={0} sx={{ border: 1, borderColor: "divider", mb: 1 }}>
														<AccordionSummary expandIcon={<ChevronDown size={20} />}>
															<Typography fontWeight={600}>{faq.question}</Typography>
														</AccordionSummary>
														<AccordionDetails>
															<Typography variant="body2" color="text.secondary" lineHeight={1.7}>
																{faq.answer}
															</Typography>
														</AccordionDetails>
													</Accordion>
												))}
											</Box>
										)
									)}
								</Paper>
							</Grid>
						</Grid>
					)}

					{/* Chat Support Section */}
					{mainTab === 1 && (
						<Grid container spacing={2}>
							{/* Tickets List — hidden on mobile while a conversation is open */}
							<Grid size={{ xs: 12, md: 4 }} sx={{ display: selectedTicket ? { xs: "none", md: "block" } : "block" }}>
								<Paper
									elevation={0}
									sx={{
										border: 1,
										borderColor: "divider",
										// On mobile the list sits above the chat panel, so cap it
										// instead of giving it a full screen of its own.
										height: { xs: "auto", md: CHAT_PANEL_HEIGHT.md },
										maxHeight: { xs: "42dvh", md: "none" },
										display: "flex",
										flexDirection: "column",
									}}
								>
									<Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
										<Stack
											direction="row"
											alignItems="center"
											justifyContent="space-between"
											flexWrap="wrap"
											useFlexGap
											gap={1}
											mb={1}
										>
											<Typography variant="h6" fontWeight={700}>
												Conversations
											</Typography>
											<Button
												variant="contained"
												size="small"
												startIcon={<MessageCircle size={16} />}
												onClick={() => {
													setSelectedTicket(null);
													setShowQuickOptions(true);
													setNewConversationMessage("");
												}}
												sx={{
													textTransform: "none",
													fontWeight: 600,
													minWidth: 120
												}}
											>
												New Chat
											</Button>
										</Stack>
										{tickets.length > 0 && (
											<Typography variant="caption" color="text.secondary">
												{tickets.length} conversation{tickets.length !== 1 ? 's' : ''}
											</Typography>
										)}
									</Box>

									<List sx={{ flex: 1, overflow: "auto", p: 1 }}>
										{isLoading ? (
											<Box display="flex" justifyContent="center" p={3}>
												<CircularProgress />
											</Box>
										) : tickets.length === 0 ? (
											<Box p={3} textAlign="center">
												<MessageCircle size={48} style={{ opacity: 0.3 }} />
												<Typography variant="body2" color="text.secondary" mt={2}>
													No conversations yet
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Start a new conversation to get help
												</Typography>
											</Box>
										) : (
											tickets.map((ticket) => (
												<TicketListItem
													key={ticket.id}
													ticket={ticket}
													isSelected={selectedTicket?.id === ticket.id}
													onClick={() => {
														setSelectedTicket(ticket);
														setShowQuickOptions(false);
													}}
													onDelete={(e) => handleDeleteClick(e, ticket)}
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
										<Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
											<Stack
												direction="row"
												alignItems="center"
												justifyContent="space-between"
												flexWrap="wrap"
												useFlexGap
												gap={1}
											>
												<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
													<IconButton
														size="small"
														aria-label="Back to conversations"
														onClick={() => setSelectedTicket(null)}
														sx={{ display: { xs: "inline-flex", md: "none" }, ml: -0.5 }}
													>
														<ArrowLeft size={18} />
													</IconButton>
													<Box sx={{ minWidth: 0 }}>
													<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
														<Typography variant="h6" fontWeight={700}>
															{selectedTicket.ticketNumber}
														</Typography>
														{selectedTicket.handledBy === 'ai' && !selectedTicket.escalated && (
															<Chip
																icon={<Bot size={14} />}
																label="AI Assistant"
																size="small"
																color="info"
																variant="outlined"
																sx={{ height: 22, fontSize: 11 }}
															/>
														)}
														{selectedTicket.escalated && (
															<Chip
																label="Human Agent"
																size="small"
																color="success"
																variant="outlined"
																sx={{ height: 22, fontSize: 11 }}
															/>
														)}
													</Stack>
													<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
														{selectedTicket.subject}
													</Typography>
													</Box>
												</Box>
												<Stack direction="row" spacing={1}>
													<Chip
														label={selectedTicket.status.replace("-", " ")}
														size="small"
														color={
															selectedTicket.status === "open" ? "error" :
															selectedTicket.status === "in-progress" ? "warning" :
															selectedTicket.status === "resolved" ? "success" : "default"
														}
														sx={{ textTransform: "capitalize" }}
													/>
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
														justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
														mb: 2,
													}}
												>
													<Box
														sx={{
															maxWidth: { xs: "88%", sm: "80%", md: "70%" },
															overflowWrap: "anywhere",
															bgcolor: msg.sender === "user" ? "primary.main" : "background.paper",
															color: msg.sender === "user" ? "primary.contrastText" : "text.primary",
															p: 1.5,
															borderRadius: 2,
															border: msg.sender === "admin" ? 1 : 0,
															borderColor: "divider",
															boxShadow: msg.sender === "admin" ? 1 : 0,
														}}
													>
														<Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
															<Typography variant="caption" fontWeight={700}>
																{msg.isAI || msg.senderId === 'ai-bot' || msg.senderName === 'WashWise AI' ? 'WashPal AI' : msg.senderName}
															</Typography>
															{(msg.isAI || msg.senderId === 'ai-bot' || msg.senderName === 'WashWise AI' || msg.senderName === 'WashPal AI') && (
																<Bot size={12} color="var(--mui-palette-info-main)" />
															)}
														</Stack>
														<Typography 
															variant="body2" 
															sx={{ whiteSpace: 'pre-line' }}
														>
															{msg.message}
														</Typography>
														<Typography variant="caption" display="block" mt={0.5} sx={{ opacity: 0.7 }}>
															{new Date(msg.timestamp).toLocaleTimeString()}
														</Typography>
													</Box>
												</Box>
											))}
											
											{/* AI Typing Indicator */}
											{aiTyping && (
												<Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
													<Box
														sx={{
															bgcolor: "background.paper",
															p: 1.5,
															borderRadius: 2,
															border: 1,
															borderColor: "divider",
															boxShadow: 1,
														}}
													>
														<Stack direction="row" alignItems="center" spacing={1}>
															<Bot size={14} color="var(--mui-palette-info-main)" />
															<Typography variant="caption" fontWeight={700}>
																WashPal AI is typing
															</Typography>
															<CircularProgress size={12} />
														</Stack>
													</Box>
												</Box>
											)}
											
											<div ref={messagesEndRef} />
										</Box>

										{/* Message Input */}
										{selectedTicket.status !== "closed" ? (
											<Box sx={{ p: { xs: 1.25, md: 2 }, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
												{selectedTicket.handledBy === 'ai' && !selectedTicket.escalated && (
													<Alert severity="info" icon={<Bot size={18} />} sx={{ mb: 1.5 }}>
														<Typography variant="caption" fontWeight={600}>
															You&apos;re chatting with our AI Assistant. If needed, we&apos;ll connect you with a human agent.
														</Typography>
													</Alert>
												)}
												{selectedTicket.escalated && (
													<Alert severity="success" sx={{ mb: 1.5 }}>
														<Typography variant="caption" fontWeight={600}>
															Your conversation has been escalated to our support team. They&apos;ll respond shortly.
														</Typography>
													</Alert>
												)}
												<Paper
													elevation={0}
													sx={{
														p: '2px 4px',
														display: 'flex',
														alignItems: 'flex-end',
														width: '100%',
														borderRadius: 6,
														border: 1,
														borderColor: 'divider',
														bgcolor: 'background.default',
														boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
														transition: 'all 0.2s',
														'&:focus-within': {
															borderColor: 'primary.main',
															boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
														}
													}}
												>
													<TextField
														fullWidth
														multiline
														maxRows={3}
														placeholder="Type your message..."
														value={messageInput}
														onChange={(e) => setMessageInput(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter" && !e.shiftKey) {
																e.preventDefault();
																handleSendMessage();
															}
														}}
														disabled={isSending || aiTyping}
														sx={{
															ml: { xs: 1, md: 2 },
															flex: 1,
															"& .MuiOutlinedInput-root": {
																"& fieldset": { border: "none" },
																p: 1.5
															}
														}}
													/>
													<Button
														variant="contained"
														onClick={handleSendMessage}
														disabled={!messageInput.trim() || isSending || aiTyping}
														sx={{ 
															minWidth: 48, 
															width: 48, 
															height: 48, 
															borderRadius: '50%',
															m: 0.5,
															mb: '4px'
														}}
													>
														{(isSending || aiTyping) ? <CircularProgress size={20} color="inherit" /> : <Send size={20} style={{ marginLeft: 2 }} />}
													</Button>
												</Paper>
											</Box>
										) : (
											<Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "grey.100" }}>
												<Alert severity="info">
													This conversation has been closed. Start a new conversation if you need further assistance.
												</Alert>
											</Box>
										)}
									</Paper>
								) : (
									<Paper
										elevation={0}
										sx={{
											border: 1,
											borderColor: "divider",
											borderRadius: 4,
											overflow: "hidden",
											height: { xs: "auto", md: CHAT_PANEL_HEIGHT.md },
											minHeight: { xs: 0, md: CHAT_PANEL_MIN_HEIGHT },
											display: "flex",
											flexDirection: "column",
											boxShadow: "0 8px 32px rgba(0,0,0,0.04)"
										}}
									>
										{/* Welcome Header */}
										<Box sx={{ 
											p: { xs: 2.5, md: 3 }, 
											borderBottom: 1, 
											borderColor: "divider", 
											background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
											color: "primary.contrastText" 
										}}>
											<Stack direction="row" alignItems="center" spacing={{ xs: 1.5, md: 2.5 }}>
												<Box
													sx={{
														width: { xs: 44, md: 56 },
														height: { xs: 44, md: 56 },
														flexShrink: 0,
														borderRadius: "50%",
														bgcolor: "rgba(255,255,255,0.2)",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
													}}
												>
													<Bot size={32} color="white" />
												</Box>
												<Box sx={{ minWidth: 0 }}>
													<Typography variant="h5" fontWeight={800} mb={0.5} sx={{ fontSize: { xs: 18, md: 24 } }}>
														How can we help you today?
													</Typography>
													<Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: 12.5, md: 14 } }}>
														Chat with our AI Assistant for instant help, or get connected to our support team.
													</Typography>
												</Box>
											</Stack>
										</Box>

										{/* Quick Questions */}
										{showQuickOptions && (
											<Box sx={{ p: { xs: 2, md: 3 }, flex: 1, overflowY: "auto" }}>
												<Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
													Suggested topics
												</Typography>
												<Grid container spacing={1.5}>
													{quickQuestions.map((question, index) => (
														<Grid size={{ xs: 12, sm: 6 }} key={index}>
															<Button
																fullWidth
																variant="outlined"
																onClick={() => handleQuickQuestion(question)}
																sx={{
																	justifyContent: "flex-start",
																	textAlign: "left",
																	textTransform: "none",
																	py: 1.5,
																	px: 2,
																	borderRadius: 3,
																	bgcolor: "background.paper",
																	borderColor: "divider",
																	color: "text.primary",
																	fontWeight: 600,
																	transition: "all 0.2s",
																	"&:hover": {
																		borderColor: "primary.main",
																		bgcolor: "primary.50",
																		transform: "translateY(-2px)",
																		boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
																	}
																}}
															>
																{question}
															</Button>
														</Grid>
													))}
												</Grid>
											</Box>
										)}

										{/* Message Input Area */}
										<Box sx={{ p: { xs: 2, md: 2.5 }, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", mt: "auto" }}>
											<Paper
												elevation={0}
												sx={{
													p: '2px 4px',
													display: 'flex',
													alignItems: 'center',
													width: '100%',
													borderRadius: 6,
													border: 1,
													borderColor: 'divider',
													bgcolor: 'background.default',
													boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
													transition: 'all 0.2s',
													'&:focus-within': {
														borderColor: 'primary.main',
														boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
													}
												}}
											>
												<TextField
													fullWidth
													multiline
													maxRows={3}
													placeholder="Type your message here..."
													value={newConversationMessage}
													onChange={(e) => setNewConversationMessage(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter" && !e.shiftKey) {
															e.preventDefault();
															handleStartNewConversation();
														}
													}}
													disabled={isCreatingTicket}
													sx={{
														ml: { xs: 1, md: 2 },
														flex: 1,
														"& .MuiOutlinedInput-root": {
															"& fieldset": { border: "none" },
															p: 1.5
														}
													}}
												/>
												<Button
													variant="contained"
													onClick={handleStartNewConversation}
													disabled={!newConversationMessage.trim() || isCreatingTicket}
													sx={{ 
														minWidth: 48, 
														width: 48, 
														height: 48, 
														borderRadius: '50%',
														m: 0.5
													}}
												>
													{isCreatingTicket ? <CircularProgress size={20} color="inherit" /> : <Send size={20} style={{ marginLeft: 2 }} />}
												</Button>
											</Paper>
											<Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5, fontWeight: 500 }}>
												Press Enter to send or Shift+Enter for a new line
											</Typography>
										</Box>
									</Paper>
								)}
							</Grid>
						</Grid>
					)}
				</Box>

				<Footer />
			</Box>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={deleteDialogOpen}
				onClose={handleDeleteCancel}
				aria-labelledby="delete-dialog-title"
				aria-describedby="delete-dialog-description"
			>
				<DialogTitle id="delete-dialog-title">
					Delete Conversation?
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="delete-dialog-description">
						Are you sure you want to delete this conversation? This action cannot be undone.
						{ticketToDelete && (
							<Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
								<Typography variant="body2" fontWeight={600}>
									{ticketToDelete.ticketNumber}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{ticketToDelete.subject}
								</Typography>
							</Box>
						)}
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button 
						onClick={handleDeleteCancel} 
						disabled={isDeleting}
						variant="outlined"
					>
						Cancel
					</Button>
					<Button 
						onClick={handleDeleteConfirm} 
						color="error" 
						variant="contained"
						disabled={isDeleting}
						startIcon={isDeleting ? <CircularProgress size={16} /> : <Trash2 size={16} />}
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
