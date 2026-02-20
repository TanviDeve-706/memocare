import { queryClient } from './queryClient';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function api(endpoint: string, options: RequestInit = {}) {
  const url = endpoint;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response.json();
}

export async function apiFormData(endpoint: string, formData: FormData, method: string = 'POST') {
  const url = endpoint;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () =>
    api('/api/auth/logout', { method: 'POST' }),

  me: () =>
    api('/api/auth/me'),
};

export const medicationsApi = {
  list: () => api('/api/medications'),
  create: (medication: any) =>
    api('/api/medications', {
      method: 'POST',
      body: JSON.stringify(medication),
    }),
  update: (id: number, updates: any) =>
    api(`/api/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  delete: (id: number) =>
    api(`/api/medications/${id}`, { method: 'DELETE' }),
  logs: (id: number) => api(`/api/medications/${id}/logs`),
  logDose: (id: number, status: 'taken' | 'missed', taken_at: string) =>
    api(`/api/medications/${id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ status, taken_at }),
    }),
};

export const remindersApi = {
  list: () => api('/api/reminders'),
  create: (reminder: any) =>
    api('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    }),
  update: (id: number, updates: any) =>
    api(`/api/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  delete: (id: number) =>
    api(`/api/reminders/${id}`, { method: 'DELETE' }),
};

export const contactsApi = {
  list: () => api('/api/contacts'),
  create: (formData: FormData) => apiFormData('/api/contacts', formData),
  update: (id: number, formData: FormData) => apiFormData(`/api/contacts/${id}`, formData, 'PUT'),
  delete: (id: number) => api(`/api/contacts/${id}`, { method: 'DELETE' }),
};

export const journalApi = {
  list: () => api('/api/journal'),
  create: (formData: FormData) => apiFormData('/api/journal', formData),
  update: (id: number, updates: any) =>
    api(`/api/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  delete: (id: number) => api(`/api/journal/${id}`, { method: 'DELETE' }),
};

export const memoryApi = {
  list: () => api('/api/memory'),
  create: (formData: FormData) => apiFormData('/api/memory', formData),
  update: (id: number, updates: any) =>
    api(`/api/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  delete: (id: number) => api(`/api/memory/${id}`, { method: 'DELETE' }),
};

export const locationsApi = {
  list: () => api('/api/locations'),
  create: (location: { name: string; address: string; context?: string; lat: number; lng: number }) =>
    api('/api/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    }),
  logs: () => api('/api/locations/logs'),
  logLocation: (lat: number, lng: number) =>
    api('/api/locations/logs', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),
  shareLocation: (lat: number, lng: number, message?: string) =>
    api('/api/locations/share', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, message }),
    }),
};

export const routinesApi = {
  list: () => api('/api/routines'),
  create: (routine: any) =>
    api('/api/routines', {
      method: 'POST',
      body: JSON.stringify(routine),
    }),
  tasks: (id: number) => api(`/api/routines/${id}/tasks`),
  createTask: (routineId: number, task: any) =>
    api(`/api/routines/${routineId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  updateTask: (taskId: number, updates: any) =>
    api(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};

export const gamesApi = {
  getQuiz: () => api('/api/games/quiz'),
};

export const emergencyApi = {
  list: () => api('/api/emergency'),
  trigger: (locationData?: { lat: number; lng: number }) =>
    api('/api/emergency', { 
      method: 'POST',
      body: locationData ? JSON.stringify(locationData) : undefined
    }),
  resolve: (id: number) =>
    api(`/api/emergency/${id}/resolve`, { method: 'POST' }),
};

export const identifyApi = {
  getObjects: () => api('/api/identify/objects'),
  upload: (formData: FormData) => apiFormData('/api/identify', formData),
  findMatches: (visual_features: any) =>
    api('/api/identify/match', {
      method: 'POST',
      body: JSON.stringify({ visual_features }),
    }),
};
