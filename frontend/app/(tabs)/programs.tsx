import { View, FlatList, RefreshControl, ActivityIndicator, TextInput, Pressable } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ProgramCard } from "@/components/ProgramCard";
import { programService } from "@/services/program";
import { Program } from "@/types/program";
import { useProgramStore } from "@/utils/programStore";

const DEBOUNCE_MS = 300;

export default function ProgramsScreen() {
  const { setCurrentProgram, setWorkouts, setCurrentWeek, setCurrentWorkoutNumber } = useProgramStore();
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchRef = useRef("");

  const fetchPrograms = useCallback(async (query: string, pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const result = await programService.searchMine({
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
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load programs on mount
  useEffect(() => {
    currentSearchRef.current = "";
    fetchPrograms("", 1, false);
  }, [fetchPrograms]);

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    currentSearchRef.current = searchQuery;

    debounceRef.current = setTimeout(() => {
      fetchPrograms(searchQuery, 1, false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, fetchPrograms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms(searchQuery, 1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      fetchPrograms(searchQuery, page + 1, true);
    }
  };

  const handleProgramPress = (program: Program) => {
    setCurrentProgram(program);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await programService.delete(programId);
      // Refresh the list after deletion
      fetchPrograms(searchQuery, 1, false);
    } catch (err) {
      console.error("Failed to delete program:", err);
    }
  };

  const handleCreateNew = () => {
    setCurrentProgram(null);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
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
        <View className="flex-row items-center justify-between mb-4">
          <Label variant="heading" weight="bold">
            My Programs
          </Label>
          <Button title="New" theme="primary" onPress={handleCreateNew} />
        </View>

        <View className="mb-2">
          <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or tag..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {total > 0 && (
          <Label variant="caption" color="secondary">
            {total} program{total !== 1 ? "s" : ""}
          </Label>
        )}
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => handleProgramPress(item)}
            onDelete={() => handleDeleteProgram(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              {loading ? "Loading..." : searchQuery ? "No programs found" : "No programs yet"}
            </Label>
            {!loading && (
              <Label variant="caption" color="tertiary" styleClass="mt-1">
                {searchQuery
                  ? "Try different search terms"
                  : "Create your first program to get started"}
              </Label>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
