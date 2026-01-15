import { View, ScrollView, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ExerciseItem } from "@/components/ExerciseItem";
import { useProgram } from "@/hooks/useProgram";
import { useProgramStore } from "@/utils/programStore";

export default function WorkoutEditorScreen() {
  const router = useRouter();
  const {
    currentProgram,
    currentWeek,
    workouts,
    isLoading,
    error,
    hasChanges,
    saveChanges,
    addExercise,
    addSet,
    updateExercise,
    updateSet,
    deleteSet,
    removeExercise,
  } = useProgram();

  const { currentWorkoutNumber } = useProgramStore();

  // Get current workout
  const currentWorkout = workouts.find(
    (w) => w.workout_number === currentWorkoutNumber
  );

  // Redirect if no program or workout
  useEffect(() => {
    if (!currentProgram) {
      router.replace("/(tabs)");
    }
  }, [currentProgram]);

  if (!currentProgram) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const handleBack = async () => {
    // Save changes before going back
    if (hasChanges) {
      try {
        await saveChanges(currentProgram.id);
      } catch (err) {
        console.error("Failed to save:", err);
      }
    }
    router.back();
  };

  const handleSave = async () => {
    try {
      await saveChanges(currentProgram.id);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleAddExercise = () => {
    if (currentWorkoutNumber) {
      addExercise(currentWorkoutNumber, currentWeek);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      await removeExercise(currentProgram.id, exerciseId);
    } catch (err) {
      console.error("Failed to delete exercise:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Back" theme="tertiary" onPress={handleBack} />
        <Label
          variant="body"
          weight="semibold"
          numberOfLines={1}
          styleClass="flex-1 mx-2 text-center"
        >
          Workout {currentWorkoutNumber}
        </Label>
        <Button
          title={isLoading ? "Saving..." : "Save"}
          theme="primary"
          onPress={handleSave}
          disabled={isLoading || !hasChanges}
        />
      </View>

      {/* Subheader */}
      <View className="px-4 py-2 bg-gray-50 dark:bg-zinc-800">
        <Label variant="caption" color="secondary">
          {currentProgram.name} • Week {currentWeek}
        </Label>
      </View>

      {/* Error message */}
      {error && (
        <View className="px-4 py-2 mx-4 mt-2 bg-red-100 rounded-lg dark:bg-red-900">
          <Label color="error">{error}</Label>
        </View>
      )}

      {/* Exercises list */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
      >
        {!currentWorkout || currentWorkout.exercises.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No exercises yet
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1">
              Add an exercise to get started
            </Label>
          </View>
        ) : (
          <View>
            {currentWorkout.exercises
              .filter((exercise) => exercise != null)
              .map((exercise, index) => (
                <ExerciseItem
                  key={exercise.id || `exercise-${currentWorkoutNumber}-${index}`}
                  exercise={exercise}
                  onUpdateExercise={updateExercise}
                  onUpdateSet={updateSet}
                  onAddSet={addSet}
                  onDeleteSet={deleteSet}
                  onDeleteExercise={handleDeleteExercise}
                />
              ))}
          </View>
        )}

        {/* Add exercise button */}
        <Button
          title="Add Exercise"
          theme="secondary"
          onPress={handleAddExercise}
          styleClass="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
