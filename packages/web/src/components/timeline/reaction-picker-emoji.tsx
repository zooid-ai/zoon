import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface PickerEmojiProps {
  onPick: (emoji: string) => void;
}

export default function PickerEmoji({ onPick }: PickerEmojiProps) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(e: { native: string }) => onPick(e.native)}
      autoFocus
      previewPosition="none"
      skinTonePosition="none"
    />
  );
}
