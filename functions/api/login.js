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
 * Handles POST requests for user login.
 */
export async function onRequestPost({ request, env }) {
    // Ensure required environment variables are configured
    if (!env.AUTH_URL) {
        console.error("AUTH_URL is not configured.");
        return jsonError("Service configuration error.", 500);
    }

    let username, password;
    try {
        const body = await request.json();
        username = body.username;
        password = body.password;

        if (!username || !password) {
            return jsonError("Username and password are required.", 400);
        }
    } catch (e) {
        return jsonError("Invalid request body.", 400);
    }

    try {
        // Step 1: Find the user in the authentication database.
        const findUrl = `${env.AUTH_URL}_find`;
        const query = {
            selector: {
                username: username,
                password: password
            }
        };

        const findResponse = await fetch(findUrl, {
            method: 'POST',
            headers: getDbHeaders(env),
            body: JSON.stringify(query)
        });

        if (!findResponse.ok) {
            console.error("Auth database query failed:", await findResponse.text());
            return jsonError("Could not process login request.", 500);
        }

        const result = await findResponse.json();

        // Step 2: Check if a matching user was found.
        if (!result.docs || result.docs.length === 0) {
            return jsonError("Invalid username or password.", 401); // Unauthorized
        }

        const userDoc = result.docs[0];

        // Step 3: Create the Base64-encoded session string.
        const sessionString = `${userDoc._id}:${userDoc.username}:${userDoc.password}`;
        const encodedAuth = btoa(sessionString);

        // Step 4: Return a success response and set the session cookie.
        const cookie = `auth=${encodedAuth}; Path=/; SameSite=Strict; Secure`;

        return new Response(JSON.stringify({
            ok: true,
            message: "Login successful."
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookie
            }
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        return jsonError('An unexpected error occurred during login.');
    }
}
