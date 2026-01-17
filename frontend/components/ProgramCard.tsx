import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { Program } from "@/types/program";

export function ProgramCard({ program, onPress, onDelete, showDelete = true }: {
  program: Program;
  onPress: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const isDraft = !program.created_at;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden bg-white border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 active:opacity-70"
    >
      {program.image_url && (
        <Image
          source={{ uri: program.image_url }}
          style={{ width: "100%", height: 180 }}
          contentFit="cover"
        />
      )}
      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Label variant="body" weight="semibold">
                {program.name}
              </Label>
              {isDraft && (
                <View className="px-2 py-0.5 ml-2 bg-yellow-100 rounded dark:bg-yellow-900">
                  <Label variant="caption" color="secondary">
                    Draft
                  </Label>
                </View>
              )}
            </View>
            {program.description && (
              <Label variant="caption" color="secondary" styleClass="mt-1" numberOfLines={2}>
                {program.description}
              </Label>
            )}
            <View className="flex-row items-center mt-2">
              <Label variant="caption" color="secondary">
                {program.total_weeks} weeks
              </Label>
              {program.tags.length > 0 && (
                <Label variant="caption" color="secondary" styleClass="ml-2">
                  • {program.tags.slice(0, 2).join(", ")}
                </Label>
              )}
            </View>
          </View>
          {showDelete && onDelete && (
            <Pressable onPress={onDelete} className="p-2">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
