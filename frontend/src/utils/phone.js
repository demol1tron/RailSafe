export function normalizeRussianPhone(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^\+?[\d\s()-]+$/.test(trimmed)) {
    throw new Error('Телефон может содержать только цифры, пробелы, скобки, дефисы и знак +');
  }

  if (trimmed.startsWith('+') && !trimmed.startsWith('+7')) {
    throw new Error('Для российских номеров код страны должен быть +7');
  }

  const digits = trimmed.replace(/\D/g, '');
  let national;

  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    national = digits.slice(1);
  } else {
    throw new Error('Введите российский номер из 10 цифр, например +7 913 123-45-67');
  }

  if (!/^[3-9]\d{9}$/.test(national)) {
    throw new Error('Некорректный российский номер телефона');
  }

  return `+7${national}`;
}
