import api from './client'

export const adminApi = {
  listUsers:       (params) => api.get('/accounts/users/', { params }),
  listTechnicians: (params) => api.get('/technicians/', { params }),
  verifyTechnician:(userId) => api.patch(`/technicians/${userId}/verify/`),
  rejectTechnician:(userId) => api.patch(`/technicians/${userId}/reject/`),
  listBookings:    (params) => api.get('/bookings/', { params }),
  listPayments:    (params) => api.get('/payments/', { params }),
  listWallets:     (params) => api.get('/payments/wallets/', { params }),
  listWithdrawals: (params) => api.get('/payments/withdrawals/', { params }),
  approveWithdrawal:(id)   => api.patch(`/payments/withdrawals/${id}/approve/`),
  rejectWithdrawal: (id)   => api.patch(`/payments/withdrawals/${id}/reject/`),
}
