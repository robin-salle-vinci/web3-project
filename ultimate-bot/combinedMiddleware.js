import { agendaApp } from './BOT/agenda.js';
import { pollApp } from './BOT/poll.js';
import { verifyKeyMiddleware } from 'discord-interactions';

const combinedMiddleware = (req, res, next) => {
  verifyKeyMiddleware(process.env.PUBLIC_KEY)(req, res, (err) => {
    if (err) {
      return res.status(401).send('Invalid request signature');
    }

    const { type, data } = req.body;

    if (type === 2 && data && data.name === 'poll') {
      return pollApp(req, res, next);
    } else {
      return agendaApp(req, res, next);
    }
  });
};

export { combinedMiddleware };