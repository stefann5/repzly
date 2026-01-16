import { useState, useEffect } from "react";
import { Modal, View, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { WorkoutExercise } from "@/types/program";
import { useExerciseStore } from "@/utils/exerciseStore";

interface ReorderExercisesModalProps {
  visible: boolean;
  exercises: WorkoutExercise[];
  onClose: () => void;
  onSave: (exerciseIds: string[]) => void;
}

export function ReorderExercisesModal({
  visible,
  exercises,
  onClose,
  onSave,
}: ReorderExercisesModalProps) {
  const [orderedExercises, setOrderedExercises] = useState<WorkoutExercise[]>([]);
  const { getExerciseName } = useExerciseStore();

  useEffect(() => {
    if (visible) {
      setOrderedExercises([...exercises]);
    }
  }, [visible, exercises]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedExercises];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedExercises(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedExercises.length - 1) return;
    const newOrder = [...orderedExercises];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedExercises(newOrder);
  };

  const handleSave = () => {
    onSave(orderedExercises.map((e) => e.id));
    onClose();
  };

  const handleCancel = () => {
    setOrderedExercises([...exercises]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-white dark:bg-zinc-900">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200 dark:border-zinc-700">
          <Label variant="heading" weight="bold" styleClass="text-center">
            Reorder Exercises
          </Label>
          <Label variant="caption" color="secondary" styleClass="text-center mt-1">
            Use arrows to change order
          </Label>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          {orderedExercises.map((exercise, index) => (
            <View
              key={exercise.id}
              className="flex-row items-center p-3 mb-2 bg-gray-100 dark:bg-zinc-800 rounded-lg"
            >
              <View className="w-8 h-8 items-center justify-center bg-blue-500 rounded-full mr-3">
                <Label variant="body" weight="semibold" styleClass="text-white">
                  {index + 1}
                </Label>
              </View>
              <View className="flex-1">
                <Label variant="body" weight="medium" numberOfLines={1}>
                  {getExerciseName(exercise.exercise_id)}
                </Label>
                <Label variant="caption" color="secondary">
                  {exercise.sets.length} {exercise.sets.length === 1 ? "set" : "sets"}
                </Label>
              </View>
              <View className="flex-row">
                <Pressable
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-2"
                >
                  <Ionicons
                    name="chevron-up"
                    size={24}
                    color={index === 0 ? "#D1D5DB" : "#3b82f6"}
                  />
                </Pressable>
                <Pressable
                  onPress={() => moveDown(index)}
                  disabled={index === orderedExercises.length - 1}
                  className="p-2"
                >
                  <Ionicons
                    name="chevron-down"
                    size={24}
                    color={index === orderedExercises.length - 1 ? "#D1D5DB" : "#3b82f6"}
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View className="flex-row justify-between px-4 py-4 border-t border-gray-200 dark:border-zinc-700">
          <Button
            title="Cancel"
            theme="secondary"
            onPress={handleCancel}
            styleClass="flex-1 mr-2"
          />
          <Button
            title="Save"
            theme="primary"
            onPress={handleSave}
            styleClass="flex-1 ml-2"
          />
        </View>
      </View>
    </Modal>
  );
}
