# Imposter Game

A multiplayer social deduction game where players try to identify the imposter among them. Players are given a common topic, but only the investigators know the secret word. The imposter must blend in by providing vague descriptions while investigators try to identify them.

## Features

- Real-time multiplayer gameplay
- Multiple topics and secret words
- Role-based gameplay (Investigator/Imposter)
- Voting system
- Score tracking
- Modern React UI

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Create a `.env` file in the root directory with:
   ```
   PORT=3001
   ```

## Running the Game

Development mode (with hot reloading):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The game will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Game Rules

1. Players join a game room
2. A random topic is selected
3. One player is randomly chosen as the imposter
4. Investigators receive the secret word
5. Each player provides a description
6. Players vote on who they think is the imposter
7. Points are awarded based on the outcome

## Technologies Used

- Frontend: React, Socket.IO Client
- Backend: Node.js, Express, Socket.IO
- Styling: Tailwind CSS 