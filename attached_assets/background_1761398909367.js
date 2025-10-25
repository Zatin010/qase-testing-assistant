// background.js - FIXED VERSION with Help Requests
let errorQueue = [];
let helpRequests = [];
const maxHelpRequests = 50;

// Initialize both queues from storage on startup
chrome.storage.local.get(['errorQueue', 'helpRequests'], (result) => {
    if (result.errorQueue) {
        errorQueue = result.errorQueue;
        console.log('Background: Loaded', errorQueue.length, 'errors from storage');
    }
    if (result.helpRequests) {
        helpRequests = result.helpRequests;
        console.log('Background: Loaded', helpRequests.length, 'help requests from storage');
    }
    updateBadge();
});

// Periodic cleanup of old help requests (every 10 minutes)
setInterval(() => {
    cleanupOldHelpRequests();
}, 600000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background: Received message:', message.type);

    if (message.type === 'ERROR_DETECTED') {
        console.log('Background: ERROR_DETECTED from tab', sender.tab?.id);

        // Create error data with guaranteed unique ID
        const errorData = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique string ID
            type: message.data.type,
            message: message.data.message,
            stack: message.data.stack,
            source: message.data.source,
            lineno: message.data.lineno,
            colno: message.data.colno,
            url: message.data.url,
            timestamp: message.data.timestamp,
            browserInfo: message.data.browserInfo,
            tabId: sender.tab?.id,
            tabUrl: sender.tab?.url || message.data.url
        };

        console.log('Background: Adding error with ID:', errorData.id);
        errorQueue.push(errorData);

        // Save to storage
        chrome.storage.local.set({ errorQueue: errorQueue }, () => {
            if (chrome.runtime.lastError) {
                console.error('Background: Error saving to storage:', chrome.runtime.lastError);
            } else {
                console.log('Background: Saved error queue, total errors:', errorQueue.length);
                updateBadge();
            }
        });

        sendResponse({ success: true, errorId: errorData.id });
        return true; // Keep channel open for async response
    }

    if (message.type === 'GET_ERRORS') {
        console.log('Background: GET_ERRORS requested');

        // Always get fresh data from storage
        chrome.storage.local.get(['errorQueue'], (result) => {
            errorQueue = result.errorQueue || [];
            console.log('Background: Returning', errorQueue.length, 'errors');

            // Ensure all errors have IDs (migration for old data)
            errorQueue = errorQueue.map((error, index) => {
                if (!error.id) {
                    error.id = `migrated_${Date.now()}_${index}`;
                    console.log('Background: Added missing ID to error:', error.id);
                }
                return error;
            });

            // Save back if we added IDs
            chrome.storage.local.set({ errorQueue: errorQueue });

            sendResponse({ errors: errorQueue });
        });

        return true; // Keep channel open for async response
    }

    if (message.type === 'CLEAR_ERRORS') {
        console.log('Background: CLEAR_ERRORS requested');
        errorQueue = [];
        chrome.storage.local.set({ errorQueue: [] }, () => {
            updateBadge();
            console.log('Background: All errors cleared');
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.type === 'REMOVE_ERROR') {
        console.log('Background: REMOVE_ERROR requested for ID:', message.errorId);

        const beforeCount = errorQueue.length;
        errorQueue = errorQueue.filter(error => error.id !== message.errorId);
        const afterCount = errorQueue.length;

        console.log('Background: Removed', beforeCount - afterCount, 'errors');

        chrome.storage.local.set({ errorQueue: errorQueue }, () => {
            updateBadge();
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.type === 'HELP_NEEDED') {
        console.log('Background: HELP_NEEDED received with score:', message.data.score);

        const helpRequest = {
            id: `help_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            score: message.data.score,
            pageContext: message.data.pageContext,
            url: message.data.url,
            patterns: message.data.stats,
            suggestedHelp: message.data.suggestedHelp,
            timestamp: message.data.timestamp,
            status: 'pending'
        };

        helpRequests.push(helpRequest);

        // Limit help requests to maxHelpRequests
        if (helpRequests.length > maxHelpRequests) {
            helpRequests = helpRequests.slice(-maxHelpRequests);
        }

        chrome.storage.local.set({ helpRequests: helpRequests }, () => {
            console.log('Background: Saved help request, total:', helpRequests.length);
            sendResponse({ success: true, helpId: helpRequest.id });
        });

        return true;
    }

    if (message.type === 'GET_HELP_REQUESTS') {
        console.log('Background: GET_HELP_REQUESTS requested');

        chrome.storage.local.get(['helpRequests'], (result) => {
            helpRequests = result.helpRequests || [];
            console.log('Background: Returning', helpRequests.length, 'help requests');
            sendResponse({ helpRequests: helpRequests });
        });

        return true;
    }

    if (message.type === 'UPDATE_HELP_STATUS') {
        console.log('Background: UPDATE_HELP_STATUS for ID:', message.helpId, 'to', message.status);

        const helpRequest = helpRequests.find(h => h.id === message.helpId);
        if (helpRequest) {
            helpRequest.status = message.status;
            helpRequest.updatedAt = Date.now();

            chrome.storage.local.set({ helpRequests: helpRequests }, () => {
                console.log('Background: Updated help request status');
                sendResponse({ success: true });
            });
        } else {
            sendResponse({ success: false, error: 'Help request not found' });
        }

        return true;
    }

    if (message.type === 'CLEAR_HELP_REQUESTS') {
        console.log('Background: CLEAR_HELP_REQUESTS requested');
        helpRequests = [];
        chrome.storage.local.set({ helpRequests: [] }, () => {
            console.log('Background: All help requests cleared');
            sendResponse({ success: true });
        });
        return true;
    }

    return true;
});

function updateBadge() {
    const count = errorQueue.length;
    console.log('Background: Updating badge to', count);

    if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Background: Qase Testing Assistant installed');
    chrome.action.setBadgeText({ text: '' });

    // Clear any old data on fresh install
    chrome.storage.local.get(['errorQueue'], (result) => {
        if (result.errorQueue) {
            console.log('Background: Found existing error queue with', result.errorQueue.length, 'errors');
        }
    });
});

function cleanupOldHelpRequests() {
    const oneHourAgo = Date.now() - 3600000;
    const beforeCount = helpRequests.length;

    helpRequests = helpRequests.filter(request => request.timestamp > oneHourAgo);

    if (helpRequests.length !== beforeCount) {
        console.log('Background: Cleaned up', beforeCount - helpRequests.length, 'old help requests');
        chrome.storage.local.set({ helpRequests: helpRequests });
    }
}

// Log when service worker starts
console.log('Background: Service worker started with help request support');