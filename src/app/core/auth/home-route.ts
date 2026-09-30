import { User } from '../models';

export function homeRouteFor(user: User): string {
  switch (user.role) {
    case 'patient':
      return '/patient';
    case 'professional':
      return user.validationStatus === 'aprovado'
        ? '/professional'
        : '/professional/aguardando-validacao';
    case 'admin':
      return '/admin';
  }
}
