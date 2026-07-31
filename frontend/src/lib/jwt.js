export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRoleFromToken(token) {
  return decodeJwtPayload(token)?.role || null;
}
