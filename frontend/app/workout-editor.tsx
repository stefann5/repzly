import { View, FlatList, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ExerciseItem } from "@/components/ExerciseItem";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { ReorderExercisesModal } from "@/components/ReorderExercisesModal";
import { NotesModal } from "@/components/NotesModal";
import { useProgram } from "@/hooks/useProgram";
import { useProgramStore } from "@/utils/programStore";
import { useExerciseStore } from "@/utils/exerciseStore";
import { Exercise } from "@/types/exercise";

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
    addMultipleExercises,
    addSet,
    updateExercise,
    updateSet,
    deleteSet,
    removeExercise,
  } = useProgram();

  const { currentWorkoutNumber, currentWorkoutOrder, copiedExercise, copyExercise, pasteExercise, reorderExercises } = useProgramStore();
  const { loadExercises, addToCache, getExerciseName } = useExerciseStore();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [changingExerciseId, setChangingExerciseId] = useState<string | null>(null);
  const [isReorderModalVisible, setIsReorderModalVisible] = useState(false);
  const [notesExerciseId, setNotesExerciseId] = useState<string | null>(null);

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
    setChangingExerciseId(null);
    setIsPickerVisible(true);
  };

  const handleChangeExercise = (exerciseId: string) => {
    setChangingExerciseId(exerciseId);
    setIsPickerVisible(true);
  };

  const handleExercisesSelected = (exercises: Exercise[]) => {
    if (exercises.length > 0) {
      addToCache(exercises);

      if (changingExerciseId) {
        // Changing an existing exercise - use only the first selected
        updateExercise(changingExerciseId, { exercise_id: exercises[0].id });
      } else if (currentWorkoutNumber) {
        // Adding new exercises
        const exerciseIds = exercises.map((e) => e.id);
        addMultipleExercises(currentWorkoutNumber, currentWeek, exerciseIds);
      }
    }
    setIsPickerVisible(false);
    setChangingExerciseId(null);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to delete this exercise? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeExercise(currentProgram.id, exerciseId);
            } catch (err) {
              console.error("Failed to delete exercise:", err);
            }
          },
        },
      ]
    );
  };

  const handleOpenNotes = useCallback((exerciseId: string) => {
    setNotesExerciseId(exerciseId);
  }, []);

  const handleSaveNotes = useCallback((notes: string) => {
    if (notesExerciseId) {
      updateExercise(notesExerciseId, { notes });
    }
  }, [notesExerciseId, updateExercise]);

  // Get current exercise for notes modal
  const notesExercise = notesExerciseId
    ? currentWorkout?.exercises.find((e) => e.id === notesExerciseId)
    : null;

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
          Week {currentWeek} • Workout {currentWorkoutOrder}
        </Label>
        <View style={{ width: 50 }} />
      </View>
      {currentWorkout && currentWorkout.exercises.length > 1 && (
        <Button
          title="Reorder exercises"
          theme="tertiary"
          onPress={() => setIsReorderModalVisible(true)}
          styleClass="mt-2 mb-2"
        />
      )}

      {/* Error message */}
      {error && (
        <View className="px-4 py-2 mx-4 mt-2 bg-red-100 rounded-lg dark:bg-red-900">
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

      {/* Exercises list */}
      <FlatList
        data={currentWorkout?.exercises.filter((exercise) => exercise != null) ?? []}
        keyExtractor={(item, index) => item.id || `exercise-${currentWorkoutNumber}-${index}`}
        renderItem={({ item }) => (
          <ExerciseItem
            exercise={item}
            onUpdateExercise={updateExercise}
            onUpdateSet={updateSet}
            onAddSet={addSet}
            onDeleteSet={deleteSet}
            onDeleteExercise={handleDeleteExercise}
            onChangeExercise={handleChangeExercise}
            onCopyExercise={copyExercise}
            onOpenNotes={handleOpenNotes}
          />
        )}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        windowSize={5}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No exercises yet
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1">
              Add an exercise to get started
            </Label>
          </View>
        }
        ListFooterComponent={
          <View>
            <View className="flex-row mt-4 gap-2">
              <Button
                title="Add Exercise"
                theme="primary"
                onPress={handleAddExercise}
                styleClass="flex-1"
              />
              {copiedExercise && currentWorkoutNumber && (
                <Button
                  title="Paste exercise"
                  theme="secondary"
                  onPress={() => pasteExercise(currentWorkoutNumber, currentWeek)}
                  styleClass="flex-1"
                />
              )}
            </View>
          </View>
        }
      />

      {/* Exercise picker modal */}
      <ExercisePickerModal
        visible={isPickerVisible}
        onClose={() => {
          setIsPickerVisible(false);
          setChangingExerciseId(null);
        }}
        onSelect={handleExercisesSelected}
        multiSelect={!changingExerciseId}
      />

      {/* Reorder exercises modal */}
      {currentWorkout && currentWorkoutNumber && (
        <ReorderExercisesModal
          visible={isReorderModalVisible}
          exercises={currentWorkout.exercises}
          onClose={() => setIsReorderModalVisible(false)}
          onSave={(exerciseIds) => reorderExercises(currentWorkoutNumber, exerciseIds)}
        />
      )}

      {/* Notes modal */}
      <NotesModal
        visible={notesExerciseId !== null}
        initialNotes={notesExercise?.notes || ""}
        exerciseName={notesExerciseId ? getExerciseName(notesExercise?.exercise_id || "") : ""}
        onClose={() => setNotesExerciseId(null)}
        onSave={handleSaveNotes}
      />
    </SafeAreaView>
  );
}
