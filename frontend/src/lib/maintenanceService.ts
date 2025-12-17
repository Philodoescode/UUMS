import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface MaintenanceRequest {
    id: string;
    facilityId: string;
    reportedById: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    status: 'Reported' | 'In Progress' | 'Resolved';
    createdAt: string;
    updatedAt: string;
    Facility?: {
        id: string;
        name: string;
        code: string;
        building: string;
        floor: string;
    };
    reportedBy?: {
        id: string;
        fullName: string;
        email: string;
    };
}

export const createMaintenanceRequest = async (data: {
    facilityId: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
}): Promise<MaintenanceRequest> => {
    const response = await axios.post(`${API_BASE_URL}/api/maintenance`, data, {
        withCredentials: true,
    });
    return response.data;
};

export const getMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/maintenance`, {
        withCredentials: true,
    });
    return response.data;
};

export const updateMaintenanceStatus = async (
    id: string,
    status: 'Reported' | 'In Progress' | 'Resolved'
): Promise<MaintenanceRequest> => {
    const response = await axios.patch(
        `${API_BASE_URL}/api/maintenance/${id}/status`,
        { status },
        { withCredentials: true }
    );
    return response.data;
};
