import { useState, useEffect } from "react";
import {
  Modal,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Label } from "@/components/Label";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';


interface NotesModalProps {
  visible: boolean;
  initialNotes: string;
  exerciseName: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function NotesModal({
  visible,
  initialNotes,
  exerciseName,
  onClose,
  onSave,
}: NotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (visible) {
      setNotes(initialNotes);
    }
  }, [visible, initialNotes]);

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAwareScrollView
              bottomOffset={0}
              className="flex-1"
              contentContainerClassName="justify-center flex-1 bg-white dark:bg-zinc-900"
              keyboardShouldPersistTaps="handled"
            >
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200 dark:border-zinc-700">
          <Label variant="heading" weight="bold" styleClass="text-center">
            Notes
          </Label>
          <Label variant="caption" color="secondary" styleClass="text-center mt-1">
            {exerciseName}
          </Label>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes for this exercise..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            className="flex-1 p-3 text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 rounded-lg"
            autoFocus
          />
        </View>

        {/* Footer */}
        <View className="flex-row justify-between px-4 py-4 border-t border-gray-200 dark:border-zinc-700">
          <Button
            title="Cancel"
            theme="secondary"
            onPress={handleCancel}
            styleClass="flex-1 mr-2"
          />
          <Button
            title="Save"
            theme="primary"
            onPress={handleSave}
            styleClass="flex-1 ml-2"
          />
        </View>
        </KeyboardAwareScrollView>
        
    </Modal>
  );
}
