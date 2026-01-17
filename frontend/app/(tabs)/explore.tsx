import { View, FlatList, RefreshControl, ActivityIndicator, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { ProgramCard } from "@/components/ProgramCard";
import { Program } from "@/types/program";
import { useProgramSearch } from "@/hooks/useProgramSearch";

export default function ExploreScreen() {
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
  } = useProgramSearch("public");

  const handleProgramPress = (program: Program) => {
    router.push(`/view-program?programId=${program.id}` as any);
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

        <Label variant="caption" color="secondary">
          {total} program{total !== 1 ? "s" : ""} found
        </Label>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => handleProgramPress(item)}
            showDelete={false}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Label variant="body" color="secondary" styleClass="mt-4">
              {loading ? "Loading..." : "No programs found"}
            </Label>
            {!loading && (
              <Label variant="caption" color="tertiary" styleClass="mt-1">
                Try different search terms
              </Label>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
