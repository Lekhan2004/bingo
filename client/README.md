# Introduction

Bingo is a simple client app to join or host games, get randomized cards, mark called numbers, and claim bingo. This README explains how to run the client locally and the basic steps to play on a personal PC.

# Run the client on your PC

Prerequisites
- Node.js (LTS) and npm or yarn
- Git (if cloning from a remote repo)

Setup and start
1. Clone the repository (or use your local copy):
    ```bash
    git clone <repo-url>
    cd bingo/client
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm run dev
    ```
4. Open the app in a browser:
    - Visit http://localhost:3000 (or the port shown in the terminal)

# Steps to play (basic flow)

1. Launch the app in your browser.
2. Enter a player name when prompted.
3. Create a new game (host) or join an existing room using the room code.
4. Host sets game options (card count, pattern, number pool) and starts the game.
5. Each player receives one or more bingo cards.
6. Caller draws numbers (automatically or manually). Mark called numbers on your card as they are announced.
7. Watch for winning patterns (line, full house, or custom pattern). When you complete the pattern, press the "Bingo" / "Claim" button.
8. Host or server verifies the claim; if valid the game ends and the winner is announced.
9. Start a new round or return to lobby to change settings.