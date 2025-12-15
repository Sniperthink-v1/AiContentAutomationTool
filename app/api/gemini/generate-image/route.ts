import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings, mode, sourceImage } = await request.json()

    console.log('🎨 Image Generation Request:', { 
      mode,
      prompt: prompt?.substring(0, 50),
      hasSourceImage: !!sourceImage,
      settings 
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Validate source image for image-to-image mode
    if (mode === 'image-to-image' && !sourceImage) {
      return NextResponse.json(
        { error: 'Source image is required for image-to-image generation' },
        { status: 400 }
      )
    }

    // Check if API key exists
    if (!process.env.REPLICATE_API_KEY) {
      return NextResponse.json(
        { error: 'Replicate API key not configured' },
        { status: 500 }
      )
    }

    // Deduct 2 credits for image generation
    const creditResponse = await fetch(`${request.nextUrl.origin}/api/credits/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: mode === 'image-to-image' ? 'image_to_image' : 'image_generation',
        creditsUsed: 2,
        modelUsed: mode === 'image-to-image' ? 'flux-dev' : 'flux-schnell',
        description: `Image generation: ${prompt.substring(0, 50)}...`
      })
    })

    const creditData = await creditResponse.json()

    if (!creditData.success) {
      return NextResponse.json(
        { 
          error: creditData.error || 'Insufficient credits',
          remaining: creditData.remaining,
          required: 2
        },
        { status: 400 }
      )
    }

    // Initialize Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    })

    // Create detailed prompt with style and settings
    let detailedPrompt = ''
    let output: any

    // Map aspect ratio to dimensions
    const getDimensionsForAspectRatio = (aspectRatio: string, quality: string) => {
      const baseResolutions: { [key: string]: { width: number, height: number } } = {
        '1:1': { width: 1024, height: 1024 },
        '4:5': { width: 896, height: 1120 },
        '9:16': { width: 768, height: 1365 },
        '16:9': { width: 1365, height: 768 }
      }
      
      // Scale up for higher quality
      const dimensions = baseResolutions[aspectRatio] || baseResolutions['1:1']
      if (quality === 'ultra') {
        return { width: Math.round(dimensions.width * 1.5), height: Math.round(dimensions.height * 1.5) }
      } else if (quality === 'high') {
        return { width: Math.round(dimensions.width * 1.2), height: Math.round(dimensions.height * 1.2) }
      }
      return dimensions
    }

    const aspectRatio = settings?.aspectRatio || '1:1'
    const quality = settings?.quality || 'high'
    const dimensions = getDimensionsForAspectRatio(aspectRatio, quality)

    if (mode === 'image-to-image') {
      // Image-to-Image transformation mode
      detailedPrompt = `${prompt}. Style: ${settings?.style || 'photorealistic'}. Mood: ${settings?.mood || 'vibrant'}. Lighting: ${settings?.lighting || 'natural'}. High quality, detailed, professional photography.`

      // Use FLUX dev for image-to-image (supports image input)
      output = await replicate.run(
        "black-forest-labs/flux-dev",
        {
          input: {
            prompt: detailedPrompt,
            image: sourceImage, // Base64 data URL
            num_inference_steps: quality === 'ultra' ? 50 : quality === 'high' ? 40 : 30,
            guidance_scale: 7.5,
            num_outputs: 1,
            output_format: "png",
            output_quality: quality === 'ultra' ? 100 : quality === 'high' ? 90 : 80,
            // Add aspect ratio control for image-to-image
            aspect_ratio: aspectRatio,
          }
        }
      )
    } else {
      // Text-to-Image generation mode
      detailedPrompt = `${prompt}. Style: ${settings?.style || 'photorealistic'}. Mood: ${settings?.mood || 'vibrant'}. Lighting: ${settings?.lighting || 'natural'}. Composition: ${settings?.composition || 'centered'}. Resolution: ${quality === 'ultra' ? '4K' : quality === 'high' ? '1080p' : '720p'}. High quality, detailed, professional photography.`

      // Use FLUX schnell for fast text-to-image generation
      output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: detailedPrompt,
            aspect_ratio: aspectRatio,
            num_outputs: 1,
            output_format: "png",
            output_quality: quality === 'ultra' ? 100 : quality === 'high' ? 90 : 80,
          }
        }
      )
    }

    // Replicate returns an array of image URLs
    if (!output || !Array.isArray(output) || output.length === 0) {
      return NextResponse.json(
        { 
          error: 'No image generated', 
          message: 'The API did not return an image'
        },
        { status: 500 }
      )
    }

    const imageUrl = output[0] // Get the first generated image URL

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageData = `data:image/png;base64,${base64Image}`

    return NextResponse.json({
      success: true,
      prompt: prompt,
      enhancedPrompt: detailedPrompt,
      imageData: imageData,
      settings: settings,
      mode: mode || 'text-to-image',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Gemini Image Generation Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
