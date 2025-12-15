export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  bio: string | null
  avatarUrl: string | null
  instagramAccessToken: string | null
  instagramUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  username?: string
  bio?: string
  avatarUrl?: string
  instagramAccessToken?: string
  instagramUserId?: string
}

export interface CreateUserRequest {
  email: string
  firstName?: string
  lastName?: string
  username?: string
  bio?: string
  avatarUrl?: string
}
