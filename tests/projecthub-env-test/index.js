const mode = process.argv[2] || 'no-mode';

if (mode === 'fail') {
  console.error('INTENTIONAL_FAILURE=true');
  process.exit(7);
}

console.log('MODE=' + mode);
console.log('NPM_LIFECYCLE_EVENT=' + (process.env.npm_lifecycle_event || ''));
console.log('FROM_DOTENV=' + process.env.FROM_DOTENV);
console.log('FROM_PROJECT_ENV=' + process.env.FROM_PROJECT_ENV);
console.log('OVERRIDE_ME=' + process.env.OVERRIDE_ME);
console.log('QUOTED_DOTENV=' + process.env.QUOTED_DOTENV);
console.log('PATH_HAS_NODE_BIN=' + String(process.env.PATH || '').includes('node_modules'));

if (mode === 'long') {
  let tick = 0;
  console.log('LONG_RUNNING=true');
  setInterval(() => {
    tick += 1;
    console.log('TICK=' + tick);
  }, 1000);
}
