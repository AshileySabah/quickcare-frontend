import { formatDateTime } from '../../core/formatting/period';
import { Block, SwitchableRole } from '../../core/models';

/** O que o bloqueio impede em cada perfil (o resto segue normalmente). */
export function blockedAction(role: SwitchableRole): string {
  return role === 'patient' ? 'criar solicitações' : 'enviar propostas';
}

export function blockMessage(role: SwitchableRole, block: Block): string {
  return (
    `Por excesso de ocorrências, você não pode ${blockedAction(role)} até ${formatDateTime(block.end)}. ` +
    'O que já está em andamento continua normalmente.'
  );
}
