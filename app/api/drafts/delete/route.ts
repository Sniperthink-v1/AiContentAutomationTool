import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get draft ID from URL query params
    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get('id')

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      )
    }

    // Delete draft from database - only if owned by user
    const result = await query(
      'DELETE FROM drafts WHERE id = $1 AND user_id = $2 RETURNING id',
      [draftId, user.id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Draft not found or not authorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    })

  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
