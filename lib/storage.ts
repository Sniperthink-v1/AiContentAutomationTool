import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Upload buffer to Cloudflare R2
 * @param buffer - File buffer to upload
 * @param key - File path/key in bucket (e.g., 'images/photo.jpg')
 * @param contentType - MIME type (e.g., 'image/jpeg')
 * @returns Upload result with public URL
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET_NAME || 'instap'
    const publicUrl = process.env.R2_PUBLIC_URL || 'https://3c946c1874c456b1fdef2a60890675a5.r2.cloudflarestorage.com'

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return { 
        success: false, 
        error: 'R2 credentials not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local' 
      }
    }

    // Create R2 client with credentials
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await r2Client.send(command)

    // Return public URL
    const fileUrl = `${publicUrl}/${key}`
    console.log('✅ R2 upload successful:', { key, url: fileUrl })
    
    return { success: true, url: fileUrl }
  } catch (err: any) {
    console.error('❌ R2 upload failed:', err)
    return { success: false, error: err.message || String(err) }
  }
}

const storage = {
  uploadToR2
}

export default storage
