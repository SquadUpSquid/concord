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

## Setup

Every platform needs **Git**, **Node.js >= 20**, and the **Rust toolchain**. Beyond that, each OS has its own system dependencies for Tauri. Pick your platform below and follow every step.

---

### Windows

<details>
<summary><b>Click to expand Windows setup</b></summary>

#### 1. Install Git

Download and install from [git-scm.com](https://git-scm.com/download/win).

#### 2. Install Node.js

Download the **LTS** installer (>= 20) from [nodejs.org](https://nodejs.org). This includes `npm`.

#### 3. Install Rust

Download and run the installer from [rustup.rs](https://rustup.rs). When prompted, choose the default installation.

After the installer finishes, **open a new terminal** and run:

```powershell
rustup default stable
```

#### 4. Install Tauri system dependencies

- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
  - In the installer, select the **"Desktop development with C++"** workload.
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10 1803+ and Windows 11).

For the full breakdown see the [Tauri v2 prerequisites guide](https://v2.tauri.app/start/prerequisites/).

#### 5. Verify everything

Open a **new** terminal (PowerShell or CMD) and run:

```powershell
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

### macOS

<details>
<summary><b>Click to expand macOS setup</b></summary>

#### 1. Install Xcode Command Line Tools

```bash
xcode-select --install
```

This gives you Git, a C compiler, and other build essentials.

#### 2. Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) (recommended) or download the LTS installer from [nodejs.org](https://nodejs.org).

```bash
# With nvm (after installing it):
nvm install 20
nvm use 20
```

#### 3. Install Rust

```bash
curl https://sh.rustup.rs -sSf | sh
```

Follow the on-screen prompts (defaults are fine). Then load it into your current shell:

```bash
source "$HOME/.cargo/env"
rustup default stable
```

#### 4. Verify everything

```bash
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

### Linux (Debian / Ubuntu)

<details>
<summary><b>Click to expand Linux setup</b></summary>

#### 1. Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) (recommended) or your distro's package manager. Most distro repos ship an outdated Node, so nvm is safest:

```bash
# With nvm (after installing it):
nvm install 20
nvm use 20
```

#### 2. Install Rust

```bash
curl https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
rustup default stable
```

#### 3. Install Tauri system dependencies

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-nice
```

> **Heads-up — Voice/Video on Linux:** Ubuntu and Debian ship WebKitGTK without WebRTC enabled. Voice and video calls work fully on **Windows** and **macOS**. On Linux you need a custom WebKitGTK build with `-DENABLE_WEB_RTC=ON` — see [this Tauri discussion](https://github.com/tauri-apps/tauri/discussions/8426) for details. Everything else (text chat, spaces, DMs, etc.) works fine.

#### 4. Verify everything

```bash
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

## Getting Started

Once your platform setup is complete:

```bash
# Clone the repo
git clone https://github.com/SquadUpSquid/concord.git
cd concord

# Install frontend dependencies
npm install

# Launch the desktop app (first run compiles the Rust backend — this takes a few minutes)
npm run tauri dev
```

To run **just the web frontend** in a browser (no Tauri / no Rust required):

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
