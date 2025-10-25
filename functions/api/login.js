import { SignJWT } from 'jose';

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
 * Hashes a password with a given salt using SHA-256.
 * @param {string} password - The plain-text password.
 * @param {string} salt - A unique string (like a UUID).
 * @returns {Promise<string>} The resulting hash as a hex string.
 */
async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Handles POST requests for user login.
 */
export async function onRequestPost({ request, env }) {
    // Ensure required environment variables are configured
    if (!env.AUTH_URL || !env.JWT_SECRET) {
        console.error("AUTH_URL or JWT_SECRET is not configured.");
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
        // Step 1: Find the user in the authentication database by username.
        const findUrl = `${env.AUTH_URL}_find`;
        const query = {
            selector: {
                username: username
            },
            limit: 1 // We only expect one user
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

        // Step 3: Verify the password hash
        const storedHash = userDoc.password;
        const salt = userDoc.salt;
        const providedHash = await hashPassword(password, salt);

        if (providedHash !== storedHash) {
            return jsonError("Invalid username or password.", 401); // Unauthorized
        }

        // Step 4: Create the JWT
        const secret = getJwtSecret(env);
        const token = await new SignJWT({
            userId: userDoc._id,
            username: userDoc.username
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // Set token to expire in 7 days
        .sign(secret);

        // Step 5: Return a success response and set the secure, HttpOnly cookie.
        const cookie = `auth=${token}; HttpOnly; Path=/; SameSite=Strict; Secure`;

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