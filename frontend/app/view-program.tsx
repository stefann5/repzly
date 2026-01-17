import { View, ScrollView, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Button } from "@/components/Button";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { useViewProgramStore } from "@/utils/viewProgramStore";

export default function ViewProgramScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { viewedProgram, isLoading, error, loadProgram, clearViewState } = useViewProgramStore();

  useEffect(() => {
    if (programId) {
      loadProgram(programId);
    }
  }, [programId]);

  const handleBack = () => {
    clearViewState();
    router.back();
  };

  const handleViewWorkouts = () => {
    router.push("/view-program-editor");
  };

  if (isLoading && !viewedProgram) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!viewedProgram) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white dark:bg-zinc-900">
        <Label variant="body" color="secondary">Program not found</Label>
        <Button title="Go Back" theme="tertiary" onPress={handleBack} styleClass="mt-4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Close" theme="tertiary" onPress={handleBack} />
        <Label variant="subheading" weight="semibold" numberOfLines={1} styleClass="flex-1 mx-2 text-center">
          {viewedProgram.name}
        </Label>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 20 }}>
        {error && (
          <View className="p-3 mb-4 bg-red-100 rounded-lg dark:bg-red-900">
            <Label color="error">{error}</Label>
          </View>
        )}

        {/* Program Image */}
        {viewedProgram.image_url && (
          <View className="mb-4">
            <Image
              source={{ uri: viewedProgram.image_url }}
              style={{ width: "100%", height: 180, borderRadius: 12 }}
              contentFit="cover"
            />
          </View>
        )}
        {/* Description */}
        {viewedProgram.description && (
          <View className="mb-4">
            <Label variant="caption" color="secondary" styleClass="mb-1">
              Description
            </Label>
            <View className="p-3 bg-gray-100 rounded-lg dark:bg-zinc-800">
              <Label variant="body">
                {viewedProgram.description}
              </Label>
            </View>
          </View>
        )}

        {/* Tags */}
        {viewedProgram.tags && viewedProgram.tags.length > 0 && (
          <View className="mb-4">
            <Label variant="caption" color="secondary" styleClass="mb-1">
              Tags
            </Label>
            <View className="flex-row flex-wrap">
              {viewedProgram.tags.map((tag, index) => (
                <View
                  key={index}
                  className="px-3 py-1 mr-2 mb-2 bg-blue-100 rounded-full dark:bg-blue-900"
                >
                  <Label variant="caption" color="primary">
                    {tag}
                  </Label>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Number of Weeks */}
        <View className="mb-4">
          <Label variant="caption" color="secondary" styleClass="mb-1">
            Duration
          </Label>
          <View className="p-3 bg-gray-100 rounded-lg dark:bg-zinc-800">
            <Label variant="body">
              {viewedProgram.total_weeks} week{viewedProgram.total_weeks !== 1 ? "s" : ""}
            </Label>
          </View>
        </View>

        {/* View Workouts Button */}
        <Button
          title="View Workouts"
          onPress={handleViewWorkouts}
          styleClass="w-full mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
