# Qase Testing Assistant - Browser Extension

A lightweight Chrome extension that automatically detects JavaScript errors during testing and creates Qase defect reports with contextual information.

## Features

- **Automatic Error Detection**: Captures JavaScript errors, promise rejections, and console errors
- **Error Queue Management**: View and manage all captured errors in one place
- **Qase Integration**: Directly create defect reports in your Qase project
- **Customizable Reports**: Edit title, severity, and details before submitting
- **Non-intrusive**: Badge notification system shows error count without disrupting your workflow

## Installation

### Load Extension in Chrome (Development Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension directory (the folder containing `manifest.json`)
6. The Qase Testing Assistant extension should now appear in your extensions list

### Load Extension in Firefox (Development Mode)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the extension directory and select the `manifest.json` file
5. The extension will be loaded temporarily

## Configuration

1. Click the extension icon in your browser toolbar
2. Go to the **Settings** tab
3. Enter your Qase API credentials:
   - **API Token**: Get this from your Qase account settings (https://app.qase.io/user/api/token)
   - **Project Code**: Your Qase project code (e.g., "DEMO", "QA")
4. Click **Validate** to check credentials (optional)
5. Click **Save Settings**

## Usage

### Testing the Extension

1. Open the included `test-page.html` in your browser (or serve it via HTTP server)
2. Click any of the error trigger buttons
3. Check the extension icon - it should show a red badge with the error count
4. Click the extension icon to view captured errors

### Using During QA Testing

1. Configure your Qase credentials in Settings
2. Browse websites/applications you're testing
3. The extension automatically captures any JavaScript errors
4. When an error occurs, a badge appears on the extension icon
5. Click the icon to review errors
6. Click **Report to Qase** on any error to create a defect
7. Edit the title, severity, and details as needed
8. Click **Submit to Qase** to create the defect in your project

### Error Types Detected

- **JavaScript Errors**: Runtime errors, type errors, reference errors
- **Promise Rejections**: Unhandled promise rejections
- **Console Errors**: Errors logged via console.error()

### Reporting to Qase

Each error captures:
- Error message
- Stack trace
- Page URL
- Timestamp
- Browser information

You can customize:
- **Title**: Defaults to first 100 characters of error message
- **Severity**: Choose from trivial, minor, major, critical, or blocker
- **Actual Result**: Full error details (read-only, automatically populated)

## Project Structure

```
qase-testing-assistant/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker for error monitoring
├── popup/
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic and event handlers
│   └── popup.css             # Styling
├── content/
│   └── content-script.js     # Injected script for error detection
├── utils/
│   ├── api.js                # Qase API wrapper
│   └── storage.js            # Chrome storage helpers
├── icons/                     # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── test-page.html            # Demo page for testing
└── README.md                 # This file
```

## API Reference

### Qase API Endpoints Used

- `GET /v1/project/{code}` - Validate credentials
- `POST /v1/defect/{code}` - Create defect

### Required Permissions

- `storage` - Store credentials and error queue
- `activeTab` - Access current tab information
- `scripting` - Inject content scripts
- `<all_urls>` - Monitor errors on any webpage

## Development

### Testing Locally

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Qase Testing Assistant card
4. Test your changes

### Running the Test Server

```bash
python -m http.server 5000
```

Then open http://localhost:5000/test-page.html in your browser.

## Troubleshooting

### Extension Not Detecting Errors

- Make sure the extension is enabled in `chrome://extensions/`
- Check that the page has fully loaded before triggering errors
- Verify content scripts are being injected (check Developer Console)

### Cannot Submit to Qase

- Verify your API token is valid
- Check that your project code is correct
- Ensure you have permissions to create defects in the project
- Check the browser console for error messages

### Badge Not Updating

- Reload the extension
- Check that background service worker is active
- Restart the browser

## Rate Limits

The Qase API has a rate limit of 600 requests per minute. The extension includes automatic rate limit checking to prevent exceeding this limit.

## Future Enhancements

- Error filtering (ignore specific error types or domains)
- Screenshot capture on error
- Duplicate error detection
- Error log export as CSV
- AI-powered severity classification
- Integration with Qase webhooks

## License

MIT

## Support

For issues with the extension, please create an issue in the repository.

For Qase API questions, visit https://developers.qase.io/
