import { View, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { WeekSelector } from "@/components/WeekSelector";
import { useStartedProgramStore } from "@/utils/startedProgramStore";
import { WorkoutHistoryItem } from "@/types/startedProgram";

export default function ProgramHistoryScreen() {
  const router = useRouter();
  const { startedProgramId } = useLocalSearchParams<{ startedProgramId: string }>();
  const {
    workoutHistory,
    isLoadingHistory,
    loadWorkoutHistory,
    clearWorkoutHistory,
  } = useStartedProgramStore();

  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    if (startedProgramId) {
      loadWorkoutHistory(startedProgramId);
    }
    return () => {
      clearWorkoutHistory();
    };
  }, [startedProgramId]);

  // Set initial week to the first available week when history loads
  useEffect(() => {
    if (workoutHistory && workoutHistory.weeks.length > 0) {
      setCurrentWeek(workoutHistory.weeks[0].week);
    }
  }, [workoutHistory]);

  const handleBack = () => {
    clearWorkoutHistory();
    router.back();
  };

  const handleWorkoutPress = (workout: WorkoutHistoryItem) => {
    router.push({
      pathname: "/workout-history",
      params: {
        startedProgramId,
        workoutNumber: workout.workout_number.toString(),
      },
    });
  };

  const getCurrentWeekWorkouts = (): WorkoutHistoryItem[] => {
    if (!workoutHistory) return [];
    const weekGroup = workoutHistory.weeks.find((w) => w.week === currentWeek);
    return weekGroup?.workouts || [];
  };

  const getTotalWeeks = (): number => {
    if (!workoutHistory || workoutHistory.weeks.length === 0) return 1;
    return Math.max(...workoutHistory.weeks.map((w) => w.week));
  };

  const handlePreviousWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    }
  };

  const handleNextWeek = () => {
    const totalWeeks = getTotalWeeks();
    if (currentWeek < totalWeeks) {
      setCurrentWeek(currentWeek + 1);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoadingHistory && !workoutHistory) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const workouts = getCurrentWeekWorkouts();

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
          {workoutHistory?.program_name || "Workout History"}
        </Label>
        <View style={{ width: 50 }} />
      </View>

      {/* Week selector */}
      <WeekSelector
        currentWeek={currentWeek}
        totalWeeks={getTotalWeeks()}
        onPrevious={handlePreviousWeek}
        onNext={handleNextWeek}
      />

      {/* Workouts list */}
      <FlatList
        className="flex-1 px-4"
        data={workouts}
        keyExtractor={(item) => `workout-${item.workout_number}`}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => handleWorkoutPress(item)}
            className="p-4 mb-3 bg-white border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 active:opacity-70"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="items-center justify-center w-10 h-10 mr-3 bg-green-100 rounded-full dark:bg-green-900/30">
                  <Ionicons name="checkmark" size={20} color="#22c55e" />
                </View>
                <View className="flex-1">
                  <Label variant="body" weight="semibold">
                    Workout {index + 1}
                  </Label>
                  {item.completed_at && (
                    <Label variant="caption" color="secondary">
                      Completed {formatDate(item.completed_at)}
                    </Label>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 50 }}>
            <Ionicons name="time-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No completed workouts in week {currentWeek}
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1 text-center px-8">
              Complete workouts to see your history here
            </Label>
          </View>
        }
      />
    </SafeAreaView>
  );
}
