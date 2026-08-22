import app from './app.mjs';
import { config } from './config.mjs';

app.listen(config.apiPort, '0.0.0.0', () => {
  console.log(`LifeRoute API listening on http://localhost:${config.apiPort}`);
});