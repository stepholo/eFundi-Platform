import api from './client'

// Decode a JWT payload without verifying signature (client-side only)
export function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export const authApi = {
  login: (data) => api.post('/accounts/login/', data),
  register: (data) => api.post('/accounts/register/', data),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
  getUser: (userId) => api.get(`/accounts/users/${userId}/`),
  updateUser: (userId, data) => api.patch(`/accounts/users/${userId}/`, data),
  forgotPassword: (email) => api.post('/accounts/reset-password/', { email }),
  verifyEmail: (uid, token) => api.get(`/accounts/verify-email/?uid=${uid}&token=${token}`),
  resendVerification: (email) => api.post('/accounts/reset-password/', { email }),
  technicianStats: () => api.get('/accounts/technician-stats/'),
}
