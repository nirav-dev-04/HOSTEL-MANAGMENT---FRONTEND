import axios from 'axios';

// Get base URL from environment or default to local Spring Boot port
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9001';

// Create Axios custom instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject Bearer Token into secure requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format error structures consistently
apiClient.interceptors.response.use(
  (response) => response.data, // Return the backend's ApiResponse wrapper directly
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject({
      status: error.response?.status || 500,
      message: message,
      errors: error.response?.data?.errors || null,
    });
  }
);

/* ==========================================
   AUTHENTICATION ENDPOINTS
   ========================================== */
export const authApi = {
  login: async (credentials) => {
    // Body: { email, password }
    return apiClient.post('/api/auth/login', credentials);
  },
  
  register: async (registrationData) => {
    // Body: { name, email, password, role, hostelBlock, roomNumber, phone }
    return apiClient.post('/api/auth/register', registrationData);
  },
  
  getMe: async () => {
    // Returns current user details via token validation
    return apiClient.get('/api/users/me');
  },
};

/* ==========================================
   COMPLAINTS LIFECYCLE ENDPOINTS
   ========================================== */
export const complaintApi = {
  // Student: Lodge a new complaint
  createComplaint: async (complaintData) => {
    // Body: { title, description, category, priority }
    return apiClient.post('/api/complaints', complaintData);
  },

  // Student: View own filed complaints
  getMyComplaints: async () => {
    return apiClient.get('/api/complaints/my');
  },

  // Student: Close their own resolved complaint
  closeComplaint: async (id) => {
    return apiClient.put(`/api/complaints/${id}/status`, { status: 'CLOSED' });
  },

  // Rector: Fetch complaints for rector's block
  getRectorComplaints: async () => {
    return apiClient.get('/api/rector/complaints');
  },

  // Rector: Update complaint status (IN_PROGRESS, RESOLVED, etc.)
  updateRectorStatus: async (id, status) => {
    return apiClient.put(`/api/rector/complaints/${id}/status`, { status });
  },

  // Rector: Log a resolution note
  addResolutionNote: async (id, resolutionNote) => {
    return apiClient.post(`/api/rector/complaints/${id}/note`, { resolutionNote });
  },

  // Student: Upload image/video attachment for a complaint
  uploadComplaintAttachment: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/complaints/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

/* ==========================================
   ADMIN & UTILITY ENDPOINTS
   ========================================== */
export const adminApi = {
  // Admin: Get all registered users (Students, Rectors, Admins)
  getAllUsers: async () => {
    return apiClient.get('/api/admin/users');
  },

  // Admin: Compile occupancy stats and complaint aggregate metrics
  getDashboardAnalytics: async () => {
    return apiClient.get('/api/admin/dashboard');
  },

  // Admin: Get all complaints across all blocks
  getAllComplaints: async () => {
    return apiClient.get('/api/admin/complaints');
  },

  // Admin: Manually assign a Rector to a Complaint
  assignRector: async (complaintId, rectorId) => {
    // Body: { complaintId, rectorId }
    return apiClient.post('/api/admin/assign-rector', { complaintId, rectorId });
  },
};

export default apiClient;
