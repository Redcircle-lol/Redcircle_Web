import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Compact USD display shared by feed cards, token page, etc.
export function formatUsd(value: number | null | undefined): string {
	if (value == null) return "—";
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
	return `$${value.toFixed(2)}`;
}

// Compact relative age: "5m", "3h", "2d"
export function timeAgo(date: string | number | Date): string {
	const diffMs = Date.now() - new Date(date).getTime();
	const diffMin = Math.max(1, Math.floor(diffMs / 60_000));
	if (diffMin < 60) return `${diffMin}m`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h`;
	return `${Math.floor(diffHr / 24)}d`;
}

export function tokenSlug(symbol?: string | null, mintAddress?: string | null): string {
	if (symbol && mintAddress) {
		return `${symbol.toLowerCase()}-${mintAddress.slice(0, 6).toLowerCase()}`;
	}
	return ""; // always fall back to UUID when either is missing
}
