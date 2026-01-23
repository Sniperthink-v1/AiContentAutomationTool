import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// GET - List user's video editor projects
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (projectId) {
      // Get specific project
      const result = await pool.query(
        `SELECT id, name, settings, video_clips, audio_clips, text_overlays,
                thumbnail_url, duration, created_at, updated_at
         FROM video_editor_projects
         WHERE id = $1 AND user_id = $2`,
        [projectId, user.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        project: result.rows[0]
      })
    }

    // List all projects
    try {
      const result = await pool.query(
        `SELECT id, name, settings, thumbnail_url, duration, created_at, updated_at
         FROM video_editor_projects
         WHERE user_id = $1 AND is_auto_save = FALSE
         ORDER BY updated_at DESC
         LIMIT 50`,
        [user.id]
      )

      return NextResponse.json({
        success: true,
        projects: result.rows || []
      })
    } catch (e) {
      return NextResponse.json({
        success: true,
        projects: []
      })
    }
  } catch (error: any) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Create or update a video editor project
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id, 
      name, 
      settings, 
      videoClips, 
      audioClips, 
      textOverlays, 
      thumbnailUrl,
      duration,
      isAutoSave = false 
    } = body

    if (!name || !settings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project name and settings are required' 
      }, { status: 400 })
    }

    if (id) {
      // Update existing project
      const result = await pool.query(
        `UPDATE video_editor_projects
         SET name = $1, settings = $2, video_clips = $3, audio_clips = $4,
             text_overlays = $5, thumbnail_url = $6, duration = $7,
             is_auto_save = $8, updated_at = NOW()
         WHERE id = $9 AND user_id = $10
         RETURNING id`,
        [
          name,
          JSON.stringify(settings),
          JSON.stringify(videoClips || []),
          JSON.stringify(audioClips || []),
          JSON.stringify(textOverlays || []),
          thumbnailUrl || null,
          duration || 0,
          isAutoSave,
          id,
          user.id
        ]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        projectId: id,
        message: 'Project updated successfully'
      })
    } else {
      // Create new project
      const result = await pool.query(
        `INSERT INTO video_editor_projects 
         (user_id, name, settings, video_clips, audio_clips, text_overlays,
          thumbnail_url, duration, is_auto_save)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          user.id,
          name,
          JSON.stringify(settings),
          JSON.stringify(videoClips || []),
          JSON.stringify(audioClips || []),
          JSON.stringify(textOverlays || []),
          thumbnailUrl || null,
          duration || 0,
          isAutoSave
        ]
      )

      return NextResponse.json({
        success: true,
        projectId: result.rows[0].id,
        message: 'Project created successfully'
      })
    }
  } catch (error: any) {
    console.error('Error saving project:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a video editor project
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 })
    }

    const result = await pool.query(
      `DELETE FROM video_editor_projects
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [projectId, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
