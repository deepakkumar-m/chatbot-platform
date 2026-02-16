/**
 * Platform Engineering Chatbot - Frontend JavaScript
 */

// DOM Elements
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const statsElements = {
    servers: document.getElementById('serverCount'),
    apps: document.getElementById('appCount')
};

// State
let isProcessing = false;

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    loadStatistics();
    chatInput.focus();
});

// ==================== Event Listeners ====================
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleUserMessage();
});

chatInput.addEventListener('input', () => {
    sendButton.disabled = !chatInput.value.trim();
});

// ==================== Core Functions ====================
async function handleUserMessage() {
    const message = chatInput.value.trim();

    if (!message || isProcessing) {
        return;
    }

    // Add user message to chat
    addUserMessage(message);

    // Clear input
    chatInput.value = '';
    sendButton.disabled = true;

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Process message
    isProcessing = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (response.ok) {
            addBotMessage(data);
        } else {
            addErrorMessage(data.error || 'An error occurred');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addErrorMessage('Failed to connect to the server. Please check if the server is running.');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        chatInput.focus();
    }
}

// ==================== Message Rendering ====================
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';

    let content = `<div class="message-text">${escapeHtml(data.message)}</div>`;

    // Add results if available
    if (data.results && data.results.length > 0) {
        content += renderResults(data.results);
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="9" cy="9" r="1" fill="currentColor"/>
                <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
        </div>
        <div class="message-content">
            ${content}
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addErrorMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">
            <div class="message-text" style="border-color: var(--error); background: rgba(239, 68, 68, 0.1);">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function renderResults(results) {
    let html = '<div class="results-grid">';

    results.forEach(result => {
        const serverName = result['Server/Node Name'] || 'N/A';
        const clusterName = result['Cluster Name'] || 'N/A';
        const environment = result['Environment'] || 'N/A';

        const runAs = result['Run as'] || 'N/A';

        const notes = result['Notes'] || '-';



        html += `
            <div class="result-card">
                <div class="result-card-header">
                    <div class="result-card-title">${escapeHtml(serverName)}</div>
                    ${runAs !== 'N/A' ? `<span class="result-card-badge badge-active">${escapeHtml(runAs)}</span>` : ''}
                </div>
                <div class="result-card-body">
                    <div class="result-card-row">
                        <span class="result-card-label">Cluster:</span>
                        <span class="result-card-value">${escapeHtml(clusterName)}</span>
                    </div>
                    <div class="result-card-row">
                        <span class="result-card-label">Environment:</span>
                        <span class="result-card-value">${escapeHtml(environment)}</span>
                    </div>
                    ${notes !== '-' ? `
                        <div class="result-card-row" style="margin-top: 0.5rem; flex-direction: column; align-items: flex-start;">
                            <span class="result-card-label">Notes:</span>
                            <span class="result-card-value" style="font-size: 0.85rem; margin-top: 0.25rem;">${escapeHtml(notes)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// ==================== Typing Indicator ====================
function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = id;
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="9" cy="9" r="1" fill="currentColor"/>
                <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

// ==================== Statistics ====================
async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (response.ok) {
            statsElements.servers.textContent = data.unique_servers || 0;
            statsElements.apps.textContent = data.unique_applications || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        statsElements.servers.textContent = '?';
        statsElements.apps.textContent = '?';
    }
}

// ==================== Utility Functions ====================
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Keyboard Shortcuts ====================
document.addEventListener('keydown', (e) => {
    // Focus input on '/' key
    if (e.key === '/' && document.activeElement !== chatInput) {
        e.preventDefault();
        chatInput.focus();
    }

    // Clear chat on Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (confirm('Clear chat history?')) {
            // Keep only the welcome message
            const welcomeMessage = chatMessages.querySelector('.message.bot-message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
    }
});
