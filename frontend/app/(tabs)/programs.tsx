import { View, FlatList, RefreshControl, ActivityIndicator, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ProgramCard } from "@/components/ProgramCard";
import { Program } from "@/types/program";
import { useProgramStore } from "@/utils/programStore";
import { useProgramSearch } from "@/hooks/useProgramSearch";

export default function ProgramsScreen() {
  const { setCurrentProgram, setWorkouts, setCurrentWeek, setCurrentWorkoutNumber } = useProgramStore();
  const router = useRouter();

  const {
    programs,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    total,
    refresh,
    loadMore,
    deleteProgram,
  } = useProgramSearch("mine");

  const handleProgramPress = (program: Program) => {
    setCurrentProgram(program);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
  };

  const handleCreateNew = () => {
    setCurrentProgram(null);
    setWorkouts([]);
    setCurrentWeek(1);
    setCurrentWorkoutNumber(null);
    router.push("/create-program");
  };

  const handleDeleteProgram = (programId: string, programName: string) => {
    Alert.alert(
      "Delete Program",
      `Are you sure you want to delete "${programName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProgram(programId),
        },
      ]
    );
  };

  const renderFooter = () => {
    if (!loading || programs.length === 0) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Label variant="heading" weight="bold">
            My Programs
          </Label>
          <Button title="New" theme="primary" onPress={handleCreateNew} />
        </View>

        <View className="mb-2">
          <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or tag..."
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

        {total > 0 && (
          <Label variant="caption" color="secondary">
            {total} program{total !== 1 ? "s" : ""}
          </Label>
        )}
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => handleProgramPress(item)}
            onDelete={() => handleDeleteProgram(item.id, item.name)}
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            {loading ?
              (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 50 }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) :
              (<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="barbell-outline" size={48} color="#9CA3AF" />

                <Label variant="body" color="secondary" styleClass="mt-4">
                  {searchQuery ? "No programs found" : "No programs yet"}
                </Label>
              </View>

              )

            }

            {!loading && (
              <Label variant="caption" color="tertiary" styleClass="mt-1">
                {searchQuery
                  ? "Try different search terms"
                  : "Create your first program to get started"}
              </Label>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
