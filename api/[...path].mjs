import 'dotenv/config';
import { createB2App } from '../server/b2App.mjs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createB2App();

export default function handler(req, res) {
  return app(req, res);
}
