import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  notificationsEnabledLocally,
  setNotificationsEnabledLocally,
} from "@/hooks/use-notifications";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";

export function NotificationSection() {
  const [localEnabled, setLocalEnabled] = useState(notificationsEnabledLocally);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [muteInput, setMuteInput] = useState("");
  const { mode, keywords, mutedUsers, setMode, addKeyword, removeKeyword, muteUser, unmuteUser } =
    useNotificationPrefs();

  function toggleLocalEnabled() {
    const next = !localEnabled;
    setLocalEnabled(next);
    setNotificationsEnabledLocally(next);
  }

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function handleAddKeyword() {
    if (!keywordInput.trim()) return;
    await addKeyword(keywordInput.trim());
    setKeywordInput("");
  }

  async function handleMuteUser() {
    if (!muteInput.trim()) return;
    await muteUser(muteInput.trim());
    setMuteInput("");
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">This browser</p>
        {permission === "default" && (
          <Button size="sm" variant="outline" onClick={() => void requestPermission()}>
            Enable notifications
          </Button>
        )}
        {permission === "denied" && (
          <p className="text-xs text-muted-foreground">
            Blocked — re-enable in browser site settings.
          </p>
        )}
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={localEnabled}
          onClick={toggleLocalEnabled}
        >
          Notifications in this browser
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Notify me about</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "all" ? "default" : "outline"}
            aria-pressed={mode === "all"}
            onClick={() => void setMode("all")}
          >
            All messages
          </Button>
          <Button
            size="sm"
            variant={mode === "mentions" ? "default" : "outline"}
            aria-pressed={mode === "mentions"}
            onClick={() => void setMode("mentions")}
          >
            Mentions, DMs &amp; keywords
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-keyword">Keyword</Label>
        <div className="flex gap-2">
          <Input
            id="notif-keyword"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddKeyword();
            }}
            placeholder="e.g. deploy"
            className="h-7 text-sm"
          />
          <Button size="sm" onClick={() => void handleAddKeyword()}>
            Add
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1">
                {kw}
                <button
                  type="button"
                  aria-label={`Remove keyword ${kw}`}
                  className="ml-1 hover:text-foreground"
                  onClick={() => void removeKeyword(kw)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-mute-user">Mute a user</Label>
        <div className="flex gap-2">
          <Input
            id="notif-mute-user"
            value={muteInput}
            onChange={(e) => setMuteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleMuteUser();
            }}
            placeholder="@user:server"
            className="h-7 text-sm"
          />
          <Button size="sm" onClick={() => void handleMuteUser()}>
            Mute
          </Button>
        </div>
        {mutedUsers.length > 0 && (
          <div className="space-y-1">
            {mutedUsers.map((u) => (
              <div key={u} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{u}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => void unmuteUser(u)}
                >
                  Unmute
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
