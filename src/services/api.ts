const API_URL = '/api';

const getAuthHeader = () => {
    const session = localStorage.getItem('brewmaster_session_token');
    return session ? { 'Authorization': `Bearer ${session}` } : {};
};

export const api = {
    auth: {
        login: async (username, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const data = await res.json();
            localStorage.setItem('brewmaster_session_token', data.token);
            return data;
        },
        register: async (username, password, breweryName) => {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, breweryName })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const data = await res.json();
            localStorage.setItem('brewmaster_session_token', data.token);
            return data;
        },
        logout: () => {
            localStorage.removeItem('brewmaster_session_token');
        }
    },
    data: {
        init: async (breweryId) => {
            const res = await fetch(`${API_URL}/init/${breweryId}`, {
                headers: getAuthHeader()
            });
            if (!res.ok) throw new Error('Failed to fetch initial data');
            return res.json();
        },
        sync: async (data, logs) => {
            // For simplicity in this step, we might want purely optimistic updates or specific endpoints.
            // Following implementation plan: using specific endpoints for inventory etc, but sync for bulk.
        },
        inventory: {
            batchUpdate: async (items) => {
                const res = await fetch(`${API_URL}/inventory/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                    body: JSON.stringify({ items })
                });
                if (!res.ok) throw new Error('Failed to update inventory');
            },
            delete: async (id) => {
                await fetch(`${API_URL}/inventory/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeader()
                });
            }
        },
        logs: {
            add: async (log) => {
                await fetch(`${API_URL}/logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                    body: JSON.stringify({ logs: [log] })
                });
            }
        },
        // Generic helper for other entities
        updateEntity: async (entity, items) => {
            const res = await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ [entity]: items })
            });
            if (!res.ok) throw new Error(`Failed to update ${entity}`);
        },
        deleteEntity: async (entity, id) => {
            // mapping entity to route path
            const map = {
                'recipes': 'recipes',
                'tasks': 'tasks',
                'scheduledBrews': 'schedule',
                'workShifts': 'shifts'
            };
            if (!map[entity]) return;
            await fetch(`${API_URL}/${map[entity]}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
        }
    },
    users: {
        add: async (user: any) => {
            // Re-using register, assuming we pass the current breweryId effectively
            // But register expects 'breweryName' to create/find brewery. 
            // If we want to add to *current* brewery, we should ensure the backend handles it.
            // The backend register uses breweryName to output breweryId.
            // We should pass the current breweryId as breweryName?? 
            // Wait, if I pass breweryName "BreweryA", backend checks if valid? No, it just uses it as string.
            // So yes, passing current breweryId as breweryName works.
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, breweryName: user.breweryId })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            return res.json();
        },
        delete: async (username: string) => {
            const res = await fetch(`${API_URL}/users/${username}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            if (!res.ok) throw new Error('Failed to delete user');
        }
    }
}
