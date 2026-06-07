import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (window.location.hostname === "social.redcircle.lol") {
			throw redirect({ to: "/social" });
		}
		throw redirect({ to: "/home" });
	},
});
