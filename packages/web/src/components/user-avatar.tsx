import { createAvatar } from "@dicebear/core";
import { glass } from "@dicebear/collection";
import { Avatar, AvatarBadge } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function avatarSeed(userId: string): string {
  const colon = userId.indexOf(":");
  if (colon > 0) {
    const localpart = userId.slice(1, colon);
    const homeserver = userId.slice(colon + 1);
    return `${homeserver}+${localpart}`;
  }
  return userId;
}

const PRESENCE_COLORS: Record<string, string> = {
  online: "bg-green-400",
  unavailable: "bg-yellow-400",
  offline: "bg-zinc-500",
};

interface UserAvatarProps {
  userId: string;
  size?: "sm" | "default" | "lg";
  presence?: "online" | "offline" | "unavailable";
  className?: string;
}

export function UserAvatar({ userId, size = "default", presence, className }: UserAvatarProps) {
  const src = createAvatar(glass, { seed: avatarSeed(userId) }).toDataUri();
  return (
    <Avatar size={size} className={cn(className)}>
      <img src={src} alt={userId} className="aspect-square size-full rounded-full object-cover" />
      {presence !== undefined && (
        <AvatarBadge
          data-presence={presence}
          className={cn(PRESENCE_COLORS[presence] ?? PRESENCE_COLORS.offline)}
        />
      )}
    </Avatar>
  );
}
