import { View, Pressable, TextInput, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Label } from "./Label";
import { SetRow } from "./SetRow";
import { Button } from "./Button";
import { WorkoutExercise, Set } from "@/types/program";
import { cn } from "@/utils/utils";

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

type ExerciseItemProps = {
  exercise: WorkoutExercise;
  onUpdateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<Set>) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setNumber: number) => void;
  onDeleteExercise: (exerciseId: string) => void;
  styleClass?: string;
};

export function ExerciseItem({
  exercise,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  styleClass,
}: ExerciseItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: isDark ? "#ffffff" : "#000000",
            }}
            placeholder="Exercise name"
            placeholderTextColor="#9CA3AF"
            value={exercise.exercise_id}
            onChangeText={(text) => onUpdateExercise(exercise.id, { exercise_id: text })}
          />
        </View>
        <Pressable
          onPress={() => onDeleteExercise(exercise.id)}
          className="p-1"
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </View>

      {/* Content */}
      <View className="p-2">
          {/* Header row with pickers */}
          <View className="flex-row items-center pb-1 mb-1 border-b border-gray-100 dark:border-zinc-700">
            <View className="items-center justify-center w-10">
              <Label variant="caption" color="secondary">#</Label>
            </View>
            <View className="flex-1 mx-1">
              <Picker
                selectedValue={exercise.volume_metric || "reps"}
                onValueChange={(value) => onUpdateExercise(exercise.id, { volume_metric: value })}
                style={{ color: isDark ? "#ffffff" : "#000000" }}
                dropdownIconColor={isDark ? "#ffffff" : "#000000"}
                mode="dropdown"
              >
                {VOLUME_OPTIONS.map((opt) => (
                  <Picker.Item 
                    key={opt.value} 
                    label={opt.label} 
                    value={opt.value} 
                    style={{ fontSize: 14, backgroundColor: isDark ? "#27272a" : "#ffffff", color: isDark ? "#ffffff" : "#000000" }} 
                  />
                ))}
              </Picker>
            </View>
            <View className="flex-1 mx-1">
              <Picker
                selectedValue={exercise.intensity_metric || "rpe"}
                onValueChange={(value) => onUpdateExercise(exercise.id, { intensity_metric: value })}
                style={{ color: isDark ? "#ffffff" : "#000000" }}
                dropdownIconColor={isDark ? "#ffffff" : "#000000"}
                mode="dropdown"
              >
                {INTENSITY_OPTIONS.map((opt) => (
                  <Picker.Item 
                    key={opt.value} 
                    label={opt.label} 
                    value={opt.value} 
                    style={{ fontSize: 14, backgroundColor: isDark ? "#27272a" : "#ffffff", color: isDark ? "#ffffff" : "#000000" }} 
                  />
                ))}
              </Picker>
            </View>
            <View className="w-7" />
          </View>

          {/* Sets */}
          {exercise.sets.map((set, index) => {
            const volumeOption = VOLUME_OPTIONS.find(o => o.value === (exercise.volume_metric || "reps"));
            const intensityOption = INTENSITY_OPTIONS.find(o => o.value === (exercise.intensity_metric || "rpe"));
            return (
              <SetRow
                key={set.id || `set-${exercise.id}-${index}`}
                set={set}
                isVolumeRange={volumeOption?.isRange ?? false}
                isIntensityRange={intensityOption?.isRange ?? false}
                onUpdateVolume={(lower, upper) =>
                  onUpdateSet(exercise.id, set.number, {
                    volume_lower: lower,
                    volume_upper: upper,
                  })
                }
                onUpdateIntensity={(lower, upper) =>
                  onUpdateSet(exercise.id, set.number, {
                    intensity_lower: lower,
                    intensity_upper: upper,
                  })
                }
                onDelete={() => onDeleteSet(exercise.id, set.number)}
              />
            );
          })}

          {/* Add set button */}
          <Button
            title="Add Set"
            theme="tertiary"
            onPress={() => onAddSet(exercise.id)}
            styleClass="mt-2"
          />
        </View>
    </View>
  );
}