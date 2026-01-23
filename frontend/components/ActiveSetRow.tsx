import { useState } from "react";
import { View, TextInput, Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { StartedSet } from "@/types/startedProgram";
import { cn } from "@/utils/utils";

type ActiveSetRowProps = {
  set: StartedSet;
  isVolumeRange: boolean;
  isIntensityRange: boolean;
  onToggleDone: (doneVolume: number | undefined, doneIntensity: number | undefined) => void;
  styleClass?: string;
};

export function ActiveSetRow({
  set,
  isVolumeRange,
  isIntensityRange,
  onToggleDone,
  styleClass,
}: ActiveSetRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Local state for input values
  const [localVolume, setLocalVolume] = useState(set.done_volume?.toString() || "");
  const [localIntensity, setLocalIntensity] = useState(set.done_intensity?.toString() || "");

  // Check if set is done (has values saved)
  const isDone = set.done_volume !== undefined && set.done_volume !== null;

  const parseNumber = (text: string): number | undefined => {
    const num = parseFloat(text);
    return isNaN(num) ? undefined : num;
  };

  // Format target value for placeholder
  const formatPlaceholder = (lower?: number, upper?: number, isRange?: boolean): string => {
    if (isRange) {
      const lowerStr = lower?.toString() || "-";
      const upperStr = upper?.toString() || "-";
      return `${lowerStr}-${upperStr}`;
    }
    return upper?.toString() || "-";
  };

  const handleToggleDone = () => {
    if (isDone) {
      // Undo - clear the values
      setLocalVolume("");
      setLocalIntensity("");
      onToggleDone(undefined, undefined);
    } else {
      // Mark as done - use input values or fall back to upper target values
      const volumeValue = parseNumber(localVolume) ?? set.volume_upper;
      const intensityValue = parseNumber(localIntensity) ?? set.intensity_upper;
      
      // Update local state to show the values used
      if (!localVolume && set.volume_upper !== undefined) {
        setLocalVolume(set.volume_upper.toString());
      }
      if (!localIntensity && set.intensity_upper !== undefined) {
        setLocalIntensity(set.intensity_upper.toString());
      }
      
      onToggleDone(volumeValue, intensityValue);
    }
  };

  const inputStyle = {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center" as const,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: isDone ? "#22c55e" : (isDark ? "#3f3f46" : "#d1d5db"),
    color: isDark ? "#ffffff" : "#000000",
    backgroundColor: isDone ? (isDark ? "#14532d" : "#dcfce7") : (isDark ? "#27272a" : "#ffffff"),
  };

  const volumePlaceholder = formatPlaceholder(set.volume_lower, set.volume_upper, isVolumeRange);
  const intensityPlaceholder = formatPlaceholder(set.intensity_lower, set.intensity_upper, isIntensityRange);

  return (
    <View className={cn("flex-row items-center py-1", styleClass)}>
      {/* Set number */}
      <View className="items-center justify-center w-8">
        <Label variant="caption" color="secondary">
          {set.number}
        </Label>
      </View>

      {/* Volume input with target as placeholder */}
      <View className="flex-1 mx-1">
        <TextInput
          style={inputStyle}
          placeholder={volumePlaceholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={localVolume}
          onChangeText={setLocalVolume}
          editable={!isDone}
        />
      </View>

      {/* Intensity input with target as placeholder */}
      <View className="flex-1 mx-1">
        <TextInput
          style={inputStyle}
          placeholder={intensityPlaceholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={localIntensity}
          onChangeText={setLocalIntensity}
          editable={!isDone}
        />
      </View>

      {/* Done/Undo button */}
      <Pressable onPress={handleToggleDone} className="p-2">
        <Ionicons
          name={isDone ? "checkmark-circle" : "checkmark-circle-outline"}
          size={24}
          color={isDone ? "#22c55e" : "#9CA3AF"}
        />
      </Pressable>
    </View>
  );
}
