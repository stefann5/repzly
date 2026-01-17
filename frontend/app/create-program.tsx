import { View, ScrollView, Pressable, Switch } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { useProgram } from "@/hooks/useProgram";
import { programService } from "@/services/program";

const programSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  total_weeks: z.string().min(1, "Number of weeks is required"),
});

type ProgramForm = z.infer<typeof programSchema>;

export default function CreateProgramScreen() {
  const { currentProgram, createProgram, updateProgram, clearCurrentProgram, isLoading, error } = useProgram();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const isEditMode = !!currentProgram;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      description: "",
      tags: "",
      total_weeks: "4",
    },
  });

  // Populate form when editing an existing program
  useEffect(() => {
    if (currentProgram) {
      reset({
        name: currentProgram.name,
        description: currentProgram.description || "",
        tags: currentProgram.tags.join(", "),
        total_weeks: currentProgram.total_weeks.toString(),
      });
      // Set existing image if available
      if (currentProgram.image_url) {
        setSelectedImage(currentProgram.image_url);
      }
      // Set public status
      setIsPublic(currentProgram.public ?? false);
    }
  }, [currentProgram, reset]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const onSubmit = async (data: ProgramForm) => {
    try {
      const tags = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter((t) => t)
        : [];

      let programId: string;

      if (isEditMode) {
        await updateProgram(currentProgram.id, {
          name: data.name,
          description: data.description || undefined,
          tags,
          total_weeks: parseInt(data.total_weeks, 10),
          public: isPublic,
        });
        programId = currentProgram.id;
      } else {
        const newProgram = await createProgram({
          name: data.name,
          description: data.description || undefined,
          tags,
          total_weeks: parseInt(data.total_weeks, 10),
          public: isPublic,
        });
        programId = newProgram.id;
      }

      // Upload image if a new one was selected (not an existing URL)
      if (selectedImage && !selectedImage.startsWith("http")) {
        setIsUploadingImage(true);
        try {
          await programService.uploadImage(programId, selectedImage);
        } catch (imgErr) {
          console.error("Failed to upload image:", imgErr);
        } finally {
          setIsUploadingImage(false);
        }
      }

      reset();
      router.push("/program-editor");
    } catch (err) {
      console.error(`Failed to ${isEditMode ? "update" : "create"} program:`, err);
    }
  };

  const handleCancel = () => {
    clearCurrentProgram();
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
        <Button title="Cancel" theme="tertiary" onPress={handleCancel} />
        <Label variant="subheading" weight="bold">
          {isEditMode ? "Edit Program" : "Create Program"}
        </Label>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 20 }}>
        {error && (
          <View className="p-3 mb-4 bg-red-100 rounded-lg dark:bg-red-900">
            <Label color="error">{error}</Label>
          </View>
        )}

        {/* Image Picker */}
        <View className="mb-4">
          <Label variant="caption" color="secondary" styleClass="mb-2">
            Program Image (optional)
          </Label>
          {selectedImage ? (
            <View className="relative">
              <Image
                source={{ uri: selectedImage }}
                style={{ width: "100%", height: 180, borderRadius: 12 }}
                contentFit="cover"
              />
              <Pressable
                onPress={removeImage}
                className="absolute p-2 bg-black rounded-full top-2 right-2"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              className="items-center justify-center h-32 border-2 border-gray-300 border-dashed rounded-xl dark:border-zinc-600"
            >
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Label variant="caption" color="tertiary" styleClass="mt-2">
                Tap to add image
              </Label>
            </Pressable>
          )}
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Program Name"
              placeholder="e.g., Push Pull Legs"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              styleClass="mb-4"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description (optional)"
              placeholder="Describe your program..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              styleClass="mb-4"
            />
          )}
        />

        <Controller
          control={control}
          name="tags"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Tags (comma separated)"
              placeholder="e.g., hypertrophy, intermediate"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              styleClass="mb-4"
            />
          )}
        />

        <Controller
          control={control}
          name="total_weeks"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Number of Weeks"
              placeholder="e.g., 8"
              keyboardType="numeric"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.total_weeks?.message}
              styleClass="mb-4"
            />
          )}
        />

        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Label variant="caption" color="tertiary">
              Make this program public (visible to other users)
            </Label>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
            thumbColor="#ffffff"
          />
        </View>

        <Button
          title={
            isUploadingImage
              ? "Uploading image..."
              : isLoading
              ? (isEditMode ? "Saving..." : "Creating...")
              : (isEditMode ? "Save Changes" : "Next")
          }
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading || isUploadingImage}
          styleClass="w-full"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
