import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all saved songs for the user
    const result = await client.query(
      `SELECT id, title, audio_url, image_url, duration, tags, model_name, created_at 
       FROM saved_songs 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    )

    const songs = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      audioUrl: row.audio_url,
      imageUrl: row.image_url,
      duration: row.duration,
      tags: row.tags,
      modelName: row.model_name,
      createdAt: row.created_at
    }))

    return NextResponse.json({
      success: true,
      songs
    })

  } catch (error: any) {
    console.error('List songs error:', error)
    
    return NextResponse.json(
      { error: 'Failed to load songs', message: error.message },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
