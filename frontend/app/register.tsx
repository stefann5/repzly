import { Pressable, TextInput, View, useColorScheme } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/SafeAreaView";
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { Toast } from "toastify-react-native";
import { Ionicons } from "@expo/vector-icons";

const registerSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
    role: z.enum(["user", "coach"]),
}).superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Passwords do not match",
            path: ["confirmPassword"]
        });
    }
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
    const { register } = useAuth();
    const passwordRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const { control, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: "", password: "", email: "", confirmPassword: "", role: "user" },
    });

    const selectedRole = watch("role");

    const onSubmit = async (data: RegisterForm) => {
        try {
            await register(data.username, data.email, data.password, data.confirmPassword, data.role);
            Toast.success("Registration successful! Please check your email to verify your account.");
            router.replace("/sign-in");
        } catch (error: any) {
            const message = error?.response?.data?.error || "Registration failed. Please try again.";
            Toast.error(message);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">

            <KeyboardAwareScrollView
                    className="flex-1 px-6"
                    contentContainerClassName="justify-center flex-1"
                  >
                <Label variant="heading" weight="bold" styleClass="mb-6">Sign Up</Label>

                {/* Role Selector */}
                <View className="mb-6">
                    <Label variant="body" weight="medium" styleClass="mb-2">I want to</Label>
                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={() => setValue("role", "user")}
                            className={`flex-1 p-4 rounded-xl border-2 ${
                                selectedRole === "user"
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                            }`}
                        >
                            <View className="items-center">
                                <Ionicons
                                    name="fitness"
                                    size={28}
                                    color={selectedRole === "user" ? "#3b82f6" : isDark ? "#71717a" : "#a1a1aa"}
                                />
                                <Label
                                    variant="body"
                                    weight="medium"
                                    styleClass="mt-2"
                                    color={selectedRole === "user" ? "primary" : "secondary"}
                                >
                                    Train
                                </Label>
                                <Label
                                    variant="caption"
                                    color="secondary"
                                    styleClass="text-center mt-1"
                                >
                                    Follow programs & track workouts
                                </Label>
                            </View>
                        </Pressable>

                        <Pressable
                            onPress={() => setValue("role", "coach")}
                            className={`flex-1 p-4 rounded-xl border-2 ${
                                selectedRole === "coach"
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                            }`}
                        >
                            <View className="items-center">
                                <Ionicons
                                    name="clipboard"
                                    size={28}
                                    color={selectedRole === "coach" ? "#3b82f6" : isDark ? "#71717a" : "#a1a1aa"}
                                />
                                <Label
                                    variant="body"
                                    weight="medium"
                                    styleClass="mt-2"
                                    color={selectedRole === "coach" ? "primary" : "secondary"}
                                >
                                    Coach
                                </Label>
                                <Label
                                    variant="caption"
                                    color="secondary"
                                    styleClass="text-center mt-1"
                                >
                                    Create & share training programs
                                </Label>
                            </View>
                        </Pressable>
                    </View>
                </View>

                <Controller
                    control={control}
                    name="username"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Username"
                            placeholder=""
                            autoCapitalize="none"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.username?.message}
                            styleClass="mb-4"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Email"
                            placeholder=""
                            autoCapitalize="none"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.email?.message}
                            styleClass="mb-4"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            blurOnSubmit={false}
                            ref={emailRef}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Password"
                            secureTextEntry
                            placeholder=""
                            autoCapitalize="none"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.password?.message}
                            styleClass="mb-4"
                            returnKeyType="next"
                            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                            blurOnSubmit={false}
                            ref={passwordRef}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                            label="Confirm Password"
                            placeholder=""
                            secureTextEntry
                            autoCapitalize="none"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.confirmPassword?.message}
                            styleClass="mb-6"
                            ref={confirmPasswordRef}
                            returnKeyType="go"
                            onSubmitEditing={handleSubmit(onSubmit)}
                        />
                    )}
                />

                <Button
                    title="Sign Up"
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    styleClass="w-full"
                />

                <Button
                    title="Already have an account? Sign In"
                    theme="tertiary"
                    styleClass="mt-3 font-atkinson-italic"
                    onPress={() => router.back()}
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
