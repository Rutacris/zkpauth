import { initializePasswordManager, storeCredentials } from './passwordmanager.js';
import { handleZKPLogin, fallbackTraditionalLogin, registerUser } from './zkp.js';

document.addEventListener('DOMContentLoaded', () => {
    initializePasswordManager();
    setupEventListeners();
});

function setupEventListeners() {
    // Login/Register toggle
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginCard').classList.remove('active');
        document.getElementById('registerCard').classList.add('active');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerCard').classList.remove('active');
        document.getElementById('loginCard').classList.add('active');
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        // showLoading('zkpLoading');
        const startTime = Date.now();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // First login
            let { success, error } = await fallbackTraditionalLogin(username, password);

            if (success) {
                storeCredentials(username, password);
                window.location.href = '/dashboard.html';
            } else {
                showError('Authentication failed: ' + error, 'errorDisplay');
            }
        } catch (error) {
            showError(error.message || 'Login failed', 'errorDisplay');
        } finally {
            const duration = Date.now() - startTime;
            // Send log to server
            await fetch('https://zkpbackend.onrender.com/api/log-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    "METHOD":"NORMAL",
                    success,
                    duration,
                    error,
                    timestamp: new Date().toISOString()
                })
            });
            hideLoading('zkpLoading');
        }
    });

    // Registration form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('regLoading');

        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        try {
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const { success, message } = await registerUser(username, email, password);

            if (success) {
                // Auto-login after registration
                const loginResult = await handleZKPLogin(username, password);
                if (loginResult.success) {
                    window.location.href = '/dashboard.html';
                }
            } else {
                showError(message || 'Registration failed', 'regError');
            }
        } catch (error) {
            showError(error.message || 'Registration error', 'regError');
        } finally {

            hideLoading('regLoading');
        }
    });
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'block';
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'none';
}

function showError(message, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}