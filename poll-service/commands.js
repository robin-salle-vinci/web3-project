import 'dotenv/config';

import { InstallGlobalCommands } from './utils.js';

// Commande de sondage avec jusqu'à 5 options
const POLL_COMMAND = {
  name: 'poll',
  description: 'Create a poll with a title and multiple options (up to 5)',
  options: [
    {
      type: 3, // String
      name: 'title',
      description: 'Title of the poll',
      required: true,
    },
    {
      type: 3, // String
      name: 'option1',
      description: 'First option for the poll',
      required: true,
    },
    {
      type: 3, // String
      name: 'option2',
      description: 'Second option for the poll',
      required: true,
    },
    {
      type: 3, // String
      name: 'option3',
      description: 'Third option for the poll',
      required: false,
    },
    {
      type: 3, // String
      name: 'option4',
      description: 'Fourth option for the poll',
      required: false,
    },
    {
      type: 3, // String
      name: 'option5',
      description: 'Fifth option for the poll',
      required: false,
    },
  ],
  type: 1, // Command type 1 corresponds to a chat input command
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, POLL_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
