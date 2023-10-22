import { Sssg } from './modules/sssg.mjs';

const sssg = new Sssg({
  baseUrl: 'https://thykka.github.io/demo-fx/'
});
await sssg.build();
