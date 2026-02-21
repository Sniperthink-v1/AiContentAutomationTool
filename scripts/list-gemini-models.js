const { GoogleGenerativeAI } = require('@google/generative-ai')
require('dotenv').config()

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set in environment')
    process.exit(1)
  }
  
  console.log('Listing available Gemini models...')
  
  try {
    // Use fetch to list models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await response.json()
    
    if (data.models) {
      console.log('\nAvailable models:')
      data.models.forEach(m => {
        if (m.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`  ✅ ${m.name} (${m.displayName})`)
        }
      })
    } else {
      console.log('Response:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

listModels()
