// Centralized user-facing strings and keys (organized by feature area)

const KEYS = {
  BACK: 'back',
  BACK_SHORT: 'b',
};

const TEXT = {
  APP: {
    WELCOME: 'Welcome to the Murder Mystery Game!',
    GENERATING_CASE: 'Generating a fresh case...',
  },
  CASE: {
    PREFIX: 'Case: ',
    SETTING_PREFIX: 'Setting: ',
    VICTIM_LABEL: 'Victim:',
    TIME_OF_DEATH_PREFIX: 'Time of death:',
  },
  MENU: {
    TITLE: 'Main Menu:',
    INSTRUCTIONS: '1. Instructions',
    SUSPECTS: '2. Suspect List',
    CLUES: '3. Clue List',
    SUBMIT: '4. Submit Conclusion',
    EXIT: '5. Exit',
    DEBUG: '6. Debug (hidden)',
    PROMPT_SELECT_OPTION: 'Select an option: ',
  },
  INSTRUCTIONS: {
    TITLE: 'Instructions:',
    INTRO: 'You are the detective. Interrogate suspects, gather clues, and identify the killer and the murder weapon.',
    HOW_TO_PLAY: 'How to play:',
    TIPS: {
      TITLE: 'Tips:',
      ASK_QUESTIONS: "- Ask direct questions (e.g., 'Where were you at 21:00?', 'What was your relationship with the victim?', 'Did you see a candlestick?').",
      CLUE_LIST: "- Visit 'Clue List' to review what you’ve learned.",
      SUBMIT: "- When ready, choose 'Submit Conclusion' and select a suspect and weapon from the lists.",
      WIN: "- If your conclusion is close enough to the truth, you win. Otherwise, keep investigating.",
      CONTRADICTIONS: '- Contradictions expose lies.',
      RELEVANCE: '- Not every detail is relevant.',
      FOLLOWUPS: '- Different suspects reveal different angles—ask follow-ups.',
      BACK: "Type 'back' during interrogation to return to the previous menu.",
    },
  },
  SUSPECTS: {
    LIST_TITLE: 'Suspect List:',
    PROMPT_SELECT: "\nSelect a suspect (number or name) to interact with, or type 'back' to go back: ",
    INVALID_SELECTION: 'Invalid selection. Please try again.',
  },
  INTERACTION: {
    INTRO: (name, gender, age) => `\nYou are now speaking with ${name} (${gender}, ${age}). Type your question. Type 'back' to return.`,
    YOU_PREFIX: 'You: ',
    THINKING: '(AI is thinking...)',
    AI_ERROR_PREFIX: '(AI error) ',
  },
  CLUES: {
    LIST_TITLE: 'Clue List:',
    NO_CLUES_YET: '(No clues discovered yet.)',
    WEAPONS_MENTIONED_TITLE: 'Weapons mentioned so far:',
    NONE_YET: '(none yet)',
  },
  SUBMISSION: {
    TITLE: 'Submit your conclusion:',
    PROMPT_WHO_MURDERER: 'Select the murderer (number): ',
    PROMPT_WHAT_WEAPON: 'Select the murder weapon (number): ',
    INPUT_MISMATCH: "\nYour input didn't match a known suspect and/or weapon. Try using exact names as listed.",
    INSUFFICIENT_EVIDENCE: 'You have not collected enough evidence about weapons yet. Interrogate suspects to uncover weapon mentions.',
    CORRECT_PREFIX: 'Correct!',
    NOT_QUITE: 'Not quite. Keep investigating.',
    TRUTH_PREFIX: 'Truth: The murderer was',
    MOTIVE_PREFIX: 'Motive:',
    KEY_CONTRADICTIONS_TITLE: 'Key Contradictions:',
  },
  DEBUG: {
    TITLE: 'Debug Mode:',
  },
  COMMON: {
    PROMPT_RETURN_MENU: 'Press Enter to return to the menu...',
    EXITING: 'Exiting game. Goodbye!',
    INVALID_OPTION: 'Invalid option. Please try again.',
  },
};

module.exports = { KEYS, TEXT };
