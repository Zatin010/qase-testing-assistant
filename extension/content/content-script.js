// content-script.js - UPDATED VERSION (CSP-Safe)
(() => {
  console.log('Qase Extension: Content script loaded');

  const browserInfo = navigator.userAgent;
  let isProcessing = false;

  // Helper function to send error to background
  function sendErrorToBackground(errorData) {
    if (isProcessing) return;
    isProcessing = true;

    chrome.runtime.sendMessage({
      type: 'ERROR_DETECTED',
      data: errorData
    }).then(() => {
      console.log('Qase Extension: Error sent to background -', errorData.type);
      isProcessing = false;
    }).catch((error) => {
      console.error('Qase Extension: Failed to send error', error);
      isProcessing = false;
    });
  }

  // 1. Capture JavaScript runtime errors
  window.addEventListener('error', (event) => {
    console.log('Qase Extension: window.error captured -', event.message);

    const errorData = {
      type: 'javascript_error',
      message: event.message || 'Unknown error',
      source: event.filename || window.location.href,
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      stack: event.error?.stack || 'No stack trace available',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      browserInfo: browserInfo
    };

    sendErrorToBackground(errorData);
  }, true);

  // 2. Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.log('Qase Extension: unhandledrejection captured -', event.reason);

    let message = 'Promise rejection';
    let stack = 'No stack trace available';

    if (event.reason instanceof Error) {
      message = `Promise rejection: ${event.reason.message}`;
      stack = event.reason.stack || stack;
    } else if (typeof event.reason === 'string') {
      message = `Promise rejection: ${event.reason}`;
    } else {
      try {
        message = `Promise rejection: ${JSON.stringify(event.reason)}`;
      } catch (e) {
        message = `Promise rejection: ${String(event.reason)}`;
      }
    }

    const errorData = {
      type: 'promise_rejection',
      message: message,
      stack: stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      browserInfo: browserInfo
    };

    sendErrorToBackground(errorData);
  });

  // 3. Listen for console.error events from injected script
  window.addEventListener('__qase_console_error__', (event) => {
    console.log('Qase Extension: console.error captured -', event.detail.message.substring(0, 50));
    sendErrorToBackground(event.detail);
  });

  // 4. Inject console interceptor script (CSP-safe method)
  function injectConsoleInterceptor() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/injected-script.js');
    script.onload = function () {
      console.log('Qase Extension: Console interceptor script loaded');
      this.remove();
    };
    script.onerror = function () {
      console.error('Qase Extension: Failed to load console interceptor');
      this.remove();
    };

    // Inject into page
    (document.head || document.documentElement).appendChild(script);
  }

  // Wait for DOM and inject
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectConsoleInterceptor);
  } else {
    // DOM already loaded
    injectConsoleInterceptor();
  }

  // Log that extension is ready
  console.log('Qase Extension: Ready to capture errors on', window.location.href);
})();