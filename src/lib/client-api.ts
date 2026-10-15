export class RequestError extends Error {
    constructor(message: string, public status: number) { super(message); }
}
export async function checkedFetch(url: string, options?: RequestInit): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, credentials: 'same-origin' });
    }
    catch {
        throw new RequestError('Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.', 0);
    }
    const data = await response.clone().json().catch(() => null);
    if (response.status === 401 && url !== '/api/auth' && typeof window !== 'undefined')
        window.dispatchEvent(new Event('celengan-session-expired'));
    if (!response.ok || !data?.success)
        throw new RequestError(data?.error || 'Permintaan belum berhasil. Coba lagi.', response.status);
    return response;
}
export async function apiRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> { const response = await checkedFetch(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return (await response.json()).data as T; }
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Permintaan belum berhasil. Coba lagi.'; }
export function newRequestId() { const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128; const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20); }
