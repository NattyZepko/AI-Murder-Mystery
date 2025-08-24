// Core exports for reuse across CLI and Web
const { generateScenario } = require('../src/scenarioGenerator');
const { applyScenarioRules } = require('../src/scenarioRules');

module.exports = {
  generateScenario,
  applyScenarioRules,
};
