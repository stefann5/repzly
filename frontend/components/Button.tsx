import { Pressable, PressableProps, Text } from "react-native";
import React from "react";
import { cn } from "../utils/utils";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  theme?: "primary" | "secondary" | "tertiary";
  disabled?: boolean;
  styleClass?: string;
  textClass?: string;
} & PressableProps;

export function Button({
  title,
  onPress,
  theme = "primary",
  disabled,
  styleClass,
  textClass,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-center rounded-md px-3 py-2 border",
        theme === "primary" && "bg-blue-500 border-blue-500 active:bg-blue-600 active:border-blue-600",
        theme === "secondary" && "bg-white border-gray-300 active:bg-gray-100",
        theme === "tertiary" && "bg-transparent border-transparent active:opacity-70",
        disabled && "opacity-50",
        styleClass
      )}
      disabled={disabled}
      {...rest}
    >
      <Text
        className={cn(
          "text-base font-medium",
          theme === "primary" && "text-white",
          theme === "secondary" && "text-gray-900",
          theme === "tertiary" && "text-blue-500",
          textClass
        )}
      >
        {title}
      </Text>
    </Pressable>
  );
}