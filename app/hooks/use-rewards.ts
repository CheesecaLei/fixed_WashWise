"use client";

import { useCallback, useEffect, useState } from "react";
import { FetchRewardsResponse, RedeemRewardResponse, UserRewardsSummary } from "../types/rewards";

export function useRewards() {
	const [summary, setSummary] = useState<UserRewardsSummary | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isRedeeming, setIsRedeeming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	const fetchRewards = useCallback(async (pageNum: number = 1) => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/member/rewards?page=${pageNum}&limit=10`);
			const data = (await response.json()) as FetchRewardsResponse;

			if (data.success) {
				setSummary(data.summary);
			} else {
				setError(data.error);
			}
		} catch {
			setError("Failed to fetch rewards summary.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const redeemReward = useCallback(async (rewardId: string): Promise<RedeemRewardResponse> => {
		setIsRedeeming(true);
		setError(null);
		try {
			const response = await fetch("/api/member/rewards", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "redeem", rewardId }),
			});
			const data = (await response.json()) as RedeemRewardResponse;

			if (!data.success) {
				setError(data.error);
			}
			return data;
		} catch {
			const errorMessage = "Failed to redeem reward.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsRedeeming(false);
		}
	}, []);

	useEffect(() => {
		fetchRewards(page);
	}, [fetchRewards, page]);

	return {
		summary,
		isLoading,
		isRedeeming,
		error,
		page,
		setPage,
		refresh: () => fetchRewards(page),
		redeemReward,
	};
}
