const { GoogleGenerativeAI } = require('@google/generative-ai')

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBoEXBWMBOUy31W6lCuAu8gcJTUOq4R69s'
  
  console.log('Testing Gemini API...')
  console.log('API Key:', apiKey.substring(0, 10) + '...')
  
  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Test different model names
  const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
  
  for (const modelName of models) {
    try {
      console.log(`\nTrying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('Say hello in one word')
      const response = await result.response
      console.log(`✅ ${modelName} works! Response:`, response.text().substring(0, 50))
      break
    } catch (error) {
      console.error(`❌ ${modelName} failed:`, error.message)
    }
  }
}

testGemini()
