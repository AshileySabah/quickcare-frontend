/** Formato devolvido pelo back (MensagemChatResponse). */
export interface ChatMessageApi {
  id: number;
  remetenteId: number;
  destinatarioId: number;
  conteudo: string;
  dataEnvio: string;
  anexoUrl?: string | null;
  anexoNomeOriginal?: string | null;
  anexoTipo?: string | null;
}

/** Evento de exclusao enviado pelo WebSocket (MensagemExcluidaEvento). */
export interface ChatMessageDeletedApi {
  id: number;
  excluida: boolean;
}

export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'file';

export interface ChatAttachment {
  /** URL assinada (expira em 24h). Nula quando o back nao conseguiu assinar. */
  url: string | null;
  name: string;
  type: string;
  kind: AttachmentKind;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  sentAt: Date;
  attachment: ChatAttachment | null;
}

export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'deleted'; id: number };

export interface Conversation {
  userId: number;
  lastMessage: ChatMessage;
  messages: ChatMessage[];
}
