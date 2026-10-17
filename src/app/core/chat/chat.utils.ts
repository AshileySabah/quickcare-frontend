import { AttachmentKind, ChatMessage, ChatMessageApi, Conversation } from './chat.model';

/** Mesmos tipos e limite aceitos pelo back (ArmazenamentoDocumentoService.enviarAnexoChat). */
export const CHAT_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
];
export const CHAT_ATTACHMENT_MAX_MB = 15;
export const CHAT_ATTACHMENT_ACCEPT = CHAT_ATTACHMENT_TYPES.join(',');

export function attachmentKind(type: string): AttachmentKind {
  const base = type.split(';')[0].trim().toLowerCase();
  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('video/')) return 'video';
  if (base.startsWith('audio/')) return 'audio';
  if (base === 'application/pdf') return 'pdf';
  return 'file';
}

/** Devolve a mensagem de erro, ou null quando o arquivo pode ser enviado. */
export function validateAttachment(file: Pick<File, 'type' | 'size'>): string | null {
  const type = file.type.split(';')[0].trim().toLowerCase();
  if (!CHAT_ATTACHMENT_TYPES.includes(type)) {
    return 'Formato não suportado. Envie imagem JPG/PNG, PDF, vídeo MP4 ou áudio (MP3, M4A, OGG, WAV).';
  }
  if (file.size > CHAT_ATTACHMENT_MAX_MB * 1024 * 1024) {
    return `O arquivo deve ter no máximo ${CHAT_ATTACHMENT_MAX_MB}MB.`;
  }
  return null;
}

export function toChatMessage(api: ChatMessageApi): ChatMessage {
  const hasAttachment = !!(api.anexoUrl || api.anexoNomeOriginal || api.anexoTipo);
  const type = api.anexoTipo ?? '';

  return {
    id: api.id,
    senderId: api.remetenteId,
    recipientId: api.destinatarioId,
    content: api.conteudo,
    sentAt: new Date(api.dataEnvio),
    attachment: hasAttachment
      ? {
          url: api.anexoUrl ?? null,
          name: api.anexoNomeOriginal ?? 'anexo',
          type,
          kind: attachmentKind(type),
        }
      : null,
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
