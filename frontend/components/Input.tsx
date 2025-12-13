import { Text, TextInput, TextInputProps, View } from "react-native";
import React, { useState, forwardRef } from "react";
import { cn } from "../utils/utils";

type InputProps = {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  variant?: "outlined" | "filled" | "underlined";
  styleClass?: string;
  inputClass?: string;
  labelClass?: string;
} & TextInputProps;

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      disabled,
      variant = "outlined",
      styleClass,
      inputClass,
      labelClass,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View className={cn("w-full", styleClass)}>
        {/* Label */}
        {label && (
          <Text
            className={cn(
              "text-sm font-medium mb-1.5",
              error ? "text-red-500" : isFocused ? "text-blue-500" : "text-black dark:text-white",
              disabled && "opacity-50",
              labelClass
            )}
          >
            {label}
          </Text>
        )}

        {/* Input */}
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ minHeight: 47 }} // Fixed height to prevent size changes
          className={cn(
            "text-base text-black dark:text-white px-3 py-2.5",
            
            // Variant base styles - always use border to prevent size shifts
            variant === "outlined" && "border rounded-md",
            variant === "filled" && "rounded-md border border-transparent",
            variant === "underlined" && "border-b-2",
            
            // Default border colors (no focus, no error)
            !isFocused && !error && variant === "outlined" && "border-gray-300 dark:border-zinc-700",
            !isFocused && !error && variant === "underlined" && "border-gray-300",
            !isFocused && !error && variant === "filled" && "bg-gray-100",
            
            // Focus states
            isFocused && !error && variant === "outlined" && "border-blue-500",
            isFocused && !error && variant === "underlined" && "border-blue-500",
            isFocused && !error && variant === "filled" && "bg-blue-50 border-blue-500",
            
            // Error states
            error && variant === "outlined" && "border-red-500",
            error && variant === "underlined" && "border-red-500",
            error && variant === "filled" && "bg-red-50 border-red-500",
            
            // Disabled state
            disabled && "opacity-50 bg-gray-50",
            
            inputClass
          )}
          {...rest}
        />

        {/* Helper text or Error message */}
        {(helperText || error) && (
          <Text
            className={cn(
              "text-xs mt-1.5",
              error ? "text-red-500" : "text-gray-500"
            )}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";