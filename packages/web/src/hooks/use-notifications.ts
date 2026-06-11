import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { RoomEvent, type IRoomTimelineData, type MatrixEvent, type Room } from "matrix-js-sdk";
import { MatrixClientPeg } from "@/client/peg";
import { sessionStorage_ } from "@/client/storage";
import { evaluateNotification } from "@/lib/matrix/notifications";

const PROMPTED_KEY = "notifications-prompted";
const ENABLED_KEY = "notifications-enabled";

export function notificationsEnabledLocally(): boolean {
  return sessionStorage_.get(ENABLED_KEY) !== "0";
}

export function setNotificationsEnabledLocally(enabled: boolean): void {
  sessionStorage_.set(ENABLED_KEY, enabled ? "1" : "0");
}

export function useNotifications(): void {
  const client = useSyncExternalStore(
    (cb) => MatrixClientPeg.subscribe(cb),
    () => MatrixClientPeg.safeGet(),
    () => null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (sessionStorage_.get(PROMPTED_KEY)) return;
    sessionStorage_.set(PROMPTED_KEY, "1");
    void Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!client || typeof Notification === "undefined") return;
    const onTimeline = (
      event: MatrixEvent,
      room: Room | undefined,
      toStartOfTimeline: boolean | undefined,
      removed: boolean,
      data: IRoomTimelineData,
    ) => {
      if (!room || toStartOfTimeline || removed || !data.liveEvent) return;
      if (!client.isInitialSyncComplete()) return;
      if (Notification.permission !== "granted") return;
      if (!notificationsEnabledLocally()) return;
      if (document.hasFocus()) return;
      const payload = evaluateNotification(client, room, event);
      if (!payload) return;
      const notification = new Notification(payload.title, {
        body: payload.body,
        tag: payload.eventId,
      });
      notification.onclick = () => {
        window.focus();
        navigate(`/room/${payload.roomId}`);
        notification.close();
      };
    };
    client.on(RoomEvent.Timeline, onTimeline);
    return () => {
      client.off(RoomEvent.Timeline, onTimeline);
    };
  }, [client, navigate]);
}
