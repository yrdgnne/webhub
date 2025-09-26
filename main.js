//import { TelegramClient } from 'https://cdn.jsdelivr.net/npm/gramjs@2.4.31/Telegram/index.js';
//import { StoreSession } from 'https://cdn.jsdelivr.net/npm/gramjs@2.4.31/sessions/StoreSession/index.js';
import { MTProto } from 'https://cdn.jsdelivr.net/npm/@mtproto/core/+esm';

// --- CONFIGURATION ---
/*
let API_ID = null;
let API_HASH = null;

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    
    const data = await res.json();
    API_ID = data.apiId;
    API_HASH = atob(data.apiHash); // decode Base64
    return true;
  } catch (err) {
    console.error("Could not load config:", err);
    statusEl.textContent = "App configuration failed.";
    loginBtn.disabled = true;
    return false;
  }
}

*/

const api = API_ID = 20277861; // ← TG APP API from https://my.telegram.org/apps
const API_HASH = '4071f73055c57bd576ea482158286ffa'; // ← API hash


// --- DOM Elements ---
const authInfo = document.getElementById('auth-info');
const statusEl = document.getElementById('status');
const loginBtn = document.getElementById('start-login');
const channelsSection = document.getElementById('channels-section');
const channelsList = document.getElementById('channels-list');

// --- Telegram WebApp Integration ---
if (window.Telegram?.WebApp){
  const user = window.Telegram.WebApp.initDataUnsafe?.user;
  if (user) {
    authInfo.innerHTML = `
      <p><strong>Hello, ${user.first_name}!</strong></p>
      <p>User ID: <code>${user.id}</code></p>
      ${user.username ? `<p>Username: @${user.username}</p>` : ''}
    `;
  } else {
    authInfo.innerHTML = `<p>Not launched from Telegram.</p>`;
  }
  window.Telegram.WebApp.ready();
} else {
  authInfo.innerHTML = `<p>This app must be opened inside Telegram.</p>`;
  loginBtn.disabled = true;
}
/*
if (window.Telegram?.WebApp) {
  const initData = window.Telegram.WebApp.initData;
  const user = window.Telegram.WebApp.initDataUnsafe?.user;

  if (user) {
    authInfo.innerHTML = `
      <p><strong>Hello, ${user.first_name}!</strong></p>
      <p>User ID: <code>${user.id}</code></p>
      ${user.username ? `<p>Username: @${user.username}</p>` : ''}
    `;
  } else {
    authInfo.innerHTML = `<p>Not launched from Telegram.</p>`;
  }

  window.Telegram.WebApp.ready();
} else {
  authInfo.innerHTML = `<p>This app must be opened inside Telegram.</p>`;
  loginBtn.disabled = true;
}

// --- GramJS Session Setup ---
*/
//let client = null;

//--- Create Client ---
const mtproto =new MTProto({
  api_id:API_ID,
  api_hash:API_HASH,
});

// -- login flow --


async function startLogin() {
  loginBtn.disabled = true;
  statusEl.textContent = "Initializing session...";

  try{
    // send codeto user 
    const phone = prompt("Enter your Phone number (with country code):");
    const {phone_code_hash } = await mtproto.call('auth.sendCode',{phone_number:phone,
                                                                  settings:{_: 'codeSettings'},
                                                                  });
    const code = prompt("Enter the code you received:");
    const signIn = await mtproto.call('auth.signIn',{
      phone_number: phone,
      phone_code_hash: phone_code_hash,
      phone_code: phone_code,
    });
    console.log("SSigned in:",signIn);
    statusEl.textContext = "Connected! Fetching your channels ...";
    await loadChannels();
  }catch(err){
    console.error("Login failed:",err);
    ststusEl.textContent ='Failed: ${err.message}';
    loginBtn.disabled=false;
  }
 /*
  try {
    const session = new StoreSession("tg_session"); // saved in localStorage
    client = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 5,
      appVersion: "1.0",
      deviceModel: "Web App",
      systemVersion: "Web",
    });

    await client.start({
      phoneNumber: async () => {
        statusEl.textContent = "Enter phone number in console.";
        return prompt("Enter your phone number:");
      },
      password: async () => {
        return prompt("Enter 2FA password (if enabled):");
      },
      phoneCode: async () => {
        return prompt("Enter SMS code:");
      },
      onError: (err) => {
        console.error("Auth error:", err);
        statusEl.textContent = `Error: ${err.message}`;
      },
    });

    statusEl.textContent = "Connected! Fetching your channels...";
    loadChannels();
  } catch (err) {
    console.error("Failed to connect:", err);
    statusEl.textContent = `Failed: ${err.message}`;
    loginBtn.disabled = false;
  }
    */
}

// -- load channels
async function loadChannels() {
  try{
    const dialogs = await mtproto.call('messages.getDialogs', {limit:50});
    console.log("Dialogs:",dialogs);
    if(!dialogs.chats|| dialogs.chats.length ===0){
      channelsList.innerHTML ='<li> No channels or groups found.</li>';
    } else{
      channelsList.innnerHTML = dialogs.chats.map(
        chat =>
         <li>
          <img class="channel-photo" src= "https://via.placeholder.com/40" alt=""/>
          <strong>${chat.title || "Unnamed"}</strong>
          <em>(${chat._})</em>
        </li>).join('');
    }
    channelsSection.style.display ='block';
    statusEl.textContent ='Loaded ${dialogs.chats.length} communities. ';
  } catch(err){
    console.error("Failed to load dialogs:",err);
    statusEl.textContent ='Load failed:${err.message}';
  }
  
  
 /*
  try {
    const dialogs = await client.getDialogs({ limit: 100 });
    const channelsAndGroups = dialogs.filter(d => d.isChannel || d.isGroup);

    if (channelsAndGroups.length === 0) {
      channelsList.innerHTML = `<li>No channels or groups found.</li>`;
    } else {
      channelsList.innerHTML = channelsAndGroups.map(d => {
        const photoUrl = d.entity?.photo
          ? client.getProfilePhotos(d.entity)
              .then(photos => photos[0]?.sizes?.pop()?.download())
              .catch(() => null)
          : null;

        return `
          <li>
            <img class="channel-photo" src="https://via.placeholder.com/40" alt="" />
            <strong>${d.name}</strong>
            <em>(${d.isChannel ? 'Channel' : 'Group'})</em>
          </li>
        `;
      }).join('');
    }

    // Lazy-load images after DOM render
    setTimeout(async () => {
      const imgs = channelsList.querySelectorAll('img');
      for (let i = 0; i < channelsAndGroups.length; i++) {
        const d = channelsAndGroups[i];
        if (d.entity?.photo) {
          try {
            const photo = await client.getProfilePhotos(d.entity, { limit: 1 });
            if (photo[0]) {
              const size = photo[0].sizes.pop();
              imgs[i].src = await size.download();
            }
          } catch (e) { 
          
          /* ignore */ 
          //}
       /* }
      }
    }, 100);

    channelsSection.style.display = 'block';
    statusEl.textContent = `Loaded ${channelsAndGroups.length} communities.`;
  } catch (err) {
    console.error("Failed to load dialogs:", err);
    statusEl.textContent = `Load failed: ${err.message}`;
  }
  */
}

// --- Event Listeners ---
loginBtn.addEventListener('click', startLogin);
