async function _handleGet({ env, username, userId }) {
    return new Response(JSON.stringify({
        ok: true,
        message: "Logout successful."
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'auth=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
        }
    });
}

export const onRequestGet = createAuthMiddleware(_handleGet);
