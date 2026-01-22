import { View, FlatList, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { HistoryExerciseItem } from "@/components/HistoryExerciseItem";
import { useStartedProgramStore } from "@/utils/startedProgramStore";
import { useExerciseStore } from "@/utils/exerciseStore";

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { startedProgramId, workoutNumber } = useLocalSearchParams<{
    startedProgramId: string;
    workoutNumber: string;
  }>();
  const {
    workoutHistoryDetail,
    isLoadingHistory,
    loadWorkoutHistoryDetail,
  } = useStartedProgramStore();
  const { loadExercises } = useExerciseStore();

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (startedProgramId && workoutNumber) {
      loadWorkoutHistoryDetail(startedProgramId, parseInt(workoutNumber, 10));
    }
  }, [startedProgramId, workoutNumber]);

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoadingHistory && !workoutHistoryDetail) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!workoutHistoryDetail) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Label variant="body" color="secondary" styleClass="mt-4">
          Workout not found
        </Label>
        <Button title="Go Back" theme="tertiary" onPress={handleBack} styleClass="mt-4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Back" theme="tertiary" onPress={handleBack} />
        <View className="flex-1 mx-2">
          <Label
            variant="body"
            weight="semibold"
            numberOfLines={1}
            styleClass="text-center"
          >
            Week {workoutHistoryDetail.week} - Workout
          </Label>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* Completion info */}
      {workoutHistoryDetail.completed_at && (
        <View className="flex-row items-center justify-center py-2 bg-green-50 dark:bg-green-900/20">
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
          <Label variant="caption" color="secondary" styleClass="ml-2">
            Completed {formatDate(workoutHistoryDetail.completed_at)}
          </Label>
        </View>
      )}

      {/* Exercises list */}
      <FlatList
        className="flex-1"
        data={workoutHistoryDetail.exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryExerciseItem exercise={item} />
        )}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 50 }}>
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No exercises recorded
            </Label>
          </View>
        }
      />
    </SafeAreaView>
  );
}
