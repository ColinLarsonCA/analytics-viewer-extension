const logContainer = document.getElementById('log-container');
const filterInput = document.getElementById('filter');
const clearBtn = document.getElementById('clear');

// --- CONFIGURATION ---
const TOPIC_PREFIX = "analytics:"; 
const TOPIC_KEY = "topic";
// ---------------------

// 1. Attach Debugger to the current tab
const tabId = chrome.devtools.inspectedWindow.tabId;

chrome.debugger.attach({ tabId }, "1.3", () => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  chrome.debugger.sendCommand({ tabId }, "Network.enable");
});

// 2. Listen for WebSocket Outgoing Frames
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.webSocketFrameSent") {
    const rawPayload = params.response.payloadData;
    try {
      const json = JSON.parse(rawPayload);
      const topic = json[TOPIC_KEY];

    if (topic && typeof topic === 'string' && topic.startsWith(TOPIC_PREFIX)) {
        addLog(json, topic);
    }
    } catch (e) {
      // Not JSON, ignore
    }
  }
});

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

function addLog(data, topic) {
  const searchTerm = filterInput.value.toLowerCase();
  const strData = JSON.stringify(data).toLowerCase();
  
  if (searchTerm && !strData.includes(searchTerm)) return;

  const card = document.createElement('div');
  card.className = 'message-card';
  const time = new Date().toLocaleTimeString();
  
  card.innerHTML = `
    <div class="timestamp">${time} - ${topic}</div>
    <pre>${syntaxHighlight(data)}</pre>
  `;
  
  logContainer.appendChild(card);
  logContainer.scrollTop = logContainer.scrollHeight; 
}

clearBtn.onclick = () => {
  logContainer.innerHTML = '';
};