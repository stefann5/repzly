import { View, FlatList, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { WeekSelector } from "@/components/WeekSelector";
import { WorkoutViewCard } from "@/components/WorkoutViewCard";
import { useViewProgramStore } from "@/utils/viewProgramStore";
import { useExerciseStore } from "@/utils/exerciseStore";

export default function ViewProgramEditorScreen() {
  const router = useRouter();
  const {
    viewedProgram,
    currentWeek,
    workouts,
    isLoading,
    error,
    loadWeek,
    setCurrentWorkoutNumber,
    setCurrentWorkoutOrder,
  } = useViewProgramStore();

  const { loadExercises } = useExerciseStore();

  // Load exercise cache on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Redirect if no program is loaded
  useEffect(() => {
    if (!viewedProgram) {
      router.replace("/(tabs)/explore");
    }
  }, [viewedProgram]);

  if (!viewedProgram) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const handlePreviousWeek = async () => {
    if (currentWeek > 1) {
      await loadWeek(viewedProgram.id, currentWeek - 1);
    }
  };

  const handleNextWeek = async () => {
    if (currentWeek < viewedProgram.total_weeks) {
      await loadWeek(viewedProgram.id, currentWeek + 1);
    }
  };

  const handleWorkoutPress = (workoutNumber: number, order: number) => {
    setCurrentWorkoutNumber(workoutNumber);
    setCurrentWorkoutOrder(order);
    router.push("/view-workout");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Back" theme="tertiary" onPress={() => router.back()} />
        <Label
          variant="body"
          weight="semibold"
          numberOfLines={1}
          styleClass="flex-1 mx-2 text-center"
        >
          {viewedProgram.name}
        </Label>
        <View style={{ width: 50 }} />
      </View>

      {/* Week selector */}
      <WeekSelector
        currentWeek={currentWeek}
        totalWeeks={viewedProgram.total_weeks}
        onPrevious={handlePreviousWeek}
        onNext={handleNextWeek}
      />

      {/* Error message */}
      {error && (
        <View className="px-4 py-2 mx-4 mb-2 bg-red-100 rounded-lg dark:bg-red-900">
          <Label color="error">{error}</Label>
        </View>
      )}

      {/* Workouts list */}
      <FlatList
        className="flex-1 px-4"
        data={workouts}
        keyExtractor={(item) => `workout-${item.workout_number}`}
        renderItem={({ item, index }) => (
          <WorkoutViewCard
            workout={item}
            order={index + 1}
            onPress={() => handleWorkoutPress(item.workout_number, index + 1)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 50 }}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="fitness-outline" size={48} color="#9CA3AF" />
              <Label variant="body" color="secondary" styleClass="mt-4">
                No workouts in this week
              </Label>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
