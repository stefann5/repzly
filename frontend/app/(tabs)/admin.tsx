import { View, FlatList, Pressable, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { useAuth } from "@/hooks/useAuth";
import { exerciseService, CreateExerciseRequest, UpdateExerciseRequest } from "@/services/exercise";
import { Exercise, MuscleIntensity } from "@/types/exercise";
import { Toast } from "toastify-react-native";
import { useColorScheme } from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

const MUSCLE_OPTIONS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Quadriceps", "Hamstrings", "Glutes", "Calves", "Abs", "Obliques",
  "Lower Back", "Traps", "Lats", "Neck"
];

export default function AdminScreen() {
  const { isAdmin } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDemoLink, setFormDemoLink] = useState("");
  const [formMuscles, setFormMuscles] = useState<MuscleIntensity[]>([]);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const response = await exerciseService.getAll({
        search: search || undefined,
        page,
        limit: 20,
      });
      setExercises(response.exercises);
      setTotalPages(response.total_pages);
    } catch (error) {
      Toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const resetForm = () => {
    setFormName("");
    setFormDemoLink("");
    setFormMuscles([]);
    setEditingExercise(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormName(exercise.name);
    setFormDemoLink(exercise.demonstration_link);
    setFormMuscles([...exercise.muscles]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Toast.error("Exercise name is required");
      return;
    }

    if (formMuscles.length === 0) {
      Toast.error("At least one muscle group is required");
      return;
    }

    setSaving(true);
    try {
      if (editingExercise) {
        // Update existing exercise
        const updateData: UpdateExerciseRequest = {
          name: formName.trim(),
          demonstration_link: formDemoLink.trim(),
          muscles: formMuscles,
        };
        await exerciseService.update(editingExercise.id, updateData);
        Toast.success("Exercise updated");
      } else {
        // Create new exercise
        const createData: CreateExerciseRequest = {
          name: formName.trim(),
          demonstration_link: formDemoLink.trim(),
          muscles: formMuscles,
        };
        await exerciseService.create(createData);
        Toast.success("Exercise created");
      }
      closeModal();
      fetchExercises();
    } catch (error) {
      Toast.error(editingExercise ? "Failed to update exercise" : "Failed to create exercise");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await exerciseService.delete(exercise.id);
              Toast.success("Exercise deleted");
              fetchExercises();
            } catch (error) {
              Toast.error("Failed to delete exercise");
            }
          },
        },
      ]
    );
  };

  const toggleMuscle = (muscle: string) => {
    const existingIndex = formMuscles.findIndex(m => m.muscle === muscle);
    if (existingIndex >= 0) {
      // Remove muscle
      setFormMuscles(formMuscles.filter(m => m.muscle !== muscle));
    } else {
      // Add muscle with default intensity of 5
      setFormMuscles([...formMuscles, { muscle, intensity: 5 }]);
    }
  };

  const updateMuscleIntensity = (muscle: string, intensity: number) => {
    setFormMuscles(formMuscles.map(m =>
      m.muscle === muscle ? { ...m, intensity } : m
    ));
  };

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
        <View className="items-center justify-center flex-1 px-8">
          <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
          <Label variant="heading" weight="bold" styleClass="mt-6 text-center">
            Access Denied
          </Label>
          <Label variant="body" color="secondary" styleClass="mt-2 text-center">
            You need admin privileges to access this section.
          </Label>
        </View>
      </SafeAreaView>
    );
  }

  const renderExercise = ({ item }: { item: Exercise }) => (
    <View
      className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
    >
      <View className="flex-1">
        <Label variant="body" weight="medium">
          {item.name}
        </Label>
        <Label variant="caption" color="secondary">
          {item.muscles.map(m => m.muscle).join(", ")}
        </Label>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => openEditModal(item)}
          className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30"
        >
          <Ionicons name="pencil" size={18} color={isDark ? "#60a5fa" : "#2563eb"} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"
        >
          <Ionicons name="trash" size={18} color={isDark ? "#f87171" : "#dc2626"} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <View className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Label variant="heading" weight="bold">
            Exercise Catalog
          </Label>
          <View className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Label variant="caption" color="primary">
              Admin
            </Label>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center px-3 mb-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 ml-2 text-zinc-900 dark:text-zinc-100"
            placeholder="Search exercises..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setPage(1);
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Exercise List */}
        {loading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color={isDark ? "#3b82f6" : "#2563eb"} />
          </View>
        ) : exercises.length === 0 ? (
          <View className="items-center justify-center flex-1">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4 text-center">
              No exercises found
            </Label>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View className="flex-row items-center justify-center gap-4 py-4">
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg ${page === 1 ? "opacity-50" : ""}`}
            >
              <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#000"} />
            </Pressable>
            <Label variant="body">
              Page {page} of {totalPages}
            </Label>
            <Pressable
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg ${page === totalPages ? "opacity-50" : ""}`}
            >
              <Ionicons name="chevron-forward" size={24} color={isDark ? "#fff" : "#000"} />
            </Pressable>
          </View>
        )}

        {/* Floating Add Button */}
        <Pressable
          onPress={openCreateModal}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>

      {/* Create/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-zinc-800 rounded-t-3xl max-h-[90%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <Label variant="heading" weight="bold">
                {editingExercise ? "Edit Exercise" : "New Exercise"}
              </Label>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
              </Pressable>
            </View>

            <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <Input
                label="Exercise Name"
                placeholder="e.g., Bench Press"
                value={formName}
                onChangeText={setFormName}
                styleClass="mb-4"
              />

              {/* Demo Link Input */}
              <Input
                label="Demonstration Link (optional)"
                placeholder="https://youtube.com/..."
                value={formDemoLink}
                onChangeText={setFormDemoLink}
                autoCapitalize="none"
                styleClass="mb-4"
              />

              {/* Muscle Selection */}
              <Label variant="body" weight="medium" styleClass="mb-2">
                Target Muscles
              </Label>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {MUSCLE_OPTIONS.map((muscle) => {
                  const isSelected = formMuscles.some(m => m.muscle === muscle);
                  return (
                    <Pressable
                      key={muscle}
                      onPress={() => toggleMuscle(muscle)}
                      className={`px-3 py-2 rounded-full ${
                        isSelected
                          ? "bg-blue-600"
                          : "bg-zinc-100 dark:bg-zinc-700"
                      }`}
                    >
                      <Label
                        variant="caption"
                        styleClass={isSelected ? "text-white" : ""}
                      >
                        {muscle}
                      </Label>
                    </Pressable>
                  );
                })}
              </View>

              {/* Intensity Sliders for Selected Muscles */}
              {formMuscles.length > 0 && (
                <View className="mb-6">
                  <Label variant="body" weight="medium" styleClass="mb-3">
                    Muscle Intensity (1-10)
                  </Label>
                  {formMuscles.map((muscleIntensity) => (
                    <View key={muscleIntensity.muscle} className="mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <Label variant="caption">{muscleIntensity.muscle}</Label>
                        <Label variant="caption" weight="medium">
                          {muscleIntensity.intensity}
                        </Label>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() => updateMuscleIntensity(
                            muscleIntensity.muscle,
                            Math.max(1, muscleIntensity.intensity - 1)
                          )}
                          className="w-8 h-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700"
                        >
                          <Ionicons name="remove" size={16} color={isDark ? "#fff" : "#000"} />
                        </Pressable>
                        <View className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                          <View
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${muscleIntensity.intensity * 10}%` }}
                          />
                        </View>
                        <Pressable
                          onPress={() => updateMuscleIntensity(
                            muscleIntensity.muscle,
                            Math.min(10, muscleIntensity.intensity + 1)
                          )}
                          className="w-8 h-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700"
                        >
                          <Ionicons name="add" size={16} color={isDark ? "#fff" : "#000"} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Save Button */}
              <View className="pb-8">
                <Button
                  title={saving ? "Saving..." : (editingExercise ? "Update Exercise" : "Create Exercise")}
                  onPress={handleSave}
                  disabled={saving}
                />
                <Button
                  title="Cancel"
                  theme="secondary"
                  onPress={closeModal}
                  styleClass="mt-2"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
