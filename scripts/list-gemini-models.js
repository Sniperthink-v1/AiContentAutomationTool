const { GoogleGenerativeAI } = require('@google/generative-ai')

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBoEXBWMBOUy31W6lCuAu8gcJTUOq4R69s'
  
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
