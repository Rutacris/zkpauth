import { handleZKPLogin } from './zkp.js';

export function initializePasswordManager() {
  const pmButton = document.getElementById('pmSignIn');

  if (!('PasswordCredential' in window)) {
    pmButton.disabled = true;
    pmButton.title = "Password manager not supported in your browser";
    return;
  }

  pmButton.disabled = false;

  pmButton.addEventListener('click', async () => {
    try {
      const cred = await navigator.credentials.get({
        password: true,
        mediation: 'required'
      });

      if (cred) {

        try {
          // First try ZKP login
          let { success } = await handleZKPLogin(cred.id, cred.password);

          if (success) {
            window.location.href = '/dashboard.html';
          } else {
            showError('Authentication failed', 'errorDisplay');
          }
        } catch (error) {
          showError(error.message || 'Login failed', 'errorDisplay');
        } finally {
          hideLoading('zkpLoading');
        }

      }
    } catch (error) {
      console.error('Password Manager error:', error);
      showError('Password manager error', 'errorDisplay');
    }
  });
}

export async function storeCredentials(username, password) {
  if (!('PasswordCredential' in window)) return;

  try {
    const cred = new PasswordCredential({
      id: username,
      password: password,
      name: username.split('@')[0],
      additionalData: {
        zkpEnabled: true,
        lastUsed: new Date().toISOString()
      }
    });

    await navigator.credentials.store(cred);
    console.log('Credentials stored successfully');
  } catch (error) {
    console.error('Credential storage failed:', error);
  }
}

function showError(message, elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
}
