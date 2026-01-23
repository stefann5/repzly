import { useEffect, useState } from "react";
import {
  View,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { StartedWorkoutExercise, StartedSet } from "@/types/startedProgram";
import { startedProgramService } from "@/services/startedProgram";
import { useExerciseStore } from "@/utils/exerciseStore";

type ExerciseHistoryModalProps = {
  visible: boolean;
  exerciseId: string | null;
  onClose: () => void;
};

export function ExerciseHistoryModal({
  visible,
  exerciseId,
  onClose,
}: ExerciseHistoryModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { getExerciseName } = useExerciseStore();

  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<StartedWorkoutExercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && exerciseId) {
      loadHistory(exerciseId);
    } else {
      setHistory([]);
      setError(null);
    }
  }, [visible, exerciseId]);

  const loadHistory = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await startedProgramService.getExerciseHistory(id);
      setHistory(response.history);
    } catch (err: any) {
      console.error("Failed to load exercise history:", err);
      setError(err.response?.data?.error || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const exerciseName = exerciseId ? getExerciseName(exerciseId) : "Exercise";

  const renderHistoryItem = ({ item }: { item: StartedWorkoutExercise }) => {
    // Filter to only done sets
    const doneSets = item.sets.filter(
      (set) => set.done_volume !== undefined && set.done_volume !== null
    );

    return (
      <View className="mb-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
        {/* Header with date and week info */}
        <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-zinc-700">
          <View>
            <Label variant="caption" color="secondary">
              Week {item.week} - Workout {item.workout_number}
            </Label>
            <Label variant="caption" color="tertiary">
              {formatDate(item.updated_at)}
            </Label>
          </View>
          {item.completed_at && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Label variant="caption" color="secondary" styleClass="ml-1">
                Completed
              </Label>
            </View>
          )}
        </View>

        {/* Sets header */}
        <View className="flex-row items-center mb-1">
          <View className="w-10">
            <Label variant="caption" color="tertiary" styleClass="text-center">
              Set
            </Label>
          </View>
          <View className="flex-1">
            <Label variant="caption" color="tertiary" styleClass="text-center">
              Volume
            </Label>
          </View>
          <View className="flex-1">
            <Label variant="caption" color="tertiary" styleClass="text-center">
              Intensity
            </Label>
          </View>
        </View>

        {/* Done sets */}
        {doneSets.length > 0 ? (
          doneSets.map((set) => (
            <View key={set.number} className="flex-row items-center py-1">
              <View className="w-10">
                <Label variant="caption" color="secondary" styleClass="text-center">
                  {set.number}
                </Label>
              </View>
              <View className="flex-1">
                <View
                  style={{
                    backgroundColor: isDark ? "#14532d" : "#dcfce7",
                    borderRadius: 4,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginHorizontal: 4,
                    alignItems: "center",
                  }}
                >
                  <Label
                    variant="caption"
                    weight="semibold"
                    style={{ color: "#22c55e" }}
                  >
                    {set.done_volume}
                  </Label>
                </View>
              </View>
              <View className="flex-1">
                <View
                  style={{
                    backgroundColor: isDark ? "#14532d" : "#dcfce7",
                    borderRadius: 4,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginHorizontal: 4,
                    alignItems: "center",
                  }}
                >
                  <Label
                    variant="caption"
                    weight="semibold"
                    style={{ color: "#22c55e" }}
                  >
                    {set.done_intensity ?? "-"}
                  </Label>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Label variant="caption" color="tertiary" styleClass="text-center py-2">
            No completed sets
          </Label>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-zinc-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? "#ffffff" : "#000000"}
            />
          </Pressable>
          <View className="flex-1 mx-4">
            <Label
              variant="body"
              weight="semibold"
              numberOfLines={1}
              styleClass="text-center"
            >
              {exerciseName} History
            </Label>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Label variant="body" color="error" styleClass="mt-4 text-center">
              {error}
            </Label>
          </View>
        ) : history.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="time-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4 text-center">
              No history yet
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1 text-center">
              Complete sets for this exercise to see your history
            </Label>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
      </View>
    </Modal>
  );
}
