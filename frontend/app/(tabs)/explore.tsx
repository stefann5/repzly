import { View } from "react-native";
import { Button } from "@/components/Button";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="items-center justify-center flex-1 p-4">
        <Label variant="heading" weight="bold" styleClass="mb-4">
          Explore
        </Label>
        <Label variant="body" color="secondary">
          Coming soon...
        </Label>
      </View>
    </SafeAreaView>
  );
}
