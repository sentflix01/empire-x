// Backward-compatible entry point. All safety checks live in one script.
const { main } = require('./clean-seed-data');
main().catch((error) => {
  console.error(`Seed cleanup refused or failed: ${error.message}`);
  process.exitCode = 1;
});
