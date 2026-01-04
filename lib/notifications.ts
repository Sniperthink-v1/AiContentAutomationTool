import pool from './db'

export type NotificationType = 'video' | 'photo' | 'music' | 'credits' | 'feature' | 'info' | 'success' | 'warning' | 'error'

interface NotificationParams {
  userId: string  // UUID
  title: string
  message: string
  type: NotificationType
  link?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification for a user
 * Use this helper from any API route to send notifications
 * 
 * @example
 * // When video is generated
 * await sendNotification({
 *   userId: user.id,
 *   title: 'Video Generated',
 *   message: 'Your AI video is ready to view!',
 *   type: 'video',
 *   link: '/dashboard/my-media',
 *   metadata: { videoId: 123 }
 * })
 * 
 * // When credits are low
 * await sendNotification({
 *   userId: user.id,
 *   title: 'Credits Low',
 *   message: 'You have 50 credits remaining',
 *   type: 'credits'
 * })
 */
export async function sendNotification(params: NotificationParams): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.userId,
        params.title,
        params.message,
        params.type,
        params.link || null,
        params.metadata ? JSON.stringify(params.metadata) : null
      ]
    )
    return true
  } catch (error) {
    console.error('Failed to send notification:', error)
    return false
  }
}

/**
 * Send a video generation complete notification
 */
export async function notifyVideoGenerated(userId: string, videoName?: string) {
  return sendNotification({
    userId,
    title: 'Video Generated',
    message: videoName ? `Your video "${videoName}" is ready!` : 'Your AI video is ready to view!',
    type: 'video',
    link: '/dashboard/my-media'
  })
}

/**
 * Send a photo generation complete notification
 */
export async function notifyPhotoGenerated(userId: string, photoName?: string) {
  return sendNotification({
    userId,
    title: 'Photo Generated',
    message: photoName ? `Your photo "${photoName}" is ready!` : 'Your AI photo is ready to view!',
    type: 'photo',
    link: '/dashboard/my-media'
  })
}

/**
 * Send a music generation complete notification
 */
export async function notifyMusicGenerated(userId: string, songName?: string) {
  return sendNotification({
    userId,
    title: 'Music Generated',
    message: songName ? `Your song "${songName}" is ready!` : 'Your AI music is ready to listen!',
    type: 'music',
    link: '/dashboard/my-songs'
  })
}

/**
 * Send a low credits warning notification
 */
export async function notifyLowCredits(userId: string, remainingCredits: number) {
  return sendNotification({
    userId,
    title: 'Credits Low',
    message: `You have ${remainingCredits} credits remaining. Consider adding more credits.`,
    type: 'credits',
    link: '/dashboard/settings'
  })
}

/**
 * Send a welcome notification for new users
 */
export async function notifyWelcome(userId: string, userName?: string) {
  return sendNotification({
    userId,
    title: 'Welcome to SniperThinkAI!',
    message: userName ? `Hi ${userName}! Start creating amazing AI content today.` : 'Start creating amazing AI content today!',
    type: 'feature',
    link: '/dashboard'
  })
}
