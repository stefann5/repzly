import { View, ScrollView, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { WeekSelector } from "@/components/WeekSelector";
import { WorkoutOverviewCard } from "@/components/WorkoutOverviewCard";
import { useProgram } from "@/hooks/useProgram";
import { useProgramStore } from "@/utils/programStore";

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

  const { setCurrentWorkoutNumber } = useProgramStore();

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
    const newWorkoutNumber = addWorkout(currentWeek);
    setCurrentWorkoutNumber(newWorkoutNumber);
    router.push("/workout-editor");
  };

  const handleWorkoutPress = (workoutNumber: number) => {
    setCurrentWorkoutNumber(workoutNumber);
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
          </View>
        ) : (
          <View>
            {workouts.map((workout, index) => (
              <WorkoutOverviewCard
                key={`workout-${workout.workout_number}`}
                workout={workout}
                order={index + 1}
                onPress={() => handleWorkoutPress(workout.workout_number)}
                onDelete={() => handleDeleteWorkout(workout.workout_number)}
              />
            ))}
          </View>
        )}

        {/* Add workout button */}
        <Button
          title="Add Workout"
          theme="secondary"
          onPress={handleAddWorkout}
          styleClass="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}