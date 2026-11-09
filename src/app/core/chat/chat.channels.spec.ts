import { ChatMessageApi, ConversationApi } from './chat.model';
import {
  channelKey,
  channelSegment,
  conversationKey,
  messageKey,
  sortConversations,
  toChatMessage,
  toConversation,
  withLastMessage,
} from './chat.utils';

const ME = 1;

function api(overrides: Partial<ConversationApi> = {}): ConversationApi {
  return {
    solicitacaoId: 10,
    participantes: [
      { usuarioId: 1, nome: 'Paciente Teste', papel: 'PACIENTE' },
      { usuarioId: 2, nome: 'Ana Profissional', papel: 'PROFISSIONAL' },
    ],
    ...overrides,
  };
}

describe('canais do chat', () => {
  it('o grupo usa o trecho "grupo" e a conversa individual usa o id do profissional', () => {
    expect(channelSegment(null)).toBe('grupo');
    expect(channelSegment(undefined)).toBe('grupo');
    expect(channelSegment(7)).toBe('7');
    expect(channelKey(10, null)).toBe('10/grupo');
    expect(channelKey(10, 7)).toBe('10/7');
  });

  it('a mensagem do grupo nao carrega profissional e a individual carrega', () => {
    const base: ChatMessageApi = {
      id: 1,
      remetenteId: 1,
      solicitacaoId: 10,
      conteudo: 'oi',
      dataEnvio: '2026-11-01T10:00:00Z',
    };

    const group = toChatMessage(base);
    const individual = toChatMessage({ ...base, profissionalUsuarioId: 2 });

    expect(group.professionalUserId).toBeUndefined();
    expect(messageKey(group)).toBe('10/grupo');
    expect(individual.professionalUserId).toBe(2);
    expect(messageKey(individual)).toBe('10/2');
  });

  it('converte uma conversa individual com o profissional e o estado somente leitura', () => {
    const conversation = toConversation(
      api({ tipo: 'INDIVIDUAL', profissionalUsuarioId: 2, somenteLeitura: true }),
      ME,
    );

    expect(conversation.isGroup).toBe(false);
    expect(conversation.professionalUserId).toBe(2);
    expect(conversation.readOnly).toBeTrue();
    expect(conversationKey(conversation)).toBe('10/2');
    expect(conversation.title).toBe('Ana Profissional');
  });

  it('converte o grupo mesmo com apenas um profissional ativo', () => {
    const conversation = toConversation(
      api({
        tipo: 'GRUPO',
        participantes: [
          { usuarioId: 1, nome: 'Paciente Teste', papel: 'PACIENTE' },
          { usuarioId: 2, nome: 'Ana Profissional', papel: 'PROFISSIONAL' },
          { usuarioId: 3, nome: 'Bia Profissional', papel: 'PROFISSIONAL', ativo: false },
        ],
      }),
      ME,
    );

    expect(conversation.isGroup).toBeTrue();
    expect(conversation.professionalUserId).toBeUndefined();
    expect(conversationKey(conversation)).toBe('10/grupo');
    expect(conversation.participants.find((p) => p.userId === 3)?.active).toBeFalse();
    expect(conversation.participants.find((p) => p.userId === 2)?.active).toBeUndefined();
  });

  it('sem o tipo informado continua deduzindo o grupo pelo numero de participantes', () => {
    expect(toConversation(api(), ME).isGroup).toBeFalse();
  });

  it('a mensagem nova atualiza so a previa do canal dela', () => {
    const individual = toConversation(api({ tipo: 'INDIVIDUAL', profissionalUsuarioId: 2 }), ME);
    const message = toChatMessage({
      id: 5,
      remetenteId: 2,
      solicitacaoId: 10,
      profissionalUsuarioId: 2,
      conteudo: 'bom dia',
      dataEnvio: '2026-11-02T10:00:00Z',
    });

    expect(messageKey(message)).toBe(conversationKey(individual));
    expect(withLastMessage(individual, message, ME).preview?.text).toBe('bom dia');
  });

  it('canais da mesma solicitacao sem mensagens ficam em ordem estavel', () => {
    const a = toConversation(api({ tipo: 'INDIVIDUAL', profissionalUsuarioId: 3 }), ME);
    const b = toConversation(api({ tipo: 'INDIVIDUAL', profissionalUsuarioId: 2 }), ME);

    expect(sortConversations([a, b]).map(conversationKey)).toEqual(['10/2', '10/3']);
  });
});
