import { Text, TextProps } from "react-native";
import React from "react";
import { cn } from "../utils/utils";

type LabelProps = {
  children: React.ReactNode;
  variant?: "heading" | "subheading" | "body" | "caption" | "label";
  weight?: "regular" | "medium" | "semibold" | "bold";
  color?: "primary" | "secondary" | "tertiary" | "error" | "success";
  align?: "left" | "center" | "right";
  styleClass?: string;
} & TextProps;

export function Label({
  children,
  variant = "body",
  weight = "regular",
  color = "primary",
  align = "left",
  styleClass,
  ...rest
}: LabelProps) {
  return (
    <Text
      className={cn(
        // Variant styles
        variant === "heading" && "text-3xl",
        variant === "subheading" && "text-2xl",
        variant === "body" && "text-base",
        variant === "caption" && "text-sm",
        variant === "label" && "text-xs",
        
        // Weight styles
        weight === "regular" && "font-normal",
        weight === "medium" && "font-medium",
        weight === "semibold" && "font-semibold",
        weight === "bold" && "font-bold",
        
        // Color styles
        color === "primary" && "text-black dark:text-white",
        color === "secondary" && "text-gray-600 dark:text-gray-400",
        color === "tertiary" && "text-gray-400",
        color === "error" && "text-red-500",
        color === "success" && "text-green-500",
        
        // Alignment
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        
        styleClass
      )}
      {...rest}
    >
      {children}
    </Text>
  );
}