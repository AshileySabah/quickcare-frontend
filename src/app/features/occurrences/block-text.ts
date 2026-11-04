import { formatDateTime } from '../../core/formatting/period';
import { Block, SwitchableRole } from '../../core/models';
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

export function creationLockMessage(role: SwitchableRole, lock: CreationLock): string {
  return lock.reason === 'occurrences'
    ? blockMessage(role, lock.block)
    : `Seus dados estão em revalidação. Até o administrador concluir, você não pode ${blockedAction(role)} novas. ` +
        'O que já está em andamento continua normalmente e você pode acompanhar em "Documentos", no menu da sua conta.';
}
