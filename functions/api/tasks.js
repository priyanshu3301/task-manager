import { jwtVerify } from 'jose';

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
 * Encodes the JWT_SECRET environment variable into a Uint8Array
 * for use with the 'jose' library.
 * @param {object} env - The environment variables object.
 * @returns {Uint8Array}
 */
const getJwtSecret = (env) => {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured in environment variables.");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
};


/**
 * Middleware to handle authentication via JWT cookie.
 * @param {function} handler - The function to call if authentication is successful.
 * @returns {function} An async function that takes the request context.
 */
const createAuthMiddleware = (handler) => {
  return async (context) => {
    const { request, env } = context;

    if (!env.DATABASE_URL || !env.JWT_SECRET) {
        console.error("DATABASE_URL or JWT_SECRET is not configured.");
        return jsonError("Service not configured.", 500);
    }

    // 1. Get token from the 'auth' cookie
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authCookie = cookies.auth; // This is now a JWT

    if (!authCookie) {
        return jsonError('Authentication token not found.', 401);
    }

    // 2. Verify the JWT
    try {
        const secret = getJwtSecret(env);
        const { payload } = await jwtVerify(authCookie, secret);

        if (!payload.username || !payload.userId) {
             return jsonError('Invalid token payload.', 401);
        }

        // SUCCESS: Add the validated username from the token to the context
        context.username = payload.username;
        return handler(context);

    } catch (err) {
        // This will catch expired tokens, invalid signatures, etc.
        console.error("Token verification failed:", err.message);
        // We also want to clear the invalid cookie
        const headers = { 'Set-Cookie': 'auth=; Path=/; Max-Age=-1' };
        return jsonError('Invalid or expired token.', 401, { headers });
    }
  };
};

// --- Core Logic (Un-exported) ---
// NO CHANGES ARE NEEDED in _handleGet, _handlePost, _handlePut, or _handleDelete
// They will all work correctly as they just use `context.username`.

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