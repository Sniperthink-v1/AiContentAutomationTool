export interface VideoSettings {
  style: string
  duration: number
  cameraStyle?: string
  cameraDirection?: string
  pacing?: string
  specialEffects?: string
  promptLength?: string
  customElements?: string
}

export interface Draft {
  id: string
  userId?: string
  originalPrompt: string
  enhancedScript: string
  videoUrl?: string
  thumbnailUrl?: string
  settings: VideoSettings | any
  status: 'generating' | 'ready' | 'draft' | 'scheduled' | 'posted' | 'failed'
  scheduledDate?: string | Date
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface CreateDraftRequest {
  originalPrompt: string
  enhancedScript: string
  videoUrl?: string
  thumbnailUrl?: string
  settings: VideoSettings
  status?: 'generating' | 'ready'
}

export interface UpdateDraftRequest {
  id: string
  videoUrl?: string
  thumbnailUrl?: string
  status?: Draft['status']
  scheduledDate?: Date
}
