const logContainer = document.getElementById('log-container');
const filterInput = document.getElementById('filter');
const clearBtn = document.getElementById('clear');

// --- CONFIGURATION FOR ARRAY FORMAT ---
const TOPIC_PREFIX = "analytics:"; 
const INDEX_TOPIC = 2;   // Position of "analytics:..."
const INDEX_EVENT = 3;   // Position of "core:analytics-event"
const INDEX_PAYLOAD = 4; // Position of the data object
// ---------------------------------------

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
      const dataArray = JSON.parse(rawPayload);

      // Verify it's an array and check the topic at index 2
      if (Array.isArray(dataArray) && 
          dataArray[INDEX_TOPIC] && 
          dataArray[INDEX_TOPIC].startsWith(TOPIC_PREFIX)) {
        
        allMessages.push({
          topic: dataArray[INDEX_TOPIC],
          eventName: dataArray[INDEX_EVENT],
          data: dataArray[INDEX_PAYLOAD],
          time: new Date().toLocaleTimeString()
        });
        
        renderLogs(); 
      }
    } catch (e) { /* Not JSON or Malformed */ }
  }
});

// 3. Smart Rendering
function renderLogs() {
  const searchTerm = filterInput.value.toLowerCase();
  const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 10;

  logContainer.innerHTML = '';

  allMessages.forEach(msg => {
    // We search across the topic name, event name, AND the data payload
    const strData = (msg.topic + msg.eventName + JSON.stringify(msg.data)).toLowerCase();
    
    if (searchTerm && !strData.includes(searchTerm)) return;

    const card = document.createElement('div');
    card.className = 'message-card';
    card.innerHTML = `
      <div class="timestamp">
        ${msg.time} — <strong>${msg.topic}</strong> — <span style="color: #4ec9b0">${msg.eventName}</span>
      </div>
      <pre>${syntaxHighlight(msg.data)}</pre>
    `;
    logContainer.appendChild(card);
  });

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