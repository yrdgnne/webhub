let client = null;
let API_ID = 20277861; 
let API_HASH = "4071f73055c57bd576ea482158286ffa"; 

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
    apiId: API_ID,
    apiHash: API_HASH,
    systemLanguageCode: 'en',
    deviceModel: 'Web App',
    systemVersion: 'Web',
    applicationVersion: '1.0'
  }));

  client.onUpdate(update => {
    if (update['@type'] === 'updateAuthorizationState') {
      handleAuthState(update.authorizationState);
    }
  });
}

function handleAuthState(state) {
  const statusEl = document.getElementById("status");
  switch (state['@type']) {
    case 'authorizationStateWaitPhoneNumber':
      const phone = prompt("Enter your phone number:");
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
    case 'authorizationStateReady':
      statusEl.textContent = "Connected!";
      loadChats();
      break;
  }
}

async function loadChats() {
  const result = await client.execute({
    '@type': 'getChats',
    chatList: { '@type': 'chatListMain' },
    limit: 20
  });
  console.log(result);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initClient();
  document.getElementById("start-client").onclick = () => {
    client.execute({ '@type': 'getAuthorizationState' });
  };
});
