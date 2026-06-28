import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (typeof window !== "undefined" && window.location.hostname === "social.redcircle.lol") {
			throw redirect({ to: "/social" });
		}
		if (typeof window !== "undefined" && window.location.hostname === "campaigns.redcircle.lol") {
			throw redirect({ to: "/campaigns" });
		}
		const params = typeof window !== "undefined"
			? new URLSearchParams(window.location.search)
			: null;
		const url = params?.get("url") ?? undefined;
		const x = params?.get("x") ?? undefined;
		throw redirect({
			to: "/home",
			search: url || x ? { url, x } : {},
		});
	},
});
