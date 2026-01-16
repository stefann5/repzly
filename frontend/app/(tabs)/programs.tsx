import { View, FlatList, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ProgramCard } from "@/components/ProgramCard";
import { useProgram } from "@/hooks/useProgram";
import { Program } from "@/types/program";
import { useProgramStore } from "@/utils/programStore";

export default function ProgramsScreen() {
  const { programs, fetchPrograms, removeProgram } = useProgram();
  const { setCurrentProgram, setWorkouts, setCurrentWeek, setCurrentWorkoutNumber } = useProgramStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms();
    setRefreshing(false);
  };

  const handleProgramPress = (program: Program) => {
    // Set program from list data immediately and navigate
    setCurrentProgram(program);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await removeProgram(programId);
    } catch (err) {
      console.error("Failed to delete program:", err);
    }
  };

  const handleCreateNew = () => {
    setCurrentProgram(null);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="flex-row items-center justify-between px-4 py-4">
        <Label variant="heading" weight="bold">
          My Programs
        </Label>
        <Button
          title="New"
          theme="primary"
          onPress={handleCreateNew}
        />
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => handleProgramPress(item)}
            onDelete={() => handleDeleteProgram(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              No programs yet
            </Label>
            <Label variant="caption" color="tertiary" styleClass="mt-1">
              Create your first program to get started
            </Label>
          </View>
        }
      />
    </SafeAreaView>
  );
}
