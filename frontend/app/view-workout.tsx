import { View, FlatList, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ExerciseViewItem } from "@/components/ExerciseViewItem";
import { useViewProgramStore } from "@/utils/viewProgramStore";
import { useExerciseStore } from "@/utils/exerciseStore";

export default function ViewWorkoutScreen() {
  const router = useRouter();
  const {
    viewedProgram,
    currentWeek,
    workouts,
    currentWorkoutNumber,
    currentWorkoutOrder,
  } = useViewProgramStore();

  const { loadExercises } = useExerciseStore();

  // Load exercise cache on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Get current workout
  const currentWorkout = workouts.find(
    (w) => w.workout_number === currentWorkoutNumber
  );

  // Redirect if no program or workout
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
          Week {currentWeek} • Workout {currentWorkoutOrder}
        </Label>
        <View style={{ width: 50 }} />
      </View>

      {/* Exercises list */}
      <FlatList
        data={currentWorkout?.exercises.filter((exercise) => exercise != null) ?? []}
        keyExtractor={(item, index) => item.id || `exercise-${currentWorkoutNumber}-${index}`}
        renderItem={({ item }) => (
          <ExerciseViewItem exercise={item} />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No exercises in this workout
            </Label>
          </View>
        }
      />
    </SafeAreaView>
  );
}
