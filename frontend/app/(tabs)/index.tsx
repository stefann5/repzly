import { Text, View } from "react-native";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "@/components/SafeAreaView";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";


export default function IndexScreen() {
    const { logout } = useAuth();

    const onLogOut = () => {
        logout();
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">

            <View className="flex-row py-2">
                <View className="items-center justify-center flex-none w-1/6">
                    <Label>#</Label>
                </View>
                <View className="items-center justify-center flex-none w-5/12">
                    <Label>Volume</Label>
                </View>
                <View className="items-center justify-center flex-none w-5/12">
                    <Label>Intensity</Label>
                </View>
            </View>
            <View className="flex-row">
                <View className="items-center justify-center flex-none w-1/6">
                    <Label>#</Label>
                </View>
                <View className="items-center justify-center flex-none w-5/12">
                    <Input placeholder="Search" styleClass="px-2 py-2"/>
                </View>
                <View className="items-center justify-center flex-none w-5/12">
                    <Input placeholder="Search" styleClass="px-2 py-2"/>
                </View>
            </View>
        </SafeAreaView>

    );
}