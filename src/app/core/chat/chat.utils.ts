import { ChatMessage, ChatMessageApi, Conversation } from './chat.model';

export function toChatMessage(api: ChatMessageApi): ChatMessage {
  return {
    id: api.id,
    senderId: api.remetenteId,
    recipientId: api.destinatarioId,
    content: api.conteudo,
    sentAt: new Date(api.dataEnvio),
  };
}

export function otherParticipantId(message: ChatMessage, currentUserId: number): number {
  return message.senderId === currentUserId ? message.recipientId : message.senderId;
}

/** Agrupa as mensagens por interlocutor; a mais recente (maior id) vira a previa. */
export function buildConversations(messages: ChatMessage[], currentUserId: number): Conversation[] {
  const byUser = new Map<number, ChatMessage[]>();

  for (const message of messages) {
    const otherId = otherParticipantId(message, currentUserId);
    const list = byUser.get(otherId) ?? [];
    list.push(message);
    byUser.set(otherId, list);
  }

  return [...byUser.entries()]
    .map(([userId, list]) => {
      const sorted = [...list].sort((a, b) => a.id - b.id);
      return { userId, messages: sorted, lastMessage: sorted[sorted.length - 1] };
    })
    .sort((a, b) => b.lastMessage.id - a.lastMessage.id);
}

/** Insere ignorando duplicatas (o mesmo id pode chegar por HTTP e por WebSocket). */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((item) => item.id === message.id)) {
    return list;
  }
  return [...list, message].sort((a, b) => a.id - b.id);
}
