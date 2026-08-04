"use client";

import { useState, useEffect, useCallback } from "react";
import { Service } from "../types/new-order";

export type ServiceResponse<T = Record<string, unknown>> =
	| ({ success: true; error?: never } & T)
	| { success: false; error: string };

interface PaginationData {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ─── IndexedDB helpers for services cache ─────────────────────────────────────

const SERVICES_DB = "washwise-offline";
const SERVICES_STORE = "cached-services";
const SERVICES_KEY = "services-list";

async function openServicesDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") { reject(new Error("No IDB")); return; }
		const req = indexedDB.open(SERVICES_DB, 2); // bump version to add new store
		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains("pending-orders")) {
				db.createObjectStore("pending-orders", { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(SERVICES_STORE)) {
				db.createObjectStore(SERVICES_STORE);
			}
		};
		req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
		req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
	});
}

async function saveServicesToCache(services: Service[]): Promise<void> {
	try {
		const db = await openServicesDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(SERVICES_STORE, "readwrite");
			const req = tx.objectStore(SERVICES_STORE).put(services, SERVICES_KEY);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
			tx.oncomplete = () => db.close();
		});
	} catch { /* silently ignore */ }
}

async function loadServicesFromCache(): Promise<Service[] | null> {
	try {
		const db = await openServicesDb();
		return new Promise<Service[] | null>((resolve, reject) => {
			const tx = db.transaction(SERVICES_STORE, "readonly");
			const req = tx.objectStore(SERVICES_STORE).get(SERVICES_KEY) as IDBRequest<Service[] | undefined>;
			req.onsuccess = () => resolve(req.result ?? null);
			req.onerror = () => reject(req.error);
			tx.oncomplete = () => db.close();
		});
	} catch {
		return null;
	}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useServices(paginate: boolean = false) {
	const [services, setServices] = useState<Service[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState<PaginationData | null>(null);

	const fetchServices = useCallback(async (pageNum: number = 1) => {
		setIsLoading(true);
		try {
			const url = paginate 
				? `/api/services?page=${pageNum}&limit=10` 
				: "/api/services";
			const response = await fetch(url);
			const data = await response.json();
			if (data.success) {
				setServices(data.services);
				if (paginate) setPagination(data.pagination);
				
				// Persist to IDB so we have it offline (only if not paginated or first page)
				if (!paginate || pageNum === 1) {
					saveServicesToCache(data.services);
				}
			} else {
				setError(data.error || "Failed to fetch services");
				// Try IDB fallback even on API error
				const cached = await loadServicesFromCache();
				if (cached) setServices(cached);
			}
		} catch {
			// Network failure — try the IndexedDB cache
			const cached = await loadServicesFromCache();
			if (cached && cached.length > 0) {
				setServices(cached);
			} else {
				setError("You're offline and no cached services are available.");
			}
		} finally {
			setIsLoading(false);
		}
	}, [paginate]);

	useEffect(() => {
		fetchServices(page);
	}, [fetchServices, page]);

	const addService = async (serviceData: Partial<Service>): Promise<ServiceResponse<{ service: Service }>> => {
		try {
			const response = await fetch("/api/admin/services", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(serviceData),
			});
			const data = await response.json();
			if (data.success) {
				setServices((prev) => [...prev, data.service]);
				return { success: true, service: data.service };
			} else {
				return { success: false, error: data.error };
			}
		} catch (err) {
			console.error(err);
			return { success: false, error: "An error occurred while adding the service" };
		}
	};

	const updateService = async (id: string, serviceData: Partial<Service>): Promise<ServiceResponse<{ service: Service }>> => {
		try {
			const response = await fetch(`/api/admin/services/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(serviceData),
			});
			const data = await response.json();
			if (data.success) {
				setServices((prev) =>
					prev.map((s) => (s._id === id ? data.service : s))
				);
				return { success: true, service: data.service };
			} else {
				return { success: false, error: data.error };
			}
		} catch (err) {
			console.error(err);
			return { success: false, error: "An error occurred while updating the service" };
		}
	};

	const deleteService = async (id: string): Promise<ServiceResponse> => {
		try {
			const response = await fetch(`/api/admin/services/${id}`, {
				method: "DELETE",
			});
			const data = await response.json();
			if (data.success) {
				setServices((prev) => prev.filter((s) => s._id !== id));
				return { success: true };
			} else {
				return { success: false, error: data.error };
			}
		} catch (err) {
			console.error(err);
			return { success: false, error: "An error occurred while deleting the service" };
		}
	};


	return {
		services,
		isLoading,
		error,
		page,
		setPage,
		pagination,
		refresh: () => fetchServices(page),
		addService,
		updateService,
		deleteService,
	};
}
