import { useState, useEffect, useCallback } from 'react';
import { pusherClient } from '../lib/pusher-client';
import type { SupportMessage, TicketPriority, SupportTicket } from '../types/support';

export function useMemberSupport() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/member/support', {
                credentials: 'include', // Ensure cookies are sent
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch tickets');
            }

            setTickets(data.tickets || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTickets([]); // Reset to empty array on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createTicket = useCallback(async (ticketData: {
        subject: string;
        category: string;
        priority: TicketPriority;
        message: string;
    }) => {
        try {
            const response = await fetch('/api/member/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Ensure cookies are sent
                body: JSON.stringify(ticketData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create ticket');
            }

            // Refresh tickets list to include the new ticket
            await fetchTickets();
            
            return { success: true, data };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'An error occurred'
            };
        }
    }, [fetchTickets]);

    const deleteTicket = useCallback(async (ticketId: string) => {
        try {
            const response = await fetch(`/api/member/support?ticketId=${ticketId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete conversation');
            }

            // Refresh tickets list to remove the deleted ticket
            await fetchTickets();
            
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'An error occurred'
            };
        }
    }, [fetchTickets]);

    return {
        tickets,
        isLoading,
        error,
        fetchTickets,
        createTicket,
        deleteTicket
    };
}

export function useMemberSupportChat(ticketId: string | null) {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!ticketId) {
            setMessages([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/member/support/messages?ticketId=${ticketId}`, {
                credentials: 'include',
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch messages');
            }

            setMessages(data.messages || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setMessages([]);
        } finally {
            setIsLoading(false);
        }
    }, [ticketId]);

    const sendMessage = useCallback(async (message: string) => {
        if (!ticketId || !message.trim()) return { success: false, error: 'Invalid input' };

        setIsSending(true);
        setError(null);

        try {
            const response = await fetch('/api/member/support/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ticketId,
                    message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            return { success: true };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsSending(false);
        }
    }, [ticketId]);

    const markAsRead = useCallback(async () => {
        if (!ticketId) return;

        try {
            await fetch('/api/member/support/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ticketId })
            });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [ticketId]);

    // Real-time message subscription
    useEffect(() => {
        if (!ticketId || typeof window === 'undefined' || !pusherClient) return;

        const channel = pusherClient.subscribe(`support-ticket-${ticketId}`);

        channel.bind('new-message', (newMessage: SupportMessage) => {
            setMessages(prev => [...prev, newMessage]);
            
            // Auto-mark admin messages as read when user is viewing
            if (newMessage.sender === 'admin') {
                markAsRead();
            }
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, [ticketId, markAsRead]);

    // Initial fetch
    useEffect(() => {
        if (ticketId) {
            fetchMessages();
            markAsRead(); // Mark admin messages as read when opening chat
        } else {
            setMessages([]);
        }
    }, [ticketId, fetchMessages, markAsRead]);

    return {
        messages,
        isLoading,
        isSending,
        error,
        sendMessage,
        fetchMessages
    };
}
