import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { z } from "zod";
import { SafeAreaView } from "@/components/SafeAreaView";
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';

const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: SignInForm) => {
    login(data.username, data.password);
    // Handle sign in logic here
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <KeyboardAwareScrollView
        bottomOffset={62}
        className="flex-1 px-6"
        contentContainerClassName="justify-center flex-1"
      >
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
          title="Sign Up"
          theme="secondary"
          styleClass="mt-3"
          onPress={() => router.push('/register')}
        />

        <Button
          title="Forgot password?"
          theme="tertiary"
          styleClass="mt-3"
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}