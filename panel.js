const logContainer = document.getElementById('log-container');
const filterInput = document.getElementById('filter');
const clearBtn = document.getElementById('clear');

// --- CONFIGURATION ---
const TOPIC_PREFIX = "analytics:"; 
const TOPIC_KEY = "topic"; 
// ---------------------

let allMessages = [];
const tabId = chrome.devtools.inspectedWindow.tabId;

// 1. Connection logic
chrome.debugger.attach({ tabId }, "1.3", () => {
  if (chrome.runtime.lastError) return;
  chrome.debugger.sendCommand({ tabId }, "Network.enable");
});

// 2. Listen for WebSocket Outgoing Frames
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.webSocketFrameSent") {
    const rawPayload = params.response.payloadData;
    try {
      const json = JSON.parse(rawPayload);
      const currentTopic = json[TOPIC_KEY];

      // if (currentTopic && typeof currentTopic === 'string' && currentTopic.startsWith(TOPIC_PREFIX)) {
        allMessages.push({
          topic: currentTopic,
          data: json,
          time: new Date().toLocaleTimeString()
        });
        renderLogs(); 
      // }
    } catch (e) { /* Not JSON */ }
  }
});

// 3. Smart Rendering with Sticky Scroll
function renderLogs() {
  const searchTerm = filterInput.value.toLowerCase();
  
  // Check if user is at the bottom BEFORE we update the content
  // We use a 10px threshold to be more forgiving
  const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 10;

  logContainer.innerHTML = '';

  allMessages.forEach(msg => {
    const strData = JSON.stringify(msg.data).toLowerCase();
    if (searchTerm && !strData.includes(searchTerm)) return;

    const card = document.createElement('div');
    card.className = 'message-card';
    card.innerHTML = `
      <div class="timestamp">${msg.time} — Topic: <strong>${msg.topic}</strong></div>
      <pre>${syntaxHighlight(msg.data)}</pre>
    `;
    logContainer.appendChild(card);
  });

  // Only scroll down if they were already at the bottom
  if (isAtBottom) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

filterInput.addEventListener('input', renderLogs);

function syntaxHighlight(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) cls = 'key';
      else cls = 'string';
    } else if (/true|false/.test(match)) cls = 'boolean';
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

clearBtn.onclick = () => {
  allMessages = [];
  renderLogs();
};