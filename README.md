# Triton Cluster Monitor — Chrome Extension

A floating widget that monitors your Aalto Triton cluster jobs directly
on the OnDemand portal. Track running and finished jobs, cancel jobs,
search, sort, and get desktop notifications — all without leaving
your current page.

![Widget Preview](icons/icon-128.png)

---

## Installation (2 minutes)

Since this isn't on the Chrome Web Store, you install it in **Developer Mode**:

1. **Download** this folder (or clone the repo)
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the `triton-widget` folder
6. Done! Navigate to https://ondemand.triton.aalto.fi and the widget
   appears in the bottom-right corner

### Updating

When a new version is available:
1. Replace the files in your `triton-widget` folder
2. Go to `chrome://extensions/`
3. Click the **reload** icon (↻) on the Triton Monitor card

---

## Features

| Feature              | Description                                        |
|----------------------|----------------------------------------------------|
| **Job monitoring**   | See running and finished jobs in real time          |
| **Search & filter**  | Find jobs by ID or status                          |
| **Sort**             | By time, status, or job ID                         |
| **Cancel jobs**      | Cancel running jobs directly from the widget       |
| **Expand details**   | See node, CPUs, GPUs, memory per job               |
| **Progress bars**    | Visual time remaining for running jobs             |
| **Notifications**    | Desktop alerts when jobs finish (toggle with 🔔)   |
| **Dark / light**     | Theme toggle, persisted across sessions            |
| **Picture-in-Picture** | Pop out into a floating PiP window               |
| **Zen Mode**         | Slows refresh to 5 min after 15 min idle           |
| **Toolbar toggle**   | Click the extension icon to show/hide the widget   |
| **Keyboard shortcut**| Alt+T to toggle visibility                         |
| **Click-to-copy**    | Click any job ID to copy it                        |
| **Draggable**        | Reposition the widget anywhere on screen           |
| **Collapsible**      | Minimize to just the header bar                    |

---

## How It Works

The extension injects the monitor widget into any page on
`ondemand.triton.aalto.fi`. It fetches data from the same APIs
that the OnDemand portal uses:

```
/pun/sys/monitor/api/running_jobs
/pun/sys/monitor/api/finished_jobs
```

No additional authentication is needed — it uses your existing
OnDemand session.

---

## Troubleshooting

**Widget doesn't appear**
- Make sure you're on `https://ondemand.triton.aalto.fi`
- Check that the extension is enabled in `chrome://extensions/`
- Try clicking the Triton Monitor icon in the toolbar

**"No jobs found"**
- You may not have any active jobs. Submit a test job to verify.

**Cancel doesn't work**
- The cancel function requires a valid session. Try refreshing the
  OnDemand page and cancelling again.

**Notifications not working**
- Click the 🔔 icon in the widget header to enable notifications
- Allow notifications when Chrome asks for permission

---

## For Developers

### File Structure
```
triton-widget/
├── manifest.json        # Chrome extension manifest (v3)
├── background.js        # Service worker (toolbar icon toggle)
├── triton-monitor.js    # The widget (content script)
├── icons/
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### Sharing with Others

**Option A — Share the folder**
Zip the `triton-widget` folder and share it via email, Slack, or
your lab's shared drive. Recipients follow the installation
steps above.

**Option B — GitHub**
Push to a GitHub repo. Others can clone and load unpacked:
```bash
git clone https://github.com/YOUR_USER/triton-monitor.git
# Then load the triton-widget folder in chrome://extensions/
```

**Option C — Chrome Web Store** (optional)
If you want one-click installs for everyone:
1. Create a [Chrome Developer account](https://chrome.google.com/webstore/devconsole/) ($5 one-time fee)
2. Zip the extension folder
3. Upload to the Chrome Web Store
4. Share the store link

For a university audience, Option B (GitHub) is usually the
easiest and most maintainable approach.

---

## License

MIT — use it, modify it, share it.
