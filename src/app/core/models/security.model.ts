import { SwitchableRole } from './user.model';

export type ClosureTarget = 'patient' | 'professional' | 'account';

export interface SecurityProfile {
  role: SwitchableRole;
  closed: boolean;
  closedAt?: string;
  deletesAt?: string;
}

export interface SecurityOverview {
  email: string;
  profiles: SecurityProfile[];
}
