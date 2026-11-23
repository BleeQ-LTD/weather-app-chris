export function shouldPublish(
  current: string,
  next: string,
  isAncestor: (older: string, newer: string) => boolean
): { publish: true } | { publish: false; reason: string };
