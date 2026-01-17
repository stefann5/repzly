import { memo } from "react";
import { View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { SetViewRow } from "./SetViewRow";
import { WorkoutExercise } from "@/types/program";
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

type ExerciseViewItemProps = {
  exercise: WorkoutExercise;
  styleClass?: string;
};

function ExerciseViewItemComponent({
  exercise,
  styleClass,
}: ExerciseViewItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { getExerciseName } = useExerciseStore();

  const exerciseName = getExerciseName(exercise.exercise_id);
  const hasNotes = exercise.notes && exercise.notes.trim().length > 0;

  const volumeOption = VOLUME_OPTIONS.find(o => o.value === (exercise.volume_metric || "reps"));
  const intensityOption = INTENSITY_OPTIONS.find(o => o.value === (exercise.intensity_metric || "rpe"));

  return (
    <View
      className={cn(
        "border border-gray-200 dark:border-zinc-700 rounded-lg mb-2 overflow-hidden",
        styleClass
      )}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800">
        <View className="flex-row items-center flex-1">
          <Label
            variant="body"
            weight="semibold"
            numberOfLines={1}
          >
            {exerciseName}
          </Label>
        </View>
        {hasNotes && (
          <View className="flex-row items-center">
            <Ionicons
              name="document-text"
              size={18}
              color="#3b82f6"
            />
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
          <View className="flex-1 mx-1 items-center">
            <Label variant="caption" color="secondary">
              {volumeOption?.label || "Reps"}
            </Label>
          </View>
          <View className="flex-1 mx-1 items-center">
            <Label variant="caption" color="secondary">
              {intensityOption?.label || "RPE"}
            </Label>
          </View>
        </View>

        {/* Sets */}
        {exercise.sets.map((set, index) => (
          <SetViewRow
            key={set.id || `set-${exercise.id}-${index}`}
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

export const ExerciseViewItem = memo(ExerciseViewItemComponent);
