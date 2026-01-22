import { View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { StartedSet } from "@/types/startedProgram";
import { cn } from "@/utils/utils";

type HistorySetRowProps = {
  set: StartedSet;
  isVolumeRange: boolean;
  isIntensityRange: boolean;
  styleClass?: string;
};

export function HistorySetRow({
  set,
  isVolumeRange,
  isIntensityRange,
  styleClass,
}: HistorySetRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Check if set was completed
  const isDone = set.done_volume !== undefined && set.done_volume !== null;

  // Format target value
  const formatTarget = (lower?: number, upper?: number, isRange?: boolean): string => {
    if (isRange) {
      const lowerStr = lower?.toString() || "-";
      const upperStr = upper?.toString() || "-";
      return `${lowerStr}-${upperStr}`;
    }
    return upper?.toString() || "-";
  };

  const targetText = formatTarget(set.volume_lower, set.volume_upper, isVolumeRange);

  const doneValueStyle = {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: isDone ? (isDark ? "#14532d" : "#dcfce7") : (isDark ? "#27272a" : "#f3f4f6"),
    borderWidth: 1,
    borderColor: isDone ? "#22c55e" : (isDark ? "#3f3f46" : "#d1d5db"),
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center" as const,
  };

  return (
    <View className={cn("flex-row items-center py-1", styleClass)}>
      {/* Set number */}
      <View className="items-center justify-center w-10">
        <Label variant="caption" color="secondary">
          {set.number}
        </Label>
      </View>

      {/* Target */}
      <View className="flex-1 mx-1 items-center">
        <Label variant="caption" color="tertiary">
          {targetText}
        </Label>
      </View>

      {/* Done Volume */}
      <View style={doneValueStyle}>
        <Label
          variant="caption"
          weight={isDone ? "semibold" : "regular"}
          style={{ color: isDone ? "#22c55e" : (isDark ? "#9CA3AF" : "#6B7280") }}
        >
          {isDone ? set.done_volume : "-"}
        </Label>
      </View>

      {/* Done Intensity */}
      <View style={doneValueStyle}>
        <Label
          variant="caption"
          weight={isDone ? "semibold" : "regular"}
          style={{ color: isDone ? "#22c55e" : (isDark ? "#9CA3AF" : "#6B7280") }}
        >
          {isDone ? set.done_intensity : "-"}
        </Label>
      </View>

      {/* Completion indicator */}
      <View className="w-8 items-center">
        {isDone && (
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
        )}
      </View>
    </View>
  );
}
