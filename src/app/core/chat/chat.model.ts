/** Formato devolvido pelo back (MensagemChatResponse). */
export interface ChatMessageApi {
  id: number;
  remetenteId: number;
  solicitacaoId: number;
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

/** Participante devolvido por GET /conversas (ParticipanteResponse). */
export interface ChatParticipantApi {
  usuarioId: number;
  nome: string;
  papel: 'PACIENTE' | 'PROFISSIONAL';
  avatarUrl?: string | null;
}

/** Resumo da ultima mensagem devolvido por GET /conversas (UltimaMensagemResponse). */
export interface LastMessageApi {
  remetenteId: number;
  conteudo: string | null;
  anexoNomeOriginal?: string | null;
  anexoTipo?: string | null;
  dataEnvio: string;
}

/** Conversa devolvida por GET /conversas (ConversaResponse). */
export interface ConversationApi {
  solicitacaoId: number;
  participantes: ChatParticipantApi[];
  ultimaMensagem?: LastMessageApi | null;
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
  requestId: number;
  content: string;
  sentAt: Date;
  attachment: ChatAttachment | null;
}

export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'deleted'; id: number };

export type ChatRole = 'patient' | 'professional';

export interface ChatParticipant {
  userId: number;
  name: string;
  role: ChatRole;
  avatarUrl: string | null;
}

/** Previa da ultima mensagem, ja com o prefixo "Voce:" ou o nome de quem enviou (grupos). */
export interface ConversationPreview {
  text: string;
  sentAt: Date;
}

/** Uma conversa por solicitacao; com mais de um profissional ela vira um grupo. */
export interface Conversation {
  requestId: number;
  participants: ChatParticipant[];
  /** Todos menos o usuario logado. */
  others: ChatParticipant[];
  isGroup: boolean;
  title: string;
  preview: ConversationPreview | null;
}

export interface ChatFiles {
  images: ChatAttachment[];
  videos: ChatAttachment[];
  audios: ChatAttachment[];
  documents: ChatAttachment[];
  total: number;
}

export type TimelineItem =
  | { kind: 'day'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      mine: boolean;
      /** Em grupos, mensagens de outros reservam o espaco do avatar na lateral. */
      showAvatarSpace: boolean;
      /** Preenchidos so na primeira mensagem de uma sequencia do mesmo autor, em grupos. */
      senderName: string | null;
      senderColor: string | null;
      senderId: number;
      senderAvatarUrl: string | null;
    };
