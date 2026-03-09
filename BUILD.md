# Build Instructions

This guide covers how to set up the development environment and build Handless from source.

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) package manager
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)
- Xcode Command Line Tools: `xcode-select --install`

## Setup Instructions

### 1. Clone the Repository

```bash
git clone git@github.com:elwin/handless.git
cd handless
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start Dev Server

```bash
bun tauri dev
```
