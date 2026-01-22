import { memo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { HistorySetRow } from "./HistorySetRow";
import { StartedWorkoutExercise } from "@/types/startedProgram";
import { cn } from "@/utils/utils";
import { useExerciseStore } from "@/utils/exerciseStore";

const VOLUME_OPTIONS = [
  { label: "Reps", value: "reps", isRange: false },
  { label: "Rep Range", value: "rep range", isRange: true },
];

const INTENSITY_OPTIONS = [
  { label: "RPE", value: "rpe", isRange: false },
  { label: "RPE Range", value: "rpe range", isRange: true },
  { label: "RIR", value: "rir", isRange: false },
  { label: "RIR Range", value: "rir range", isRange: true },
];

type HistoryExerciseItemProps = {
  exercise: StartedWorkoutExercise;
  styleClass?: string;
};

function HistoryExerciseItemComponent({
  exercise,
  styleClass,
}: HistoryExerciseItemProps) {
  const { getExerciseName } = useExerciseStore();

  const exerciseName = getExerciseName(exercise.exercise_id);
  const hasNotes = exercise.notes && exercise.notes.trim().length > 0;

  const volumeOption = VOLUME_OPTIONS.find(o => o.value === (exercise.volume_metric || "reps"));
  const intensityOption = INTENSITY_OPTIONS.find(o => o.value === (exercise.intensity_metric || "rpe"));

  return (
    <View
      className={cn(
        "border border-gray-200 dark:border-zinc-700 rounded-lg mb-3 overflow-hidden",
        styleClass
      )}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800">
        <View className="flex-row items-center flex-1">
          <Label variant="body" weight="semibold" numberOfLines={1}>
            {exerciseName}
          </Label>
        </View>
        {hasNotes && (
          <View className="flex-row items-center">
            <Ionicons name="document-text" size={18} color="#3b82f6" />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-2">
        {/* Header row with metric labels */}
        <View className="flex-row items-center pb-1 mb-1 border-b border-gray-100 dark:border-zinc-700">
          <View className="items-center justify-center w-10">
            <Label variant="caption" color="secondary">#</Label>
          </View>
          <View className="flex-1 mx-1">
            <Label variant="caption" color="secondary" styleClass="text-center">
              Target
            </Label>
          </View>
          <View className="flex-1 mx-1">
            <Label variant="caption" color="secondary" styleClass="text-center">
              Done ({volumeOption?.label || "Reps"})
            </Label>
          </View>
          <View className="flex-1 mx-1">
            <Label variant="caption" color="secondary" styleClass="text-center">
              Done ({intensityOption?.label || "RPE"})
            </Label>
          </View>
        </View>

        {/* Sets */}
        {exercise.sets.map((set, index) => (
          <HistorySetRow
            key={`set-${exercise.id}-${index}`}
            set={set}
            isVolumeRange={volumeOption?.isRange ?? false}
            isIntensityRange={intensityOption?.isRange ?? false}
          />
        ))}

        {/* Notes section */}
        {hasNotes && (
          <View className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Label variant="caption" color="secondary">
              Notes: {exercise.notes}
            </Label>
          </View>
        )}
      </View>
    </View>
  );
}

export const HistoryExerciseItem = memo(HistoryExerciseItemComponent);
