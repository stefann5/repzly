import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";

export default function IndexScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="items-center justify-center flex-1 px-8">
        <Ionicons name="construct-outline" size={64} color="#9CA3AF" />
        <Label variant="heading" weight="bold" styleClass="mt-6 text-center">
          Coming Soon
        </Label>
        <Label variant="body" color="secondary" styleClass="mt-2 text-center">
          We're working on something exciting. Stay tuned!
        </Label>
      </View>
    </SafeAreaView>
  );
}
