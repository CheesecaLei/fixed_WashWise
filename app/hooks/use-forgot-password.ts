import { useState } from 'react';
import { ForgotPasswordInitialResponse, ForgotPasswordChallengeResponse, ForgotPasswordResetResponse } from '../types/auth';

export function useForgotPassword() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const clearApiError = () => setApiError(null);

    const verifyInitial = async (credential: string): Promise<{ ok: boolean; data?: ForgotPasswordInitialResponse }> => {
        setIsSubmitting(true);
        setApiError(null);
        try {
            const response = await fetch('/api/auth/forgot-password/verify-initial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return { ok: true, data };
        } catch (error) {
            setApiError(error instanceof Error ? error.message : "An unexpected error occurred");
            return { ok: false };
        } finally {
            setIsSubmitting(false);
        }
    };

    const verifyChallenge = async (userId: string, secondaryCredential: string, address: string): Promise<{ ok: boolean; data?: ForgotPasswordChallengeResponse }> => {
        setIsSubmitting(true);
        setApiError(null);
        try {
            const response = await fetch('/api/auth/forgot-password/verify-challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, secondaryCredential, address }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return { ok: true, data };
        } catch (error) {
            setApiError(error instanceof Error ? error.message : "An unexpected error occurred");
            return { ok: false };
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetPassword = async (userId: string, newPassword: string): Promise<{ ok: boolean; data?: ForgotPasswordResetResponse }> => {
        setIsSubmitting(true);
        setApiError(null);
        try {
            const response = await fetch('/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Reset failed');
            return { ok: true, data };
        } catch (error) {
            setApiError(error instanceof Error ? error.message : "An unexpected error occurred");
            return { ok: false };
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        apiError,
        clearApiError,
        verifyInitial,
        verifyChallenge,
        resetPassword,
    };
}
