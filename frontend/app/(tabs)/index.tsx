import { View, FlatList, RefreshControl, ActivityIndicator, Pressable, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { StartedProgram } from "@/types/startedProgram";
import { useStartedProgramStore } from "@/utils/startedProgramStore";
import { useAuth } from "@/hooks/useAuth";

export default function StartedProgramsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [startingProgramId, setStartingProgramId] = useState<string | null>(null);
  const {
    startedPrograms,
    isLoadingPrograms,
    loadStartedPrograms,
    deleteStartedProgram,
    setActiveStartedProgram,
    startWorkout,
  } = useStartedProgramStore();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadStartedPrograms();
  }, []);

  const handleProgramPress = (program: StartedProgram) => {
    // If program is finished, just show info
    if (program.current_workout_number === null) {
      Alert.alert("Program Completed", "You've finished this program!");
      return;
    }

    // Set active program and navigate to workout screen
    setActiveStartedProgram(program);
    router.push("/active-workout");
  };

  const handleStartWorkout = async (program: StartedProgram) => {
    // If program is finished, just show info
    if (program.current_workout_number === null) {
      Alert.alert("Program Completed", "You've finished this program!");
      return;
    }

    // If workout already started, just navigate
    if (program.workout_started) {
      setActiveStartedProgram(program);
      router.push("/active-workout");
      return;
    }

    // Start the workout immediately then navigate
    setStartingProgramId(program.id);
    try {
      setActiveStartedProgram(program);
      await startWorkout(program.id);
      router.push("/active-workout");
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to start workout";
      Alert.alert("Error", message);
    } finally {
      setStartingProgramId(null);
    }
  };

  const handleDeleteProgram = (program: StartedProgram) => {
    Alert.alert(
      "Remove Started Program",
      `Are you sure you want to remove "${program.program_name}" from your started programs?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStartedProgram(program.id);
            } catch (error: any) {
              const message = error.response?.data?.error || "Failed to remove program";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  };

  const handleViewHistory = (program: StartedProgram) => {
    router.push({
      pathname: "/program-history",
      params: { startedProgramId: program.id },
    });
  };

  const getButtonText = (program: StartedProgram): string => {
    if (startingProgramId === program.id) {
      return "Starting...";
    }
    if (program.current_workout_number === null) {
      return "Completed";
    }
    if (program.workout_started) {
      return "Continue Workout";
    }
    return "Start Workout";
  };

  const renderItem = ({ item }: { item: StartedProgram }) => {
    const isFinished = item.current_workout_number === null;
    const isStarting = startingProgramId === item.id;

    return (
      <Pressable
        onPress={() => handleProgramPress(item)}
        className="mb-3 overflow-hidden bg-white border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 active:opacity-70"
      >
        {/* Program Image */}
        {item.program_image_url && (
          <Image
            source={{ uri: item.program_image_url }}
            style={{ width: "100%", height: 180 }}
            contentFit="cover"
          />
        )}
        
        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Label variant="body" weight="semibold">
                {item.program_name}
              </Label>
              <View className="flex-row items-center mt-1">
                {isFinished ? (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Label variant="caption" color="secondary" styleClass="ml-1">
                      Completed
                    </Label>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="barbell-outline" size={14} color="#9CA3AF" />
                    <Label variant="caption" color="secondary" styleClass="ml-1">
                      Workout {item.current_workout_number}
                    </Label>
                    {item.workout_started && (
                      <View className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                        <Label variant="caption" style={{ color: "#f59e0b", fontSize: 10 }}>
                          In Progress
                        </Label>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteProgram(item);
              }}
              className="p-2 -mr-2 -mt-1"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View className="flex-row mt-3 gap-2">
            {!isFinished && (
              <Button
                title={getButtonText(item)}
                theme="primary"
                onPress={() => handleStartWorkout(item)}
                disabled={isStarting}
                styleClass="flex-1 py-3"
              />
            )}
            <Button
              title="History"
              theme="secondary"
              onPress={() => handleViewHistory(item)}
              styleClass={isFinished ? "flex-1 py-3" : "py-3 px-4"}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <View className="flex-row items-start justify-between px-4 py-4">
        <View>
          <Label variant="heading" weight="bold">
            Started Programs
          </Label>
          {startedPrograms.length > 0 && (
            <Label variant="caption" color="secondary" styleClass="mt-1">
              {startedPrograms.length} program{startedPrograms.length !== 1 ? "s" : ""}
            </Label>
          )}
        </View>
        <Pressable
          onPress={handleLogout}
          className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </Pressable>
      </View>

      <FlatList
        data={startedPrograms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPrograms}
            onRefresh={loadStartedPrograms}
          />
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 50 }}>
            {isLoadingPrograms ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              <>
                <Ionicons name="fitness-outline" size={48} color="#9CA3AF" />
                <Label variant="body" color="secondary" styleClass="mt-4">
                  No started programs
                </Label>
                <Label variant="caption" color="tertiary" styleClass="mt-1">
                  Start a program from Explore or My Programs
                </Label>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
