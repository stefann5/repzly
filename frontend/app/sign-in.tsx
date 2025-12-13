import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { Text } from "react-native"
import { useAuthStore } from "@/utils/authStore";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef } from "react";

const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: SignInForm) => {
    login(data.username, data.password);
    // Handle sign in logic here
  };

  return (
      <KeyboardAvoidingView className="flex-1 justify-center px-6 bg-white dark:bg-zinc-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Label variant="heading" weight="bold" styleClass="mb-8 font-atkinson">Sign In</Label>
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
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder=""
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              styleClass="mb-6"
              ref={passwordRef}
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          styleClass="w-full"
        />

        <Button
          title="Forgot password?"
          theme="tertiary"
          styleClass="mt-3"
        />
      </KeyboardAvoidingView>
  );
}