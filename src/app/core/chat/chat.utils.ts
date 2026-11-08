import {
  AttachmentKind,
  ChatFiles,
  ChatMessage,
  ChatMessageApi,
  ChatParticipant,
  Conversation,
  ConversationApi,
  ConversationPreview,
  TimelineItem,
} from './chat.model';

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

/** O back usa WebSocket nativo (sem SockJS) em /ws: http vira ws e https vira wss. */
export function toWebSocketUrl(apiUrl: string): string {
  return `${apiUrl.replace(/\/+$/, '').replace(/^http/i, 'ws')}/ws`;
}

export function toChatMessage(api: ChatMessageApi): ChatMessage {
  const hasAttachment = !!(api.anexoUrl || api.anexoNomeOriginal || api.anexoTipo);
  const type = api.anexoTipo ?? '';

  return {
    id: api.id,
    senderId: api.remetenteId,
    requestId: api.solicitacaoId,
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

function attachmentLabel(type: string | null | undefined): string {
  switch (attachmentKind(type ?? '')) {
    case 'image':
      return 'Foto';
    case 'video':
      return 'Vídeo';
    case 'audio':
      return 'Áudio';
    case 'pdf':
      return 'Documento';
    default:
      return 'Anexo';
  }
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function buildPreview(
  senderId: number,
  content: string | null | undefined,
  attachmentType: string | null | undefined,
  hasAttachment: boolean,
  sentAt: Date,
  participants: ChatParticipant[],
  currentUserId: number,
  isGroup: boolean,
): ConversationPreview {
  const body = content?.trim() || (hasAttachment ? attachmentLabel(attachmentType) : '');
  let prefix = '';
  if (senderId === currentUserId) {
    prefix = 'Você: ';
  } else if (isGroup) {
    const sender = participants.find((p) => p.userId === senderId);
    prefix = sender ? `${firstName(sender.name)}: ` : '';
  }
  return { text: prefix + body, sentAt };
}

export function toConversation(api: ConversationApi, currentUserId: number): Conversation {
  const participants: ChatParticipant[] = api.participantes.map((p) => ({
    userId: p.usuarioId,
    name: p.nome,
    role: p.papel === 'PACIENTE' ? 'patient' : 'professional',
    avatarUrl: p.avatarUrl ?? null,
  }));
  const others = participants.filter((p) => p.userId !== currentUserId);
  const isGroup = participants.length > 2;
  const last = api.ultimaMensagem;

  return {
    requestId: api.solicitacaoId,
    participants,
    others,
    isGroup,
    title: others.map((p) => p.name).join(', ') || 'Conversa',
    preview: last
      ? buildPreview(
          last.remetenteId,
          last.conteudo,
          last.anexoTipo,
          !!(last.anexoNomeOriginal || last.anexoTipo),
          new Date(last.dataEnvio),
          participants,
          currentUserId,
          isGroup,
        )
      : null,
  };
}

/** Atualiza a previa da conversa quando chega (ou e enviada) uma mensagem nova. */
export function withLastMessage(conversation: Conversation, message: ChatMessage, currentUserId: number): Conversation {
  return {
    ...conversation,
    preview: buildPreview(
      message.senderId,
      message.content,
      message.attachment?.type,
      !!message.attachment,
      message.sentAt,
      conversation.participants,
      currentUserId,
      conversation.isGroup,
    ),
  };
}

/** Mais recente primeiro; conversas sem mensagem ficam no fim, da solicitacao mais nova para a mais antiga. */
export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const at = a.preview?.sentAt.getTime() ?? -Infinity;
    const bt = b.preview?.sentAt.getTime() ?? -Infinity;
    return bt === at ? b.requestId - a.requestId : bt - at;
  });
}

export function roleLabel(role: ChatParticipant['role']): string {
  return role === 'patient' ? 'Paciente' : 'Profissional';
}

/** Iniciais para o avatar: primeira letra do primeiro e do ultimo nome. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export interface AvatarColor {
  bg: string;
  fg: string;
}

const AVATAR_COLORS: AvatarColor[] = [
  { bg: '#d4eee7', fg: '#0b5a46' },
  { bg: '#e0e4fb', fg: '#3b46a8' },
  { bg: '#fde9c8', fg: '#8a5a00' },
  { bg: '#fbdde5', fg: '#a3294f' },
  { bg: '#d9ecfa', fg: '#1f5f8f' },
  { bg: '#eadcf7', fg: '#6b3a9b' },
];

/** Cor estavel por usuario, para distinguir quem fala nos grupos. */
export function colorFor(userId: number): AvatarColor {
  return AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length];
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function dayLabel(date: Date, now: Date = new Date()): string {
  if (dayKey(date) === dayKey(now)) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

/** Hora se for hoje, "Ontem" ou dia/mes: o formato curto da lista de conversas. */
export function shortTime(date: Date, now: Date = new Date()): string {
  if (dayKey(date) === dayKey(now)) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Minusculas e sem acento, para a busca da lista. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Monta a lista exibida na tela: separadores de dia e, nos grupos, o nome e a foto de quem
 * enviou (so na primeira mensagem de uma sequencia do mesmo autor).
 */
export function buildTimeline(
  messages: ChatMessage[],
  conversation: Conversation | null,
  currentUserId: number,
  now: Date = new Date(),
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const isGroup = !!conversation?.isGroup;
  let lastDay = '';
  let lastSender: number | null = null;

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== lastDay) {
      items.push({ kind: 'day', key: `d-${key}`, label: dayLabel(message.sentAt, now) });
      lastDay = key;
      lastSender = null;
    }

    const mine = message.senderId === currentUserId;
    const startsRun = lastSender !== message.senderId;
    const sender = conversation?.participants.find((p) => p.userId === message.senderId);
    const showSender = isGroup && !mine && startsRun;

    items.push({
      kind: 'message',
      key: `m-${message.id}`,
      message,
      mine,
      showAvatarSpace: isGroup && !mine,
      senderName: showSender ? (sender?.name ?? 'Participante') : null,
      senderColor: showSender ? colorFor(message.senderId).fg : null,
      senderId: message.senderId,
      senderAvatarUrl: sender?.avatarUrl ?? null,
    });
    lastSender = message.senderId;
  }

  return items;
}

/** Separa os anexos da conversa por tipo, para o painel de informacoes. */
export function collectFiles(messages: ChatMessage[]): ChatFiles {
  const files: ChatFiles = { images: [], videos: [], audios: [], documents: [], total: 0 };

  for (const message of messages) {
    const attachment = message.attachment;
    if (!attachment?.url) continue;
    files.total++;
    switch (attachment.kind) {
      case 'image':
        files.images.push(attachment);
        break;
      case 'video':
        files.videos.push(attachment);
        break;
      case 'audio':
        files.audios.push(attachment);
        break;
      default:
        files.documents.push(attachment);
    }
  }

  return files;
}

/** Insere ignorando duplicatas (o mesmo id pode chegar por HTTP e por WebSocket). */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((item) => item.id === message.id)) {
    return list;
  }
  return [...list, message].sort((a, b) => a.id - b.id);
}
