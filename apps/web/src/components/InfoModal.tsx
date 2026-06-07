import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full sm:max-w-md bg-[#09090b] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 sm:px-8 pt-5 sm:pt-8 pb-5 sm:pb-6 space-y-3 sm:space-y-5">
              <div className="text-center">
                <img src="/logo.png" alt="RedCircle" className="w-10 h-10 rounded-xl mx-auto" />
              </div>

              <div className="text-center">
                <h3 className="text-sm sm:text-lg font-bold text-[#FF4500] mb-1">What is RedCircle?</h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  RedCircle turns viral Reddit posts into tradeable Solana tokens.
                  Creators earn USDC, curators get rewarded, and anyone can trade on Jupiter DEX.
                </p>
              </div>

              <div>
                <h3 className="text-sm sm:text-lg font-bold text-[#FF4500] text-center mb-1.5">How it works</h3>
                <ul className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-white/70">
                  <li className="flex items-start gap-2"><span className="text-[#FF4500] shrink-0">→</span>Browse hot Reddit posts and launch a token in one click</li>
                  <li className="flex items-start gap-2"><span className="text-[#FF4500] shrink-0">→</span>Server pays the gas — no SOL needed to launch</li>
                  <li className="flex items-start gap-2"><span className="text-[#FF4500] shrink-0">→</span>Token goes live on Solana via a Meteora liquidity pool</li>
                  <li className="flex items-start gap-2"><span className="text-[#FF4500] shrink-0">→</span>Trade instantly on Jupiter DEX with real price discovery</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm sm:text-lg font-bold text-[#FF4500] text-center mb-1.5">Fees & Rewards</h3>
                <p className="text-xs sm:text-sm font-bold text-white text-center mb-1.5">2% fee on every buy and sell</p>
                <ul className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-white/70">
                  <li className="flex items-center justify-between"><span>0.40% → Creator</span><span className="text-white/30 text-[10px] sm:text-xs">claimable USDC</span></li>
                  <li className="flex items-center justify-between"><span>0.15% → Curator</span><span className="text-white/30 text-[10px] sm:text-xs">claimable USDC</span></li>
                  <li className="flex items-center justify-between"><span>0.50% → RedCircle</span><span /></li>
                  <li className="flex items-center justify-between"><span>0.95% → Protocol</span><span className="text-white/30 text-[10px] sm:text-xs">Meteora + Orynth</span></li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-[#FF4500] hover:bg-[#FF4500]/85 text-white font-bold py-3 text-sm transition-all cursor-pointer"
              >
                let's go
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
