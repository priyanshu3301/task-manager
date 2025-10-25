//
// File: /functions/me.js
//
import { jwtVerify } from 'jose';

// --- Helper Functions (Copied from your other files) ---

const jsonError = (message, status = 500) => {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
};

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

const getJwtSecret = (env) => {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured in environment variables.");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
};

// --- Main Handler ---

export async function onRequestGet({ request, env }) {
    if (!env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured.");
        return jsonError("Service not configured.", 500);
    }

    // 1. Get token from the 'auth' cookie
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authCookie = cookies.auth;

    if (!authCookie) {
        return jsonError('Not authenticated.', 401);
    }

    // 2. Verify the JWT
    try {
        const secret = getJwtSecret(env);
        const { payload } = await jwtVerify(authCookie, secret);

        if (!payload.username || !payload.userId) {
             return jsonError('Invalid token payload.', 401);
        }

        // 3. Return the user info from the token
        return new Response(JSON.stringify({
            username: payload.username,
            userId: payload.userId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Token verification failed:", err.message);
        return jsonError('Invalid or expired token.', 401);
    }
}