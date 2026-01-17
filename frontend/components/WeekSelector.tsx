import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { cn } from "@/utils/utils";

type WeekSelectorProps = {
  currentWeek: number;
  totalWeeks: number;
  onPrevious: () => void;
  onNext: () => void;
  styleClass?: string;
};

export function WeekSelector({
  currentWeek,
  totalWeeks,
  onPrevious,
  onNext,
  styleClass,
}: WeekSelectorProps) {
  const canGoPrevious = currentWeek > 1;
  const canGoNext = currentWeek < totalWeeks;

  return (
    <View className={cn("flex-row items-center justify-center py-3", styleClass)}>
      <Pressable
        onPress={onPrevious}
        disabled={!canGoPrevious}
        className={cn(
          "p-2",
          !canGoPrevious && "opacity-30"
        )}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color="#3b82f6"
        />
      </Pressable>

      <Label variant="body" weight="semibold" styleClass="mx-4">
        Week {currentWeek}/{totalWeeks}
      </Label>

      <Pressable
        onPress={onNext}
        disabled={!canGoNext}
        className={cn(
          "p-2",
          !canGoNext && "opacity-30"
        )}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color="#3b82f6"
        />
      </Pressable>
    </View>
  );
}
