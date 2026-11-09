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
  /** Canal da mensagem: nulo/ausente e o grupo; preenchido e a conversa individual com esse profissional. */
  profissionalUsuarioId?: number | null;
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
  /** Falso para o profissional que saiu da conversa. */
  ativo?: boolean;
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
  tipo?: 'GRUPO' | 'INDIVIDUAL';
  profissionalUsuarioId?: number | null;
  /** Verdadeiro quando o usuario logado so pode ver o historico. */
  somenteLeitura?: boolean;
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
  /** Profissional do canal individual; ausente nas mensagens do grupo. */
  professionalUserId?: number | null;
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
  /** Falso quando o profissional saiu da conversa; ausente significa ativo. */
  active?: boolean;
}

/** Previa da ultima mensagem, ja com o prefixo "Voce:" ou o nome de quem enviou (grupos). */
export interface ConversationPreview {
  text: string;
  sentAt: Date;
}

/** Um canal de uma solicitacao: a conversa individual com um profissional ou o grupo com todos. */
export interface Conversation {
  requestId: number;
  participants: ChatParticipant[];
  /** Todos menos o usuario logado. */
  others: ChatParticipant[];
  isGroup: boolean;
  title: string;
  preview: ConversationPreview | null;
  /** Profissional do canal individual; ausente no grupo. */
  professionalUserId?: number | null;
  /** O usuario logado so ve o historico (saiu da conversa ou ela ficou sem ninguem para responder). */
  readOnly?: boolean;
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