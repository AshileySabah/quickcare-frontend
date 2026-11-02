const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** O que o input aceita, para o atributo `accept`. */
export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

/** As mesmas regras do back (PDF, JPG ou PNG até 5MB); devolve a mensagem de erro, se houver. */
export function uploadError(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return `Formato inválido para "${file.name}". Envie um arquivo PDF, JPG ou PNG.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `O arquivo "${file.name}" deve ter no máximo 5MB.`;
  }
  return null;
}

export function fileSizeLabel(file: File): string {
  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}
