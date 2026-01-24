import { View, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { useAuth } from "@/hooks/useAuth";
import { exerciseService } from "@/services/exercise";
import { Exercise } from "@/types/exercise";
import { Toast } from "toastify-react-native";
import { useColorScheme } from "react-native";

export default function AdminScreen() {
  const { isAdmin } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const response = await exerciseService.getAll({
        search: search || undefined,
        page,
        limit: 20,
      });
      setExercises(response.exercises);
      setTotalPages(response.total_pages);
    } catch (error) {
      Toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleDelete = async (exercise: Exercise) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await exerciseService.delete(exercise.id);
              Toast.success("Exercise deleted");
              fetchExercises();
            } catch (error) {
              Toast.error("Failed to delete exercise");
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
        <View className="items-center justify-center flex-1 px-8">
          <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
          <Label variant="heading" weight="bold" styleClass="mt-6 text-center">
            Access Denied
          </Label>
          <Label variant="body" color="secondary" styleClass="mt-2 text-center">
            You need admin privileges to access this section.
          </Label>
        </View>
      </SafeAreaView>
    );
  }

  const renderExercise = ({ item }: { item: Exercise }) => (
    <View
      className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
    >
      <View className="flex-1">
        <Label variant="body" weight="medium">
          {item.name}
        </Label>
        <Label variant="caption" color="secondary">
          {item.muscles.length} muscle group{item.muscles.length !== 1 ? "s" : ""}
        </Label>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handleDelete(item)}
          className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"
        >
          <Ionicons name="trash" size={18} color={isDark ? "#f87171" : "#dc2626"} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <View className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Label variant="title" weight="bold">
            Exercise Catalog
          </Label>
          <View className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Label variant="caption" color="primary">
              Admin
            </Label>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center px-3 mb-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 ml-2 text-zinc-900 dark:text-zinc-100"
            placeholder="Search exercises..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setPage(1);
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Exercise List */}
        {loading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color={isDark ? "#3b82f6" : "#2563eb"} />
          </View>
        ) : exercises.length === 0 ? (
          <View className="items-center justify-center flex-1">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4 text-center">
              No exercises found
            </Label>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View className="flex-row items-center justify-center gap-4 py-4">
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg ${page === 1 ? "opacity-50" : ""}`}
            >
              <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#000"} />
            </Pressable>
            <Label variant="body">
              Page {page} of {totalPages}
            </Label>
            <Pressable
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg ${page === totalPages ? "opacity-50" : ""}`}
            >
              <Ionicons name="chevron-forward" size={24} color={isDark ? "#fff" : "#000"} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
