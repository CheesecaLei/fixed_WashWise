export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type MessageSender = "user" | "admin";

export interface SupportMessage {
  id: string;
  ticketId: string;
  sender: MessageSender;
  senderName: string;
  senderId: string;
  message: string;
  timestamp: string;
  read: boolean;
  isAI?: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  assignedTo?: string;
  handledBy?: 'ai' | 'human';
  escalated?: boolean;
  escalationReason?: string;
  escalatedAt?: string;
}

export interface SupportStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgResponseTime: string;
  satisfactionRate: string;
}
