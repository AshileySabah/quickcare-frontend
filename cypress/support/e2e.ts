import './commands';
import { stubDefaults } from './api';

Cypress.on('uncaught:exception', (error) => {
  if (error.message.includes('ResizeObserver loop')) {
    return false;
  }
  return true;
});

beforeEach(() => {
  stubDefaults();
});
