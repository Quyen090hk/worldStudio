function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatEntryDate(value: string) {
  return formatEntryDateTime(value);
}

export function formatEntryDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

export function formatEntryRelative(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const diff = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ${Math.floor((diff % hour) / minute)}m ago`;

  return formatEntryDateTime(value);
}