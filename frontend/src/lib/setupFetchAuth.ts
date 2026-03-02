import { secureStorage, STORAGE_KEYS } from './secureStorage';

const originalFetch = window.fetch.bind(window);

function isApiRequest(url: URL): boolean {
  return url.origin === window.location.origin && url.pathname.startsWith('/api/');
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const resolvedUrl =
    typeof input === 'string' || input instanceof URL
      ? new URL(String(input), window.location.origin)
      : new URL(input.url, window.location.origin);

  if (!isApiRequest(resolvedUrl)) {
    return originalFetch(input, init);
  }

  const token = secureStorage.get(STORAGE_KEYS.TOKEN) || localStorage.getItem('token');
  const userId = secureStorage.get(STORAGE_KEYS.USER_ID) || localStorage.getItem('userId');
  const orgId =
    secureStorage.get(STORAGE_KEYS.ORGANIZATION_ID) || localStorage.getItem('organizationId');

  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined)
  );
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (userId && !headers.has('x-user-id')) {
    headers.set('x-user-id', userId);
  }
  if (orgId && !headers.has('x-organization-id')) {
    headers.set('x-organization-id', orgId);
  }

  const response = await originalFetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include',
  });

  if (response.status === 401 && window.location.pathname !== '/login') {
    secureStorage.remove(STORAGE_KEYS.TOKEN);
    secureStorage.remove(STORAGE_KEYS.USER_ID);
    secureStorage.remove(STORAGE_KEYS.ORGANIZATION_ID);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('organizationId');
    window.location.href = '/login';
  }

  return response;
};
