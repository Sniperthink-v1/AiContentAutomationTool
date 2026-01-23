import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode, sourceImage, style, title } = await request.json()

    console.log('🎨 Thumbnail Generation Request:', { 
      mode,
      prompt: prompt?.substring(0, 50),
      hasSourceImage: !!sourceImage,
      style,
      title 
    })

    if (!prompt && !title) {
      return NextResponse.json(
        { error: 'Prompt or title is required' },
        { status: 400 }
      )
    }

    // Validate source image for image-to-thumbnail mode
    if (mode === 'image-to-thumbnail' && !sourceImage) {
      return NextResponse.json(
        { error: 'Source image is required for image-to-thumbnail generation' },
        { status: 400 }
      )
    }

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Deduct credits - 4 credits per thumbnail (~$0.039)
    const creditCost = 4
    const creditResponse = await fetch(`${request.nextUrl.origin}/api/credits/deduct`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        actionType: mode === 'image-to-thumbnail' ? 'image_to_thumbnail' : 'text_to_thumbnail',
        creditsUsed: creditCost,
        modelUsed: 'gemini-2.0-flash-exp',
        description: `Thumbnail: ${(prompt || title).substring(0, 50)}...`
      })
    })

    const creditData = await creditResponse.json()

    if (!creditData.success) {
      return NextResponse.json(
        { 
          error: creditData.error || 'Insufficient credits',
          remaining: creditData.remaining,
          required: creditCost
        },
        { status: 400 }
      )
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Build the thumbnail-specific prompt
    const styleInstructions: { [key: string]: string } = {
      vibrant: 'Use vibrant, saturated colors with high contrast. Add dynamic energy and excitement.',
      minimal: 'Clean and simple design with plenty of white space. Focus on clarity and simplicity.',
      professional: 'Business-appropriate with corporate colors. Clean typography and refined look.',
      bold: 'Bold and dramatic with strong colors. Large impactful elements and eye-catching design.',
      elegant: 'Refined and sophisticated with premium feel. Subtle gradients and elegant typography.',
      modern: 'Contemporary design with trendy elements. Geometric shapes and modern color palettes.',
      gaming: 'High energy gaming style with neon colors, action poses, and dynamic effects.',
      cinematic: 'Movie poster style with dramatic lighting, depth of field, and cinematic composition.'
    }

    let thumbnailPrompt = prompt || `Create a YouTube thumbnail for: "${title}"`
    thumbnailPrompt += `. ${styleInstructions[style] || styleInstructions.vibrant}`
    thumbnailPrompt += ` The thumbnail should be in 16:9 aspect ratio (1280x720 pixels), highly clickable, with clear focal point.`
    thumbnailPrompt += ` Make it visually striking and attention-grabbing for social media.`

    let imageData: string | null = null

    if (mode === 'image-to-thumbnail') {
      // Image-to-Thumbnail: Transform existing image into a thumbnail
      const transformPrompt = `Transform this image into a professional YouTube thumbnail. ${thumbnailPrompt} Keep the main subject but enhance it for thumbnail format. Add visual appeal and make it click-worthy.`
      
      // Extract base64 data from data URL
      const base64Match = sourceImage.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!base64Match) {
        return NextResponse.json(
          { error: 'Invalid image format. Please provide a valid base64 image.' },
          { status: 400 }
        )
      }

      const mimeType = `image/${base64Match[1]}`
      const imageBase64 = base64Match[2]

      // Use Gemini with image input for image-to-image generation
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64
                }
              },
              { text: transformPrompt }
            ]
          }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      })

      // Extract image from response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
    } else {
      // Text-to-Thumbnail: Generate from text description
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: thumbnailPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      })

      // Extract image from response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { 
          error: 'No thumbnail generated', 
          message: 'The API did not return an image. Try a different prompt.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageData,
      prompt: thumbnailPrompt,
      mode: mode || 'text-to-thumbnail',
      style: style,
      creditsUsed: creditCost,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Thumbnail Generation Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate thumbnail', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
