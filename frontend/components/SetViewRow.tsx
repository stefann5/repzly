import { View, useColorScheme } from "react-native";
import { Label } from "./Label";
import { Set } from "@/types/program";
import { cn } from "@/utils/utils";

type SetViewRowProps = {
  set: Set;
  isVolumeRange: boolean;
  isIntensityRange: boolean;
  styleClass?: string;
};

export function SetViewRow({
  set,
  isVolumeRange,
  isIntensityRange,
  styleClass,
}: SetViewRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const formatValue = (lower?: number, upper?: number, isRange?: boolean): string => {
    if (isRange) {
      const lowerStr = lower?.toString() || "-";
      const upperStr = upper?.toString() || "-";
      return `${lowerStr} - ${upperStr}`;
    }
    return upper?.toString() || "-";
  };

  const valueStyle = {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: isDark ? "#27272a" : "#f3f4f6",
  };

  return (
    <View className={cn("flex-row items-center py-1", styleClass)}>
      {/* Set number */}
      <View className="items-center justify-center w-10">
        <Label variant="caption" color="secondary">
          {set.number}
        </Label>
      </View>

      {/* Volume value */}
      <View className="flex-1 mx-1">
        <View style={valueStyle}>
          <Label variant="body" styleClass="text-center">
            {formatValue(set.volume_lower, set.volume_upper, isVolumeRange)}
          </Label>
        </View>
      </View>

      {/* Intensity value */}
      <View className="flex-1 mx-1">
        <View style={valueStyle}>
          <Label variant="body" styleClass="text-center">
            {formatValue(set.intensity_lower, set.intensity_upper, isIntensityRange)}
          </Label>
        </View>
      </View>
    </View>
  );
}
