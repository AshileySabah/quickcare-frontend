import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { banDays, buildBanForm, validateBanForm } from './ban-form';

describe('ban-form', () => {
  const form = () => buildBanForm(TestBed.inject(FormBuilder));

  it('começa vazio e exige o tipo', () => {
    const ban = form();

    expect(validateBanForm(ban)).toBeFalse();
    expect(ban.controls.type.errors).toEqual({ required: true });
  });

  it('suspensão exige a duração', () => {
    const ban = form();
    ban.controls.type.setValue('suspensao');

    expect(validateBanForm(ban)).toBeFalse();
    expect(ban.controls.daysOption.errors).toEqual({ required: true });

    ban.controls.daysOption.setValue('7');

    expect(validateBanForm(ban)).toBeTrue();
    expect(banDays(ban)).toBe(7);
  });

  it('permanente não tem dias', () => {
    const ban = form();
    ban.controls.type.setValue('permanente');

    expect(validateBanForm(ban)).toBeTrue();
    expect(banDays(ban)).toBeUndefined();
  });

  it('trocar o tipo limpa a duração e os dias', () => {
    const ban = form();
    ban.controls.type.setValue('suspensao');
    ban.controls.daysOption.setValue('outro');
    ban.controls.customDays.setValue('45');

    ban.controls.type.setValue('permanente');
    ban.controls.type.setValue('suspensao');

    expect(ban.controls.daysOption.value).toBe('');
    expect(ban.controls.customDays.value).toBe('');
  });

  it('trocar a duração limpa os dias livres', () => {
    const ban = form();
    ban.controls.type.setValue('suspensao');
    ban.controls.daysOption.setValue('outro');
    ban.controls.customDays.setValue('45');

    ban.controls.daysOption.setValue('15');

    expect(ban.controls.customDays.value).toBe('');
  });

  it('outro número de dias precisa estar entre 1 e 365', () => {
    const ban = form();
    ban.controls.type.setValue('suspensao');
    ban.controls.daysOption.setValue('outro');
    ban.controls.customDays.setValue('400');

    expect(validateBanForm(ban)).toBeFalse();
    expect(ban.controls.customDays.errors).toEqual({ days: true });

    ban.controls.customDays.setValue('45');

    expect(validateBanForm(ban)).toBeTrue();
    expect(banDays(ban)).toBe(45);
  });
});
