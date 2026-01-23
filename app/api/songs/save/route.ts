import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { songId, title, audioUrl, imageUrl, duration, tags, modelName, prompt } = await request.json()

    if (!songId || !title || !audioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save song to database (including prompt)
    await client.query(
      `INSERT INTO saved_songs (id, user_id, title, audio_url, image_url, duration, tags, model_name, prompt, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id, user_id) DO UPDATE 
       SET title = $3, audio_url = $4, image_url = $5, duration = $6, tags = $7, model_name = $8, prompt = $9`,
      [songId, user.id, title, audioUrl, imageUrl || '', duration || 0, tags || '', modelName || '', prompt || '']
    )

    return NextResponse.json({
      success: true,
      message: 'Song saved successfully'
    })

  } catch (error: any) {
    console.error('Save song error:', error)
    
    return NextResponse.json(
      { error: 'Failed to save song', message: error.message },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
