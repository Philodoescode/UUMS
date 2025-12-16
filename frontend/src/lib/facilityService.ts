import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface Facility {
  id: string;
  name: string;
  code: string;
  type: 'Classroom' | 'Laboratory';
  capacity: number;
  status: 'Active' | 'Maintenance';
  description?: string;
  floor?: string;
  building?: string;
  equipmentList?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityFilters {
  page?: number;
  limit?: number;
  type?: 'Classroom' | 'Laboratory';
  status?: 'Active' | 'Maintenance';
  minCapacity?: number;
  maxCapacity?: number;
  building?: string;
  search?: string;
}

export interface PaginatedFacilities {
  facilities: Facility[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getAllFacilities = async (filters: FacilityFilters = {}): Promise<PaginatedFacilities> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await axios.get(`${API_BASE_URL}/api/facilities?${params.toString()}`, {
    withCredentials: true,
  });
  return response.data;
};

export const getFacilityById = async (id: string): Promise<Facility> => {
  const response = await axios.get(`${API_BASE_URL}/api/facilities/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const createFacility = async (data: Partial<Facility>): Promise<Facility> => {
  const response = await axios.post(`${API_BASE_URL}/api/facilities`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const updateFacility = async (id: string, data: Partial<Facility>): Promise<Facility> => {
  const response = await axios.put(`${API_BASE_URL}/api/facilities/${id}`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const deleteFacility = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/facilities/${id}`, {
    withCredentials: true,
  });
};

export const updateFacilityStatus = async (
  id: string,
  status: 'Active' | 'Maintenance'
): Promise<Facility> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/facilities/${id}/status`,
    { status },
    { withCredentials: true }
  );
  return response.data;
};
