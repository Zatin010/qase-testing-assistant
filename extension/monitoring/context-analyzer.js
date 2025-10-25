class ContextAnalyzer {
    constructor() {
        this.isQaseDomain = this.checkQaseDomain();
        this.helpThreshold = 0.6;
        this.minTimeBetweenOffers = 120000;
        this.dismissalCooldown = 300000;
        this.lastHelpOfferTime = 0;
        this.lastDismissalTime = 0;
        this.analysisHistory = [];
        this.maxHistorySize = 50;

        this.complexityMultipliers = {
            test_plans: 1.3,
            test_runs: 1.2,
            settings: 1.1,
            reports: 1.2,
            defects: 1.0,
            test_cases: 1.0,
            projects: 1.0,
            unknown: 1.0
        };

        if (this.isQaseDomain) {
            this.init();
        }
    }

    checkQaseDomain() {
        const hostname = window.location.hostname;
        return hostname.includes('qase.io') || 
               hostname.includes('app.qase') || 
               hostname.includes('localhost') ||
               hostname.includes('.repl.co') ||
               hostname.includes('.replit.dev');
    }

    init() {
        console.log('Context Analyzer: Initialized on', window.location.hostname);

        window.addEventListener('qase_context_update', (event) => {
            this.analyzeContext(event.detail);
        });

        window.addEventListener('qase_dom_error', (event) => {
            this.handleDOMError(event.detail);
        });
    }

    analyzeContext(contextData) {
        const score = this.calculateHelpScore(contextData);

        const analysis = {
            timestamp: Date.now(),
            score,
            contextData,
            triggered: false
        };

        this.analysisHistory.push(analysis);
        if (this.analysisHistory.length > this.maxHistorySize) {
            this.analysisHistory.shift();
        }

        console.log('Context Analyzer: Help score calculated:', score.toFixed(2), 'for', contextData.pageContext);

        if (this.shouldOfferHelp(score)) {
            analysis.triggered = true;
            this.triggerHelpOffer(contextData, score);
        }
    }

    calculateHelpScore(contextData) {
        const stats = contextData.stats;
        const pageContext = contextData.pageContext;
        let score = 0;

        if (stats.rapidClicks > 0) {
            score += Math.min(stats.rapidClicks * 0.15, 0.3);
        }

        if (stats.repeatedActions > 0) {
            score += Math.min(stats.repeatedActions * 0.2, 0.4);
        }

        if (stats.abandonedForms > 0) {
            score += Math.min(stats.abandonedForms * 0.25, 0.5);
        }

        if (stats.hesitations > 0) {
            score += Math.min(stats.hesitations * 0.1, 0.2);
        }

        if (stats.backNavigations > 0) {
            score += Math.min(stats.backNavigations * 0.15, 0.3);
        }

        const recentActivities = contextData.recentActivities || [];
        const errorActivities = recentActivities.filter(a =>
            a.type === 'dom_error' || a.type === 'validation_error'
        );

        if (errorActivities.length > 0) {
            score += Math.min(errorActivities.length * 0.3, 0.6);
        }

        const complexityMultiplier = this.complexityMultipliers[pageContext] || 1.0;
        score = score * complexityMultiplier;

        return Math.min(score, 1.0);
    }

    shouldOfferHelp(score) {
        const now = Date.now();

        if (score < this.helpThreshold) {
            return false;
        }

        if (now - this.lastDismissalTime < this.dismissalCooldown) {
            console.log('Context Analyzer: In dismissal cooldown period');
            return false;
        }

        if (now - this.lastHelpOfferTime < this.minTimeBetweenOffers) {
            console.log('Context Analyzer: Too soon since last help offer');
            return false;
        }

        return true;
    }

    triggerHelpOffer(contextData, score) {
        console.log('Context Analyzer: Triggering help offer with score', score.toFixed(2));

        this.lastHelpOfferTime = Date.now();

        const helpData = {
            score,
            pageContext: contextData.pageContext,
            url: contextData.url,
            timestamp: Date.now(),
            stats: contextData.stats,
            suggestedHelp: this.generateHelpSuggestion(contextData)
        };

        chrome.runtime.sendMessage({
            type: 'HELP_NEEDED',
            data: helpData
        }).catch(() => {
            console.warn('Failed to send help request to background');
        });

        window.dispatchEvent(new CustomEvent('qase_help_needed', {
            detail: helpData
        }));
    }

    generateHelpSuggestion(contextData) {
        const stats = contextData.stats;
        const pageContext = contextData.pageContext;
        const suggestions = [];

        if (stats.rapidClicks > 2) {
            suggestions.push('You seem to be clicking rapidly. Would you like help with this action?');
        }

        if (stats.repeatedActions > 1) {
            suggestions.push('I noticed you\'re trying the same action multiple times. Can I assist you?');
        }

        if (stats.abandonedForms > 0) {
            suggestions.push('Having trouble with a form? I can help you fill it out correctly.');
        }

        if (stats.hesitations > 2) {
            suggestions.push('You seem hesitant. Would you like guidance on what to do next?');
        }

        if (stats.backNavigations > 1) {
            suggestions.push('Going back frequently? Let me help you find what you\'re looking for.');
        }

        if (pageContext === 'test_plans') {
            suggestions.push('Need help creating or managing test plans?');
        } else if (pageContext === 'defects') {
            suggestions.push('Need assistance with defect reporting or management?');
        } else if (pageContext === 'test_cases') {
            suggestions.push('Can I help you with test case creation or execution?');
        }

        return suggestions.length > 0 ? suggestions[0] : 'How can I assist you with Qase?';
    }

    handleDOMError(errorData) {
        console.log('Context Analyzer: DOM error detected:', errorData.type);

        const syntheticContext = {
            stats: {
                rapidClicks: 0,
                repeatedActions: 0,
                abandonedForms: 0,
                hesitations: 0,
                backNavigations: 0
            },
            recentActivities: [{
                type: 'dom_error',
                data: errorData
            }],
            sessionDuration: 0,
            pageContext: window.qaseActivityTracker?.getPageContext() || 'unknown',
            url: window.location.href
        };

        this.analyzeContext(syntheticContext);
    }

    recordDismissal() {
        this.lastDismissalTime = Date.now();
        console.log('Context Analyzer: Help dismissed, cooldown period started');
    }

    getAnalysisHistory() {
        return this.analysisHistory;
    }

    getStats() {
        return {
            totalAnalyses: this.analysisHistory.length,
            helpOffersTriggered: this.analysisHistory.filter(a => a.triggered).length,
            averageScore: this.analysisHistory.length > 0
                ? this.analysisHistory.reduce((sum, a) => sum + a.score, 0) / this.analysisHistory.length
                : 0,
            lastHelpOfferTime: this.lastHelpOfferTime,
            lastDismissalTime: this.lastDismissalTime
        };
    }
}

if (window.location.hostname.includes('qase.io') || window.location.hostname.includes('app.qase') || window.location.hostname.includes('localhost')) {
    window.qaseContextAnalyzer = new ContextAnalyzer();

    window.qaseForceAnalysis = function () {
        if (window.qaseActivityTracker) {
            window.qaseActivityTracker.sendToContextAnalyzer();
        } else {
            console.warn('Activity tracker not initialized');
        }
    };
}
