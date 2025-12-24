import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { MessageSquare, Mail, User as UserIcon, MapPin, Clock, Award, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RequestMeetingDialog from "@/components/RequestMeetingDialog";

interface InstructorProfile {
  id: string;
  title: string;
  officeLocation: string | null;
  officeHours: string | null;
  awards: { title: string; year?: number; description?: string }[] | null;
  department: { id: string; name: string } | null;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: { name: string } | string;
  profileImage?: string;
  instructorProfile?: InstructorProfile | null;
}

const FacultyDirectory = () => {
  const [faculty, setFaculty] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessor, setSelectedProfessor] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/faculty');
      setFaculty(response.data);
    } catch (error) {
      console.error("Failed to fetch faculty", error);
      toast({
        title: "Error",
        description: "Failed to load faculty directory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/student/messages?recipientId=${userId}`);
  };

  const handleRequestMeeting = (userId: string, userName: string) => {
    setSelectedProfessor({ id: userId, name: userName });
  };

  const handleCloseMeetingDialog = () => {
    setSelectedProfessor(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'instructor': return 'default';
      case 'ta': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar links={STUDENT_LINKS} />
      <main className="flex-grow p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Faculty Directory</h1>
            <p className="text-muted-foreground mt-2">
              Connect with your instructors and teaching assistants.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : faculty.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
              <UserIcon className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <h3 className="text-lg font-medium">No faculty members found</h3>
              <p>Check back later or contact administration.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {faculty.map((user) => {
                const roleName = typeof user.role === 'string' ? user.role : (user.role as { name: string })?.name;
                const profile = user.instructorProfile;
                return (
                  <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <CardHeader className="flex flex-row items-center gap-4 pb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImage} alt={user.fullName} />
                        <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <CardTitle className="text-lg truncate">{user.fullName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={getRoleBadgeVariant(roleName)} className="text-xs uppercase">
                            {roleName}
                          </Badge>
                          {profile?.title && (
                            <span className="text-xs text-muted-foreground">{profile.title}</span>
                          )}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 flex-grow space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {profile?.department && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Award className="mr-2 h-4 w-4 shrink-0" />
                          <span>{profile.department.name}</span>
                        </div>
                      )}
                      {profile?.officeLocation && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-2 h-4 w-4 shrink-0" />
                          <span>{profile.officeLocation}</span>
                        </div>
                      )}
                      {profile?.officeHours && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4 shrink-0" />
                          <span>{profile.officeHours}</span>
                        </div>
                      )}
                      {profile?.awards && profile.awards.length > 0 && (
                        <div className="pt-2 border-t mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Awards:</p>
                          <div className="flex flex-wrap gap-1">
                            {profile.awards.slice(0, 3).map((award, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {award.title} {award.year && `(${award.year})`}
                              </Badge>
                            ))}
                            {profile.awards.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{profile.awards.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-4 pt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRequestMeeting(user.id, user.fullName)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Request Meeting
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleMessage(user.id)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Start Chat
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Meeting Request Dialog */}
      {selectedProfessor && (
        <RequestMeetingDialog
          isOpen={true}
          onClose={handleCloseMeetingDialog}
          professorId={selectedProfessor.id}
          professorName={selectedProfessor.name}
        />
      )}
    </div>
  );
};

export default FacultyDirectory;
