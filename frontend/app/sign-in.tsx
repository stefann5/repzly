import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput, Modal, View, Pressable } from "react-native";
import { z } from "zod";
import { SafeAreaView } from "@/components/SafeAreaView";
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { Toast } from "toastify-react-native";
import { getApiUrl, setApiUrl, resetApiUrl, DEFAULT_API_URL, initApiUrl } from "@/config/api";

const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [apiUrl, setApiUrlInput] = useState("");

  useEffect(() => {
    // Initialize API URL from storage on mount
    initApiUrl().then((url) => {
      setApiUrlInput(url);
    });
  }, []);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: SignInForm) => {
    try {
      await login(data.username, data.password);
      Toast.success("Welcome back!");
    } catch (error: any) {
      const message = error?.response?.data?.error || "Login failed. Please check your credentials.";
      Toast.error(message);
    }
  };

  const handleSaveUrl = async () => {
    if (!apiUrl.trim()) {
      Toast.error("Please enter a valid URL");
      return;
    }
    try {
      await setApiUrl(apiUrl);
      Toast.success("API URL updated");
      setModalVisible(false);
    } catch (error) {
      Toast.error("Failed to save URL");
    }
  };

  const handleResetUrl = async () => {
    await resetApiUrl();
    setApiUrlInput(DEFAULT_API_URL);
    Toast.success("API URL reset to default");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <KeyboardAwareScrollView
        bottomOffset={62}
        className="flex-1 px-6"
        contentContainerClassName="justify-center flex-1"
      >
        <Label variant="heading" weight="bold" styleClass="mb-8 font-atkinson">Sign In</Label>
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
          title="Configure API URL"
          theme="tertiary"
          styleClass="mt-3"
          onPress={() => setModalVisible(true)}
        />
      </KeyboardAwareScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="bg-white dark:bg-zinc-800 rounded-2xl p-6 mx-6 w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            <Label variant="heading" weight="bold" styleClass="mb-4">Configure API URL</Label>

            <Input
              label="API Base URL"
              placeholder="https://example.com"
              autoCapitalize="none"
              autoCorrect={false}
              value={apiUrl}
              onChangeText={setApiUrlInput}
              styleClass="mb-4"
            />

            <Label variant="caption" styleClass="mb-4 text-zinc-500">
              Default: {DEFAULT_API_URL}
            </Label>

            <View className="flex-row gap-2">
              <Button
                title="Reset"
                theme="secondary"
                styleClass="flex-1"
                onPress={handleResetUrl}
              />
              <Button
                title="Save"
                styleClass="flex-1"
                onPress={handleSaveUrl}
              />
            </View>

            <Button
              title="Cancel"
              theme="tertiary"
              styleClass="mt-2"
              onPress={() => setModalVisible(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
