class QaseDOMObserver {
    constructor() {
        this.isQaseDomain = this.checkQaseDomain();
        this.observer = null;
        this.isActive = false;
        this.errorSelectors = [
            '[class*="error"]',
            '[role="alert"]',
            '.validation-error',
            '.error-message',
            '.alert-danger',
            '[data-error]',
            '.invalid-feedback'
        ];

        this.emptyStateSelectors = [
            '[class*="empty"]',
            '.no-data',
            '.no-results',
            '.empty-state',
            '[class*="no-content"]'
        ];

        this.loadingSelectors = [
            '[class*="loading"]',
            '[class*="spinner"]',
            '.loading-indicator',
            '.loader',
            '[aria-busy="true"]'
        ];

        this.detectedErrors = new Set();
        this.loadingStates = new Map();
        this.loadingCheckInterval = null;

        if (this.isQaseDomain) {
            this.init();
        }
    }

    checkQaseDomain() {
        const hostname = window.location.hostname;
        return hostname.includes('qase.io') || hostname.includes('app.qase') || hostname.includes('localhost');
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startObserving());
        } else {
            this.startObserving();
        }
    }

    startObserving() {
        if (!this.isQaseDomain) {
            return;
        }

        console.log('Qase DOM Observer: Active on', window.location.hostname);

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'role', 'data-error', 'aria-busy']
        });

        this.isActive = true;

        this.scanExistingDOM();

        this.loadingCheckInterval = setInterval(() => {
            this.monitorLoadingStates();
        }, 3000);
    }

    handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkNodeForErrors(node);
                        this.checkNodeForEmptyStates(node);
                        this.checkNodeForLoading(node);
                    }
                });
            } else if (mutation.type === 'attributes') {
                this.checkNodeForErrors(mutation.target);
                this.checkNodeForLoading(mutation.target);
            }
        }
    }

    scanExistingDOM() {
        this.errorSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => this.checkNodeForErrors(el));
        });
    }

    checkNodeForErrors(node) {
        if (!node.matches) return;

        for (const selector of this.errorSelectors) {
            if (node.matches(selector) || node.querySelector(selector)) {
                const element = node.matches(selector) ? node : node.querySelector(selector);
                this.processError(element);
            }
        }
    }

    checkNodeForEmptyStates(node) {
        if (!node.matches) return;

        for (const selector of this.emptyStateSelectors) {
            if (node.matches(selector)) {
                this.processEmptyState(node);
            }
        }
    }

    checkNodeForLoading(node) {
        if (!node.matches) return;

        for (const selector of this.loadingSelectors) {
            if (node.matches(selector)) {
                const elementId = this.getElementIdentifier(node);

                if (!this.loadingStates.has(elementId)) {
                    this.loadingStates.set(elementId, {
                        element: node,
                        startTime: Date.now()
                    });
                }
            }
        }
    }

    processError(element) {
        const errorText = element.textContent.trim();
        const elementId = this.getElementIdentifier(element);
        const errorKey = `${elementId}:${errorText}`;

        if (this.detectedErrors.has(errorKey)) {
            return;
        }

        this.detectedErrors.add(errorKey);

        setTimeout(() => {
            this.detectedErrors.delete(errorKey);
        }, 5000);

        const errorData = {
            type: this.classifyError(element, errorText),
            message: errorText,
            element: elementId,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            pageContext: window.qaseActivityTracker?.getPageContext() || 'unknown'
        };

        console.log('Qase DOM Observer: Error detected:', errorData.type, '-', errorText.substring(0, 50));

        chrome.runtime.sendMessage({
            type: 'ERROR_DETECTED',
            data: {
                ...errorData,
                type: 'ui_error',
                stack: 'DOM UI Error - No stack trace available',
                browserInfo: navigator.userAgent
            }
        }).catch(() => { });

        window.dispatchEvent(new CustomEvent('qase_dom_error', {
            detail: errorData
        }));
    }

    classifyError(element, errorText) {
        const text = errorText.toLowerCase();

        if (text.includes('network') || text.includes('connection') || text.includes('timeout')) {
            return 'network_error';
        }

        if (text.includes('permission') || text.includes('unauthorized') || text.includes('forbidden')) {
            return 'permission_error';
        }

        if (text.includes('required') || text.includes('invalid') || text.includes('must')) {
            return 'validation_error';
        }

        if (text.includes('not found') || text.includes('404')) {
            return 'not_found';
        }

        if (text.includes('server') || text.includes('500') || text.includes('error')) {
            return 'server_error';
        }

        return 'ui_error';
    }

    processEmptyState(element) {
        const emptyText = element.textContent.trim();

        console.log('Qase DOM Observer: Empty state detected:', emptyText.substring(0, 50));

        window.dispatchEvent(new CustomEvent('qase_empty_state', {
            detail: {
                message: emptyText,
                element: this.getElementIdentifier(element),
                url: window.location.href,
                timestamp: Date.now()
            }
        }));
    }

    monitorLoadingStates() {
        const now = Date.now();
        const stuckThreshold = 10000;

        this.loadingStates.forEach((state, elementId) => {
            const duration = now - state.startTime;

            if (duration > stuckThreshold) {
                console.log('Qase DOM Observer: Stuck loading detected:', elementId, `(${duration}ms)`);

                const errorData = {
                    type: 'stuck_loading',
                    message: `Loading state stuck for ${Math.round(duration / 1000)}s`,
                    element: elementId,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    duration,
                    pageContext: window.qaseActivityTracker?.getPageContext() || 'unknown'
                };

                chrome.runtime.sendMessage({
                    type: 'ERROR_DETECTED',
                    data: {
                        ...errorData,
                        type: 'ui_error',
                        stack: 'Stuck loading state - No stack trace available',
                        browserInfo: navigator.userAgent
                    }
                }).catch(() => { });

                window.dispatchEvent(new CustomEvent('qase_dom_error', {
                    detail: errorData
                }));

                this.loadingStates.delete(elementId);
            }

            if (!document.body.contains(state.element)) {
                this.loadingStates.delete(elementId);
            }
        });
    }

    getElementIdentifier(element) {
        if (!element) return 'unknown';

        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) return `.${classes[0]}`;
        }
        return element.tagName.toLowerCase();
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.isActive = false;
            console.log('Qase DOM Observer: Stopped');
        }

        if (this.loadingCheckInterval) {
            clearInterval(this.loadingCheckInterval);
            this.loadingCheckInterval = null;
        }
    }
}

if (window.location.hostname.includes('qase.io') || window.location.hostname.includes('app.qase') || window.location.hostname.includes('localhost')) {
    window.qaseDOMObserver = new QaseDOMObserver();
}
