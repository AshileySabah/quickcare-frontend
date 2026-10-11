/** Formato devolvido pelo back (MensagemChatResponse). */
export interface ChatMessageApi {
  id: number;
  remetenteId: number;
  destinatarioId: number;
  conteudo: string;
  dataEnvio: string;
}

/** Evento de exclusao enviado pelo WebSocket (MensagemExcluidaEvento). */
export interface ChatMessageDeletedApi {
  id: number;
  excluida: boolean;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  sentAt: Date;
}

export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'deleted'; id: number };

export interface Conversation {
  userId: number;
  lastMessage: ChatMessage;
  messages: ChatMessage[];
}
