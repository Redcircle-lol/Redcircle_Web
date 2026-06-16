import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchFilters = {
  q?: string;
  subreddit?: string;
  author?: string;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  minMarketCap?: number;
  tags?: string;
  sortBy?: "trending" | "new" | "price" | "volume" | "marketCap";
};

type SearchBarProps = {
  onSearch: (filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
};

export default function SearchBar({
  onSearch,
  placeholder = "search posts, tokens, mint address, communities…",
  showFilters = true,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<Omit<SearchFilters, "sortBy" | "q">>({});

  const emitSearch = useCallback(
    (q: string, extra: Omit<SearchFilters, "sortBy" | "q">) => {
      const merged: SearchFilters = { ...extra };
      if (q) merged.q = q;
      onSearch(merged);
    },
    [onSearch],
  );

  // Debounced search on query change — skip the mount run: it would emit an
  // empty search identical to the feed's own initial load (a duplicate fetch)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timer = setTimeout(() => emitSearch(query, filters), 500);
    return () => clearTimeout(timer);
  }, [query, filters]);

  const handleClearFilters = () => {
    setQuery("");
    setFilters({});
    setShowAdvancedFilters(false);
    onSearch({});
  };

  const hasActiveFilters =
    query ||
    filters.subreddit ||
    filters.author ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minVolume ||
    filters.minMarketCap;

  const activeFilterCount = [
    query,
    filters.subreddit,
    filters.author,
    filters.minPrice,
    filters.maxPrice,
    filters.minVolume,
    filters.minMarketCap,
  ].filter(Boolean).length;

  return (
    <div className={cn("w-full", className)}>
      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 group-focus-within:text-[#E8431C] transition-colors" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-xl border-white/[0.08] bg-[#0d0d0d] pl-11 pr-11 text-sm font-mono text-white placeholder:text-white/20 focus:border-[#E8431C]/40 focus:shadow-[0_0_0_1px_rgba(232,67,28,0.15),0_0_20px_rgba(232,67,28,0.08)] focus:ring-0 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant="ghost"
            className={cn(
              "h-12 rounded-xl border border-white/[0.08] bg-[#0d0d0d] px-5 text-sm font-mono text-white/50 hover:bg-[#141414] hover:text-white hover:border-[#E8431C]/40 transition-all gap-2 cursor-pointer",
              showAdvancedFilters && "bg-[#141414] border-[#E8431C]/40 text-white",
              hasActiveFilters && "text-[#E8431C] border-[#E8431C]/30 bg-[#E8431C]/5",
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8431C] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-white/80">Advanced Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-white/30 hover:text-white transition-colors"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                    Community / Account
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., cryptocurrency, elonmusk"
                    value={filters.subreddit || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, subreddit: e.target.value || undefined })
                    }
                    className="h-9 rounded-xl border-white/5 bg-black/30 text-sm text-white placeholder:text-white/20 focus:border-white/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                    Author
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., username"
                    value={filters.author || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, author: e.target.value || undefined })
                    }
                    className="h-9 rounded-xl border-white/5 bg-black/30 text-sm text-white placeholder:text-white/20 focus:border-white/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                    Tags
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., crypto"
                    value={filters.tags || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, tags: e.target.value || undefined })
                    }
                    className="h-9 rounded-xl border-white/5 bg-black/30 text-sm text-white placeholder:text-white/20 focus:border-white/10"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
