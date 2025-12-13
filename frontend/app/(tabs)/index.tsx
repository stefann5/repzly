import { View } from "react-native";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
    const { logout } = useAuth();

    const onLogOut= () => {
        logout();
    };

    return (
        <View className="flex-1 justify-center px-6 bg-white dark:bg-zinc-900">
            <Button title="logout" onPress={onLogOut} />
        </View>
    );
}