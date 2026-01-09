// Test which models are available with your API key
require('dotenv').config();
const Anthropic = require('../node_modules/@anthropic-ai/sdk').default;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const modelsToTest = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2',
];

async function testModel(modelName) {
  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Hi',
      }],
    });
    console.log(`✓ ${modelName} - WORKS`);
    return true;
  } catch (error) {
    if (error.status === 404) {
      console.log(`✗ ${modelName} - NOT AVAILABLE (404)`);
    } else {
      console.log(`✗ ${modelName} - ERROR: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('Testing available models with your API key...\n');

  for (const model of modelsToTest) {
    await testModel(model);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\nTest complete!');
}

main();
