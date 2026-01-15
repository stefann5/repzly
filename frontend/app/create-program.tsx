import { View, ScrollView } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { useProgram } from "@/hooks/useProgram";

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
    }
  }, [currentProgram, reset]);

  const onSubmit = async (data: ProgramForm) => {
    try {
      const tags = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter((t) => t)
        : [];

      if (isEditMode) {
        await updateProgram(currentProgram.id, {
          name: data.name,
          description: data.description || undefined,
          tags,
          total_weeks: parseInt(data.total_weeks, 10),
        });
      } else {
        await createProgram({
          name: data.name,
          description: data.description || undefined,
          tags,
          total_weeks: parseInt(data.total_weeks, 10),
          public: false,
        });
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
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 20 }}>
        <View className="flex-row items-center justify-between mb-6">
          <Label variant="heading" weight="bold">
            {isEditMode ? "Edit Program" : "Create Program"}
          </Label>
          <Button title="Cancel" theme="tertiary" onPress={handleCancel} />
        </View>

        {error && (
          <View className="p-3 mb-4 bg-red-100 rounded-lg dark:bg-red-900">
            <Label color="error">{error}</Label>
          </View>
        )}

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
              styleClass="mb-6"
            />
          )}
        />

        <Button
          title={isLoading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Next")}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          styleClass="w-full"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
