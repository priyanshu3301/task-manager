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
 * Handles POST requests to register a new user.
 */
export async function onRequestPost({ request, env }) {
    // Ensure required environment variables are configured
    if (!env.DATABASE_URL || !env.AUTH_URL) {
        console.error("DATABASE_URL or AUTH_URL is not configured.");
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

    const headers = getDbHeaders(env);
    const userDbUrl = `${env.DATABASE_URL}${encodeURIComponent(username)}`;

    try {
        // Step 1: Attempt to create a new database for the user.
        const createDbResponse = await fetch(userDbUrl, {
            method: 'PUT',
            headers: headers
        });

        // Check if the database already exists
        if (createDbResponse.status === 412) {
             const errorBody = await createDbResponse.json();
             if (errorBody.error === 'file_exists') {
                return jsonError("Username is already taken.", 409); // 409 Conflict
             }
        }
        
        if (!createDbResponse.ok && createDbResponse.status !== 201) {
            console.error("Failed to create user database:", await createDbResponse.text());
            return jsonError("Could not create user account.", 500);
        }

        // Step 2: If the database was created, create the user's secure authentication document.
        
        // --- NEW: Hash the password ---
        const salt = crypto.randomUUID(); // Create a unique salt for this user
        const hashedPassword = await hashPassword(password, salt);

        const userAuthPayload = { 
            username, 
            password: hashedPassword, // Store the HASH
            salt: salt                // Store the salt
        };
        // --- End of new code ---

        const createUserDocResponse = await fetch(env.AUTH_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(userAuthPayload)
        });

        if (!createUserDocResponse.ok) {
            // This is a critical failure. The user's DB was created but their auth doc was not.
            // In a production system, you might want to try and delete the user DB here.
            console.error("Failed to create user auth document:", await createUserDocResponse.text());
            return jsonError("Failed to finalize user registration.", 500);
        }
        
        const newUserDoc = await createUserDocResponse.json();

        // Step 3: Registration successful.
        return new Response(JSON.stringify({
            ok: true,
            message: "User registered successfully.",
            userId: newUserDoc.id
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Registration Error:", err.message);
        return jsonError('An unexpected error occurred during registration.');
    }
}