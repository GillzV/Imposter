import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Connect to the same server that's serving the frontend
const socket = io('http://localhost:3002');

function Game() {
  const [gameState, setGameState] = useState({
    gameId: null,
    playerName: '',
    players: [],
    status: 'initial',
    topic: null,
    secretWord: null,
    isImposter: false,
    description: '',
    descriptions: {},
    votes: {},
    scores: [],
    descriptionRound: 1,
    selectedTopic: null,
  });

  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const Notification = ({ message, type }) => (
    <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${
      type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white`}>
      {message}
    </div>
  );

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    socket.on('error', ({ message }) => {
      setErrorMessage(message);
      setShowError(true);
      setIsJoining(false);
    });

    socket.on('gameCreated', ({ gameId, playerName }) => {
      setGameState(prev => ({
        ...prev,
        gameId,
        playerName,
        status: 'waiting'
      }));
      showNotification('Game created successfully!');
    });

    socket.on('playerJoined', ({ players }) => {
      setGameState(prev => ({
        ...prev,
        players
      }));
      setIsJoining(false);
      showNotification('Successfully joined the game!');
    });

    socket.on('gameStarted', ({ topic, secretWord, isImposter }) => {
      setGameState(prev => ({
        ...prev,
        topic,
        secretWord,
        isImposter,
        status: 'describing',
        description: '',
        descriptions: {},
        descriptionRound: 1
      }));
      showNotification('Game started!');
    });

    socket.on('allDescriptionsSubmitted', ({ descriptions, players, currentRound, maxRounds }) => {
      setGameState(prev => ({
        ...prev,
        descriptions,
        players,
        status: 'describing',
        description: '',
        descriptionRound: currentRound,
      }));
    });

    socket.on('votingStarted', ({ descriptions, players }) => {
      setGameState(prev => ({
        ...prev,
        descriptions,
        players,
        status: 'voting'
      }));
    });

    socket.on('roundResults', ({ imposterCaught, imposter, mostVotedPlayers, votes, scores }) => {
      setGameState(prev => ({
        ...prev,
        imposterCaught,
        imposter,
        mostVotedPlayers,
        votes,
        scores,
        status: 'results',
        descriptions: {},
        description: '',
        descriptionRound: 1
      }));
    });

    socket.on('playerLeft', ({ players }) => {
      setGameState(prev => ({
        ...prev,
        players
      }));
    });

    return () => {
      socket.off('error');
      socket.off('gameCreated');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('allDescriptionsSubmitted');
      socket.off('votingStarted');
      socket.off('roundResults');
      socket.off('playerLeft');
    };
  }, []);

  const handleCreateGame = (e) => {
    e.preventDefault();
    if (!gameState.playerName.trim()) return;
    socket.emit('createGame', {
      playerName: gameState.playerName,
      selectedTopic: gameState.selectedTopic || null
    });
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (!gameState.playerName.trim() || !gameState.gameId.trim()) {
      setErrorMessage('Please enter both your name and game ID');
      setShowError(true);
      return;
    }

    setIsJoining(true);
    socket.emit('joinGame', {
      gameId: gameState.gameId.trim(),
      playerName: gameState.playerName.trim()
    });
  };

  const handleStartGame = () => {
    socket.emit('startGame', gameState.gameId);
  };

  const handleSubmitDescription = (e) => {
    e.preventDefault();
    if (!gameState.description.trim()) return;
    socket.emit('submitDescription', {
      gameId: gameState.gameId,
      description: gameState.description
    });
    showNotification('Description submitted successfully!');
  };

  const handleVote = (votedForId) => {
    socket.emit('submitVote', {
      gameId: gameState.gameId,
      votedForId
    });
  };

  const handleStartVoting = () => {
    socket.emit('startVoting', gameState.gameId);
  };

  const renderInitialScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            Who is the Imposter?
          </h2>
          
          {/* How to Play Section */}
          <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">How to Play</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-lg font-semibold">1</span>
                </div>
                <p className="ml-4 text-gray-600">
                  <span className="font-medium">Setup:</span> Investigators receive a random secret word, while the Imposter only knows the theme.
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-lg font-semibold">2</span>
                </div>
                <p className="ml-4 text-gray-600">
                  <span className="font-medium">Gameplay:</span> Players take turns describing the secret word—without being too obvious or saying it directly. Remember, anyone could be lying!
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-lg font-semibold">3</span>
                </div>
                <p className="ml-4 text-gray-600">
                  <span className="font-medium">Goal:</span> Find the imposter!
                </p>
              </div>
              
              <div className="mt-6 bg-gray-50 rounded-md p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Scoring</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>If the imposter is caught: Investigators get 1 point each, Imposter gets 0 points</li>
                  <li>If the imposter survives: Imposter gets 2 points, Investigators get 0 points</li>
                  <li>If there is a tie in votes between the imposter and an investigator, 
                    the imposter survives so think carefully!</li>
                </ul>
              </div>
              
              <p className="text-gray-600 italic mt-4">
                Bluff as best as you can, and uncover the imposter to win!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <form className="space-y-6" onSubmit={handleCreateGame}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="player-name" className="sr-only">
                  Your Name
                </label>
                <input
                  id="player-name"
                  name="player-name"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Your Name"
                  value={gameState.playerName}
                  onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value }))}
                  disabled={isJoining}
                />
              </div>
              <div>
                <label htmlFor="topic" className="sr-only">
                  Topic (Optional)
                </label>
                <select
                  id="topic"
                  name="topic"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={gameState.selectedTopic || ''}
                  onChange={(e) => setGameState(prev => ({ ...prev, selectedTopic: e.target.value || null }))}
                  disabled={isJoining}
                >
                  <option value="">Random Topic</option>
                  <option value="Food">Food</option>
                  <option value="Animal">Animal</option>
                  <option value="Country">Country</option>
                  <option value="Sport">Sport</option>
                  <option value="Board Game">Board Game</option>
                  <option value="Video Game">Video Game</option>
                  <option value="Person">Person</option>
                  <option value="Characters">Characters</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isJoining}
              >
                Create New Game
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <form className="mt-6 space-y-6" onSubmit={handleJoinGame}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="game-id" className="sr-only">
                    Game ID
                  </label>
                  <input
                    id="game-id"
                    name="game-id"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Game ID"
                    value={gameState.gameId}
                    onChange={(e) => setGameState(prev => ({ ...prev, gameId: e.target.value }))}
                    disabled={isJoining}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isJoining}
                >
                  {isJoining ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWaitingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Waiting for Players
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Game ID: {gameState.gameId}
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">Players:</h3>
          <ul className="mt-4 divide-y divide-gray-200">
            {gameState.players.map((player) => (
              <li key={player.id} className="py-3">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{player.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {gameState.players.length >= 3 && (
          <div>
            <button
              onClick={handleStartGame}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Start Game
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderDescriptionScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Describe the Word
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Topic: {gameState.topic}
            {gameState.isImposter ? (
              <span className="block text-red-600">You are the Imposter!</span>
            ) : (
              <span className="block text-green-600">Secret Word: {gameState.secretWord}</span>
            )}
          </p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Round {gameState.descriptionRound} 
          </p>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Previous Descriptions:</h3>
          <ul className="mt-2 divide-y divide-gray-200">
            {Object.entries(gameState.descriptions)
              .filter(([round]) => parseInt(round) < gameState.descriptionRound)
              .map(([round, roundDescriptions]) => (
                <li key={round} className="py-2">
                  <p className="text-sm font-medium text-gray-900">Round {round}:</p>
                  {Object.entries(roundDescriptions).map(([playerId, description]) => {
                    const player = gameState.players.find(p => p.id === playerId);
                    return (
                      <div key={playerId} className="ml-4 mt-1">
                        <p className="text-sm font-medium text-gray-900">{player.name}:</p>
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                    );
                  })}
                </li>
              ))}
          </ul>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmitDescription}>
          <div>
            <label htmlFor="description" className="sr-only">
              Your Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Write your description here..."
              value={gameState.description}
              onChange={(e) => setGameState(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit Description
            </button>
            
            {gameState.descriptionRound > 1 && (
              <button
                type="button"
                onClick={handleStartVoting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Start Voting
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  const renderVotingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Vote for the Imposter
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Topic: {gameState.topic}
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">Descriptions:</h3>
          <ul className="mt-4 divide-y divide-gray-200">
            {Object.entries(gameState.descriptions).map(([round, roundDescriptions]) => (
              <li key={round} className="py-3">
                <p className="text-sm font-medium text-gray-900">Round {round}:</p>
                {Object.entries(roundDescriptions).map(([playerId, description]) => {
                  const player = gameState.players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} className="ml-4 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{player.name}</span>
                        <button
                          onClick={() => handleVote(playerId)}
                          className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Vote
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{description}</p>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderResultsScreen = () => {
    const votedOutPlayers = gameState.mostVotedPlayers
      .map(playerId => gameState.players.find(p => p.id === playerId))
      .filter(Boolean)
      .map(p => p.name)
      .join(', ');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Round Results
            </h2>
            <div className="mt-4 text-center">
              <p className="text-lg font-medium text-gray-900">
                Most Voted Players (Lost this round):
              </p>
              <p className="mt-1 text-base text-red-600">
                {votedOutPlayers}
              </p>
              <p className="mt-4 text-base text-gray-600">
                The Imposter was {gameState.imposter.name}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {gameState.imposterCaught 
                  ? "The Imposter was caught and got 0 points!" 
                  : gameState.isTie
                    ? "The Imposter survived! He gets 2 points!"
                    : "The Imposter survived! He gets 2 points!"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900">Current Scores:</h3>
            <ul className="mt-4 divide-y divide-gray-200">
              {gameState.scores
                .sort((a, b) => b.score - a.score) // Sort by score in descending order
                .map(({ name, score }) => (
                  <li key={name} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{name}</span>
                      <span className="text-sm text-gray-500">{score} points</span>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <button
              onClick={() => setGameState(prev => ({ ...prev, status: 'waiting' }))}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Play Another Round
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderErrorDialog = () => (
    <Dialog
      open={showError}
      onClose={() => setShowError(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
            <Dialog.Title className="ml-3 text-lg font-medium text-gray-900">
              Error
            </Dialog.Title>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">{errorMessage}</p>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              onClick={() => setShowError(false)}
            >
              OK
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>

  );

  return (
    <>
      {renderErrorDialog()}
      {notification.show && <Notification message={notification.message} type={notification.type} />}
      {gameState.status === 'initial' && renderInitialScreen()}
      {gameState.status === 'waiting' && renderWaitingScreen()}
      {gameState.status === 'describing' && renderDescriptionScreen()}
      {gameState.status === 'voting' && renderVotingScreen()}
      {gameState.status === 'results' && renderResultsScreen()}
  
      {/* Footer Section */}
      <footer className="text-center text-xs text-gray-500 py-4 absolute bottom-0 w-full bg-gray-100">
        Lefty is the sus one lowkey everyone vote for him
      </footer>
    </>
  );
  
}




export default Game; 