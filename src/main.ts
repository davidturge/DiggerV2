import { describeDemo } from './app';

// Scaffold entry point. Boots the same core sim composition app.test.ts
// exercises (grid parse → advanceTick loop), proving core is wired end to
// end. The renderer lands with its own issue; until then this just proves
// the phone→dev-server loop and that core is reachable from the app.
const app = document.getElementById('app');
if (app) {
  app.textContent = describeDemo();
}
