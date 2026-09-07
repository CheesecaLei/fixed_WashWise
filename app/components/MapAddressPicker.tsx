"use client";

import { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Stack, TextField, Typography, Chip, Autocomplete } from "@mui/material";
import { MapPin, Crosshair } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import { olongapoBarangays } from "../data/auth";

const OLONGAPO_CENTER: [number, number] = [14.8383, 120.2839];
const OLONGAPO_BOUNDS = {
	minLat: 14.77,
	maxLat: 14.90,
	minLng: 120.23,
	maxLng: 120.35,
};

interface MapAddressPickerProps {
	street: string;
	barangay: string;
	onAddressChange: (street: string, barangay: string) => void;
	streetError?: string;
	barangayError?: string;
}

interface NominatimResult {
	address: {
		road?: string;
		quarter?: string;
		suburb?: string;
		village?: string;
		city_district?: string;
		city?: string;
		neighbourhood?: string;
	};
	display_name: string;
}

function isInsideOlongapo(lat: number, lng: number) {
	return (
		lat >= OLONGAPO_BOUNDS.minLat &&
		lat <= OLONGAPO_BOUNDS.maxLat &&
		lng >= OLONGAPO_BOUNDS.minLng &&
		lng <= OLONGAPO_BOUNDS.maxLng
	);
}

function resolveOlongapoBarangay(detectedStreet: string, rawBarangay: string, displayName: string): string {
	const combinedText = `${detectedStreet} ${rawBarangay} ${displayName}`.toLowerCase();

	// Specific fix for Tabacuhan / Sta. Rita / Santa Rita streets and areas
	if (
		combinedText.includes("tabacuhan") ||
		combinedText.includes("sta. rita") ||
		combinedText.includes("sta rita") ||
		combinedText.includes("santa rita")
	) {
		return "Santa Rita";
	}

	// Attempt to match rawBarangay with known Olongapo barangays
	if (rawBarangay) {
		const lowerRaw = rawBarangay.toLowerCase();
		const matched = olongapoBarangays.find(
			(b) => b.toLowerCase() === lowerRaw || lowerRaw.includes(b.toLowerCase())
		);
		if (matched) return matched;
	}

	// Check if any barangay name appears in combinedText
	for (const b of olongapoBarangays) {
		if (combinedText.includes(b.toLowerCase())) {
			return b;
		}
	}

	return rawBarangay;
}

export default function MapAddressPicker({
	street,
	barangay,
	onAddressChange,
	streetError,
	barangayError,
}: MapAddressPickerProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<LeafletMap | null>(null);
	const markerRef = useRef<LeafletMarker | null>(null);
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [pinPlaced, setPinPlaced] = useState(false);
	const [outsideBounds, setOutsideBounds] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !mapContainerRef.current) return;

		let destroyed = false;

		// Dynamically import leaflet only on client
		import("leaflet").then((L) => {
			// Guard: component may have unmounted while the async import was in-flight
			if (destroyed || !mapContainerRef.current) return;

			// Guard: if the DOM container already has a Leaflet instance (React Strict
			// Mode double-mount), remove it first to avoid "already initialized" error.
			const container = mapContainerRef.current as (HTMLDivElement & { _leaflet_id?: number | null }) | null;
			if (container?._leaflet_id) {
				container._leaflet_id = null;
			}

			// Also destroy any pre-existing map instance on the ref
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
				markerRef.current = null;
			}

			// Fix default icon paths broken by webpack
			delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
				iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
				shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
			});

			const map = L.map(mapContainerRef.current!, {
				center: OLONGAPO_CENTER,
				zoom: 14,
				zoomControl: true,
			});

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19,
			}).addTo(map);

			// Add a faint boundary overlay label — removed once user pins their location
			const hintTooltip = L.tooltip({
				permanent: true,
				direction: "center",
				className: "map-hint-tooltip",
			})
				.setLatLng(OLONGAPO_CENTER)
				.setContent("📍 Tap your location in Olongapo City")
				.addTo(map);

			map.on("click", async (e: LeafletMouseEvent) => {
				const { lat, lng } = e.latlng;

				if (!isInsideOlongapo(lat, lng)) {
					setOutsideBounds(true);
					setTimeout(() => setOutsideBounds(false), 3000);
					return;
				}

				setOutsideBounds(false);

				// Remove the hint tooltip on first valid pin
				hintTooltip.remove();

				// Place / move marker
				if (markerRef.current) {
					markerRef.current.setLatLng([lat, lng]);
				} else {
					markerRef.current = L.marker([lat, lng]).addTo(map);
				}

				setPinPlaced(true);
				setIsGeocoding(true);

				try {
					const res = await fetch(
						`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
						{ headers: { "Accept-Language": "en" } }
					);
					const data: NominatimResult = await res.json();

					const addr = data.address ?? {};
					const detectedStreet = addr.road ?? "";
					const rawBarangay =
						addr.suburb ??
						addr.quarter ??
						addr.village ??
						addr.city_district ??
						addr.neighbourhood ??
						"";

					const resolvedBarangay = resolveOlongapoBarangay(detectedStreet, rawBarangay, data.display_name ?? "");

					onAddressChange(detectedStreet, resolvedBarangay);
				} catch {
					// Reverse geocode failed — leave fields blank for manual entry
				} finally {
					setIsGeocoding(false);
				}
			});

			mapRef.current = map;
		});

		return () => {
			destroyed = true;
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
				markerRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);


	return (
		<Stack spacing={1.5}>
			{/* Instruction chip */}
			<Stack direction="row" alignItems="center" spacing={0.8}>
				<Crosshair size={16} style={{ color: "#11998e" }} />
				<Typography variant="caption" color="text.secondary" fontWeight={500}>
					Tap on the map to auto-fill, or type your street and barangay manually
				</Typography>
			</Stack>

			{/* Map container */}
			<Box
				sx={{
					position: "relative",
					width: "100%",
					height: 280,
					borderRadius: 2,
					overflow: "hidden",
					border: (theme) =>
						`1.5px solid ${streetError || barangayError ? theme.palette.error.main : theme.palette.divider}`,
					boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
				}}
			>
				<div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

				{/* Geocoding spinner overlay */}
				{isGeocoding && (
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: "rgba(255,255,255,0.65)",
							zIndex: 1000,
							borderRadius: 2,
						}}
					>
						<Stack alignItems="center" spacing={1}>
							<CircularProgress size={28} />
							<Typography variant="caption" color="text.secondary">
								Detecting address…
							</Typography>
						</Stack>
					</Box>
				)}

				{/* Out of bounds warning */}
				{outsideBounds && (
					<Box
						sx={{
							position: "absolute",
							bottom: 12,
							left: "50%",
							transform: "translateX(-50%)",
							zIndex: 1001,
						}}
					>
						<Chip
							label="Please tap inside Olongapo City"
							color="error"
							size="small"
							icon={<MapPin size={16} />}
						/>
					</Box>
				)}
			</Box>

			{/* Pin placed indicator */}
			{pinPlaced && !isGeocoding && (
				<Typography variant="caption" color="success.main" fontWeight={500}>
					✓ Pin placed. Review and correct the fields below if needed.
				</Typography>
			)}

			{/* Editable street field (auto-filled from reverse geocode or manual typing) */}
			<TextField
				fullWidth
				required
				label="Street"
				size="small"
				value={street}
				onChange={(e) => onAddressChange(e.target.value, barangay)}
				error={Boolean(streetError)}
				helperText={streetError ?? "Tap map to auto-fill, or type your street manually"}
			/>

			{/* Editable barangay field (auto-filled from reverse geocode, dropdown or manual typing) */}
			<Autocomplete
				freeSolo
				options={olongapoBarangays}
				value={barangay}
				onInputChange={(_event, newValue) => {
					onAddressChange(street, newValue);
				}}
				renderInput={(params) => (
					<TextField
						{...params}
						fullWidth
						required
						label="Barangay"
						size="small"
						error={Boolean(barangayError)}
						helperText={barangayError ?? "Tap map to auto-fill, or select/type your barangay"}
					/>
				)}
			/>
		</Stack>
	);
}

