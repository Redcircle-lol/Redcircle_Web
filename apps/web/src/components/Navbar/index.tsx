import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import UserProfile from "@/components/UserProfile";

const navLinks = [
  { label: "Feed", to: "/feed" },
  { label: "Launch", to: "/launch" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Transactions", to: "/transactions" },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-[60]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/10" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/home"
            className="flex shrink-0 items-center gap-2 z-50 font-extrabold text-lg sm:text-xl tracking-tight text-white"
          >
            <img src="/logo.png" alt="Redcircle" className="h-8 w-auto" />
            <span>Redcircle</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-white/70 hover:text-white transition-colors"
                activeProps={{ className: "text-sm text-white font-semibold" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <UserProfile />
            ) : (
              <Link
                to="/signin"
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all"
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
