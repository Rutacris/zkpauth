import { storeCredentials } from './passwordmanager.js';

// Shared hashing utility
const hash = async data => {
    const bytes = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(data) // Explicit UTF-8
    )
    return Array.from(new Uint8Array(bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export const generateZKProof = async (password, challenge) => {
    const commitment = await hash(password.trim()) // Add trim
    console.log(`${commitment.trim()}:${challenge.trim()}`);
    return await hash(`${commitment.trim()}:${challenge.trim()}`) // Add trim
}

export const handleZKPLogin = async (username, password) => {
    try {
        // Get challenge
        const res = await fetch(`https://zkpbackend.onrender.com/api/zkp/challenge?username=${encodeURIComponent(username)}`)
        if (!res.ok) throw new Error(await res.text())
        const { challenge } = await res.json()

        // Verify proof
        const verifyRes = await fetch('https://zkpbackend.onrender.com/api/zkp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                challenge,
                proof: await generateZKProof(password, challenge)
            })
        })

        if (!verifyRes.ok) throw new Error(await verifyRes.text())
        const { token } = await verifyRes.json()

        // Store token
        localStorage.setItem('authToken', token)
        return { success: true }

    } catch (error) {
        console.error('Login failed:', error)
        return { success: false, error: error.message }
    }
}

export async function fallbackTraditionalLogin(username, password) {
    try {
        const response = await fetch('https://zkpbackend.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Login failed');
        const { success, token } = await response.json();

        if (success) {
            localStorage.setItem('authToken', token);
            return { success: true };
        }
        return { success: false };
    } catch (error) {
        console.error('Traditional login failed:', error);
        return { success: false, error: error.message };
    }
}

export async function registerUser(username, email, password) {
    try {
        // Traditional registration
        const regResponse = await fetch('https://zkpbackend.onrender.com/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (!regResponse.ok) throw new Error('Registration failed');
        const regData = await regResponse.json();

        if (!regData.success) {
            return regData;
        }

        // ZKP registration

        const commitment = await hash(password.trim()); // Just hash the password directly
        
        const zkpResponse = await fetch('https://zkpbackend.onrender.com/api/zkp/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, commitment })
        });
          

        if (!zkpResponse.ok) throw new Error('ZKP setup failed');

        return { success: true, message: 'Registration successful' };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: error.message };
    }
}