import { ChatMessage } from './chat.model';
import {
  attachmentKind,
  buildConversations,
  mergeMessage,
  otherParticipantId,
  toChatMessage,
  validateAttachment,
} from './chat.utils';

const msg = (id: number, senderId: number, recipientId: number, content = `m${id}`): ChatMessage => ({
  id,
  senderId,
  recipientId,
  content,
  sentAt: new Date('2026-10-10T12:00:00Z'),
  attachment: null,
});

describe('chat.utils', () => {
  it('converte a resposta da API', () => {
    const result = toChatMessage({
      id: 1,
      remetenteId: 2,
      destinatarioId: 3,
      conteudo: 'oi',
      dataEnvio: '2026-10-10T12:00:00Z',
    });
    expect(result.senderId).toBe(2);
    expect(result.recipientId).toBe(3);
    expect(result.content).toBe('oi');
    expect(result.sentAt.getTime()).toBe(Date.parse('2026-10-10T12:00:00Z'));
    expect(result.attachment).toBeNull();
  });

  it('converte a resposta da API com anexo', () => {
    const result = toChatMessage({
      id: 1,
      remetenteId: 2,
      destinatarioId: 3,
      conteudo: '',
      dataEnvio: '2026-10-10T12:00:00Z',
      anexoUrl: 'https://exemplo.test/arquivo',
      anexoNomeOriginal: 'musica.mp3',
      anexoTipo: 'audio/mpeg',
    });
    expect(result.content).toBe('');
    expect(result.attachment).toEqual({
      url: 'https://exemplo.test/arquivo',
      name: 'musica.mp3',
      type: 'audio/mpeg',
      kind: 'audio',
    });
  });

  it('mantem o anexo mesmo quando o back nao conseguiu assinar a URL', () => {
    const result = toChatMessage({
      id: 1,
      remetenteId: 2,
      destinatarioId: 3,
      conteudo: 'oi',
      dataEnvio: '2026-10-10T12:00:00Z',
      anexoUrl: null,
      anexoNomeOriginal: 'foto.png',
      anexoTipo: 'image/png',
    });
    expect(result.attachment?.url).toBeNull();
    expect(result.attachment?.kind).toBe('image');
  });

  it('classifica o tipo do anexo', () => {
    expect(attachmentKind('image/png')).toBe('image');
    expect(attachmentKind('video/mp4')).toBe('video');
    expect(attachmentKind('audio/webm;codecs=opus')).toBe('audio');
    expect(attachmentKind('application/pdf')).toBe('pdf');
    expect(attachmentKind('application/zip')).toBe('file');
  });

  it('valida tipo e tamanho do anexo', () => {
    expect(validateAttachment({ type: 'audio/mpeg', size: 1024 })).toBeNull();
    expect(validateAttachment({ type: 'application/x-msdownload', size: 1024 })).toContain('Formato');
    expect(validateAttachment({ type: 'video/mp4', size: 16 * 1024 * 1024 })).toContain('15MB');
  });

  it('identifica o outro participante', () => {
    expect(otherParticipantId(msg(1, 1, 2), 1)).toBe(2);
    expect(otherParticipantId(msg(1, 2, 1), 1)).toBe(2);
  });

  it('agrupa por interlocutor e ordena pela mensagem mais recente', () => {
    const conversations = buildConversations(
      [msg(1, 1, 2), msg(2, 3, 1), msg(3, 2, 1)],
      1,
    );
    expect(conversations.map((c) => c.userId)).toEqual([2, 3]);
    expect(conversations[0].lastMessage.id).toBe(3);
    expect(conversations[0].messages.map((m) => m.id)).toEqual([1, 3]);
  });

  it('retorna lista vazia sem mensagens', () => {
    expect(buildConversations([], 1)).toEqual([]);
  });

  it('mergeMessage ignora duplicadas e mantem a ordem', () => {
    const base = [msg(1, 1, 2), msg(3, 1, 2)];
    expect(mergeMessage(base, msg(3, 1, 2))).toBe(base);
    expect(mergeMessage(base, msg(2, 2, 1)).map((m) => m.id)).toEqual([1, 2, 3]);
  });
});
