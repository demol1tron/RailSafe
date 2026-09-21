export const STATUS_LABELS = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
  REJECTED: 'Отклонён',
};

export const SEVERITY_LABELS = {
  LOW: 'Низкая',
  MEDIUM: 'Средняя',
  HIGH: 'Высокая',
  CRITICAL: 'Критическая',
};

export const ROLE_LABELS = {
  ADMIN: 'Администратор',
  DISPATCHER: 'Диспетчер',
  INSPECTOR: 'Инспектор',
  EMPLOYEE: 'Сотрудник',
};

export const STATUS_VALUES = Object.keys(STATUS_LABELS);
export const SEVERITY_VALUES = Object.keys(SEVERITY_LABELS);
export const USER_ROLE_VALUES = ['DISPATCHER', 'INSPECTOR', 'EMPLOYEE'];

export const statusLabel = (value) => STATUS_LABELS[value] || value || '—';
export const severityLabel = (value) => SEVERITY_LABELS[value] || value || '—';
export const roleLabel = (value) => ROLE_LABELS[value] || value || '—';

export const roleCodeFromInput = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.entries(ROLE_LABELS).find(([code, label]) =>
    code.toLowerCase() === normalized || label.toLowerCase() === normalized,
  )?.[0] || null;
};

export const translateKnownEnumsInText = (value) => {
  let result = String(value ?? '');
  for (const [code, label] of Object.entries({...STATUS_LABELS, ...SEVERITY_LABELS, ...ROLE_LABELS})) {
    result = result.replaceAll(code, label);
  }
  return result;
};
