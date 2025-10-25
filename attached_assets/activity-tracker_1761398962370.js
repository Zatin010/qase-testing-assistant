class QaseActivityTracker {
    constructor() {
        this.isQaseDomain = this.checkQaseDomain();
        this.activities = [];
        this.maxActivities = 100;
        this.sessionStart = Date.now();
        this.lastAnalysisTime = 0;
        this.analysisInterval = 10000;

        this.stats = {
            pageViews: 0,
            clicks: 0,
            rapidClicks: 0,
            repeatedActions: 0,
            formInteractions: 0,
            abandonedForms: 0,
            hesitations: 0,
            backNavigations: 0
        };

        this.lastClickTime = 0;
        this.lastClickElement = null;
        this.clickCount = 0;
        this.clickTimeout = null;

        this.focusedForm = null;
        this.formStartTime = 0;
        this.formInteracted = false;

        this.lastActivityTime = Date.now();
        this.hesitationTimeout = null;

        if (this.isQaseDomain) {
            this.init();
        }
    }

    checkQaseDomain() {
        const hostname = window.location.hostname;
        return hostname.includes('qase.io') || hostname.includes('app.qase') || hostname.includes('localhost');
    }

    init() {
        console.log('Qase Activity Tracker: Initialized on', window.location.hostname);

        this.trackPageView();
        this.trackClicks();
        this.trackForms();
        this.trackMousePatterns();
        this.trackKeyboard();
        this.trackNavigation();

        setInterval(() => this.periodicAnalysis(), this.analysisInterval);
    }

    trackPageView() {
        this.stats.pageViews++;
        this.addActivity('page_view', {
            url: window.location.href,
            context: this.getPageContext()
        });
    }

    getPageContext() {
        const path = window.location.pathname;

        if (path.includes('/defect')) return 'defects';
        if (path.includes('/case') || path.includes('/test')) return 'test_cases';
        if (path.includes('/run')) return 'test_runs';
        if (path.includes('/plan')) return 'test_plans';
        if (path.includes('/suite')) return 'test_suites';
        if (path.includes('/project')) return 'projects';
        if (path.includes('/settings')) return 'settings';
        if (path.includes('/report')) return 'reports';

        return 'unknown';
    }

    trackClicks() {
        document.addEventListener('click', (event) => {
            this.stats.clicks++;
            this.resetHesitationTimer();

            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;
            const element = this.getElementIdentifier(event.target);

            if (timeSinceLastClick < 500) {
                this.clickCount++;

                if (this.clickCount >= 3) {
                    this.stats.rapidClicks++;
                    this.addActivity('rapid_clicks', {
                        element,
                        count: this.clickCount,
                        timespan: now - this.lastClickTime
                    });
                }
            } else {
                this.clickCount = 1;
            }

            if (element === this.lastClickElement && timeSinceLastClick < 3000) {
                this.stats.repeatedActions++;
                this.addActivity('repeated_action', {
                    element,
                    timeBetween: timeSinceLastClick
                });
            }

            this.lastClickTime = now;
            this.lastClickElement = element;

            this.addActivity('click', {
                element,
                x: event.clientX,
                y: event.clientY
            });
        }, { passive: true });
    }

    trackForms() {
        document.addEventListener('focusin', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
                this.stats.formInteractions++;
                this.resetHesitationTimer();

                if (!this.focusedForm) {
                    this.focusedForm = this.getElementIdentifier(event.target);
                    this.formStartTime = Date.now();
                    this.formInteracted = false;
                }

                this.addActivity('form_focus', {
                    field: this.getElementIdentifier(event.target),
                    type: event.target.type || event.target.tagName.toLowerCase()
                });
            }
        }, { passive: true });

        document.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                this.formInteracted = true;
                this.resetHesitationTimer();
            }
        }, { passive: true });

        document.addEventListener('focusout', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
                const timeSpent = Date.now() - this.formStartTime;

                if (this.focusedForm && this.formInteracted && timeSpent > 2000) {
                    const isEmpty = !event.target.value || event.target.value.trim().length === 0;

                    if (isEmpty) {
                        this.stats.abandonedForms++;
                        this.addActivity('form_abandonment', {
                            field: this.focusedForm,
                            timeSpent,
                            wasInteracted: this.formInteracted
                        });
                    }
                }

                this.focusedForm = null;
                this.formInteracted = false;
            }
        }, { passive: true });
    }

    trackMousePatterns() {
        document.addEventListener('mousemove', () => {
            this.resetHesitationTimer();
        }, { passive: true });
    }

    resetHesitationTimer() {
        this.lastActivityTime = Date.now();

        if (this.hesitationTimeout) {
            clearTimeout(this.hesitationTimeout);
        }

        this.hesitationTimeout = setTimeout(() => {
            this.stats.hesitations++;
            this.addActivity('hesitation', {
                duration: Date.now() - this.lastActivityTime,
                pageContext: this.getPageContext()
            });
        }, 5000);
    }

    trackKeyboard() {
        document.addEventListener('keydown', (event) => {
            this.resetHesitationTimer();

            if (event.key === 'Escape') {
                this.addActivity('escape_pressed', {
                    context: this.getPageContext()
                });
            }
        }, { passive: true });
    }

    trackNavigation() {
        let navigationStart = Date.now();

        window.addEventListener('popstate', () => {
            this.stats.backNavigations++;
            const timeOnPage = Date.now() - navigationStart;

            if (timeOnPage < 5000) {
                this.addActivity('quick_back_navigation', {
                    timeOnPage,
                    fromContext: this.getPageContext()
                });
            }

            navigationStart = Date.now();
        }, { passive: true });
    }

    getElementIdentifier(element) {
        if (!element) return 'unknown';

        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
            return `.${element.className.split(' ')[0]}`;
        }
        return element.tagName.toLowerCase();
    }

    addActivity(type, data) {
        const activity = {
            type,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            pageContext: this.getPageContext()
        };

        this.activities.push(activity);

        if (this.activities.length > this.maxActivities) {
            this.activities.shift();
        }
    }

    periodicAnalysis() {
        const now = Date.now();

        if (now - this.lastAnalysisTime < this.analysisInterval) {
            return;
        }

        if (this.shouldTriggerAnalysis()) {
            this.sendToContextAnalyzer();
            this.lastAnalysisTime = now;
        }
    }

    shouldTriggerAnalysis() {
        return (
            this.stats.rapidClicks > 0 ||
            this.stats.repeatedActions > 1 ||
            this.stats.abandonedForms > 0 ||
            this.stats.hesitations > 2 ||
            this.stats.backNavigations > 1
        );
    }

    sendToContextAnalyzer() {
        const contextData = {
            stats: { ...this.stats },
            recentActivities: this.activities.slice(-20),
            sessionDuration: Date.now() - this.sessionStart,
            pageContext: this.getPageContext(),
            url: window.location.href
        };

        window.dispatchEvent(new CustomEvent('qase_context_update', {
            detail: contextData
        }));
    }

    getSessionSummary() {
        return {
            stats: this.stats,
            sessionDuration: Date.now() - this.sessionStart,
            activitiesCount: this.activities.length,
            pageContext: this.getPageContext()
        };
    }

    reset() {
        this.stats = {
            pageViews: 0,
            clicks: 0,
            rapidClicks: 0,
            repeatedActions: 0,
            formInteractions: 0,
            abandonedForms: 0,
            hesitations: 0,
            backNavigations: 0
        };
        this.activities = [];
    }
}

if (window.location.hostname.includes('qase.io') || window.location.hostname.includes('app.qase') || window.location.hostname.includes('localhost')) {
    window.qaseActivityTracker = new QaseActivityTracker();
}
