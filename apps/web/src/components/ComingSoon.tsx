import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiUrl } from "@/lib/auth";

// Animated gradient orbs floating in background
function GradientOrbs() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<motion.div
				animate={{
					x: [0, 100, -50, 0],
					y: [0, -80, 60, 0],
					scale: [1, 1.2, 0.9, 1],
				}}
				transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full opacity-30"
				style={{ background: "radial-gradient(circle, rgba(255,69,0,0.3) 0%, transparent 70%)", filter: "blur(80px)" }}
			/>
			<motion.div
				animate={{
					x: [0, -80, 40, 0],
					y: [0, 60, -90, 0],
					scale: [1, 0.85, 1.15, 1],
				}}
				transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-20"
				style={{ background: "radial-gradient(circle, rgba(20,241,149,0.25) 0%, transparent 70%)", filter: "blur(100px)" }}
			/>
			<motion.div
				animate={{
					x: [0, 60, -30, 0],
					y: [0, -50, 80, 0],
					scale: [1, 1.1, 0.95, 1],
				}}
				transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
				className="absolute bottom-[10%] left-[30%] w-[450px] h-[450px] rounded-full opacity-20"
				style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)", filter: "blur(90px)" }}
			/>
			<motion.div
				animate={{
					x: [0, -40, 70, 0],
					y: [0, 40, -60, 0],
				}}
				transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-[10%] right-[30%] w-[350px] h-[350px] rounded-full opacity-15"
				style={{ background: "radial-gradient(circle, rgba(255,200,0,0.2) 0%, transparent 70%)", filter: "blur(70px)" }}
			/>
		</div>
	);
}

// Animated mesh grid
function AnimatedMesh() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)] opacity-30" />
		</div>
	);
}

// Shooting stars
function ShootingStars() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{Array.from({ length: 12 }).map((_, i) => (
				<motion.div
					key={i}
					className="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent w-24 md:w-36"
					initial={{
						x: Math.random() * 100 + "%",
						y: Math.random() * 100 + "%",
						rotate: -45,
						opacity: 0,
					}}
					animate={{
						x: [null, `calc(${Math.random() * 100}% - 800px)`],
						y: [null, `calc(${Math.random() * 100}% + 800px)`],
						opacity: [0, 0.6, 0],
					}}
					transition={{
						duration: Math.random() * 4 + 3,
						repeat: Infinity,
						ease: "linear",
						delay: Math.random() * 6,
					}}
				/>
			))}
		</div>
	);
}

// Floating glowing dots
function GlowDots() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{Array.from({ length: 40 }).map((_, i) => (
				<motion.div
					key={i}
					className="absolute rounded-full"
					style={{
						width: 2 + Math.random() * 4,
						height: 2 + Math.random() * 4,
						left: `${Math.random() * 100}%`,
						top: `${Math.random() * 100}%`,
						background: i % 4 === 0
							? "rgba(255,69,0,0.6)"
							: i % 4 === 1
								? "rgba(20,241,149,0.5)"
								: i % 4 === 2
									? "rgba(168,85,247,0.4)"
									: "rgba(255,255,255,0.3)",
						boxShadow: i % 4 === 0
							? "0 0 6px rgba(255,69,0,0.4)"
							: i % 4 === 1
								? "0 0 6px rgba(20,241,149,0.3)"
								: "none",
					}}
					animate={{
						y: [-20, 20, -20],
						x: [-10, 10, -10],
						opacity: [0.2, 0.9, 0.2],
						scale: [0.8, 1.3, 0.8],
					}}
					transition={{
						duration: 3 + Math.random() * 5,
						repeat: Infinity,
						delay: Math.random() * 4,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}

// Confetti rain for success
const CONFETTI_COLORS = [
	"#FF4500", "#14F195", "#FFD700", "#FF6B6B",
	"#4ECDC4", "#ff9a00", "#00f2fe", "#a855f7", "#f43f5e",
];

function ConfettiRain() {
	const [visible, setVisible] = useState(true);
	const [pieces] = useState(() =>
		Array.from({ length: 60 }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			delay: Math.random() * 2.5,
			duration: 2.5 + Math.random() * 2.5,
			size: 6 + Math.random() * 8,
			color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
			drift: -40 + Math.random() * 80,
			isCircle: Math.random() > 0.5,
		}))
	);

	useEffect(() => {
		const timer = setTimeout(() => setVisible(false), 7000);
		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;

	return (
		<>
			<style>{`
				@keyframes confetti-fall-cs {
					0% { transform: translateY(-20px) translateX(0px) rotateZ(0deg) rotateX(0deg); opacity: 1; }
					15% { opacity: 1; }
					100% { transform: translateY(110vh) translateX(var(--confetti-drift)) rotateZ(720deg) rotateX(360deg); opacity: 0; }
				}
			`}</style>
			<div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99999, overflow: "hidden" }} aria-hidden="true">
				{pieces.map((p) => (
					<div
						key={p.id}
						style={{
							position: "absolute",
							top: -20,
							left: `${p.left}%`,
							width: p.size,
							height: p.isCircle ? p.size : p.size * 1.5,
							backgroundColor: p.color,
							borderRadius: p.isCircle ? "50%" : "2px",
							["--confetti-drift" as string]: `${p.drift}px`,
							animation: `confetti-fall-cs ${p.duration}s ease-in ${p.delay}s forwards`,
						}}
					/>
				))}
			</div>
		</>
	);
}

export function ComingSoon() {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [showConfetti, setShowConfetti] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		if (!email.trim()) { setErrorMessage("Please enter your email"); return; }

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) { setErrorMessage("Please enter a valid email"); return; }

		setIsSubmitting(true);
		try {
			const apiUrl = getApiUrl();
			const res = await fetch(`${apiUrl}/api/waitlist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim() }),
			});
			const data = await res.json();
			if (res.status === 201) {
				setIsSuccess(true);
				setShowConfetti(true);
			} else if (res.status === 409) {
				setErrorMessage("You're already on the waitlist! 🎉");
			} else {
				setErrorMessage(data.message || "Something went wrong.");
			}
		} catch {
			setErrorMessage("Network error. Try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const titleWords = ["Coming", "Soon"];

	return (
		<div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black">
			{/* Layered animated background */}
			<GradientOrbs />
			<AnimatedMesh />
			<ShootingStars />
			<GlowDots />

			{/* Confetti */}
			{showConfetti && <ConfettiRain />}

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">

				{/* Title with letter-by-letter reveal */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
					className="mb-6"
				>
					<h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 leading-tight">
						{titleWords.map((word, wordIndex) => (
							<span key={wordIndex} className="inline-block mr-4 last:mr-0">
								{word.split("").map((letter, letterIndex) => (
									<motion.span
										key={`${wordIndex}-${letterIndex}`}
										initial={{ y: 80, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{
											delay: 0.4 + wordIndex * 0.15 + letterIndex * 0.04,
											type: "spring",
											stiffness: 150,
											damping: 25,
										}}
										className="inline-block"
									>
										{letter}
									</motion.span>
								))}
							</span>
						))}
					</h1>
				</motion.div>

				{/* Subtitle */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.9, duration: 0.8 }}
					className="text-lg md:text-xl text-neutral-400 mb-12 max-w-lg font-light leading-relaxed"
				>
					We're building the future of tokenized social content on Solana.
					Join the waitlist to get early access.
				</motion.p>

				{/* Waitlist form — matching landing page style */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 1.1, duration: 0.8 }}
					className="w-full max-w-lg mx-auto"
				>
					<AnimatePresence mode="wait">
						{isSuccess ? (
							<motion.div
								key="success"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
								className="flex flex-col items-center gap-3"
							>
								<div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
									<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 className="text-2xl font-bold text-white">
									You're on the list! 🎉
								</h3>
								<p className="text-neutral-400 text-sm">
									We'll notify you when we launch. Stay tuned!
								</p>
							</motion.div>
						) : (
							<motion.form
								key="form"
								initial={{ opacity: 1 }}
								exit={{ opacity: 0, y: -20 }}
								onSubmit={handleSubmit}
								className="flex flex-col items-center gap-4"
							>
								<p className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-1">
									Join the Waitlist
								</p>

								<div className="flex w-full gap-1 sm:gap-2 items-center bg-white/10 backdrop-blur-xl rounded-full border border-white/15 shadow-xl shadow-black/20 p-1 sm:p-1.5 transition-all duration-300 focus-within:border-orange-500 focus-within:shadow-orange-500/10">
									<input
										id="coming-soon-email"
										type="email"
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											setErrorMessage("");
										}}
										placeholder="Enter your email"
										className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder:text-neutral-500"
										disabled={isSubmitting}
										autoComplete="email"
									/>
									<button
										type="submit"
										disabled={isSubmitting}
										className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-sm font-semibold
											bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600
											text-white transition-all duration-300
											hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30
											disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
											cursor-pointer whitespace-nowrap"
									>
										{isSubmitting ? (
											<span className="flex items-center gap-2">
												<svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
												</svg>
												Joining...
											</span>
										) : (
											"Join Now"
										)}
									</button>
								</div>

								<AnimatePresence>
									{errorMessage && (
										<motion.p
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="text-sm text-red-400"
										>
											{errorMessage}
										</motion.p>
									)}
								</AnimatePresence>
							</motion.form>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</div>
	);
}
