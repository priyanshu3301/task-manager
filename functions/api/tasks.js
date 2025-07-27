/**
 * A helper function to generate the database authentication headers.
 * It uses environment variables, which must be set in your Cloudflare Pages project settings.
 * @param {object} env - The environment variables object provided by Cloudflare.
 * @returns {HeadersInit}
 */
const getDbHeaders = (env) => {
    if (!env.DB_USERNAME || !env.DB_PASSWORD) {
        throw new Error("Database credentials are not configured in environment variables.");
    }
    return {
        'Authorization': 'Basic ' + btoa(`${env.DB_USERNAME}:${env.DB_PASSWORD}`),
        'Content-Type': 'application/json'
    };
};

/**
 * Responds with a JSON error message.
 * @param {string} message - The error message.
 * @param {number} status - The HTTP status code.
 * @returns {Response}
 */
const jsonError = (message, status = 500) => {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
};

/**
 * Parses cookies from the 'Cookie' header string.
 * @param {string} cookieHeader - The string from the 'Cookie' header.
 * @returns {object} An object of key-value pairs of cookies.
 */
const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.match(/(.*?)=(.*)$/)
            if(parts) {
               cookies[parts[1].trim()] = (parts[2] || '').trim();
            }
        });
    }
    return cookies;
};


/**
 * Middleware to handle authentication via cookies.
 * @param {function} handler - The function to call if authentication is successful.
 * @returns {function} An async function that takes the request context.
 */
const createAuthMiddleware = (handler) => {
  return async (context) => {
    const { request, env } = context;

    if (!env.AUTH_URL || !env.DATABASE_URL) {
        console.error("AUTH_URL or DATABASE_URL is not configured.");
        return jsonError("Service not configured.", 500);
    }

    // 1. Get credentials from the 'auth' cookie
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authCookie = cookies.auth;

    if (!authCookie) {
        return jsonError('Authentication cookie not found.', 401);
    }

    let userId, username, password;
    try {
        // 2. Decode the Base64 cookie
        const decoded = atob(authCookie);
        [userId, username, password] = decoded.split(':', 3);
        if (!userId || !username || !password) throw new Error('Invalid format');
    } catch (e) {
        return jsonError('Invalid authentication cookie format.', 401);
    }

    // 3. Authenticate by fetching the user document and comparing credentials
    try {
        const userDocUrl = `${env.AUTH_URL}${encodeURIComponent(userId)}`;
        const dbHeaders = getDbHeaders(env);
        delete dbHeaders['Content-Type']; // Not needed for GET

        const authResponse = await fetch(userDocUrl, { headers: dbHeaders });

        if (authResponse.status === 404) {
             return jsonError('User not found.', 401);
        }
        if (!authResponse.ok) {
            return jsonError('Authentication service returned an error.', authResponse.status);
        }

        const storedUser = await authResponse.json();
        
        // 4. Verify that the credentials from the cookie match the stored credentials
        if (storedUser.username === username && storedUser.password === password) {
            // SUCCESS: Add the validated username to the context for the next function
            context.username = username;
            return handler(context);
        } else {
            return jsonError('Invalid credentials.', 401);
        }

    } catch (err) {
        console.error("Authentication Error:", err.message);
        return jsonError('Could not reach authentication service.', 503);
    }
  };
};

// --- Core Logic (Un-exported) ---
// These functions now receive the username from the context to build user-specific URLs.

async function _handleGet({ env, username }) {
    try {
        const userDbUrl = `${env.DATABASE_URL}${username}/_all_docs?include_docs=true`;
        const headers = getDbHeaders(env);
        delete headers['Content-Type'];

        const res = await fetch(userDbUrl, { headers });
        if (!res.ok) return jsonError(`Database error: ${res.statusText}`, res.status);
        
        const json = await res.json();
        const docs = json.rows.map(row => row.doc);
        return new Response(JSON.stringify(docs), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (err) {
        return jsonError('Server Error');
    }
}

async function _handlePost({ request, env, username }) {
    try {
        const body = await request.json();
        if (!body || Object.keys(body).length === 0) return jsonError('Request body cannot be empty.', 400);
        
        const userDbUrl = `${env.DATABASE_URL}${username}/`;
        const res = await fetch(userDbUrl, { method: 'POST', headers: getDbHeaders(env), body: JSON.stringify(body) });
        
        const result = await res.json();
        return new Response(JSON.stringify(result), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return jsonError('Invalid JSON or Server Error');
    }
}

async function _handlePut({ request, env, username }) {
    try {
        const body = await request.json();
        const { _id, _rev } = body;
        if (!_id || !_rev) return jsonError('Missing _id or _rev.', 400);
        
        const updateUrl = `${env.DATABASE_URL}${username}/${encodeURIComponent(_id)}`;
        const res = await fetch(updateUrl, { method: 'PUT', headers: getDbHeaders(env), body: JSON.stringify(body) });
        
        const result = await res.json();
        return new Response(JSON.stringify(result), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return jsonError('Invalid JSON or Server Error');
    }
}

async function _handleDelete({ request, env, username }) {
    try {
        const { _id, _rev } = await request.json();
        if (!_id || !_rev) return jsonError('Missing _id or _rev.', 400);

        const deleteUrl = `${env.DATABASE_URL}${username}/${encodeURIComponent(_id)}?rev=${encodeURIComponent(_rev)}`;
        const headers = getDbHeaders(env);
        delete headers['Content-Type'];

        const res = await fetch(deleteUrl, { method: 'DELETE', headers });
        
        const result = await res.json();
        return new Response(JSON.stringify(result), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return jsonError('Invalid JSON or Server Error');
    }
}

// --- Exported Handlers with Authentication ---
export const onRequestGet = createAuthMiddleware(_handleGet);
export const onRequestPost = createAuthMiddleware(_handlePost);
export const onRequestPut = createAuthMiddleware(_handlePut);
export const onRequestDelete = createAuthMiddleware(_handleDelete);
// --- End of Core Logic ---