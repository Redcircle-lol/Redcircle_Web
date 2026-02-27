import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Coins, Users, Sparkles, AlertCircle, ArrowRight, Rocket } from "lucide-react";
import { getApiUrl } from "@/lib/auth";

interface RedditPostPreview {
  redditPostId: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  thumbnail?: string;
  url: string;
  content?: string;
  createdAt: string;
  age: string;
}

export default function LaunchPanel() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [postPreview, setPostPreview] = useState<RedditPostPreview | null>(null);
  const [error, setError] = useState("");
  
  // Token configuration
  const [initialSupply, setInitialSupply] = useState("10000");
  const [initialPrice, setInitialPrice] = useState("0.001");
  const [description, setDescription] = useState("");
  
  const [isSubmitting, setSubmitting] = useState(false);

  const handleFetchPost = async () => {
    if (!url) return;
    
    setError("");
    setIsFetching(true);
    
    try {
      const apiUrl = getApiUrl();
      console.log("🔍 Fetching post from:", `${apiUrl}/api/posts/fetch-reddit`);
      
      const response = await fetch(`${apiUrl}/api/posts/fetch-reddit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Reddit post");
      }

      if (data.success && data.post) {
        setPostPreview(data.post);
        console.log("✅ Post fetched successfully:", data.post.title);
      } else {
        throw new Error("Invalid response from server");
      }
      
    } catch (err) {
      console.error("❌ Error fetching post:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch post");
      setPostPreview(null);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postPreview) {
      setError("Please fetch post details first");
      return;
    }

    // Skip user check for localhost testing
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && !user?.id) {
      setError("You must be signed in to tokenize posts");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      const apiUrl = getApiUrl();
      console.log("🪙 Tokenizing post:", postPreview.title);
      
      const response = await fetch(`${apiUrl}/api/posts/tokenize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          tokenSupply: parseInt(initialSupply),
          initialPrice: parseFloat(initialPrice),
          description: description || null,
          // userId is optional - backend will create test user if not provided
          ...(user?.id && { userId: user.id }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to tokenize post");
      }

      if (data.success && data.post) {
        const explorerUrl = data.blockchain?.explorerUrl as string | undefined;

        toast.success("Token minted on Solana 🎉", {
          description:
            `Post tokenized successfully.\n` +
            `Symbol: ${data.post.tokenSymbol} • Supply: ${initialSupply} • Price: ${initialPrice} SOL\n` +
            `Market Cap: ${data.post.marketCap} SOL • Status: ${data.post.status}`,
          action: explorerUrl
            ? {
                label: "View on Solscan",
                onClick: () =>
                  window.open(explorerUrl, "_blank", "noopener,noreferrer"),
              }
            : undefined,
        });
        
        // Reset form
        setUrl("");
        setPostPreview(null);
        setInitialSupply("10000");
        setInitialPrice("0.001");
        setDescription("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to tokenize post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            Tokenize Viral Content
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight font-satoshi">
            Launch Your Token
          </h1>
          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed px-4">
            Turn any Reddit post into a tradable digital asset on Solana.
            Capture viral momentum and earn rewards.
          </p>
        </motion.div>
      </div>

      <div className="relative">
        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 bg-neutral-900/50 border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 sm:p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* URL Input Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white/70 ml-1">
                  Reddit Post URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    required
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setPostPreview(null);
                      setError("");
                    }}
                    placeholder="Paste Reddit link here..."
                    className="flex-1 bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm"
                  />
                  <Button
                    type="button"
                    onClick={handleFetchPost}
                    disabled={!url || isFetching}
                    className="h-12 sm:h-auto px-6 rounded-lg bg-white text-black hover:bg-white/90 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetching ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden">Fetch Post</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    )}
                  </Button>
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/10 px-4 py-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {postPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-8 overflow-hidden"
                  >
                    <div className="h-px w-full bg-white/5" />

                    {/* Preview Card */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-medium text-white/90 mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">1</span>
                            Post Preview
                          </h3>
                          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                            <div className="flex gap-4">
                              {postPreview.thumbnail && (
                                <img
                                  src={postPreview.thumbnail}
                                  alt="Thumbnail"
                                  className="w-20 h-20 rounded-lg object-cover bg-neutral-800"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium leading-snug mb-2 line-clamp-2">
                                  {postPreview.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-white/40">
                                  <span className="font-medium text-white/60">r/{postPreview.subreddit}</span>
                                  <span>•</span>
                                  <span>{postPreview.author}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-4 text-xs font-medium">
                                  <span className="flex items-center gap-1.5 text-white/60">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {postPreview.upvotes.toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-white/60">
                                    <Users className="w-3.5 h-3.5" />
                                    {postPreview.comments.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Why should people invest in this post?"
                            rows={3}
                            className="w-full bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all resize-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-medium text-white/90 mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">2</span>
                            Token Economics
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-4">
                              <div>
                                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">
                                  Initial Supply
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={initialSupply}
                                    onChange={(e) => setInitialSupply(e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-white font-mono focus:outline-none focus:border-white/40 transition-all"
                                  />
                                  <Coins className="absolute right-0 top-2 w-4 h-4 text-white/20" />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">
                                  Initial Price (SOL)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={initialPrice}
                                    onChange={(e) => setInitialPrice(e.target.value)}
                                    step="0.0001"
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-white font-mono focus:outline-none focus:border-white/40 transition-all"
                                  />
                                  <TrendingUp className="absolute right-0 top-2 w-4 h-4 text-white/20" />
                                </div>
                              </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                              <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-white/60">Estimated Market Cap</span>
                                <span className="text-white font-mono font-medium">
                                  {(parseFloat(initialSupply || "0") * parseFloat(initialPrice || "0")).toFixed(4)} SOL
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-white/40">
                                <span>Creator Allocation</span>
                                <span>100% (Fair Launch)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setUrl("");
                          setPostPreview(null);
                        }}
                        className="h-12 sm:h-auto text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 sm:h-auto bg-white text-black hover:bg-white/90 px-8 py-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>Launching...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Rocket className="w-4 h-4" />
                            <span>Launch Token</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


