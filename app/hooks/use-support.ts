import { useState, useEffect, useCallback } from 'react';
import { pusherClient } from '../lib/pusher-client';
import type { SupportTicket, SupportMessage, SupportStats, TicketStatus, TicketPriority } from '../types/support';

export function useSupport() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [stats, setStats] = useState<SupportStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async (status?: string, priority?: string) => {
        console.log('[useSupport] fetchTickets called with:', { status, priority });
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.append('status', status);
            if (priority && priority !== 'all') params.append('priority', priority);

            const url = `/api/admin/support?${params.toString()}`;
            console.log('[useSupport] Fetching from:', url);
            
            const response = await fetch(url, {
                credentials: 'include',
            });
            const data = await response.json();

            console.log('[useSupport] Response:', { ok: response.ok, status: response.status, data });

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch tickets');
            }

            setTickets(data.tickets || []);
            setStats(data.stats || null);
            console.log('[useSupport] Set tickets:', data.tickets?.length, 'tickets');
        } catch (err) {
            console.error('[useSupport] Error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTickets([]);
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateTicket = useCallback(async (
        ticketId: string,
        updates: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string }
    ) => {
        console.log('[useSupport] updateTicket called:', { ticketId, updates });
        try {
            const response = await fetch('/api/admin/support', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ticketId, ...updates })
            });

            const data = await response.json();
            console.log('[useSupport] Update response:', { ok: response.ok, data });

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update ticket');
            }

            // Refresh tickets to show updated data
            await fetchTickets();

            return { success: true };
        } catch (err) {
            console.error('[useSupport] Update error:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'An error occurred'
            };
        }
    }, [fetchTickets]);

    return {
        tickets,
        stats,
        isLoading,
        error,
        fetchTickets,
        updateTicket
    };
}

export function useSupportChat(ticketId: string | null) {
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
            const response = await fetch(`/api/admin/support/messages?ticketId=${ticketId}`, {
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

    const sendMessage = useCallback(async (message: string, senderName: string = 'Admin') => {
        if (!ticketId || !message.trim()) return { success: false, error: 'Invalid input' };

        setIsSending(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/support/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ticketId,
                    sender: 'admin',
                    senderName,
                    senderId: 'admin',
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

    const markAsRead = useCallback(async (sender: 'user' | 'admin') => {
        if (!ticketId) return;

        try {
            await fetch('/api/admin/support/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ticketId, sender })
            });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [ticketId]);

    // Real-time message subscription
    useEffect(() => {
        if (!ticketId || typeof window === 'undefined') return;

        const channel = pusherClient.subscribe(`support-ticket-${ticketId}`);

        channel.bind('new-message', (newMessage: SupportMessage) => {
            setMessages(prev => [...prev, newMessage]);
            
            // Auto-mark user messages as read when admin is viewing
            if (newMessage.sender === 'user') {
                markAsRead('user');
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
            markAsRead('user'); // Mark user messages as read when opening chat
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
