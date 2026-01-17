import { View, Text, Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastProps = {
  text1: string;
  text2?: string;
  type: "success" | "error" | "info" | "warn" | "default";
  hide: () => void;
};

const TOAST_CONFIG = {
  success: {
    icon: "checkmark-circle" as const,
    lightBg: "#ecfdf5",
    darkBg: "#064e3b",
    lightBorder: "#a7f3d0",
    darkBorder: "#065f46",
    lightIcon: "#059669",
    darkIcon: "#34d399",
  },
  error: {
    icon: "close-circle" as const,
    lightBg: "#fef2f2",
    darkBg: "#7f1d1d",
    lightBorder: "#fecaca",
    darkBorder: "#991b1b",
    lightIcon: "#dc2626",
    darkIcon: "#f87171",
  },
  info: {
    icon: "information-circle" as const,
    lightBg: "#eff6ff",
    darkBg: "#1e3a5f",
    lightBorder: "#bfdbfe",
    darkBorder: "#1e40af",
    lightIcon: "#2563eb",
    darkIcon: "#60a5fa",
  },
  warn: {
    icon: "warning" as const,
    lightBg: "#fffbeb",
    darkBg: "#78350f",
    lightBorder: "#fde68a",
    darkBorder: "#92400e",
    lightIcon: "#d97706",
    darkIcon: "#fbbf24",
  },
  default: {
    icon: "notifications" as const,
    lightBg: "#f9fafb",
    darkBg: "#27272a",
    lightBorder: "#e5e7eb",
    darkBorder: "#3f3f46",
    lightIcon: "#6b7280",
    darkIcon: "#9ca3af",
  },
};

export function CustomToast({ text1, text2, type, hide }: ToastProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.default;

  const backgroundColor = isDark ? config.darkBg : config.lightBg;
  const borderColor = isDark ? config.darkBorder : config.lightBorder;
  const iconColor = isDark ? config.darkIcon : config.lightIcon;
  const textColor = isDark ? "#f4f4f5" : "#18181b";
  const secondaryTextColor = isDark ? "#a1a1aa" : "#52525b";

  return (
    <View
      style={{
        width: "90%",
        backgroundColor,
        borderWidth: 1,
        borderColor,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Ionicons name={config.icon} size={24} color={iconColor} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            color: textColor,
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          {text1}
        </Text>
        {text2 && (
          <Text
            style={{
              color: secondaryTextColor,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {text2}
          </Text>
        )}
      </View>
      <Pressable onPress={hide} hitSlop={8}>
        <Ionicons
          name="close"
          size={20}
          color={isDark ? "#71717a" : "#a1a1aa"}
        />
      </Pressable>
    </View>
  );
}

export const toastConfig = {
  success: (props: ToastProps) => <CustomToast {...props} type="success" />,
  error: (props: ToastProps) => <CustomToast {...props} type="error" />,
  info: (props: ToastProps) => <CustomToast {...props} type="info" />,
  warn: (props: ToastProps) => <CustomToast {...props} type="warn" />,
  default: (props: ToastProps) => <CustomToast {...props} type="default" />,
};
