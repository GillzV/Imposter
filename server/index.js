const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Game state
const games = new Map();

// Topics and words
const topics = {
  "Food": [
    "Pizza", "Sushi", "Burger", "Pasta", "Ice Cream", "Tacos", "Sandwich", "Salad",
    "Steak", "Ramen", "Dumplings", "Curry", "Fried Chicken", "Hot Dog", "Burrito", "Wings",
    "Pho", "BBQ Ribs", "Lobster", "Mac and Cheese", "Nachos", "Chili", "Pancakes",
    "Waffles", "French Fries", "Mashed Potatoes", "Cheesecake", "Chocolate Cake",
    "Donuts", "Cookies", "Brownies", "Cupcakes", "Lasagna", "Grilled Cheese",
    "Fajitas", "Spring Rolls", "Clam Chowder", "Gumbo", "Paella", "Samosa",
    "Shawarma", "Gyro", "Poke Bowl", "Banh Mi", "Ceviche", "Falafel", "Jambalaya",
    "Empanadas", "Tamales", "Bibimbap", "Pierogi", "Gnocchi", "Cobb Salad",
    "Caprese Salad", "Omelette", "Scrambled Eggs", "Bagel with Cream Cheese",
    "Croissant", "Pretzel", "Churros", "Mochi", "Baklava", "Tiramisu", "Gelato",
    "Rice Pudding", "Flan", "Horchata", "Hummus", "Guacamole", "Meatballs", 
    "Fondue", "Crispy Duck", "Dim Sum", "Pad Thai", "Kimchi", "Miso Soup",
    "Teriyaki Chicken", "Fish and Chips", "Shepherds Pie",
    "Cornbread", "Jerk Chicken", "Grits", "Biscuits and Gravy", "Stuffed Peppers",
    "Sloppy Joes", "Lamb Chops", "Beef Stroganoff", "Tuna Tartare", "Pulled Pork",
    "Crab Cakes", "Coconut Shrimp", "Frittata", "Baba Ganoush", "Bulgogi",
    "Chimichanga", "Arepas", "Muffins", "Scones", "Poutine", "Okonomiyaki",
    "Udon", "Couscous", "Zucchini Noodles", "Carrot Cake", "Key Lime Pie"],

  "Animal": [
    "Elephant", "Tiger", "Dolphin", "Kangaroo", "Penguin", "Giraffe", "Lion", "Panda",
    "Cheetah", "Leopard", "Jaguar", "Wolf", "Fox", "Bear", "Grizzly Bear", "Polar Bear",
    "Koala", "Zebra", "Hippopotamus", "Rhinoceros", "Crocodile", "Alligator", "Turtle",
    "Tortoise", "Chameleon", "Iguana", "Gecko", "Eagle", "Hawk",
    "Falcon", "Owl", "Vulture", "Peacock", "Flamingo", "Parrot", "Macaw", "Hummingbird",
    "Goose", "Duck", "Turkey", "Ostrich", "Bald Eagle", "Horse", "Donkey",
     "Cow", "Bison", "Buffalo", "Moose", "Deer", "Antelope", "Gazelle", "Sheep",
    "Goat", "Camel", "Llama", "Alpaca", "Hedgehog", "Armadillo", "Sloth", "Opossum",
    "Raccoon", "Skunk", "Beaver", "Otter", "Mink", "Weasel", "Badger", "Wolverine",
    "Chimpanzee", "Gorilla", "Orangutan", 
    "Hyena", "Jackal", "Coyote", "Whale", "Blue Whale", "Humpback Whale",
    "Orca", "Shark", "Great White Shark", "Hammerhead Shark", "Manta Ray", "Stingray",
    "Seahorse", "Jellyfish", "Octopus", "Squid", "Lobster", "Crab", "Starfish",
    "Clownfish", "Pufferfish", "Swordfish", "Barracuda", "Eel", "Anaconda", "Python",
    "Cobra", "Rattlesnake","Frog", "Toad", "Salamander", 
    "Tarantula", "Scorpion", "Butterfly", "Moth", "Bee", "Wasp", "Ant", "Grasshopper",
    "Cricket", "Praying Mantis", "Dragonfly", "Firefly", "Ladybug", "Snail", "Slug",
    "Earthworm", "Mole", "Bat", "Ferret", "Hare", "Rabbit", "Hamster", "Guinea Pig",
    "Mouse", "Rat", "Squirrel", "Chipmunk", "Porcupine", "Platypus", "Narwhal",
     "Walrus", "Seal", "Snow Leopard",
     "Unicorn"],

  "Country": [
    "Canada", "Brazil", "France", "Japan", "Australia", "India", "Mexico", "Italy",
    "United States", "United Kingdom", "Germany", "China", "Russia", "Spain", "South Korea",
    "South Africa", "Egypt", "Saudi Arabia", "Turkey",
    "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Thailand", "Vietnam", "Philippines", "Indonesia",
    "Singapore", "New Zealand", "Colombia", "Chile",
    "Paraguay", "Uruguay", "Bolivia", "Cuba", "Dominican Republic", "Jamaica",
    "Costa Rica", 
    "Nigeria", "Madagascar", "Iraq",
    "Pakistan", "Bangladesh", "Afghanistan", "Kazakhstan", "Uzbekistan", "Turkmenistan",
    "Mongolia", "Nepal", "Bhutan", "Myanmar", "Sri Lanka", "Lebanon", "Israel",
    "Palestine", "Jordan", "Kuwait", "Oman", "Yemen", "Georgia", "Armenia", "Azerbaijan",
    "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria", "Serbia",
    "Croatia", "Slovenia", "Bosnia and Herzegovina", "Montenegro", "North Macedonia",
    "Latvia", "Lithuania", "Estonia", "Iceland", "Luxembourg", "Malta", "Cyprus",
    "Fiji", "Papua New Guinea", "Solomon Islands", "Samoa", "Vanuatu", "Micronesia",
    "Palau", "Tonga", "Kiribati", "Nauru", "Marshall Islands", "Tuvalu" ],

  "Sport": [
    "Soccer", "Basketball", "Tennis", "Cricket", "Baseball", "Hockey", "Rugby", "Golf",
    "American Football", "Volleyball", "Table Tennis", "Badminton", "Track and Field",
    "Swimming", "Gymnastics", "Wrestling", "Boxing", "MMA", "Judo", "Karate", "Taekwondo",
    "Fencing", "Archery", "Bowling", "Darts", "Snooker", "Billiards", "Chess", "Esports",
    "Lacrosse", "Field Hockey", "Handball", "Softball", "Water Polo", "Rowing",
    "Kayaking", "Canoeing", "Surfing", "Sailing", "Cycling", "BMX", "Mountain Biking",
    "Motocross", "Formula 1", "NASCAR", "Rally Racing", "Horse Racing", "Polo",
    "Rock Climbing", "Skateboarding", "Snowboarding", "Skiing", "Ice Skating",
    "Figure Skating", "Speed Skating", "Luge", "Bobsled", "Curling", "Sumo Wrestling",
    "Powerlifting", "Bodybuilding", "Weightlifting", "Triathlon", "Decathlon",
    "Pentathlon", "Marathon", "Sprint Racing", "Steeplechase", "Shot Put", "Discus Throw",
    "Javelin Throw", "Pole Vault", "High Jump", "Long Jump", "Triple Jump",
    "Tug of War", "Parkour", "Ultimate Frisbee", "Disc Golf", "Kabaddi", "Sepak Takraw",
    "Pickleball", "Paddle Tennis", "Racquetball", "Squash", "Kickboxing", "Arm Wrestling",
    "Bull Riding", "Barefoot Skiing", "Extreme Ironing", "Cheerleading", "Dodgeball",
    "Tetherball", "Wiffle Ball", "Frisbee", "Airsoft", "Paintball"],

  "Game": ["Chess", "Monopoly", "Scrabble", "Poker", "Checkers", "Risk", "Clue", "Battleship", "Uno", "Jenga", "Catan",
     "Backgammon", "Dominoes", "Mahjong", "Pictionary", "Twister", "Yahtzee"],

  "Video Game": [
    "Minecraft", "Fortnite", "Roblox", "Grand Theft Auto V", "The Legend of Zelda: Breath of the Wild",
    "Super Mario Bros.", "Super Smash Bros. Ultimate", 
    "Dark Souls", "Elden Ring",
    "Cyberpunk 2077", "Red Dead Redemption 2",
    "Call of Duty: Modern Warfare", "Call of Duty: Warzone",
    "Overwatch", "Valorant", "Counter-Strike: Global Offensive",
    "League of Legends", "Dota 2", "Team Fortress 2", "Apex Legends", "PUBG",
    "Rainbow Six Siege", "Fall Guys", "Among Us",
    "Terraria", "Don't Starve", "The Last of Us Part ",
    "Outlast", "Five Nights at Freddys", "Phasmophobia",
    "Subnautica",
    "Portal", "Left 4 Dead", "Warframe", "Genshin Impact",
    "Hitman 3", "Just Cause 4", "Far Cry 6", "Watch Dogs 2",
    "Dragon Ball FighterZ", "Super Smash Bros. Ultimate" ],

  "Person": [
    "Albert Einstein", "Elvis Presley", "Marilyn Monroe", "Michael Jackson", "Leonardo da Vinci",
    "Nikola Tesla", "William Shakespeare", "Walt Disney", "Steve Jobs", "Oprah Winfrey",
    "Nelson Mandela", "Princess Diana", "Martin Luther King Jr.", "Muhammad Ali", "Pablo Picasso",
    "Mahatma Gandhi", "Audrey Hepburn", "John Lennon", "Beyoncé", "Barack Obama",
    "Abraham Lincoln", "Frida Kahlo", "Charles Darwin", "Bruce Lee", "Rosa Parks",
    "George Washington", "Bob Marley", "Vincent van Gogh", "J.K. Rowling", "David Bowie",
    "Freddie Mercury", "Bill Gates", "Kanye West", "Tom Hanks", "Lady Gaga", "Elon Musk",
    "Mark Zuckerberg", "Angelina Jolie", "Leonardo DiCaprio", "Meryl Streep", "Madonna",
    "Scarlett Johansson", "Johnny Depp", "Keanu Reeves", "Will Smith", "Chris Hemsworth",
    "Robert Downey Jr.", "Dwayne 'The Rock' Johnson", "Tom Cruise", "Brad Pitt", "George Clooney",
    "Julia Roberts", "Sandra Bullock", "Matt Damon", "Nicole Kidman", "Cate Blanchett",
    "Johnny Depp", "Ryan Reynolds", "Zac Efron", "Will Ferrell", "Emma Stone", "Jennifer Lawrence",
    "Megan Fox", "Chris Pratt", "Hugh Jackman", "Matthew McConaughey", "Harrison Ford",
    "Morgan Freeman", "Samuel L. Jackson", "Mia Khalifa", "Kylie Jenner", "Kim Kardashian", 
    "Angela White", "Johnny Sins", "Salvador Martinez", "Levi whatever his last name is", 
    "Lefty", "Edward Venegas", "Ben Affleck", "Eddie Murphy", "Al Pacino", "Jack Nicholson", 
    "Robert De Niro", "Ninja", "Pokimane", "Shroud", "Dr Disrespect", "xQc", "Ludwig", "Valkyrae", 
    "AuronPlay", "SypherPK", "TimTheTatman", "Dream", "Markiplier", "Jacksepticeye", "PewDiePie", 
    "Logan Paul", "KSI", "Smosh", "Dude Perfect", "Casey Neistat", "Emma Chamberlain", 
    "David Dobrik", "MrBeast", "James Charles", "Tana Mongeau", "Liza Koshy", "The Try Guys", 
    "DanTDM", "Jack Harlow","Iron Man", "Spider-Man", 
    "Superman", "Batman", "The Joker", "Wonder Woman", "Deadpool", "Black Panther", "Thanos"],


    "Characters": [
    "Homer Simpson", "Marge Simpson", "Bart Simpson", "Lisa Simpson", "Maggie Simpson",
    "Mr. Burns", "Ned Flanders", "Krusty the Clown", "Sideshow Bob", "Apu Nahasapeemapetilon",
    "Stewie Griffin", "Peter Griffin", "Lois Griffin", "Meg Griffin", "Chris Griffin",
    "Brian Griffin", "Glenn Quagmire", "Cleveland Brown", "Joe Swanson","Charlie Brown", "Snoopy",
    "Tom (Tom and Jerry)",
    "Jerry (Tom and Jerry)", "Bugs Bunny", "Daffy Duck", "Porky Pig","Marvin the Martian", "Speedy Gonzales",
    "The Tasmanian Devil (Taz)", "Scooby-Doo", "Shaggy Rogers", "Fred Jones", "Daphne Blake",
    "Johnny Bravo", "Dexter (Dexter's Laboratory)",
    "Courage the Cowardly Dog","Samurai Jack", "Aku", "Finn the Human", "Jake the Dog", "Princess Bubblegum",
    "Mordecai", "Rigby",
    "Benson", "Skips", "Pops", "Muscle Man", "High Five Ghost", "SpongeBob SquarePants",
    "Patrick Star", "Squidward Tentacles", "Mr. Krabs", "Sandy Cheeks", "Plankton", 
    "Larry the Lobster", "The Flying Dutchman", "Jimmy Neutron", "Carl Wheezer", "Sheen Estevez",
    "Timmy Turner", "Cosmo", "Wanda", "Vicky", "Denzel Crocker", "Danny Phantom",
    "Leonardo (TMNT)", "Michelangelo (TMNT)", "Donatello (TMNT)", "Raphael (TMNT)",
    "Optimus Prime", "Megatron", "Bumblebee", "Starscream", "Goku", "Vegeta", "Naruto Uzumaki",
    "Luffy", "Naruto Uzumaki", "SpongeBob SquarePants", 
    "Mickey Mouse", "Bugs Bunny", "Homer Simpson", "Bart Simpson", "Looney Tunes", "Rick Sanchez", 
    "Morty Smith", "Scooby-Doo", "Shaggy Rogers", "Tom and Jerry", "The Flintstones", "Pikachu", 
    "Ash Ketchum", "Goku", "Vegeta", "Naruto Uzumaki", "Sailor Moon" ]


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

  socket.on('createGame', ({ playerName, selectedTopic }) => {
    const gameId = Math.random().toString(36).substring(2, 8);
    const game = {
      id: gameId,
      players: [{ id: socket.id, name: playerName, score: 0 }],
      status: 'waiting',
      topic: null,
      selectedTopic: selectedTopic,
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
    game.topic = game.selectedTopic || getRandomTopic();
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
      
      // If there's a tie in votes, imposter wins (survives)
      const isTie = mostVotedPlayers.length > 1;
      const imposterWins = isTie || !imposterWasVotedOut;
      
      // Update scores based on the correct rules
      game.players.forEach(player => {
        if (imposterWins) {
          // If imposter survives (either through tie or not being caught):
          // - Imposter gets 2 points
          // - All investigators get 0 points
          if (player.id === game.imposter.id) {
            player.score += 2;
          } else {
            player.score += 0;
          }
        } else {
          // If imposter was caught:
          // - Each investigator gets 1 point
          // - Imposter gets 0 points
          if (player.id === game.imposter.id) {
            player.score += 0;
          } else {
            player.score += 1;
          }
        }
      });

      // Emit round results
      io.to(gameId).emit('roundResults', {
        imposterCaught: !imposterWins,
        imposter: game.imposter,
        mostVotedPlayers: mostVotedPlayers,
        votes: game.votes,
        scores: game.players.map(p => ({ name: p.name, score: p.score })),
        isTie
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
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log('To connect from other devices, use your computer\'s local IP address');
}); 