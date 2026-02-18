import { StaggeredMenu } from "../StaggeredMenu";
import { useAuth } from "../../contexts/AuthContext";
import UserProfile from "../UserProfile";
import WalletButton from "../WalletButton";
import { Link } from "@tanstack/react-router";

const items = [
	{
		label: "Home",
		link: "/",
		ariaLabel: "Go to home page",
	},
	{
		label: "Dashboard",
		link: "/dashboard",
		ariaLabel: "Open dashboard",
	},
	{
		label: "Sign In",
		link: "/signin",
		ariaLabel: "Sign in to your account",
	},
];

const socialItems = [
	{ label: "Twitter", link: "https://twitter.com/adityaslyf" },
	{ label: "GitHub", link: "https://github.com/adityaslyf" },
	{ label: "LinkedIn", link: "https://www.linkedin.com/in/aditya-varshney-089b33244/" },
];

export default function Navbar() {
	const { isAuthenticated } = useAuth();

	// Dynamically build menu items based on auth status
	const menuItems = isAuthenticated
		? [
				{
					label: "Home",
					link: "/",
					ariaLabel: "Go to home page",
				},
				{
					label: "Feed",
					link: "/feed",
					ariaLabel: "View feed",
				},
				{
					label: "Dashboard",
					link: "/dashboard",
					ariaLabel: "Open dashboard",
				},
				{
					label: "Leaderboard",
					link: "/dashboard?tab=leaderboard",
					ariaLabel: "View leaderboard",
				},
				{
					label: "Portfolio",
					link: "/portfolio",
					ariaLabel: "View your portfolio",
				},
				{
					label: "Transactions",
					link: "/transactions",
					ariaLabel: "View transaction history",
				},
				{
					label: "Launch",
					link: "/launch",
					ariaLabel: "Launch a post",
				},
				{
					label: "Profile",
					link: "/dashboard?tab=profile",
					ariaLabel: "View your profile",
				},
		  ]
		: items;

	return (
		<>
			<StaggeredMenu
				position="right"
				colors={["#0a0a0a", "#1a1a1a"]}
				items={menuItems}
				socialItems={socialItems}
				displaySocials={true}
				displayItemNumbering={true}
				logoComponent={
					<Link
						to="/"
						style={{
							textDecoration: "none",
							color: "inherit",
						}}
					>
						<span
							style={{
								fontWeight: 800,
								fontSize: "1.25rem",
								letterSpacing: "-0.02em",
								color: "#ffffff",
								cursor: "pointer",
							}}
						>
							Redcircle
						</span>
					</Link>
				}
				menuPanelHeader={
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full z-10000">
					{isAuthenticated && <UserProfile />}
						<WalletButton />
					</div>
				}
				menuButtonColor="#ffffff"
				openMenuButtonColor="#ffffff"
				accentColor="#3b82f6"
				changeMenuColorOnOpen={false}
				isFixed={true}
			/>
		</>
	);
}