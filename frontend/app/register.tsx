import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { useAuth } from "@/hooks/useAuth";
import { useRef } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/SafeAreaView";
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';

const registerSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
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
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: "", password: "", email: "", confirmPassword: "" },
    });

    const onSubmit = (data: RegisterForm) => {
        register(data.username, data.email, data.password, data.confirmPassword);
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">

            <KeyboardAwareScrollView
                    className="flex-1 px-6"
                    contentContainerClassName="justify-center flex-1"
                  >
                <Label variant="heading" weight="bold" styleClass="mb-8">Sign Up</Label>
                {/* <Text className="text-white font-atkinson">REPZLY 0</Text> */}
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