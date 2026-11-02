export type BlockTargetKind = 'professional' | 'patient';

export interface BlockTarget {
  kind: BlockTargetKind;
  id: string;
  name: string;
}

export interface BlockedUser {
  id: string;
  profileId: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface BlockPreview {
  name: string;
  pendingProposals: number;
  activeAttendances: number;
  countsAsOccurrence: boolean;
}
