# Qase AI Testing Assistant - Chrome Extension

## Project Overview
A Chrome Extension (Manifest V3) that serves as a proactive AI testing assistant for Qase.io. The extension automatically detects JavaScript errors, monitors user behavior patterns, and provides intelligent assistance during testing.

**Current Version:** 0.2.0  
**Status:** Phase 2 Complete, Ready for Phase 3  
**Last Updated:** 2025-01-24

## Architecture

### Extension Components
```
extension/
├── manifest.json              # Chrome Extension Manifest V3
├── background.js              # Service worker (error queue + help requests)
├── content/
│   ├── content-script.js      # Error detection & capture
│   └── injected-script.js     # Console.error interceptor
├── monitoring/                # Phase 2 AI monitoring system
│   ├── activity-tracker.js    # User behavior pattern tracking
│   ├── context-analyzer.js    # Help score calculation engine
│   └── dom-observer.js        # DOM error & UI state detection
├── popup/                     # Extension UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── utils/
│   ├── api.js                 # Qase API wrapper
│   └── storage.js             # Chrome storage helpers
└── icons/                     # Extension icons (16, 48, 128px)
```

## Completed Features

### Phase 1: Error Detection & Reporting
- ✅ JavaScript error capture (runtime, type, reference errors)
- ✅ Promise rejection detection
- ✅ Console.error interception
- ✅ Qase API integration with retry logic
- ✅ Defect report creation with customizable severity
- ✅ Badge notification system

### Phase 2: Proactive AI Monitoring
- ✅ Activity tracking (clicks, form interactions, navigation)
- ✅ Behavior pattern detection (rapid clicks, hesitation, abandonment)
- ✅ Context-aware help scoring (0.0-1.0 scale)
- ✅ DOM observation (validation errors, empty states, stuck loading)
- ✅ Privacy-first: domain-gated (only *.qase.io, localhost)
- ✅ Help request queue with auto-cleanup

### Key Algorithms
- **Help Score Threshold:** 0.6 (60% confidence)
- **Pattern Detection:** Rapid clicks, repeated actions, form abandonment, hesitation (5s pause), back navigation
- **Complexity Multipliers:** Test plans (1.3x), Test runs (1.2x), Reports (1.2x), Settings (1.1x)
- **Rate Limiting:** 600 requests/min (Qase API limit)

## Development Roadmap

### Phase 3: CrewAI Multi-Agent Integration (NEXT)
- [ ] Python backend with CrewAI framework
- [ ] Multi-agent system:
  - Analyzer Agent: Error classification & triage
  - Researcher Agent: Solution lookup & knowledge base
  - Reporter Agent: Intelligent defect creation
- [ ] Native messaging bridge (Chrome ↔ Python)
- [ ] Agent memory & learning system
- [ ] Enhanced context-aware suggestions

### Phase 4: Model Context Protocol (MCP)
- [ ] Standardized AI communication protocol
- [ ] LLM provider abstraction layer
- [ ] Multi-model support (GPT-4, Claude, etc.)

### Phase 5: Advanced LLM Features
- [ ] Automated defect description generation
- [ ] Natural language query support
- [ ] Auto-severity classification
- [ ] Duplicate error detection
- [ ] Root cause analysis
- [ ] Chrome Web Store deployment

## Testing

### Test Pages
- **test-pages/test-page.html** - Error detection validation
- **test-monitoring.html** - Monitoring system validation
- **generate-icons.html** - Icon generation utility

### Loading the Extension
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory
5. Extension should appear with Qase icon

### Running Test Server
```bash
# HTTP server for test pages
python -m http.server 5000
# Then visit: http://localhost:5000/test-pages/test-page.html
```

### Debug Commands
```javascript
// Browser console (on test pages):
window.qaseActivityTracker.getSessionSummary()
window.qaseContextAnalyzer.getAnalysisHistory()
window.qaseForceAnalysis()

// Extension service worker console:
chrome.storage.local.get(['helpRequests'], console.log)
chrome.storage.local.get(['errorQueue'], console.log)
```

## Configuration

### Qase API Setup
1. Open extension popup → Settings tab
2. Get API token: https://app.qase.io/user/api/token
3. Enter project code (e.g., "DEMO", "QA")
4. Click Validate → Save Settings

### Storage Schema
```javascript
{
  qaseToken: string,
  qaseProjectCode: string,
  configured: boolean,
  errorQueue: Array<ErrorData>,    // Max: unlimited
  helpRequests: Array<HelpRequest>  // Max: 50, auto-cleanup after 1 hour
}
```

## Technology Stack
- **Extension:** Chrome Manifest V3, Vanilla JavaScript
- **API:** Qase REST API v1
- **Storage:** Chrome Storage API (local)
- **Next (Phase 3):** Python 3.11, CrewAI, LangChain, OpenAI/Anthropic

## User Preferences
- Clean, production-ready code
- Privacy-first design (domain-gated monitoring)
- No regressions between phases
- Comprehensive error handling
- Clear documentation

## Recent Changes
- 2025-01-24: Project structure organized, ready for Phase 3 development
- Phase 2: Insights tab fixed, help request system operational
- Phase 1: Core error detection and Qase integration complete

## Notes
- All monitoring only activates on Qase domains (security/privacy)
- Help threshold: 0.6 (60% confidence before offering help)
- Extension uses storage-based queues (max 50 help requests)
- No regressions: Phase 1 error detection still fully functional
