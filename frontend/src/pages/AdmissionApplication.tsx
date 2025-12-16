import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdmissionApplication() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        previousEducation: '',
        intendedMajor: '',
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        try {
            await api.post('/applications', formData);
            setStatus('success');
        } catch (error: any) {
            console.error('Submission error:', error);
            setStatus('error');
            setErrorMessage(error.response?.data?.message || 'Failed to submit application. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-green-600">Application Submitted!</CardTitle>
                        <CardDescription>
                            Thank you, {formData.name}. Your application has been received successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>We will review your details and get back to you at <strong>{formData.email}</strong> shortly.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/')}>Return to Home</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Admission Application</CardTitle>
                    <CardDescription>
                        Apply to the university online. Please fill out all fields.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="John Doe"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="intendedMajor">Intended Major (Department)</Label>
                            <Input
                                id="intendedMajor"
                                name="intendedMajor"
                                placeholder="e.g. Computer Science"
                                required
                                value={formData.intendedMajor}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="previousEducation">Previous Education History</Label>
                            <Textarea
                                id="previousEducation"
                                name="previousEducation"
                                placeholder="Please list high schools, colleges attended, dates, and degrees..."
                                required
                                className="min-h-[100px]"
                                value={formData.previousEducation}
                                onChange={handleChange}
                            />
                        </div>

                        {status === 'error' && (
                            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                                {errorMessage}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={status === 'submitting'}>
                            {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
