import { storeCredentials } from './passwordmanager.js';

export async function generateZKProof(password, challenge) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${challenge}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16)).join('');
}

export async function handleZKPLogin(username, password) {
  try {
    // Get challenge from server
    const challengeResponse = await fetch(`http://localhost:5000/api/zkp/challenge?username=${encodeURIComponent(username)}`);
    if (!challengeResponse.ok) throw new Error('Failed to get challenge');
    const { challenge } = await challengeResponse.json();
    
    // Generate proof
    const proof = await generateZKProof(password, challenge);
    
    // Verify proof
    const verifyResponse = await fetch('http://localhost:5000/api/zkp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, proof, challenge })
    });
    
    if (!verifyResponse.ok) throw new Error('Verification failed');
    const { success, token } = await verifyResponse.json();
    
    if (success) {
      await storeCredentials(username, password);
      localStorage.setItem('authToken', token);
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('ZKP login error:', error);
    return { success: false, error: error.message };
  }
}

export async function fallbackTraditionalLogin(username, password) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
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
    const regResponse = await fetch('http://localhost:5000/api/auth/register', {
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
    const commitment = await generateZKProof(password, 'initial-commitment');
    const zkpResponse = await fetch('http://localhost:5000/api/zkp/register', {
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