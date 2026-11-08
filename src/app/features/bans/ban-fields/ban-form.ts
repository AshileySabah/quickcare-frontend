import { AbstractControl, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { BanType } from '../../../core/models';

export const MAX_SUSPENSION_DAYS = 365;

export type BanForm = FormGroup<{
  type: FormControl<BanType | ''>;
  daysOption: FormControl<string>;
  customDays: FormControl<string>;
  bothProfiles: FormControl<boolean>;
}>;

export function buildBanForm(fb: FormBuilder): BanForm {
  const form: BanForm = fb.nonNullable.group({
    type: fb.nonNullable.control<BanType | ''>(''),
    daysOption: fb.nonNullable.control(''),
    customDays: fb.nonNullable.control(''),
    bothProfiles: fb.nonNullable.control(false),
  });
  form.controls.type.valueChanges.subscribe(() => {
    clear(form.controls.daysOption);
    clear(form.controls.customDays);
  });
  form.controls.daysOption.valueChanges.subscribe(() => clear(form.controls.customDays));
  return form;
}

export function resetBanForm(form: BanForm): void {
  form.reset({ type: '', daysOption: '', customDays: '', bothProfiles: false });
}

export function validateBanForm(form: BanForm): boolean {
  const { type, daysOption, customDays } = form.getRawValue();
  const suspension = type === 'suspensao';
  const custom = suspension && daysOption === 'outro';
  const days = Number(customDays);

  const typeOk = mark(form.controls.type, type ? null : { required: true });
  const optionOk = mark(form.controls.daysOption, !suspension || daysOption ? null : { required: true });
  const customOk = mark(
    form.controls.customDays,
    !custom || (!!customDays && Number.isInteger(days) && days >= 1 && days <= MAX_SUSPENSION_DAYS) ? null : { days: true },
  );
  return typeOk && optionOk && customOk;
}

export function banType(form: BanForm): BanType {
  return form.controls.type.value as BanType;
}

export function banDays(form: BanForm): number | undefined {
  const { type, daysOption, customDays } = form.getRawValue();
  if (type !== 'suspensao') {
    return undefined;
  }
  return Number(daysOption === 'outro' ? customDays : daysOption);
}

function clear(control: FormControl<string>): void {
  control.reset('');
}

function mark(control: AbstractControl, errors: Record<string, boolean> | null): boolean {
  control.setErrors(errors);
  if (errors) {
    control.markAsTouched();
  }
  return errors === null;
}
