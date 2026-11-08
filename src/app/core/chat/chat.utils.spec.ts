import { ChatMessage, Conversation, ConversationApi } from './chat.model';
import {
  attachmentKind,
  buildTimeline,
  collectFiles,
  colorFor,
  dayLabel,
  initials,
  mergeMessage,
  normalizeText,
  shortTime,
  sortConversations,
  toChatMessage,
  toConversation,
  toWebSocketUrl,
  validateAttachment,
  withLastMessage,
} from './chat.utils';

const msg = (id: number, senderId: number, sentAt = '2026-10-10T15:00:00'): ChatMessage => ({
  id,
  senderId,
  requestId: 10,
  content: `m${id}`,
  sentAt: new Date(sentAt),
  attachment: null,
});

const groupApi: ConversationApi = {
  solicitacaoId: 10,
  participantes: [
    { usuarioId: 1, nome: 'Ana Paciente', papel: 'PACIENTE', avatarUrl: 'http://foto/ana' },
    { usuarioId: 2, nome: 'Bruno Medico', papel: 'PROFISSIONAL' },
    { usuarioId: 3, nome: 'Carla Fisio', papel: 'PROFISSIONAL' },
  ],
};

describe('chat.utils', () => {
  it('converte a resposta da API', () => {
    const result = toChatMessage({
      id: 1,
      remetenteId: 2,
      solicitacaoId: 10,
      conteudo: 'oi',
      dataEnvio: '2026-10-10T12:00:00Z',
    });
    expect(result.senderId).toBe(2);
    expect(result.requestId).toBe(10);
    expect(result.content).toBe('oi');
    expect(result.sentAt.getTime()).toBe(Date.parse('2026-10-10T12:00:00Z'));
    expect(result.attachment).toBeNull();
  });

  it('converte a resposta da API com anexo', () => {
    const result = toChatMessage({
      id: 1,
      remetenteId: 2,
      solicitacaoId: 10,
      conteudo: '',
      dataEnvio: '2026-10-10T12:00:00Z',
      anexoUrl: 'https://exemplo.test/arquivo',
      anexoNomeOriginal: 'musica.mp3',
      anexoTipo: 'audio/mpeg',
    });
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
      solicitacaoId: 10,
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
    expect(validateAttachment({ type: 'application/zip', size: 1024 })).toContain('Formato não suportado');
    expect(validateAttachment({ type: 'image/png', size: 16 * 1024 * 1024 })).toContain('15MB');
  });

  it('monta a URL do WebSocket nativo', () => {
    expect(toWebSocketUrl('https://api.exemplo.test')).toBe('wss://api.exemplo.test/ws');
    expect(toWebSocketUrl('http://localhost:8080/')).toBe('ws://localhost:8080/ws');
  });

  describe('conversas', () => {
    it('monta a conversa em grupo a partir do ponto de vista do usuario', () => {
      const conversation = toConversation(groupApi, 1);
      expect(conversation.isGroup).toBeTrue();
      expect(conversation.others.map((p) => p.name)).toEqual(['Bruno Medico', 'Carla Fisio']);
      expect(conversation.title).toBe('Bruno Medico, Carla Fisio');
      expect(conversation.participants[0].role).toBe('patient');
      expect(conversation.participants[0].avatarUrl).toBe('http://foto/ana');
      expect(conversation.participants[1].avatarUrl).toBeNull();
      expect(conversation.preview).toBeNull();
    });

    it('conversa entre duas pessoas nao e grupo e usa o nome do outro', () => {
      const conversation = toConversation({ solicitacaoId: 11, participantes: groupApi.participantes.slice(0, 2) }, 2);
      expect(conversation.isGroup).toBeFalse();
      expect(conversation.title).toBe('Ana Paciente');
    });

    it('previa com "Voce:" quando a ultima mensagem e minha', () => {
      const conversation = toConversation(
        { ...groupApi, ultimaMensagem: { remetenteId: 1, conteudo: 'oi', dataEnvio: '2026-10-10T12:00:00Z' } },
        1,
      );
      expect(conversation.preview?.text).toBe('Você: oi');
    });

    it('previa com o primeiro nome de quem enviou, em grupos', () => {
      const conversation = toConversation(
        { ...groupApi, ultimaMensagem: { remetenteId: 2, conteudo: 'bom dia', dataEnvio: '2026-10-10T12:00:00Z' } },
        1,
      );
      expect(conversation.preview?.text).toBe('Bruno: bom dia');
    });

    it('previa sem prefixo em conversa de duas pessoas e rotulo para anexo', () => {
      const conversation = toConversation(
        {
          solicitacaoId: 11,
          participantes: groupApi.participantes.slice(0, 2),
          ultimaMensagem: {
            remetenteId: 2,
            conteudo: '',
            anexoNomeOriginal: 'foto.png',
            anexoTipo: 'image/png',
            dataEnvio: '2026-10-10T12:00:00Z',
          },
        },
        1,
      );
      expect(conversation.preview?.text).toBe('Foto');
    });

    it('atualiza a previa com uma mensagem nova', () => {
      const conversation = toConversation(groupApi, 1);
      const updated = withLastMessage(conversation, msg(5, 3), 1);
      expect(updated.preview?.text).toBe('Carla: m5');
      expect(conversation.preview).toBeNull();
    });

    it('ordena pela mensagem mais recente e deixa as vazias no fim', () => {
      const a = withLastMessage(toConversation({ ...groupApi, solicitacaoId: 1 }, 1), msg(1, 2, '2026-10-01T10:00:00'), 1);
      const b = withLastMessage(toConversation({ ...groupApi, solicitacaoId: 2 }, 1), msg(2, 2, '2026-10-05T10:00:00'), 1);
      const c = toConversation({ ...groupApi, solicitacaoId: 3 }, 1);
      const d = toConversation({ ...groupApi, solicitacaoId: 4 }, 1);
      expect(sortConversations([a, c, b, d]).map((x) => x.requestId)).toEqual([2, 1, 4, 3]);
    });
  });

  it('gera iniciais do avatar', () => {
    expect(initials('Ana Paciente')).toBe('AP');
    expect(initials('  maria  da  silva ')).toBe('MS');
    expect(initials('Bruno')).toBe('B');
    expect(initials('')).toBe('?');
  });

  it('a cor do usuario e estavel', () => {
    expect(colorFor(2)).toEqual(colorFor(2));
    expect(colorFor(2)).not.toEqual(colorFor(3));
  });

  it('normaliza texto para busca', () => {
    expect(normalizeText('  Clínica Médica ')).toBe('clinica medica');
  });

  it('rotula Hoje, Ontem e datas antigas', () => {
    const now = new Date('2026-10-10T12:00:00');
    expect(dayLabel(new Date('2026-10-10T08:00:00'), now)).toBe('Hoje');
    expect(dayLabel(new Date('2026-10-09T23:00:00'), now)).toBe('Ontem');
    expect(dayLabel(new Date('2026-10-01T10:00:00'), now)).toBe(
      new Date('2026-10-01T10:00:00').toLocaleDateString('pt-BR'),
    );
  });

  it('formata a hora curta da lista', () => {
    const now = new Date('2026-10-10T12:00:00');
    expect(shortTime(new Date('2026-10-10T08:05:00'), now)).toMatch(/08:05/);
    expect(shortTime(new Date('2026-10-09T23:00:00'), now)).toBe('Ontem');
    expect(shortTime(new Date('2026-10-01T10:00:00'), now)).toBe('01/10');
  });

  describe('buildTimeline', () => {
    const conversation: Conversation = toConversation(groupApi, 1);
    const now = new Date('2026-10-10T20:00:00');
    type MessageItem = Extract<ReturnType<typeof buildTimeline>[number], { kind: 'message' }>;

    it('separa por dia', () => {
      const items = buildTimeline([msg(1, 1, '2026-10-09T10:00:00'), msg(2, 2, '2026-10-10T10:00:00')], conversation, 1, now);
      expect(items.filter((i) => i.kind === 'day').map((i) => (i as { label: string }).label)).toEqual([
        'Ontem',
        'Hoje',
      ]);
    });

    it('mostra o nome so na primeira mensagem de uma sequencia, em grupos', () => {
      const items = buildTimeline([msg(1, 2), msg(2, 2), msg(3, 3), msg(4, 1)], conversation, 1, now);
      const messages = items.filter((i) => i.kind === 'message') as MessageItem[];
      expect(messages.map((m) => m.senderName)).toEqual(['Bruno Medico', null, 'Carla Fisio', null]);
      expect(messages[0].senderColor).toBe(colorFor(2).fg);
      expect(messages[1].senderColor).toBeNull();
      expect(messages[3].mine).toBeTrue();
      expect(messages[3].showAvatarSpace).toBeFalse();
    });

    it('nao mostra nome em conversa de duas pessoas', () => {
      const pair = toConversation({ solicitacaoId: 11, participantes: groupApi.participantes.slice(0, 2) }, 1);
      const items = buildTimeline([msg(1, 2)], pair, 1, now);
      const message = items.find((i) => i.kind === 'message') as MessageItem;
      expect(message.senderName).toBeNull();
      expect(message.showAvatarSpace).toBeFalse();
    });

    it('recomeca a sequencia depois do separador de dia', () => {
      const items = buildTimeline([msg(1, 2, '2026-10-09T10:00:00'), msg(2, 2, '2026-10-10T10:00:00')], conversation, 1, now);
      const messages = items.filter((i) => i.kind === 'message') as MessageItem[];
      expect(messages.map((m) => m.senderName)).toEqual(['Bruno Medico', 'Bruno Medico']);
    });
  });

  it('separa os anexos por tipo e ignora os sem URL', () => {
    const withAttachment = (id: number, type: string, url: string | null): ChatMessage => ({
      ...msg(id, 1),
      attachment: { url, name: `a${id}`, type, kind: attachmentKind(type) },
    });
    const files = collectFiles([
      withAttachment(1, 'image/png', 'u1'),
      withAttachment(2, 'video/mp4', 'u2'),
      withAttachment(3, 'audio/mpeg', 'u3'),
      withAttachment(4, 'application/pdf', 'u4'),
      withAttachment(5, 'image/png', null),
      msg(6, 1),
    ]);
    expect(files.images.length).toBe(1);
    expect(files.videos.length).toBe(1);
    expect(files.audios.length).toBe(1);
    expect(files.documents.length).toBe(1);
    expect(files.total).toBe(4);
  });

  it('merge ignora duplicatas e ordena por id', () => {
    const list = [msg(1, 1), msg(3, 1)];
    expect(mergeMessage(list, msg(2, 2)).map((m) => m.id)).toEqual([1, 2, 3]);
    expect(mergeMessage(list, msg(3, 1))).toBe(list);
  });
});
