import { View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ActiveExerciseItem } from "@/components/ActiveExerciseItem";
import { ExerciseHistoryModal } from "@/components/ExerciseHistoryModal";
import { useStartedProgramStore } from "@/utils/startedProgramStore";
import { useExerciseStore } from "@/utils/exerciseStore";
import { StartedSet } from "@/types/startedProgram";

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const {
    activeStartedProgram,
    currentWorkout,
    isLoadingWorkout,
    startWorkout,
    loadCurrentWorkout,
    updateExerciseProgress,
    finishWorkout,
    clearActiveWorkout,
  } = useStartedProgramStore();
  const { loadExercises, isLoaded: exercisesLoaded } = useExerciseStore();

  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [localExercises, setLocalExercises] = useState<typeof currentWorkout>(null);
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);

  // Load exercises catalog for name lookup
  useEffect(() => {
    if (!exercisesLoaded) {
      loadExercises();
    }
  }, [exercisesLoaded]);

  // Load current workout when screen opens
  useEffect(() => {
    if (activeStartedProgram) {
      loadCurrentWorkout(activeStartedProgram.id);
    }
  }, [activeStartedProgram?.id]);

  // Sync local state with store
  useEffect(() => {
    if (currentWorkout) {
      setLocalExercises(currentWorkout);
    }
  }, [currentWorkout]);

  const handleBack = () => {
    clearActiveWorkout();
    router.back();
  };

  const handleStartWorkout = async () => {
    if (!activeStartedProgram) return;

    setIsStarting(true);
    try {
      await startWorkout(activeStartedProgram.id);
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to start workout";
      Alert.alert("Error", message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleUpdateSets = async (exerciseId: string, sets: StartedSet[]) => {
    // Update local state immediately for responsive UI
    if (localExercises) {
      setLocalExercises({
        ...localExercises,
        exercises: localExercises.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets } : e
        ),
      });
    }

    // Debounce the API call (fire and forget for now)
    try {
      await updateExerciseProgress(exerciseId, sets);
    } catch (error) {
      console.error("Failed to update exercise:", error);
    }
  };

  const handleFinishWorkout = async () => {
    if (!activeStartedProgram) return;

    Alert.alert(
      "Finish Workout",
      "Are you sure you want to finish this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            setIsFinishing(true);
            try {
              await finishWorkout(activeStartedProgram.id);
              Alert.alert("Workout Complete", "Great job! Your progress has been saved.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error: any) {
              const message = error.response?.data?.error || "Failed to finish workout";
              Alert.alert("Error", message);
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  const handleViewHistory = (exerciseId: string) => {
    setHistoryExerciseId(exerciseId);
  };

  if (!activeStartedProgram) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <Label variant="body" color="secondary">No active program</Label>
        <Button title="Go Back" theme="tertiary" onPress={handleBack} styleClass="mt-4" />
      </SafeAreaView>
    );
  }

  if (isLoadingWorkout || !localExercises) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Label variant="caption" color="secondary" styleClass="mt-2">
          Loading workout...
        </Label>
      </SafeAreaView>
    );
  }

  const workoutStarted = activeStartedProgram.workout_started;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Close" theme="tertiary" onPress={handleBack} />
        <View className="flex-1 mx-2">
          <Label variant="subheading" weight="semibold" numberOfLines={1} styleClass="text-center">
            {activeStartedProgram.program_name}
          </Label>
          <Label variant="caption" color="secondary" styleClass="text-center">
            Workout {localExercises.workout_number}
          </Label>
        </View>
        {workoutStarted ? (
          <Button
            title={isFinishing ? "..." : "Finish"}
            theme="primary"
            onPress={handleFinishWorkout}
            disabled={isFinishing}
          />
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Content */}
      {!workoutStarted ? (
        <View className="flex-1 items-center justify-center px-4">
          <Label variant="body" color="secondary" styleClass="text-center mb-4">
            Ready to start Workout {localExercises.workout_number}?
          </Label>
          <Label variant="caption" color="tertiary" styleClass="text-center mb-6">
            {localExercises.exercises.length} exercise{localExercises.exercises.length !== 1 ? "s" : ""} in this workout
          </Label>
          <Button
            title={isStarting ? "Starting..." : "Start Workout"}
            onPress={handleStartWorkout}
            disabled={isStarting}
            styleClass="px-8"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {localExercises.exercises.map((exercise) => (
            <ActiveExerciseItem
              key={exercise.id}
              exercise={exercise}
              onUpdateSets={(sets) => handleUpdateSets(exercise.id, sets)}
              onViewHistory={handleViewHistory}
            />
          ))}
        </ScrollView>
      )}

      {/* Exercise History Modal */}
      <ExerciseHistoryModal
        visible={historyExerciseId !== null}
        exerciseId={historyExerciseId}
        onClose={() => setHistoryExerciseId(null)}
      />
    </SafeAreaView>
  );
}
