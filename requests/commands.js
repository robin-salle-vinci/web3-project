import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Command containing options
const ADD_EVENT_COMMAND = {
  name: 'addevent',
  description: 'Add an event',
  options: [
    {
      type: 3, // STRING
      name: 'date',
      description: 'Date of the event (YYYY-MM-DD)',
      required: true,
    },
    {
      type: 3, // STRING
      name: 'heure',
      description: 'Time of the event (HH:MM)',
      required: true,
    },
    {
      type: 3, // STRING
      name: 'description',
      description: 'Description of the event',
      required: true,
    },
  ],
  type: 1,
};

const DELETE_EVENT_COMMAND = {
  name: 'deleteevent',
  description: 'Delete an event',
  options: [
    {
      type: 3, // STRING
      name: 'date',
      description: 'Date of the event (YYYY-MM-DD)',
      required: true,
    },
    {
      type: 3, // STRING
      name: 'heure',
      description: 'Time of the event (HH:MM)',
      required: true,
    },
  ],
  type: 1,
};

const LIST_EVENT_COMMAND = {
  name: 'listevent',
  description: 'List all events',
  type: 1,
};

const ALL_COMMANDS = [ADD_EVENT_COMMAND, DELETE_EVENT_COMMAND, LIST_EVENT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);