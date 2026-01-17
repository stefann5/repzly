import { useState, useRef, useCallback, useEffect } from "react";
import { programService } from "@/services/program";
import { Program } from "@/types/program";

const DEBOUNCE_MS = 300;

type SearchType = "mine" | "public";

export function useProgramSearch(type: SearchType) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchRef = useRef("");

  const searchFn = type === "mine" ? programService.searchMine : programService.searchPublic;

  const search = useCallback(
    async (query: string, pageNum: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        const result = await searchFn({
          search: query.trim() || undefined,
          page: pageNum,
          limit: 10,
        });

        // Only update if this is still the current search
        if (query === currentSearchRef.current) {
          if (append) {
            setPrograms((prev) => [...prev, ...result.programs]);
          } else {
            setPrograms(result.programs);
          }
          setPage(result.page);
          setTotalPages(result.total_pages);
          setTotal(result.total);
        }
      } catch (err) {
        console.error("Failed to search programs:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchFn]
  );

  // Load programs on mount
  useEffect(() => {
    currentSearchRef.current = "";
    search("", 1, false);
  }, [search]);

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    currentSearchRef.current = searchQuery;

    debounceRef.current = setTimeout(() => {
      search(searchQuery, 1, false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, search]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await search(searchQuery, 1, false);
    setRefreshing(false);
  }, [search, searchQuery]);

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) {
      search(searchQuery, page + 1, true);
    }
  }, [loading, page, totalPages, search, searchQuery]);

  const deleteProgram = useCallback(
    async (programId: string) => {
      try {
        await programService.delete(programId);
        // Refresh the list after deletion
        search(searchQuery, 1, false);
      } catch (err) {
        console.error("Failed to delete program:", err);
      }
    },
    [search, searchQuery]
  );

  return {
    programs,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    page,
    totalPages,
    total,
    refresh,
    loadMore,
    deleteProgram,
  };
}
