import { useAuth } from "../../contexts/AuthContext";
import UserProfile from "../UserProfile";
import WalletButton from "../WalletButton";
import { Link, useRouterState } from "@tanstack/react-router";

// Public tabs always visible in the top bar
const publicTabs = [
	{ label: "Feed", to: "/" },
	{ label: "Launch", to: "/launch" },
	{ label: "Leaderboard", to: "/leaderboard" },
];

// Authenticated-only tabs/items
const privateTabs = [
	{ label: "Portfolio", to: "/portfolio" },
	{ label: "Transactions", to: "/transactions" },
	{ label: "Profile", to: "/profile" },
];

export default function Navbar() {
	const { isAuthenticated } = useAuth();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	// Check if a tab is active
	const isActive = (to: string) => {
		if (to === "/") return currentPath === "/" || currentPath === "/feed";
		return currentPath === to;
	};

	return (
		<header className="fixed top-0 left-0 right-0 z-50">
			{/* Glassmorphism background */}
			<div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/10" />

			<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Left: Logo */}
					<Link
						to="/home"
						className="flex shrink-0 items-center gap-2 mr-3"
					>
						<span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
							Redcircle
						</span>
					</Link>

					{/* Middle: All tabs in one row */}
					<div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
						<nav className="flex min-w-max items-center gap-1 whitespace-nowrap">
							{publicTabs.map((tab) => (
								<Link
									key={tab.to}
									to={tab.to}
									className={
										"relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 " +
										(isActive(tab.to)
											? "text-white bg-white/10"
											: "text-white/60 hover:text-white hover:bg-white/5")
									}
								>
									{tab.label}
									{isActive(tab.to) && (
										<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-purple-500 rounded-full" />
									)}
								</Link>
							))}
							{isAuthenticated &&
								privateTabs.map((tab) => (
									<Link
										key={tab.label}
										to={tab.to}
										className={
											"relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 " +
											(isActive(tab.to)
												? "text-white bg-white/10"
												: "text-white/60 hover:text-white hover:bg-white/5")
										}
									>
										{tab.label}
										{isActive(tab.to) && (
											<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-purple-500 rounded-full" />
										)}
									</Link>
								))}
						</nav>
					</div>

					{/* Right section */}
					<div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
						{/* Invest in us link (desktop) */}
						<a
							href="https://twitter.com/adityaslyf"
							target="_blank"
							rel="noopener noreferrer"
							className="hidden md:inline-flex text-sm text-white/60 hover:text-white transition-colors"
						>
							Invest in us
						</a>

						{isAuthenticated && (
							<div className="hidden sm:flex items-center gap-2">
								<UserProfile />
							</div>
						)}
						<WalletButton />

						{!isAuthenticated && (
							<Link
								to="/signin"
								className="text-sm px-3 py-1.5 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/5 transition-all"
							>
								Sign In
							</Link>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}