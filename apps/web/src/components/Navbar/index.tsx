import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import UserProfile from "../UserProfile";
import WalletButton from "../WalletButton";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Public tabs always visible
const publicTabs = [
	{ label: "Feed", to: "/feed" },
];

// Authenticated-only tabs
const privateTabs: { label: string; to: string }[] = [];

export default function Navbar() {
	const { isAuthenticated } = useAuth();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const [isOpen, setIsOpen] = useState(false);

	// Toggle mobile menu
	const toggleMenu = () => setIsOpen(!isOpen);

	// Close menu on navigation
	useEffect(() => {
		setIsOpen(false);
	}, [currentPath]);

	// Lock body scroll when menu is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	const isActive = (to: string) => {
		return currentPath === to;
	};

	return (
		<>
			<header className="fixed top-0 left-0 right-0 z-[60]">
				{/* Glassmorphism background */}
				<div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/10" />

				<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						{/* Left section: Logo + Nav */}
						<div className="flex items-center gap-6 sm:gap-8">
							<Link
								to="/home"
								className="relative pb-1 flex shrink-0 items-center gap-2 z-50 transition-all duration-300 font-extrabold text-lg sm:text-xl tracking-tight text-white"
							>
								<span>Redcircle</span>
								{currentPath === "/home" && (
									<motion.span 
										layoutId="active-nav-indicator"
										className="absolute bottom-0 left-0 right-0 h-[4px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,1)]"
										transition={{ type: "spring", stiffness: 380, damping: 30 }}
									/>
								)}
							</Link>

							{/* Nav Links */}
							<nav className="flex items-center gap-4 sm:gap-1">
								{publicTabs.map((tab) => (
									<Link
										key={tab.to}
										to={tab.to}
										className="relative pb-1 transition-all duration-300 font-extrabold text-lg sm:text-xl tracking-tight text-white"
									>
										{tab.label}
										{isActive(tab.to) && (
											<motion.span 
												layoutId="active-nav-indicator"
												className="absolute bottom-0 left-0 right-0 h-[4px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,1)]"
												transition={{ type: "spring", stiffness: 380, damping: 30 }}
											/>
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
						<div className="flex shrink-0 items-center gap-2 sm:gap-3 z-50">
							{isAuthenticated && (
								<div className="hidden sm:flex items-center gap-2">
									<UserProfile />
								</div>
							)}
							
							<div className="flex items-center gap-2">
								<WalletButton />
								
								{/* Mobile Toggle Button */}
								<button
									onClick={toggleMenu}
									className="p-1.5 md:hidden text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
								>
									{isOpen ? <X size={22} /> : <Menu size={22} />}
								</button>
							</div>


						</div>
					</div>
				</div>
			</header>

			{/* Mobile Menu Overlay */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 z-[55] md:hidden"
					>
						{/* Backdrop */}
						<div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
						
						{/* Menu Content */}
						<motion.div
							initial={{ y: 10, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 10, opacity: 0 }}
							className="relative h-full flex flex-col pt-20 px-4 pb-8"
						>
							<nav className="space-y-1">
								{publicTabs.map((tab) => (
									<Link
										key={tab.to}
										to={tab.to}
										className={
											"flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all " +
											(isActive(tab.to)
												? "text-white bg-white/10"
												: "text-white/60 active:bg-white/5")
										}
									>
										{tab.label}
									</Link>
								))}
								
								{isAuthenticated && (
									<>
										<div className="h-px bg-white/5 my-2 mx-4" />
										{privateTabs.map((tab) => (
											<Link
												key={tab.label}
												to={tab.to}
												className={
													"flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all " +
													(isActive(tab.to)
														? "text-white bg-white/10"
														: "text-white/60 active:bg-white/5")
												}
											>
												{tab.label}
											</Link>
										))}
										
										<div className="h-px bg-white/5 my-2 mx-4" />
										<div className="px-4 py-3">
											<div className="flex items-center gap-3">
												<UserProfile />
												<span className="text-white/60 font-medium">Profile</span>
											</div>
										</div>
									</>
								)}


							</nav>

							<div className="mt-auto text-center">
								<p className="text-white/20 text-xs">Redcircle</p>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}