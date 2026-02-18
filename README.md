<p align="center">
  <img src="assets/concord-banner.png" alt="Concord" width="100%">
</p>

# Concord -- WORK IN PROGRESS NO OFFICIAL RELEASE

A Discord-like desktop client for [Matrix](https://matrix.org), built with React, TypeScript, and Tauri.

Concord aims to bring a familiar, modern chat experience to the Matrix ecosystem — spaces as servers, channels with text and voice, and a clean dark UI inspired by Discord.

## Features

- **Matrix Protocol** — Full Matrix client powered by [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) with end-to-end encryption (Rust crypto)
- **Discord-style Layout** — Three-column UI: servers (spaces), channels, and chat
- **Spaces & Channels** — Organize rooms into spaces with custom text and voice channel sections
- **Rich Messaging** — Markdown (GFM), code syntax highlighting, replies, reactions, and emoji picker
- **Voice & Video Chat** — LiveKit SFU integration for voice/video calls with mic, camera, screenshare, speaker detection, and participant grid (with legacy GroupCall fallback)
- **Voice Channel Text Chat** — Toggleable, resizable text chat panel attached to voice channels
- **Channel Organization** — Drag-and-drop reordering of channels and sections within spaces (admin/moderator only)
- **Direct Messages** — Dedicated DM section separate from space channels
- **Typing Indicators** — See who's typing in real time
- **Presence** — Online, away, and offline status for all users
- **Member Sidebar** — View room members with roles and presence
- **Unread Tracking** — Badge counts on channels with unread messages
- **Themes** — Multiple dark themes (default, green, orange, red, blue)
- **Desktop App** — Native desktop experience via [Tauri](https://tauri.app) (lightweight, no Electron)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Build | [Vite 6](https://vite.dev) |
| Desktop | [Tauri 2](https://tauri.app) (Rust backend) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| State | [Zustand](https://zustand.docs.pmnd.rs) |
| Matrix | [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) with Rust crypto (WASM) |
| Testing | [Vitest](https://vitest.dev) + Testing Library |

## Prerequisites

- [Node.js](https://nodejs.org) >= 20 (LTS recommended)
- [Rust](https://rustup.rs) >= 1.75
- Tauri system dependencies (see below)

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-nice
```

> **Note:** Voice/video calls require WebRTC support. Ubuntu/Debian ship WebKitGTK without WebRTC enabled at build time. Voice calls work fully on **Windows** and **macOS**. On Linux, a custom WebKitGTK build with `-DENABLE_WEB_RTC=ON` is required for voice — see [this discussion](https://github.com/tauri-apps/tauri/discussions/8426) for details.

### macOS

```bash
xcode-select --install
```

### Windows

Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

For full details, see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/).

## Getting Started

```bash
# Clone the repo
git clone https://github.com/SquadUpSquid/concord.git
cd concord

# Install frontend dependencies
npm install

# Run in development mode (opens Tauri window)
npm run tauri dev
```

To run just the frontend in a browser (without Tauri):

```bash
npm run dev
# Open http://localhost:5173
```

## Building

```bash
# Build the production desktop app
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Testing

```bash
# Run the test suite
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
concord/
├── src/                        # Frontend source
│   ├── components/
│   │   ├── chat/               # Message list, input, header, reactions
│   │   ├── common/             # Avatar, Modal, LoadingSpinner, ErrorBoundary
│   │   ├── layout/             # AppLayout, TitleBar
│   │   ├── members/            # Member sidebar
│   │   ├── modals/             # Create room/space, settings, leave room
│   │   ├── sidebar/            # Server sidebar, channel list, context menu
│   │   └── voice/              # Voice channel view, controls, participant tiles
│   ├── lib/                    # Matrix client init & event handlers
│   ├── pages/                  # LoginPage, MainPage
│   ├── stores/                 # Zustand stores (auth, rooms, messages, calls, etc.)
│   └── utils/                  # Helpers & formatters
├── src-tauri/                  # Tauri / Rust backend
│   ├── src/
│   │   ├── lib.rs              # App setup (plugins, permission handling)
│   │   └── main.rs             # Entry point
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests where appropriate
4. Run `npm test` to ensure everything passes
5. Commit and push, then open a PR
6. Sign the [CLA](CLA.md) when prompted by the bot on your PR

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
