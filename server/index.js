const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game state
const games = new Map();

// Topics and words
const topics = {
  "Food": ["Pizza", "Sushi", "Burger", "Pasta", "Ice Cream", "Tacos", "Sandwich", "Salad"],
  "Animal": ["Elephant", "Tiger", "Dolphin", "Kangaroo", "Penguin", "Giraffe", "Lion", "Panda"],
  "Country": ["Canada", "Brazil", "France", "Japan", "Australia", "India", "Mexico", "Italy"],
  "Sport": ["Soccer", "Basketball", "Tennis", "Cricket", "Baseball", "Hockey", "Rugby", "Golf"],
  "Game": ["Chess", "Monopoly", "Scrabble", "Poker", "Checkers", "Risk", "Clue", "Battleship"]
};

// Helper functions
const getRandomTopic = () => {
  const topicKeys = Object.keys(topics);
  return topicKeys[Math.floor(Math.random() * topicKeys.length)];
};

const getRandomWord = (topic) => {
  const words = topics[topic];
  return words[Math.floor(Math.random() * words.length)];
};

const getRandomPlayer = (players) => {
  return players[Math.floor(Math.random() * players.length)];
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createGame', (playerName) => {
    const gameId = Math.random().toString(36).substring(2, 8);
    const game = {
      id: gameId,
      players: [{ id: socket.id, name: playerName, score: 0 }],
      status: 'waiting',
      topic: null,
      secretWord: null,
      imposter: null,
      descriptions: {},
      votes: {},
      round: 1,
      descriptionRound: 1,
      maxDescriptionRounds: 3
    };
    games.set(gameId, game);
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, playerName });
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    console.log('Attempting to join game:', { gameId, playerName });
    const game = games.get(gameId);
    
    if (!game) {
      console.log('Game not found:', gameId);
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.status !== 'waiting') {
      console.log('Game already started:', gameId);
      socket.emit('error', { message: 'Game already started' });
      return;
    }

    // Check if player name is already taken in this game
    if (game.players.some(p => p.name === playerName)) {
      console.log('Player name already taken:', playerName);
      socket.emit('error', { message: 'Player name already taken' });
      return;
    }

    const newPlayer = { id: socket.id, name: playerName, score: 0 };
    game.players.push(newPlayer);
    socket.join(gameId);
    
    console.log('Player joined successfully:', newPlayer);
    console.log('Current players:', game.players);
    
    io.to(gameId).emit('playerJoined', { players: game.players });
  });

  socket.on('startGame', (gameId) => {
    const game = games.get(gameId);
    if (!game) return;

    game.status = 'playing';
    game.topic = getRandomTopic();
    game.secretWord = getRandomWord(game.topic);
    game.imposter = getRandomPlayer(game.players);

    // Notify players of their roles
    game.players.forEach(player => {
      io.to(player.id).emit('gameStarted', {
        topic: game.topic,
        secretWord: player.id === game.imposter.id ? null : game.secretWord,
        isImposter: player.id === game.imposter.id
      });
    });
  });

  socket.on('submitDescription', ({ gameId, description }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Store descriptions with round number
    if (!game.descriptions[game.descriptionRound]) {
      game.descriptions[game.descriptionRound] = {};
    }
    game.descriptions[game.descriptionRound][player.id] = description;

    // Check if all players have submitted descriptions for this round
    if (Object.keys(game.descriptions[game.descriptionRound]).length === game.players.length) {
      // Move to next description round
      game.descriptionRound += 1;
      game.status = 'describing';
      io.to(gameId).emit('allDescriptionsSubmitted', {
        descriptions: game.descriptions,
        players: game.players.map(p => ({ id: p.id, name: p.name })),
        currentRound: game.descriptionRound,
        maxRounds: game.maxDescriptionRounds
      });
    }
  });

  socket.on('startVoting', (gameId) => {
    const game = games.get(gameId);
    if (!game) return;

    game.status = 'voting';
    io.to(gameId).emit('votingStarted', {
      descriptions: game.descriptions,
      players: game.players.map(p => ({ id: p.id, name: p.name }))
    });
  });

  socket.on('submitVote', ({ gameId, votedForId }) => {
    const game = games.get(gameId);
    if (!game) return;

    game.votes[socket.id] = votedForId;

    // Check if all players have voted
    if (Object.keys(game.votes).length === game.players.length) {
      // Count votes
      const voteCounts = {};
      Object.values(game.votes).forEach(votedId => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      });

      // Find player(s) with most votes
      const maxVotes = Math.max(...Object.values(voteCounts));
      const mostVotedPlayers = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

      // Check if imposter was among the most voted
      const imposterWasVotedOut = mostVotedPlayers.includes(game.imposter.id);
      
      // Update scores based on the correct rules
      game.players.forEach(player => {
        if (imposterWasVotedOut) {
          // If imposter was caught:
          // - Each investigator gets 1 point
          // - Imposter gets 0 points
          if (player.id === game.imposter.id) {
            player.score += 0;
          } else {
            player.score += 1;
          }
        } else {
          // If imposter wasn't caught:
          // - Imposter gets 2 points
          // - All investigators get 0 points
          if (player.id === game.imposter.id) {
            player.score += 2;
          } else {
            player.score += 0;
          }
        }
      });

      // Emit round results
      io.to(gameId).emit('roundResults', {
        imposterCaught: imposterWasVotedOut,
        imposter: game.imposter,
        mostVotedPlayers: mostVotedPlayers,
        votes: game.votes,
        scores: game.players.map(p => ({ name: p.name, score: p.score }))
      });

      // Reset game state for next round
      game.status = 'waiting';
      game.topic = null;
      game.secretWord = null;
      game.imposter = null;
      game.descriptions = {};
      game.votes = {};
      game.round += 1;
      game.descriptionRound = 1;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Clean up games where this player was participating
    games.forEach((game, gameId) => {
      game.players = game.players.filter(p => p.id !== socket.id);
      if (game.players.length === 0) {
        games.delete(gameId);
      } else {
        io.to(gameId).emit('playerLeft', { players: game.players });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 