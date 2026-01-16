import { View, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Input } from "@/components/Input";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ProgramCard } from "@/components/ProgramCard";
import { programService } from "@/services/program";
import { Program } from "@/types/program";

const DEBOUNCE_MS = 300;

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchRef = useRef("");

  const searchPrograms = useCallback(async (query: string, pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const result = await programService.searchPublic({
        search: query.trim() || undefined,
        page: pageNum,
        limit: 20,
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
  }, []);

  // Load programs on mount
  useEffect(() => {
    currentSearchRef.current = "";
    searchPrograms("", 1, false);
  }, [searchPrograms]);

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    currentSearchRef.current = searchQuery;

    debounceRef.current = setTimeout(() => {
      searchPrograms(searchQuery, 1, false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, searchPrograms]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await searchPrograms(searchQuery, 1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      searchPrograms(searchQuery, page + 1, true);
    }
  };

  const handleProgramPress = (program: Program) => {
    // TODO: Navigate to program detail view
    console.log("View program:", program.id);
  };

  const renderFooter = () => {
    if (!loading || programs.length === 0) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="px-4 py-4">
        <Label variant="heading" weight="bold" styleClass="mb-4">
          Explore Programs
        </Label>

        <View className="mb-2">
          <Input
            placeholder="Search by name or tag..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        <Label variant="caption" color="secondary">
          {total} program{total !== 1 ? "s" : ""} found
        </Label>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => handleProgramPress(item)}
            showDelete={false}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              {loading ? "Loading..." : "No programs found"}
            </Label>
            {!loading && (
              <Label variant="caption" color="tertiary" styleClass="mt-1">
                Try different search terms
              </Label>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
