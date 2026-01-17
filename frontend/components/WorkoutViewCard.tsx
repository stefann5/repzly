import { View, Pressable } from "react-native";
import { Label } from "./Label";
import { WorkoutGroup } from "@/types/program";
import { useExerciseStore } from "@/utils/exerciseStore";

type WorkoutViewCardProps = {
  workout: WorkoutGroup;
  order: number;
  onPress: () => void;
};

export function WorkoutViewCard({
  workout,
  order,
  onPress,
}: WorkoutViewCardProps) {
  const { getExerciseName } = useExerciseStore();
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <Pressable
      onPress={onPress}
      className="p-4 mb-3 bg-white border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Label variant="body" weight="semibold">
            Workout {order}
          </Label>
          <Label variant="caption" color="secondary" styleClass="mt-1">
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} • {totalSets} set{totalSets !== 1 ? "s" : ""}
          </Label>
        </View>
      </View>
      {workout.exercises.length > 0 && (
        <View className="mt-2">
          {workout.exercises.map((e, index) => (
            <View key={e.id || index} className="flex-row justify-between">
              <Label variant="caption" color="primary">
                {getExerciseName(e.exercise_id)}
              </Label>
              <Label variant="body" color="primary">
                {e.sets.length === 1 ? "1 set" : `${e.sets.length} sets`}
              </Label>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
