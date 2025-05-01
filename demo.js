document.addEventListener('DOMContentLoaded', async () => {
    const pmButton = document.getElementById('pmSignIn');
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
  
    if (isPasswordManagerSupported()) {
      await enablePasswordManager();
      disableBrowserAutofill();
    }
  
    loginForm.addEventListener('submit', handleFormSubmit);
  });
  
  function isPasswordManagerSupported() {
    return 'PasswordCredential' in window;
  }
  
  async function enablePasswordManager() {
    const pmButton = document.getElementById('pmSignIn');
    pmButton.disabled = false;
    
    const credentials = await getAvailableCredentials();
    
    if (credentials.length > 1) {
      createCredentialSelector(credentials);
      pmButton.style.display = 'none';
    } else {
      pmButton.addEventListener('click', handlePasswordManagerLogin);
    }
  }
  
  async function getAvailableCredentials() {
    try {
      const cred = await navigator.credentials.get({
        password: true,
        mediation: 'silent'
      });
      return cred ? [cred] : [];
    } catch (error) {
      console.debug('Silent credential retrieval failed:', error);
      return [];
    }
  }
  
  function createCredentialSelector(credentials) {
    const container = document.createElement('div');
    container.className = 'credential-selector';
    
    const select = document.createElement('select');
    select.id = 'credentialSelect';
    select.className = 'credential-dropdown';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select an account';
    select.appendChild(defaultOption);
    
    credentials.forEach(cred => {
      const option = document.createElement('option');
      option.value = cred.id;
      option.textContent = cred.name || cred.id;
      option.dataset.credential = JSON.stringify({
        id: cred.id,
        password: cred.password
      });
      select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
      if (e.target.value) {
        const selectedOption = e.target.selectedOptions[0];
        const cred = JSON.parse(selectedOption.dataset.credential);
        document.getElementById('username').value = cred.id;
        document.getElementById('password').value = cred.password;
        redirectToDashboard(cred.id);
      }
    });
    
    container.appendChild(select);
    document.querySelector('.login-card').insertBefore(container, document.querySelector('.divider'));
  }
  
  async function handlePasswordManagerLogin() {
    try {
      const cred = await navigator.credentials.get({
        password: true,
        mediation: 'required'
      });
      
      if (cred) {
        redirectToDashboard(cred.id);
      }
    } catch (error) {
      console.error('Password Manager error:', error);
      alert('Could not retrieve credentials. Please try manual sign in.');
    }
  }
  
  async function handleFormSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
      if (isPasswordManagerSupported()) {
        await storeCredentials(username, password);
      }
      redirectToDashboard(username);
    }
  }
  
  async function storeCredentials(username, password) {
    try {
      const cred = new PasswordCredential({
        id: username,
        password: password,
        name: username.split('@')[0]
      });
      await navigator.credentials.store(cred);
    } catch (error) {
      console.log('Credential storage failed:', error);
    }
  }
  
  function redirectToDashboard(username) {
    // Store username in sessionStorage for dashboard to use
    sessionStorage.setItem('currentUser', username);
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  }
  
  function disableBrowserAutofill() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    loginForm.setAttribute('autocomplete', 'off');
    usernameInput.setAttribute('autocomplete', 'off');
    passwordInput.setAttribute('autocomplete', 'new-password');
    usernameInput.setAttribute('name', 'no-autofill-username');
    passwordInput.setAttribute('name', 'no-autofill-password');
    usernameInput.setAttribute('data-lpignore', 'true');
    passwordInput.setAttribute('data-lpignore', 'true');
  }