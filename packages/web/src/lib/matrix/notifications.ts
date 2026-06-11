import type { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";

const MAX_BODY = 140;

export interface DesktopNotificationPayload {
  roomId: string;
  eventId: string;
  title: string;
  body: string;
}

export function evaluateNotification(
  client: MatrixClient,
  room: Room,
  event: MatrixEvent,
): DesktopNotificationPayload | null {
  if (event.getType() !== "m.room.message") return null;
  if (event.getSender() === client.getUserId()) return null;
  const actions = client.getPushActionsForEvent(event);
  if (!actions?.notify) return null;

  const senderId = event.getSender()!;
  const sender = room.getMember(senderId)?.name ?? senderId;
  const text =
    typeof event.getContent().body === "string"
      ? (event.getContent().body as string)
      : "New message";
  const body = `${sender}: ${text}`;
  return {
    roomId: room.roomId,
    eventId: event.getId()!,
    title: room.name,
    body: body.length > MAX_BODY ? `${body.slice(0, MAX_BODY - 1)}…` : body,
  };
}
