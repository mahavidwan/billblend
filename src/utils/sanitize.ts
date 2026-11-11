/**
 * Recursively removes all `undefined` properties from an object or array.
 * Firestore strictly forbids `undefined` values.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 🚨 FIX: If it's a Date object, leave it exactly as it is!
  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized;
}