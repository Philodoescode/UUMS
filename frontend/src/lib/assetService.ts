import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===== Types =====

export interface User {
    id: string;
    fullName: string;
    email: string;
}

export interface AssetAllocationLog {
    id: string;
    assetId: string;
    userId: string;
    action: 'checked_out' | 'returned';
    performedById: string;
    notes?: string;
    createdAt: string;
    user?: User;
    performedBy?: User;
}

export interface Asset {
    id: string;
    name: string;
    assetTag: string;
    category: 'equipment' | 'furniture' | 'electronics' | 'other';
    status: 'available' | 'checked_out' | 'maintenance' | 'retired';
    currentHolderId?: string;
    location?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    currentHolder?: User;
    allocationHistory?: AssetAllocationLog[];
}

export interface CreateAssetData {
    name: string;
    assetTag: string;
    category?: 'equipment' | 'furniture' | 'electronics' | 'other';
    location?: string;
    description?: string;
}

export interface UpdateAssetData {
    name?: string;
    assetTag?: string;
    category?: 'equipment' | 'furniture' | 'electronics' | 'other';
    status?: 'available' | 'checked_out' | 'maintenance' | 'retired';
    location?: string;
    description?: string;
}

// ===== API Functions =====

export const getAllAssets = async (params?: { status?: string; category?: string }): Promise<Asset[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/assets`, {
        params,
        withCredentials: true,
    });
    return response.data;
};

export const getAssetById = async (id: string): Promise<Asset> => {
    const response = await axios.get(`${API_BASE_URL}/api/assets/${id}`, {
        withCredentials: true,
    });
    return response.data;
};

export const createAsset = async (data: CreateAssetData): Promise<Asset> => {
    const response = await axios.post(`${API_BASE_URL}/api/assets`, data, {
        withCredentials: true,
    });
    return response.data;
};

export const updateAsset = async (id: string, data: UpdateAssetData): Promise<Asset> => {
    const response = await axios.put(`${API_BASE_URL}/api/assets/${id}`, data, {
        withCredentials: true,
    });
    return response.data;
};

export const deleteAsset = async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/assets/${id}`, {
        withCredentials: true,
    });
};

export const checkoutAsset = async (id: string, userId: string, notes?: string): Promise<Asset> => {
    const response = await axios.post(
        `${API_BASE_URL}/api/assets/${id}/checkout`,
        { userId, notes },
        { withCredentials: true }
    );
    return response.data.asset;
};

export const returnAsset = async (id: string, notes?: string): Promise<Asset> => {
    const response = await axios.post(
        `${API_BASE_URL}/api/assets/${id}/return`,
        { notes },
        { withCredentials: true }
    );
    return response.data.asset;
};
