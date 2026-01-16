import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { exerciseService } from "@/services/exercise";
import { Exercise } from "@/types/exercise";

const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercises: Exercise[]) => void;
  multiSelect?: boolean;
}

const ITEMS_PER_PAGE = 20;

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  multiSelect = true,
}: ExercisePickerModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [demoExercise, setDemoExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setCurrentPage(1);
      setExercises([]);
      loadExercises("", 1, true);
      setSelectedExercises([]);
    }
  }, [visible]);

  // Debounced search effect
  useEffect(() => {
    if (!visible) return;
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setExercises([]);
      loadExercises(searchQuery, 1, true);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const loadExercises = async (search: string, page: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    
    try {
      const response = await exerciseService.getAll({
        search: search || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      
      if (reset) {
        setExercises(response.exercises);
      } else {
        setExercises(prev => [...prev, ...response.exercises]);
      }
      setTotalPages(response.total_pages);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || "Failed to load exercises");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && currentPage < totalPages) {
      loadExercises(searchQuery, currentPage + 1, false);
    }
  }, [isLoadingMore, currentPage, totalPages, searchQuery]);

  const toggleExercise = (exercise: Exercise) => {
    if (multiSelect) {
      setSelectedExercises((prev) => {
        const isSelected = prev.some((e) => e.id === exercise.id);
        if (isSelected) {
          return prev.filter((e) => e.id !== exercise.id);
        } else {
          return [...prev, exercise];
        }
      });
    } else {
      setSelectedExercises([exercise]);
    }
  };

  const handleConfirm = () => {
    if (selectedExercises.length > 0) {
      onSelect(selectedExercises);
      setSelectedExercises([]);
    }
  };

  const handleCancel = () => {
    setSelectedExercises([]);
    setSearchQuery("");
    onClose();
  };

  const openDemonstration = (exercise: Exercise) => {
    setDemoExercise(exercise);
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const isSelected = selectedExercises.some((e) => e.id === item.id);

    return (
      <Pressable
        onPress={() => toggleExercise(item)}
        className={`flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700 ${
          isSelected ? "bg-blue-100 dark:bg-blue-900" : ""
        }`}
      >
        <View className="w-6 h-auto mr-3 items-center justify-center">
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#9CA3AF" />
          )}
        </View>
        <Label
          variant="body"
          weight={isSelected ? "semibold" : "regular"}
          styleClass="flex-1"
        >
          {item.name}
        </Label>
        {item.demonstration_link && (
          <Pressable
            onPress={() => openDemonstration(item)}
            className="ml-2 p-2"
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  const demoVideoId = demoExercise
    ? extractYoutubeVideoId(demoExercise.demonstration_link)
    : null;

  return (
    <>
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
              {multiSelect ? "Choose Exercises" : "Choose Exercise"}
            </Label>
          </View>

          {/* Search Bar */}
          <View className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
            <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center px-4">
              <Label color="error">{error}</Label>
              <Button
                title="Retry"
                theme="secondary"
                onPress={() => loadExercises(searchQuery, 1, true)}
                styleClass="mt-4"
              />
            </View>
          ) : exercises.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4">
              <Label color="secondary">
                {searchQuery ? "No exercises found" : "No exercises available"}
              </Label>
            </View>
          ) : (
            <FlatList
              data={exercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => item.id}
              className="flex-1"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
            />
          )}

          {/* Footer */}
          <View className="flex-row justify-between px-4 py-4 border-t border-gray-200 dark:border-zinc-700">
            <Button
              title="Cancel"
              theme="secondary"
              onPress={handleCancel}
              styleClass="flex-1 mr-2"
            />
            <Button
              title={"OK" + (multiSelect && selectedExercises.length > 0 ? ` (${selectedExercises.length})` : "")}
              theme="primary"
              onPress={handleConfirm}
              disabled={selectedExercises.length === 0}
              styleClass="flex-1 ml-2"
            />
          </View>
        </View>
      </Modal>

      {/* Demo Modal */}
      <Modal
        visible={!!demoExercise}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDemoExercise(null)}
      >
        <View className="flex-1 bg-white dark:bg-zinc-900">
          {/* Demo Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-700">
            <Pressable onPress={() => setDemoExercise(null)} className="p-1">
              <Ionicons name="close" size={28} color="#9CA3AF" />
            </Pressable>
            <Label variant="heading" weight="bold" styleClass="flex-1 text-center mr-8">
              {demoExercise?.name}
            </Label>
          </View>

          {/* YouTube Player */}
          <View className="flex-1 justify-center bg-black">
            {demoVideoId && (
              <YoutubePlayer
                height={300}
                videoId={demoVideoId}
                play={true}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
