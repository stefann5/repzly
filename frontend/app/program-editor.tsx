import { View, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { WeekSelector } from "@/components/WeekSelector";
import { WorkoutOverviewCard } from "@/components/WorkoutOverviewCard";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { ReorderWorkoutsModal } from "@/components/ReorderWorkoutsModal";
import { useProgram } from "@/hooks/useProgram";
import { useProgramStore } from "@/utils/programStore";
import { useExerciseStore } from "@/utils/exerciseStore";
import { Exercise } from "@/types/exercise";

export default function ProgramEditorScreen() {
  const router = useRouter();
  const {
    currentProgram,
    currentWeek,
    workouts,
    isLoading,
    error,
    hasChanges,
    loadWeek,
    saveChanges,
    finishProgram,
    addWorkout,
    removeWorkout,
  } = useProgram();

  const { setCurrentWorkoutNumber, setCurrentWorkoutOrder, setCurrentProgram, copiedWorkout, copyWorkout, pasteWorkout, copiedWeek, copyWeek, pasteWeek, reorderWorkouts } = useProgramStore();
  const { loadExercises, addToCache } = useExerciseStore();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isReorderModalVisible, setIsReorderModalVisible] = useState(false);

  // Load exercise cache on mount
  useEffect(() => {
    loadExercises();
    loadWeek(currentProgram!.id, currentWeek);
  }, []);

  // Redirect if no program is loaded
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

  const handlePreviousWeek = async () => {
    if (currentWeek > 1) {
      if (hasChanges) {
        await saveChanges(currentProgram.id);
      }
      await loadWeek(currentProgram.id, currentWeek - 1);
    }
  };

  const handleNextWeek = async () => {
    if (currentWeek < currentProgram.total_weeks) {
      if (hasChanges) {
        await saveChanges(currentProgram.id);
      }
      await loadWeek(currentProgram.id, currentWeek + 1);
    }
  };

  const handleSave = async () => {
    try {
      await saveChanges(currentProgram.id);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleFinish = async () => {
    try {
      if (hasChanges) {
        await saveChanges(currentProgram.id);
      }
      await finishProgram(currentProgram.id);
      router.replace("/(tabs)/programs");
    } catch (err) {
      console.error("Failed to finish program:", err);
    }
  };

  const handleAddWorkout = () => {
    setIsPickerVisible(true);
  };

  const handleExercisesSelected = (exercises: Exercise[]) => {
    if (exercises.length > 0) {
      // Add exercises to cache for name lookup
      addToCache(exercises);
      // Create workout with selected exercises
      const exerciseIds = exercises.map((e) => e.id);
      const newWorkoutNumber = addWorkout(currentWeek, exerciseIds);
      setCurrentWorkoutNumber(newWorkoutNumber);
      setCurrentWorkoutOrder(workouts.length + 1);
      router.push("/workout-editor");
    }
    setIsPickerVisible(false);
  };

  const handleWorkoutPress = (workoutNumber: number, order: number) => {
    setCurrentWorkoutNumber(workoutNumber);
    setCurrentWorkoutOrder(order);
    router.push("/workout-editor");
  };

  const handleDeleteWorkout = async (workoutNumber: number) => {
    try {
      await removeWorkout(currentProgram.id, workoutNumber);
    } catch (err) {
      console.error("Failed to delete workout:", err);
    }
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
          {currentProgram.name}
        </Label>
        <Button
          title="Finish"
          theme="primary"
          onPress={handleFinish}
          disabled={isLoading}
        />
      </View>

      {/* Week selector */}
      <WeekSelector
        currentWeek={currentWeek}
        totalWeeks={currentProgram.total_weeks}
        onPrevious={handlePreviousWeek}
        onNext={handleNextWeek}
      />

      {/* Error message */}
      {error && (
        <View className="px-4 py-2 mx-4 mb-2 bg-red-100 rounded-lg dark:bg-red-900">
          <Label color="error">{error}</Label>
        </View>
      )}

      {/* Save button */}
      {hasChanges && (
        <View className="px-4 mb-2">
          <Button
            title={isLoading ? "Saving..." : "Save Changes"}
            theme="secondary"
            onPress={handleSave}
            disabled={isLoading}
          />
        </View>
      )}

      {/* Workouts list */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading && workouts.length === 0 ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : workouts.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="fitness-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No workouts in this week
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1">
              Add a workout to get started
            </Label>
            {copiedWeek && copiedWeek.length > 0 && (
              <Button
                title="Paste week"
                theme="secondary"
                onPress={() => {
                  const newLastWorkoutNumber = pasteWeek(currentWeek, currentProgram.last_workout_number);
                  setCurrentProgram({ ...currentProgram, last_workout_number: newLastWorkoutNumber });
                }}
                styleClass="mt-4"
              />
            )}
          </View>
        ) : (
          <View>
            {workouts.map((workout, index) => (
              <WorkoutOverviewCard
                key={`workout-${workout.workout_number}`}
                workout={workout}
                order={index + 1}
                onPress={() => handleWorkoutPress(workout.workout_number, index + 1)}
                onDelete={() => handleDeleteWorkout(workout.workout_number)}
                onCopy={() => copyWorkout(workout)}
              />
            ))}
            <View className="flex-row mt-2 gap-2">
              {workouts.length > 1 && (
                <Button
                  title="Reorder workouts"
                  theme="tertiary"
                  onPress={() => setIsReorderModalVisible(true)}
                  styleClass="flex-1"
                />
              )}
              <Button
                title="Copy week"
                theme="tertiary"
                onPress={() => copyWeek(workouts)}
                styleClass="flex-1"
              />
            </View>
          </View>
        )}

        {/* Add workout button */}
        <View className="flex-row mt-4 gap-2">
          <Button
            title="Add Workout"
            theme="primary"
            onPress={handleAddWorkout}
            styleClass="flex-1"
          />
          {copiedWorkout && (
            <Button
              title="Paste workout"
              theme="secondary"
              onPress={() => {
                const newWorkoutNumber = pasteWorkout(currentWeek, currentProgram.last_workout_number);
                setCurrentProgram({ ...currentProgram, last_workout_number: newWorkoutNumber });
              }}
              styleClass="flex-1"
            />
          )}
        </View>
      </ScrollView>

      {/* Exercise picker modal for new workout */}
      <ExercisePickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={handleExercisesSelected}
        multiSelect={true}
      />

      {/* Reorder workouts modal */}
      <ReorderWorkoutsModal
        visible={isReorderModalVisible}
        workouts={workouts}
        onClose={() => setIsReorderModalVisible(false)}
        onSave={reorderWorkouts}
      />
    </SafeAreaView>
  );
}