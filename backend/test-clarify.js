// Quick test script to debug clarification service
require('dotenv').config();
const Database = require('better-sqlite3');
const Anthropic = require('../node_modules/@anthropic-ai/sdk').default;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaudeAPI() {
  try {
    console.log('Testing Claude API...');
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: 'You are a helpful assistant.',
      messages: [{
        role: 'user',
        content: 'Say hello in one sentence.',
      }],
    });

    console.log('✓ Claude API works!');
    console.log('Response:', response.content[0].text);
    return true;
  } catch (error) {
    console.error('✗ Claude API error:',error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testDatabase() {
  try {
    console.log('\nTesting Database...');
    const db = new Database('./data/kgs.db');

    // Test query
    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(1);
    console.log('✓ Database works!');
    console.log('Demo user:', result);

    db.close();
    return true;
  } catch (error) {
    console.error('✗ Database error:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Clarification Service Debug ===\n');

  const dbOk = await testDatabase();
  const apiOk = await testClaudeAPI();

  if (dbOk && apiOk) {
    console.log('\n✓ All systems operational!');
  } else {
    console.log('\n✗ Some systems have errors - see above');
  }
}

main();
