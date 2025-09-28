let client = null;
let API_ID = null;
let API_HASH = null;

// --- Load Config ---
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    API_ID = data.apiId;
    API_HASH = data.apiHash; 
    return true;
  } catch (err) {
    console.error("Failed to load config:", err);
    document.getElementById("status").textContent = "Configuration error.";
    return false;
  }
}

// --- Init TDLib Client ---
async function initClient() {
  const statusEl = document.getElementById("status");

  client = new TdClient({
    clientId: 1,
    logVerbosityLevel: 0,
    jsLogVerbosityLevel: 'error',
    mode: 'wasm',
    wasmUrl: 'https://cdn.jsdelivr.net/npm/tdweb@1.8.0/td_web.wasm',
    fallbackWasmUrl: 'https://unpkg.com/tdweb@1.8.0/td_web.wasm',
    nativeLibUrl: 'https://cdn.jsdelivr.net/npm/tdweb@1.8.0/td_native.wasm',
  });

  client.use(new TdAuthParameters({
    useTestDc: false,
    apiId: API_ID,
    apiHash: API_HASH,
    systemLanguageCode: 'en',
    deviceModel: 'Web App',
    systemVersion: 'Web',
    applicationVersion: '1.0',
    enableStorageOptimizer: true,
    ignoreFileNames: true,
    databaseDirectory: 'tdlib-db-temp',
    filesDirectory: 'tdlib-files-temp'
  }));

  // Listen to updates
  client.onUpdate(update => {
    console.log('Update:', update['@type'], update);

    switch (update['@type']) {
      case 'updateAuthorizationState':
        handleAuthState(update.authorizationState);
        break;

      case 'updateNewChat':
      case 'updateChatTitle':
      case 'updateChatPhoto':
        refreshChannelsList();
        break;
    }
  });

  client.onFatalError(error => {
    statusEl.textContent = `Fatal: ${error}`;
    console.error("TDLib Fatal Error:", error);
  });
}

function handleAuthState(state) {
  const statusEl = document.getElementById("status");
  const loginBtn = document.getElementById("start-client");

  switch (state['@type']) {
    case 'authorizationStateWaitTdlibParameters':
      statusEl.textContent = "Setting up...";
      break;

    case 'authorizationStateWaitEncryptionKey':
      client.execute({ '@type': 'checkDatabaseEncryptionKey' });
      break;

    case 'authorizationStateWaitPhoneNumber':
      statusEl.textContent = "Enter phone number.";
      const phone = prompt("Enter your phone number (with country code):");
      if (phone) {
        client.execute({ '@type': 'setAuthenticationPhoneNumber', phoneNumber: phone });
      }
      break;

    case 'authorizationStateWaitCode':
      const code = prompt("Enter SMS code:");
      if (code) {
        client.execute({ '@type': 'checkAuthenticationCode', code });
      }
      break;

    case 'authorizationStateWaitPassword':
      const password = prompt("Enter 2FA password:");
      if (password) {
        client.execute({ '@type': 'checkAuthenticationPassword', password });
      }
      break;

    case 'authorizationStateReady':
      statusEl.textContent = "Connected! Loading your data...";
      loginBtn.disabled = true;
      loadChats();
      break;

    case 'authorizationStateClosed':
      statusEl.textContent = "Connection closed.";
      break;
  }
}

async function loadChats() {
  try {
    const result = await client.execute({
      '@type': 'getChats',
      chatList: { '@type': 'chatListMain' },
      limit: 100
    });

    if (result['@type'] === 'chats') {
      const promises = result.chatIds.map(chatId =>
        client.execute({ '@type': 'getChat', chatId })
      );

      const chats = await Promise.all(promises);
      const filtered = chats.filter(chat =>
        chat.type?.['@type'] === 'chatTypeBasicGroup' ||
        chat.type?.['@type'] === 'chatTypeSupergroup' ||
        chat.type?.['@type'] === 'chatTypeChannel'
      );

      displayChannels(filtered);
    }
  } catch (err) {
    console.error("Failed to load chats:", err);
    document.getElementById("status").textContent = "Load failed.";
  }
}

function displayChannels(chats) {
  const list = document.getElementById("channels-list");
  list.innerHTML = '';

  if (chats.length === 0) {
    list.innerHTML = '<li>No channels or groups found.</li>';
  } else {
    chats.forEach(chat => {
      const photoUrl = getChatPhotoUrl(chat);
      const type = chat.type?.['@type'];
      const typeName = type.includes('Channel') ? 'Channel' :
                       type.includes('Supergroup') ? 'Group' : 'Basic Group';

      const li = document.createElement('li');
      li.innerHTML = `
        <img class="channel-photo" src="${photoUrl || 'https://via.placeholder.com/40'}" width="40" style="border-radius:8px;margin-right:12px" alt="" />
        <strong>${escapeHtml(chat.title)}</strong>
        <em style="color:#7f8c8d">(${typeName})</em>
      `;
      list.appendChild(li);
    });
  }

  document.getElementById("channels-section").style.display = 'block';
}

function getChatPhotoUrl(chat) {
  const photo = chat.photo;
  if (!photo) return null;
  // TODO: Replace with proper TDLib downloadFile call for real images
  return null;
}

function escapeHtml(unsafe) {
  return unsafe?.replace(/[&<>"']/g, h => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  }[h])) || '';
}

// --- DOM Interaction ---
document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = document.getElementById('auth-info');
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (user) {
    authInfo.innerHTML = `
      <p><strong>Hello, ${user.first_name}!</strong></p>
      <p>User ID: <code>${user.id}</code></p>
      ${user.username ? `<p>Username: @${user.username}</p>` : ''}
    `;
    window.Telegram.WebApp.ready();
  }

  if (!(await loadConfig())) {
    alert("App configuration failed.");
    return;
  }

  await initClient();

  document.getElementById("start-client").onclick = () => {
    client.execute({ '@type': 'getAuthorizationState' });
  };
});
