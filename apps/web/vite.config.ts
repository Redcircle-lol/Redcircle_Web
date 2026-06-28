import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	// Campaigns backend target for the dev proxy (defaults to the live host).
	const campaignsTarget = env.VITE_CAMPAIGNS_API_URL || "http://63.180.247.78:8080";

	return {
		plugins: [tailwindcss(), tanstackRouter({}), react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		server: {
			host: true,
			fs: {
				allow: [path.resolve(__dirname, "../.."), path.resolve(__dirname, ".")],
				strict: false,
			},
			// Dev-only proxy: the browser talks SAME-ORIGIN to localhost:5173/cap-api,
			// and Vite forwards server-to-server to the campaigns backend — sidestepping
			// the backend's missing CORS headers. `cookieDomainRewrite` drops the cookie
			// domain so the session cookie sticks to localhost. (Production must rely on
			// real CORS + HTTPS on the backend instead.)
			proxy: {
				"/cap-api": {
					target: campaignsTarget,
					changeOrigin: true,
					secure: false,
					rewrite: (p) => p.replace(/^\/cap-api/, ""),
					cookieDomainRewrite: { "*": "" },
				},
			},
		},
	};
});
