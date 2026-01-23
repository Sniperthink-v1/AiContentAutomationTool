import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function DELETE(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { songId } = await request.json()

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      )
    }

    // Delete song from database
    await client.query(
      'DELETE FROM saved_songs WHERE id = $1 AND user_id = $2',
      [songId, user.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Song deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete song error:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete song', message: error.message },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
