import { Modal, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { Label } from "./Label";
import { Exercise } from "@/types/exercise";

const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

interface ExerciseDemoModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

export function ExerciseDemoModal({ exercise, onClose }: ExerciseDemoModalProps) {
  const videoId = exercise?.demonstration_link
    ? extractYoutubeVideoId(exercise.demonstration_link)
    : null;

  return (
    <Modal
      visible={!!exercise}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-zinc-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-700">
          <Pressable onPress={onClose} className="p-1">
            <Ionicons name="close" size={28} color="#9CA3AF" />
          </Pressable>
          <Label variant="heading" weight="bold" styleClass="flex-1 text-center mr-8">
            {exercise?.name}
          </Label>
        </View>

        {/* YouTube Player */}
        <View className="flex-1 justify-center bg-black">
          {videoId ? (
            <YoutubePlayer
              height={300}
              videoId={videoId}
              play={true}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="videocam-off-outline" size={48} color="#9CA3AF" />
              <Label variant="body" color="secondary" styleClass="mt-4">
                No demonstration video available
              </Label>
            </View>
          )}
        </View>

        {/* Muscle info */}
        {exercise && exercise.muscles.length > 0 && (
          <View className="px-4 py-4 border-t border-gray-200 dark:border-zinc-700">
            <Label variant="body" weight="medium" styleClass="mb-2">
              Target Muscles
            </Label>
            <View className="flex-row flex-wrap gap-2">
              {exercise.muscles.map((m) => (
                <View
                  key={m.muscle}
                  className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30"
                >
                  <Label variant="caption" color="primary">
                    {m.muscle} ({m.intensity})
                  </Label>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
