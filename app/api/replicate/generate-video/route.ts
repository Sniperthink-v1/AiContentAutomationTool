import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
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

    // Initialize Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    })

    console.log('Starting video generation with Replicate...')
    console.log('Prompt:', prompt)
    console.log('Settings:', settings)

    // Map duration to frame count for Stable Video Diffusion
    const durationMap: { [key: string]: string } = {
      '8': '14_frames_with_svd',   // ~2-3 seconds at 6 fps
      '16': '25_frames_with_svd',  // ~4-5 seconds at 6 fps
      '32': '25_frames_with_svd'   // Maximum supported by SVD
    }

    // Note: Stable Video Diffusion is img2vid, not text2vid
    // For text-to-video, we'd need a different model like AnimateDiff or Runway
    // For now, we'll use a text-to-image model first, then convert to video
    
    // Step 1: Generate an image from the prompt using FLUX Dev (better prompt adherence)
    console.log('Step 1: Generating initial image from prompt...')
    const imageOutput = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: prompt, // Use prompt directly without diluting
          aspect_ratio: "16:9", // Video aspect ratio
          num_outputs: 1,
          output_format: "png",
          output_quality: 95,
          num_inference_steps: 35,
          guidance: 3.5, // Higher guidance = follows prompt more closely
          go_fast: false,
        }
      }
    )

    if (!imageOutput || !Array.isArray(imageOutput) || imageOutput.length === 0) {
      throw new Error('Failed to generate initial image for video')
    }

    const initialImageUrl = imageOutput[0]
    console.log('Initial image generated:', initialImageUrl)

    // Step 2: Convert image to video using Stable Video Diffusion
    console.log('Step 2: Converting image to video...')
    const videoFrames = durationMap[settings?.duration || '16'] || '14_frames_with_svd'
    
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion-img2vid-xt:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          cond_aug: 0.02,
          decoding_t: 7,
          input_image: initialImageUrl, // Use the generated image
          video_length: videoFrames,
          sizing_strategy: "maintain_aspect_ratio",
          motion_bucket_id: 127,
          frames_per_second: 8, // Increased FPS for smoother video
        }
      }
    )

    console.log('Replicate output:', output)

    return NextResponse.json({
      success: true,
      prompt: prompt,
      videoUrl: output, // Replicate returns the video URL
      initialImageUrl: initialImageUrl, // Also return the initial frame
      settings: settings,
      duration: settings?.duration || '16',
      timestamp: new Date().toISOString(),
      message: 'Video generated successfully'
    })

  } catch (error: any) {
    console.error('Replicate API Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
