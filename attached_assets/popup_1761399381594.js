// popup.js - DIAGNOSTIC VERSION - This will definitely show errors
let currentError = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Popup loaded - DOMContentLoaded fired');

    try {
        await loadSettings();
        await loadErrors();
        setupEventListeners();
        console.log('✅ Popup initialization complete');
    } catch (error) {
        console.error('❌ Error during popup initialization:', error);
        showErrorMessage('Failed to initialize popup: ' + error.message);
    }
});

function setupEventListeners() {
    console.log('Setting up event listeners');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    document.getElementById('validateBtn').addEventListener('click', validateCredentials);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllErrors);

    // Debug: Add clear storage button if it exists
    const clearStorageBtn = document.getElementById('clearStorageBtn');
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', clearStorage);
    }

    // Insights tab buttons
    const clearHelpBtn = document.getElementById('clearHelpBtn');
    if (clearHelpBtn) {
        clearHelpBtn.addEventListener('click', clearHelpRequests);
    }

    const refreshInsightsBtn = document.getElementById('refreshInsightsBtn');
    if (refreshInsightsBtn) {
        refreshInsightsBtn.addEventListener('click', loadInsights);
    }

    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('cancelReportBtn').addEventListener('click', closeModal);
    document.getElementById('submitReportBtn').addEventListener('click', submitReport);

    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target.id === 'reportModal') {
            closeModal();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    // Load insights when switching to insights tab
    if (tabName === 'insights') {
        loadInsights();
    }
}

async function loadSettings() {
    console.log('📝 Loading settings...');
    try {
        const credentials = await StorageHelper.getCredentials();
        console.log('Credentials loaded:', {
            hasToken: !!credentials.token,
            hasProjectCode: !!credentials.projectCode,
            configured: credentials.configured
        });

        document.getElementById('apiToken').value = credentials.token || '';
        document.getElementById('projectCode').value = credentials.projectCode || '';

        const statusEl = document.getElementById('configStatus');
        if (credentials.configured) {
            statusEl.textContent = 'Configured';
            statusEl.style.color = '#28a745';
        } else {
            statusEl.textContent = 'Not configured';
            statusEl.style.color = '#dc3545';
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        throw error;
    }
}

async function saveSettings() {
    const token = document.getElementById('apiToken').value.trim();
    const projectCode = document.getElementById('projectCode').value.trim();
    const messageEl = document.getElementById('settingsMessage');

    if (!token || !projectCode) {
        showMessage(messageEl, 'Please fill in all fields', 'error');
        return;
    }

    try {
        await StorageHelper.saveCredentials(token, projectCode);
        showMessage(messageEl, 'Settings saved successfully!', 'success');

        document.getElementById('configStatus').textContent = 'Configured';
        document.getElementById('configStatus').style.color = '#28a745';

        setTimeout(() => {
            messageEl.classList.remove('success', 'error', 'info');
            messageEl.style.display = 'none';
        }, 3000);
    } catch (error) {
        showMessage(messageEl, 'Error saving settings: ' + error.message, 'error');
    }
}

async function validateCredentials() {
    const token = document.getElementById('apiToken').value.trim();
    const projectCode = document.getElementById('projectCode').value.trim();
    const messageEl = document.getElementById('settingsMessage');

    if (!token || !projectCode) {
        showMessage(messageEl, 'Please fill in all fields', 'error');
        return;
    }

    showMessage(messageEl, 'Validating credentials...', 'info');

    try {
        const api = new QaseAPI(token, projectCode);
        await api.validateCredentials();
        showMessage(messageEl, 'Credentials are valid!', 'success');
    } catch (error) {
        showMessage(messageEl, 'Validation failed: ' + error.message, 'error');
    }
}

async function loadErrors() {
    console.log('📥 Loading errors from background...');

    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'GET_ERRORS' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        console.log('📦 Raw response:', response);
        const errors = response?.errors || [];
        console.log(`✅ Received ${errors.length} errors`);

        // Log first error for inspection
        if (errors.length > 0) {
            console.log('🔍 First error structure:', errors[0]);
            console.log('🔍 First error keys:', Object.keys(errors[0]));
        }

        displayErrors(errors);
        updateErrorCount(errors.length);

    } catch (error) {
        console.error('❌ Error loading errors from background:', error);

        // Fallback: Try loading directly from storage
        console.log('🔄 Trying fallback: loading from storage directly...');
        try {
            const errors = await StorageHelper.getErrors();
            console.log(`📦 Got ${errors.length} errors from storage`);
            if (errors.length > 0) {
                console.log('🔍 First error from storage:', errors[0]);
            }
            displayErrors(errors);
            updateErrorCount(errors.length);
        } catch (storageError) {
            console.error('❌ Storage fallback also failed:', storageError);
            showErrorMessage('Failed to load errors: ' + error.message);
        }
    }
}

function displayErrors(errors) {
    console.log(`🎨 displayErrors called with ${errors?.length || 0} errors`);
    const errorsList = document.getElementById('errorsList');

    if (!errorsList) {
        console.error('❌ errorsList element not found!');
        return;
    }

    if (!errors || errors.length === 0) {
        console.log('ℹ️ No errors to display');
        errorsList.innerHTML = `
            <div class="empty-state">
                <p>No errors detected yet</p>
                <small>Errors will appear here when JavaScript errors occur on web pages</small>
            </div>
        `;
        return;
    }

    console.log(`✏️ Rendering ${errors.length} errors...`);

    try {
        const errorHTML = errors.map((error, index) => {
            // Generate ID if missing
            const errorId = error.id || `error_${Date.now()}_${index}`;
            const message = error.message || 'Unknown error';
            const url = error.url || error.tabUrl || 'Unknown URL';
            const timestamp = error.timestamp || new Date().toISOString();

            console.log(`  Rendering error ${index}: ${message.substring(0, 40)}...`);

            return `
                <div class="error-item" data-error-id="${errorId}">
                    <div class="error-header">
                        <span class="error-icon">🔴</span>
                        <div class="error-message">${escapeHtml(truncate(message, 100))}</div>
                    </div>
                    <div class="error-meta">
                        <a href="${escapeHtml(url)}" class="error-url" target="_blank" title="${escapeHtml(url)}">${escapeHtml(truncate(url, 60))}</a>
                        <div class="error-time">${formatTimestamp(timestamp)}</div>
                    </div>
                    <div class="error-actions">
                        <button class="btn btn-primary report-btn" data-error-id="${errorId}" data-error-index="${index}">Report to Qase</button>
                        <button class="btn btn-danger dismiss-btn" data-error-id="${errorId}">Dismiss</button>
                    </div>
                </div>
            `;
        }).join('');

        console.log('📝 Setting innerHTML...');
        errorsList.innerHTML = errorHTML;
        console.log('✅ innerHTML set successfully');

        // Add event listeners
        console.log('🔗 Adding event listeners to buttons...');
        const reportButtons = document.querySelectorAll('.report-btn');
        const dismissButtons = document.querySelectorAll('.dismiss-btn');

        console.log(`  Found ${reportButtons.length} report buttons`);
        console.log(`  Found ${dismissButtons.length} dismiss buttons`);

        reportButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const errorIndex = parseInt(btn.dataset.errorIndex);
                console.log(`🔘 Report button clicked for error index: ${errorIndex}`);
                openReportModal(errors[errorIndex]);
            });
        });

        dismissButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const errorId = btn.dataset.errorId;
                console.log(`🗑️ Dismiss button clicked for error: ${errorId}`);
                dismissError(errorId);
            });
        });

        console.log('✅ Error display complete!');

    } catch (error) {
        console.error('❌ Error in displayErrors:', error);
        console.error('Stack:', error.stack);
        showErrorMessage('Failed to display errors: ' + error.message);
    }
}

function showErrorMessage(message) {
    const errorsList = document.getElementById('errorsList');
    errorsList.innerHTML = `
        <div class="empty-state">
            <p style="color: #f44336;">⚠️ ${escapeHtml(message)}</p>
            <small>Check the console for more details</small>
        </div>
    `;
}

function openReportModal(error) {
    console.log('📋 Opening report modal for error:', error);

    if (!error) {
        console.error('❌ Error object is null/undefined');
        alert('Error not found');
        return;
    }

    currentError = error;

    const title = `Auto-detected: ${truncate(error.message || 'Unknown error', 100)}`;
    const details = `Error Type: ${error.type || 'unknown'}
Message: ${error.message || 'No message'}

Stack Trace:
${error.stack || 'No stack trace available'}

Page URL: ${error.url || error.tabUrl || 'Unknown'}
Timestamp: ${error.timestamp || 'Unknown'}
Browser: ${error.browserInfo || 'Unknown'}`;

    document.getElementById('defectTitle').value = title;
    document.getElementById('defectDetails').value = details;
    document.getElementById('defectSeverity').value = 'major';

    const reportMessage = document.getElementById('reportMessage');
    reportMessage.style.display = 'none';
    reportMessage.classList.remove('success', 'error', 'info');

    document.getElementById('reportModal').classList.add('active');
    console.log('✅ Report modal opened');
}

function closeModal() {
    document.getElementById('reportModal').classList.remove('active');
    currentError = null;
}

async function submitReport() {
    if (!currentError) {
        console.error('❌ No current error to submit');
        return;
    }

    const title = document.getElementById('defectTitle').value.trim();
    const severity = document.getElementById('defectSeverity').value;
    const actualResult = document.getElementById('defectDetails').value;
    const messageEl = document.getElementById('reportMessage');

    if (!title) {
        showMessage(messageEl, 'Title is required', 'error');
        return;
    }

    console.log('📤 Submitting report to Qase...');

    try {
        const credentials = await StorageHelper.getCredentials();

        if (!credentials.configured) {
            showMessage(messageEl, 'Please configure your Qase credentials in Settings first', 'error');
            return;
        }

        showMessage(messageEl, 'Submitting to Qase...', 'info');
        document.getElementById('submitReportBtn').disabled = true;

        const api = new QaseAPI(credentials.token, credentials.projectCode);
        const result = await api.createDefect({
            title: title,
            actual_result: actualResult,
            severity: severity
        });

        console.log('✅ Defect created:', result);
        showMessage(messageEl, `Defect created successfully! ID: ${result.result?.id || 'Unknown'}`, 'success');

        await dismissError(currentError.id);

        setTimeout(() => {
            closeModal();
            loadErrors();
        }, 2000);

    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showMessage(messageEl, 'Error: ' + error.message, 'error');
        document.getElementById('submitReportBtn').disabled = false;
    }
}

async function dismissError(errorId) {
    console.log('🗑️ Dismissing error:', errorId);
    try {
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'REMOVE_ERROR',
                errorId: parseFloat(errorId) || errorId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
        console.log('✅ Error dismissed:', result);
        await loadErrors();
    } catch (error) {
        console.error('❌ Error dismissing error:', error);
    }
}

async function clearAllErrors() {
    if (!confirm('Are you sure you want to clear all errors?')) {
        return;
    }

    console.log('🗑️ Clearing all errors');
    try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_ERRORS' });
        console.log('✅ All errors cleared');
        await loadErrors();
    } catch (error) {
        console.error('❌ Error clearing errors:', error);
    }
}

// DEBUG FUNCTION: Clear storage completely (for testing)
async function clearStorage() {
    if (!confirm('⚠️ This will delete ALL extension data including settings. Continue?')) {
        return;
    }

    console.log('🗑️ Clearing entire storage...');
    chrome.storage.local.clear(() => {
        console.log('✅ Storage cleared completely');
        alert('Storage cleared! Reload the extension and this popup.');
    });
}

function updateErrorCount(count) {
    console.log(`🔢 Updating error count badge: ${count}`);
    const badge = document.getElementById('errorCount');
    if (badge) {
        badge.textContent = count;
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
}

function truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch (e) {
        return String(timestamp);
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('🔥 Popup error:', event.error);
});

console.log('✅ popup.js loaded successfully');
// ========== INSIGHTS TAB FUNCTIONALITY ==========

async function loadInsights() {
    console.log('📊 Loading insights data...');
    await loadHelpRequests();
    // Activity stats would come from a tab if we could access it
    displayActivityMessage();
}

async function loadHelpRequests() {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_HELP_REQUESTS'
        });

        const helpRequests = response.helpRequests || [];
        console.log('📊 Loaded', helpRequests.length, 'help requests');

        displayHelpRequests(helpRequests);
        updateHelpCount(helpRequests.length);
    } catch (error) {
        console.error('❌ Error loading help requests:', error);
    }
}

function displayHelpRequests(requests) {
    const listEl = document.getElementById('helpRequestsList');

    if (requests.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <p>No help requests yet</p>
                <small>The system will automatically detect when you need assistance</small>
            </div>
        `;
        return;
    }

    // Show pending requests first
    const pending = requests.filter(r => r.status === 'pending');
    const completed = requests.filter(r => r.status !== 'pending');

    listEl.innerHTML = [...pending, ...completed].map(request => `
        <div class="help-request-item" data-help-id="${request.id}">
            <div class="help-request-header">
                <span class="help-score">Score: ${(request.score || 0).toFixed(2)}</span>
                <span class="help-context">${request.pageContext || 'unknown'}</span>
            </div>
            <div class="help-suggestion">${escapeHtml(request.suggestedHelp || 'Help available')}</div>
            <div class="help-context">Page: ${truncate(request.url || '', 50)}</div>
            <div class="help-time">${formatTimestamp(request.timestamp)}</div>
            ${request.status === 'pending' ? `
                <div class="help-request-actions">
                    <button class="btn btn-primary btn-sm" onclick="acceptHelp('${request.id}')">Accept</button>
                    <button class="btn btn-secondary btn-sm" onclick="dismissHelpRequest('${request.id}')">Dismiss</button>
                </div>
            ` : `
                <div class="help-context" style="margin-top: 8px; color: #999;">
                    Status: ${request.status}
                </div>
            `}
        </div>
    `).join('');
}

function displayActivityMessage() {
    const statsEl = document.getElementById('activityStats');
    statsEl.innerHTML = `
        <p style="color: #667eea; font-weight: 600; margin-bottom: 12px;">Activity Monitoring Active</p>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Status</div>
                <div class="stat-value" style="font-size: 14px;">Tracking</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Mode</div>
                <div class="stat-value" style="font-size: 14px;">Proactive</div>
            </div>
        </div>
        <p style="margin-top: 12px; font-size: 12px; color: #666;">
            Visit <strong>app.qase.io</strong> to enable behavior tracking and AI assistance
        </p>
    `;
}

async function acceptHelp(helpId) {
    console.log('✅ Accepting help request:', helpId);
    try {
        await chrome.runtime.sendMessage({
            type: 'UPDATE_HELP_STATUS',
            helpId: helpId,
            status: 'accepted'
        });
        await loadHelpRequests();
    } catch (error) {
        console.error('❌ Error accepting help:', error);
    }
}

async function dismissHelpRequest(helpId) {
    console.log('❌ Dismissing help request:', helpId);
    try {
        await chrome.runtime.sendMessage({
            type: 'UPDATE_HELP_STATUS',
            helpId: helpId,
            status: 'dismissed'
        });
        await loadHelpRequests();
    } catch (error) {
        console.error('❌ Error dismissing help:', error);
    }
}

async function clearHelpRequests() {
    if (!confirm('Clear all help requests?')) {
        return;
    }

    console.log('🗑️ Clearing all help requests...');
    try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_HELP_REQUESTS' });
        await loadHelpRequests();
    } catch (error) {
        console.error('❌ Error clearing help requests:', error);
    }
}

function updateHelpCount(count) {
    console.log(`🔢 Updating help count badge: ${count}`);
    const badge = document.getElementById('helpCount');
    if (badge) {
        badge.textContent = count;
    }
}

// No need to override - these are called in the main setupEventListeners

console.log('✅ Insights functionality loaded');
