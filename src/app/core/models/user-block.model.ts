/** Quem pode ser bloqueado por quem: o paciente bloqueia profissional; o profissional, paciente. */
export type BlockTargetKind = 'professional' | 'patient';

/** A pessoa a bloquear (o id é o do perfil dela). */
export interface BlockTarget {
  kind: BlockTargetKind;
  id: string;
  name: string;
}

/** Alguém que eu bloqueei. */
export interface BlockedUser {
  id: string;
  profileId: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

/** O que acaba entre os dois se bloquear agora, para o modal avisar antes. */
export interface BlockPreview {
  name: string;
  pendingProposals: number;
  activeAttendances: number;
  /** Algum atendimento cancelado conta ocorrência para quem bloqueia (regra das 48h). */
  countsAsOccurrence: boolean;
}
