import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "./Label";
import { Button } from "./Button";
import { ExerciseItem } from "./ExerciseItem";
import { WorkoutGroup, WorkoutExercise, Set } from "@/types/program";
import { cn } from "@/utils/utils";

type WorkoutCardProps = {
  workout: WorkoutGroup;
  onUpdateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<Set>) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setNumber: number) => void;
  onAddExercise: (workoutNumber: number) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onDeleteWorkout: (workoutNumber: number) => void;
  styleClass?: string;
};

export function WorkoutCard({
  workout,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onAddExercise,
  onDeleteExercise,
  onDeleteWorkout,
  styleClass,
}: WorkoutCardProps) {
  return (
    <View
      className={cn(
        "border border-gray-300 dark:border-zinc-600 rounded-xl mb-4 overflow-hidden",
        styleClass
      )}
    >
      {/* Workout header */}
      <View className="flex-row items-center justify-between p-3 bg-gray-100 dark:bg-zinc-800">
        <Label variant="body" weight="semibold">
          Workout {workout.workout_number}
        </Label>
        <Pressable
          onPress={() => onDeleteWorkout(workout.workout_number)}
          className="p-1"
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>

      {/* Exercises */}
      <View className="p-3">
        {workout.exercises.map((exercise) => (
          <ExerciseItem
            key={exercise.id}
            exercise={exercise}
            onUpdateExercise={onUpdateExercise}
            onUpdateSet={onUpdateSet}
            onAddSet={onAddSet}
            onDeleteSet={onDeleteSet}
            onDeleteExercise={onDeleteExercise}
          />
        ))}

        {/* Add exercise button */}
        <Button
          title="Add Exercise"
          theme="secondary"
          onPress={() => onAddExercise(workout.workout_number)}
          styleClass="mt-2"
        />
      </View>
    </View>
  );
}
