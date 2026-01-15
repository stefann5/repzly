import { View, TextInput, Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { Set } from "@/types/program";
import { cn } from "@/utils/utils";

type SetRowProps = {
  set: Set;
  isVolumeRange: boolean;
  isIntensityRange: boolean;
  onUpdateVolume: (lower?: number, upper?: number) => void;
  onUpdateIntensity: (lower?: number, upper?: number) => void;
  onDelete: () => void;
  styleClass?: string;
};

export function SetRow({
  set,
  isVolumeRange,
  isIntensityRange,
  onUpdateVolume,
  onUpdateIntensity,
  onDelete,
  styleClass,
}: SetRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const parseNumber = (text: string): number | undefined => {
    const num = parseFloat(text);
    return isNaN(num) ? undefined : num;
  };

  const inputStyle = {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center" as const,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: isDark ? "#3f3f46" : "#d1d5db",
    color: isDark ? "#ffffff" : "#000000",
    backgroundColor: isDark ? "#27272a" : "#ffffff",
  };

  return (
    <View className={cn("flex-row items-center py-1", styleClass)}>
      {/* Set number */}
      <View className="items-center justify-center w-10">
        <Label variant="caption" color="secondary">
          {set.number}
        </Label>
      </View>

      {/* Volume inputs */}
      <View className="flex-row items-center flex-1 mx-1">
        {isVolumeRange ? (
          <>
            <TextInput
              style={inputStyle}
              placeholder="-"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={set.volume_lower?.toString() || ""}
              onChangeText={(text) => onUpdateVolume(parseNumber(text), set.volume_upper)}
            />
            <Label variant="caption" color="secondary" styleClass="mx-1">
              -
            </Label>
            <TextInput
              style={inputStyle}
              placeholder="-"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={set.volume_upper?.toString() || ""}
              onChangeText={(text) => onUpdateVolume(set.volume_lower, parseNumber(text))}
            />
          </>
        ) : (
          <TextInput
            style={inputStyle}
            placeholder="-"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={set.volume_upper?.toString() || ""}
            onChangeText={(text) => onUpdateVolume(undefined, parseNumber(text))}
          />
        )}
      </View>

      {/* Intensity inputs */}
      <View className="flex-row items-center flex-1 mx-1">
        {isIntensityRange ? (
          <>
            <TextInput
              style={inputStyle}
              placeholder="-"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={set.intensity_lower?.toString() || ""}
              onChangeText={(text) => onUpdateIntensity(parseNumber(text), set.intensity_upper)}
            />
            <Label variant="caption" color="secondary" styleClass="mx-1">
              -
            </Label>
            <TextInput
              style={inputStyle}
              placeholder="-"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={set.intensity_upper?.toString() || ""}
              onChangeText={(text) => onUpdateIntensity(set.intensity_lower, parseNumber(text))}
            />
          </>
        ) : (
          <TextInput
            style={inputStyle}
            placeholder="-"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={set.intensity_upper?.toString() || ""}
            onChangeText={(text) => onUpdateIntensity(undefined, parseNumber(text))}
          />
        )}
      </View>

      {/* Delete button */}
      <Pressable onPress={onDelete} className="p-1 ml-1">
        <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
      </Pressable>
    </View>
  );
}
