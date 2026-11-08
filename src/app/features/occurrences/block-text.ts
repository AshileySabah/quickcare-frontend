import { formatDateTime } from '../../core/formatting/period';
import { Ban, Block, SwitchableRole } from '../../core/models';
import { CreationLock } from '../../core/services/creation-lock.service';

export function blockedAction(role: SwitchableRole): string {
  return role === 'patient' ? 'criar solicitações' : 'enviar propostas';
}

export function blockMessage(role: SwitchableRole, block: Block): string {
  return (
    `Por excesso de ocorrências, você não pode ${blockedAction(role)} até ${formatDateTime(block.end)}. ` +
    'O que já está em andamento continua normalmente.'
  );
}

export function banMessage(ban: Ban): string {
  const until = ban.type === 'permanente' ? 'de forma permanente' : `até ${formatDateTime(ban.end!)}`;
  return (
    `Este perfil está banido ${until}. Você pode consultar o histórico e as notificações, ` +
    'mas não pode criar nem alterar nada.'
  );
}

export function creationLockMessage(role: SwitchableRole, lock: CreationLock): string {
  switch (lock.reason) {
    case 'ban':
      return banMessage(lock.ban);
    case 'occurrences':
      return blockMessage(role, lock.block);
    case 'revalidation':
      return (
        `Seus dados estão em revalidação. Até o administrador concluir, você não pode ${blockedAction(role)} novas. ` +
        'O que já está em andamento continua normalmente e você pode acompanhar em "Documentos", no menu da sua conta.'
      );
  }
}
