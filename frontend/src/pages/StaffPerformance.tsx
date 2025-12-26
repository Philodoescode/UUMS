import { useEffect, useState } from 'react';
import api from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Award, BookOpen, GraduationCap, TrendingUp, FileText, Calendar, ExternalLink } from 'lucide-react';

interface Evaluation {
    id: string;
    rating: number;
    comments: string;
    semester: string;
    year: number;
    course: {
        courseCode: string;
        name: string;
    };
}

interface ProfessionalDevelopment {
    id: string;
    title: string;
    type: string;
    provider: string;
    completionDate: string;
    expiryDate?: string;
    credentialUrl?: string;
}

interface Research {
    id: string;
    title: string;
    abstract: string;
    publicationDate: string;
    journalConferenceName: string;
    link: string;
    status: string;
}

interface PerformanceData {
    evaluations: Evaluation[];
    professionalDevelopment: ProfessionalDevelopment[];
    research: Research[];
}

const StaffPerformance = () => {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/instructor-portal/performance');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch performance data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!data) return null;

    // Process data for chart
    // Group by Semester-Year and calculate average
    const chartData = Object.values(data.evaluations.reduce((acc: any, curr) => {
        const key = `${curr.semester} ${curr.year}`;
        if (!acc[key]) {
            acc[key] = { name: key, total: 0, count: 0, average: 0 };
        }
        acc[key].total += curr.rating;
        acc[key].count += 1;
        acc[key].average = Number((acc[key].total / acc[key].count).toFixed(2));
        return acc;
    }, {})).sort((a: any, b: any) => {
        // Custom sort logic or just rely on order if data is sorted from backend
        // Backend sorts by year DESC, semester DESC. We might want chronological for chart.
        return 0;
    }).reverse() as any[];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Staff Performance & Research
                </h1>
                <p className="text-gray-500 text-lg">
                    Track your teaching impact, professional growth, and research contributions.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 backdrop-blur-sm border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg. Evaluation Score</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {data.evaluations.length > 0
                                    ? (data.evaluations.reduce((acc, curr) => acc + curr.rating, 0) / data.evaluations.length).toFixed(1)
                                    : 'N/A'}
                                <span className="text-sm text-gray-400 font-normal ml-1">/ 5.0</span>
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white/50 backdrop-blur-sm border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                            <Award size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">PD Activities</p>
                            <h3 className="text-2xl font-bold text-gray-900">{data.professionalDevelopment.length}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white/50 backdrop-blur-sm border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Research Papers</p>
                            <h3 className="text-2xl font-bold text-gray-900">{data.research.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Teaching Evaluations Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-800">Teaching Evaluations</h2>
                        <div className="h-px flex-1 bg-gray-200"></div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-80">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Performance Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis domain={[0, 5]} stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="average"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    dot={{ r: 4, stroke: '#4f46e5', strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 0, fill: '#4f46e5' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        {chartData.length === 0 && <p className="text-center text-gray-400 mt-[-150px]">No data available</p>}
                    </div>

                    {/* Recent Comments */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Student Feedback</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {data.evaluations.map((evaluation) => (
                                <div key={evaluation.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-semibold text-gray-800">{evaluation.course.courseCode}</span>
                                            <span className="text-gray-500 text-sm ml-2">{evaluation.semester} {evaluation.year}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg text-sm font-bold shadow-sm">
                                            <span className={evaluation.rating >= 4 ? "text-green-500" : evaluation.rating >= 3 ? "text-yellow-500" : "text-red-500"}>
                                                {evaluation.rating}
                                            </span>
                                            <span className="text-gray-300">/5</span>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">"{evaluation.comments}"</p>
                                </div>
                            ))}
                            {data.evaluations.length === 0 && <p className="text-gray-400 italic">No feedback received yet.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: PD & Research */}
                <div className="space-y-8">

                    {/* Professional Development */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-800">Professional Development</h2>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                            <div className="space-y-4">
                                {data.professionalDevelopment.map((pd) => (
                                    <div key={pd.id} className="flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded-lg">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                                            {pd.type === 'Certification' ? <Award size={20} /> : <GraduationCap size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-gray-800">{pd.title}</h4>
                                                <span className="text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded-full">{pd.completionDate}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{pd.provider}</p>
                                            {pd.credentialUrl && (
                                                <a href={pd.credentialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium mt-2 hover:underline">
                                                    View Credential <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {data.professionalDevelopment.length === 0 && <p className="text-gray-400 italic text-center py-4">No professional development records found.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Research */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-800">Research & Publications</h2>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                            <div className="space-y-6">
                                {data.research.map((paper) => (
                                    <div key={paper.id} className="relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="pl-4">
                                            <h4 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                <a href={paper.link} target="_blank" rel="noopener noreferrer">{paper.title}</a>
                                            </h4>
                                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <BookOpen size={14} /> {paper.journalConferenceName}
                                                </span>
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <Calendar size={14} /> {paper.publicationDate}
                                                </span>
                                            </div>
                                            {paper.abstract && (
                                                <p className="text-sm text-gray-600 mt-3 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                                                    {paper.abstract}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {data.research.length === 0 && <p className="text-gray-400 italic text-center py-4">No approved research publications found.</p>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StaffPerformance;
