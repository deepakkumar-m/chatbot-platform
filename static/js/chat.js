/**
 * GBME Platform Assistant – Frontend JavaScript
 * Rancher API mode: displays cluster status, nodes, CPU & memory.
 */

// DOM Elements
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const statsElements = {
    clusters: document.getElementById('clusterCount'),
    nodes: document.getElementById('nodeCount'),
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
    if (!message || isProcessing) return;

    addUserMessage(message);
    chatInput.value = '';
    sendButton.disabled = true;

    const typingId = showTypingIndicator();
    isProcessing = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
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
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addBotMessage(data) {
    const div = document.createElement('div');
    div.className = 'message bot-message';

    // Render markdown-lite bold (**text**)
    const messageHtml = escapeHtml(data.message).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let content = `<div class="message-text">${messageHtml}</div>`;

    if (data.results && data.results.length > 0) {
        content += renderClusterResults(data.results);
    }

    div.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="9" cy="9" r="1" fill="currentColor"/>
                <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
        </div>
        <div class="message-content">${content}</div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
}

function addErrorMessage(text) {
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">
            <div class="message-text" style="border-color: var(--error); background: rgba(239,68,68,0.1);">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

// ==================== Cluster / Node Rendering ====================

function stateBadge(state) {
    const s = (state || 'unknown').toLowerCase();
    const ok = s === 'active' || s === 'running';
    const warn = ['provisioning', 'updating', 'upgrading', 'migrating'].includes(s);
    const color = ok ? 'var(--success, #22c55e)' : warn ? 'var(--warning, #f59e0b)' : 'var(--error, #ef4444)';
    const icon = ok ? '✅' : warn ? '⚠️' : '🔴';
    return `<span class="result-card-badge" style="background:${color}22; color:${color}; border:1px solid ${color}55;">
                ${icon} ${escapeHtml(state || 'unknown')}
            </span>`;
}

function resourceBar(label, requested, capacity) {
    if (!capacity) return '';

    // Parse Kubernetes resource strings like "4" (cores), "8000m", "16Gi", "32768Mi"
    const parseCPU = v => {
        if (!v) return 0;
        if (v.endsWith('m')) return parseFloat(v) / 1000;
        return parseFloat(v);
    };
    const parseMem = v => {
        if (!v) return 0;
        if (v.endsWith('Ki')) return parseFloat(v) / (1024 * 1024);
        if (v.endsWith('Mi')) return parseFloat(v) / 1024;
        if (v.endsWith('Gi')) return parseFloat(v);
        if (v.endsWith('Ti')) return parseFloat(v) * 1024;
        return parseFloat(v) / (1024 * 1024 * 1024);
    };

    const isMem = label.toLowerCase().includes('mem');
    const parse = isMem ? parseMem : parseCPU;
    const rVal = parse(requested);
    const cVal = parse(capacity);

    if (!cVal) return '';
    const pct = Math.min(100, Math.round((rVal / cVal) * 100));
    const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e';

    const fmt = isMem
        ? v => `${parse(v).toFixed(1)} Gi`
        : v => `${parse(v).toFixed(2)} cores`;

    return `
        <div class="resource-row">
            <span class="resource-label">${label}</span>
            <div class="resource-bar-wrap">
                <div class="resource-bar-fill" style="width:${pct}%; background:${color};"></div>
            </div>
            <span class="resource-pct">${fmt(requested)} / ${fmt(capacity)} (${pct}%)</span>
        </div>`;
}

function renderNodeRow(node) {
    const stateColor = node.is_down ? '#ef4444' : '#22c55e';
    const stateIcon = node.is_down ? '🔴' : '🟢';
    const roles = (node.roles || []).join(', ') || 'worker';

    return `
        <div class="node-row ${node.is_down ? 'node-down' : ''}">
            <div class="node-name">
                <span style="color:${stateColor};">${stateIcon}</span>
                ${escapeHtml(node.name)}
            </div>
            <div class="node-meta">
                <span class="node-role">${escapeHtml(roles)}</span>
                <span class="node-state" style="color:${stateColor};">${escapeHtml(node.state)}</span>
            </div>
            ${resourceBar('CPU', node.cpu_requested, node.cpu_capacity)}
            ${resourceBar('Memory', node.memory_requested, node.memory_capacity)}
        </div>`;
}

function renderClusterResults(results) {
    let html = '<div class="results-grid">';

    results.forEach(cluster => {
        const hasDownNodes = cluster.down_nodes > 0;
        const totalNodes = cluster.total_nodes ?? cluster.nodes?.length ?? 'N/A';
        const downNodes = cluster.down_nodes ?? 0;

        html += `
            <div class="result-card ${hasDownNodes ? 'card-warning' : ''}">
                <div class="result-card-header">
                    <div class="result-card-title">🖥️ ${escapeHtml(cluster.name)}</div>
                    ${stateBadge(cluster.state)}
                </div>
                <div class="result-card-body">

                    <!-- Cluster meta -->
                    <div class="result-card-row">
                        <span class="result-card-label">Provider:</span>
                        <span class="result-card-value">${escapeHtml(cluster.provider || 'N/A')}</span>
                    </div>
                    <div class="result-card-row">
                        <span class="result-card-label">K8s Version:</span>
                        <span class="result-card-value">${escapeHtml(cluster.k8s_version || 'N/A')}</span>
                    </div>
                    <div class="result-card-row">
                        <span class="result-card-label">Nodes:</span>
                        <span class="result-card-value">
                            ${totalNodes} total
                            ${hasDownNodes
                ? `<span style="color:#ef4444; font-weight:600;"> — ⚠️ ${downNodes} DOWN</span>`
                : '<span style="color:#22c55e;"> — all healthy</span>'}
                        </span>
                    </div>

                    <!-- Cluster-level CPU / Memory -->
                    ${resourceBar('CPU', cluster.cpu_requested, cluster.cpu_capacity)}
                    ${resourceBar('Memory', cluster.memory_requested, cluster.memory_capacity)}

                    <!-- Node detail rows -->
                    ${cluster.nodes && cluster.nodes.length > 0 ? `
                        <div class="nodes-section">
                            <div class="nodes-section-title">Nodes</div>
                            ${cluster.nodes.map(renderNodeRow).join('')}
                        </div>` : ''}
                </div>
            </div>`;
    });

    html += '</div>';
    return html;
}

// ==================== Typing Indicator ====================
function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.id = id;
    div.innerHTML = `
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
    chatMessages.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ==================== Statistics ====================
async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (response.ok) {
            if (statsElements.clusters) statsElements.clusters.textContent = data.total_clusters ?? 0;
            if (statsElements.nodes) statsElements.nodes.textContent = data.total_nodes ?? 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        if (statsElements.clusters) statsElements.clusters.textContent = '?';
        if (statsElements.nodes) statsElements.nodes.textContent = '?';
    }
}

// ==================== Utility ====================
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

// ==================== Keyboard Shortcuts ====================
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== chatInput) {
        e.preventDefault();
        chatInput.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (confirm('Clear chat history?')) {
            const welcome = chatMessages.querySelector('.message.bot-message');
            chatMessages.innerHTML = '';
            if (welcome) chatMessages.appendChild(welcome);
        }
    }
});
