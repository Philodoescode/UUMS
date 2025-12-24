import api from './api';

export interface Award {
    title: string;
    year?: number;
    description?: string;
}

export interface InstructorProfile {
    id: string;
    userId: string;
    departmentId: string;
    title: string;
    officeLocation: string | null;
    officeHours: string | null;
    awards: Award[];
    user: {
        id: string;
        fullName: string;
        email: string;
    };
    department: {
        id: string;
        name: string;
    };
}

export interface InstructorProfilePublic {
    id: string;
    userId: string;
    departmentId: string;
    title: string;
    officeLocation: string | null;
    officeHours: string | null;
    awards: Award[] | null;
    user: {
        id: string;
        fullName: string;
        email: string;
        role: {
            id: string;
            name: string;
        };
    };
    department: {
        id: string;
        name: string;
        code: string;
    };
    courses: Array<{
        id: string;
        courseCode: string;
        name: string;
        semester: string;
        year: number;
    }>;
}

export interface UpdateProfileData {
    officeLocation?: string;
    officeHours?: string;
    awards?: Award[];
}

export const getMyProfile = async (): Promise<InstructorProfile> => {
    const response = await api.get('/profile/self');
    return response.data;
};

export const updateMyProfile = async (data: UpdateProfileData): Promise<InstructorProfile> => {
    const response = await api.patch('/profile/self', data);
    return response.data;
};

export const getInstructorProfile = async (id: string): Promise<InstructorProfilePublic> => {
    const response = await api.get(`/profile/${id}`);
    return response.data;
};

