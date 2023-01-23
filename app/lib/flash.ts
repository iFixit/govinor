import { Session } from "remix";
import { z } from "zod";

const FLASH_MESSAGE_KEY = "globalMessage";

export enum MessageType {
  Success = "success",
  Error = "error",
}

const MessageSchema = z.object({
  type: z.nativeEnum(MessageType),
  text: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export function flashMessage(session: Session, message: Message) {
  session.flash(FLASH_MESSAGE_KEY, JSON.stringify(message));
}

export function getFlashMessage(session: Session): Message | null {
  const globalMessage: unknown = session.get(FLASH_MESSAGE_KEY) ?? null;
  if (typeof globalMessage !== "string") {
    return null;
  }
  const messageJson = JSON.parse(globalMessage);
  const validation = MessageSchema.safeParse(messageJson);
  if (validation.success) {
    return validation.data;
  }
  return null;
}
