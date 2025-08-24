// Entry point for the game
const { startGame } = require('./gameLogic');

(async () => {
	try {
		await startGame();
	} catch (err) {
		console.error('Failed to start game:', err.message);
		process.exit(1);
	}
})();
