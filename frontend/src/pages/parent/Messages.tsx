import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { PARENT_LINKS } from "@/config/navLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Send, ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import InboxList from "@/components/InboxList";
import { parseSimpleMarkdown } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Message {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
    sender: { fullName: string };
    recipientId: string;
}

interface User {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
}

const Messages = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // const navigate = useNavigate(); // Unused
    const recipientId = searchParams.get('recipientId');
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // State
    const [activeRecipient, setActiveRecipient] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [authorizedTeachers, setAuthorizedTeachers] = useState<User[]>([]);
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load - Fetch Teachers
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await api.get('/parent/teachers');
                setAuthorizedTeachers(res.data);
            } catch (err) {
                console.error("Failed to fetch authorized teachers", err);
            }
        };
        fetchTeachers();
    }, []);

    // Handle selecting a conversation from the inbox
    const handleSelectConversation = (userId: string) => {
        setSearchParams({ recipientId: userId });
        // The effect below will handle fetching details
    };

    // Handle selecting from "New Message" dialog
    const handleNewMessageSelection = (teacherId: string) => {
        const teacher = authorizedTeachers.find(t => t.id === teacherId);
        if (teacher) {
            // Check if we are already chatting with this teacher
            handleSelectConversation(teacherId);
            setIsNewMessageOpen(false);
        }
    };

    // Handle going back to inbox view
    const handleBackToInbox = () => {
        setSearchParams({});
        setActiveRecipient(null);
        setMessages([]);
    };

    // Initial Load - If recipientId is present
    useEffect(() => {
        if (recipientId) {
            fetchRecipientDetails(recipientId);
        } else {
            setActiveRecipient(null);
        }
    }, [recipientId]);

    // Fetch messages when activeRecipient changes
    useEffect(() => {
        if (activeRecipient) {
            fetchMessages(activeRecipient.id);
        }
    }, [activeRecipient]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchRecipientDetails = async (id: string) => {
        try {
            // First check if it's in our authorized list
            let teacher = authorizedTeachers.find(t => t.id === id);

            // If not found (maybe loaded before teachers, or loading existing convo from history that might not be in "current" list), fetch from users?
            // Parents should only message authorized teachers, but for viewing history we might need to be lenient if teacher assignment changed?
            // DirectMessageController allows reading history freely.
            if (!teacher) {
                const response = await api.get(`/users/${id}`);
                teacher = response.data;
            }

            if (teacher) {
                setActiveRecipient(teacher);
            }
        } catch (error) {
            console.error("Failed to fetch user", error);
            toast({ title: "Error", description: "User not found", variant: "destructive" });
        }
    };

    const fetchMessages = async (otherUserId: string) => {
        setLoadingMessages(true);
        try {
            const response = await api.get(`/messages/${otherUserId}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeRecipient) return;

        try {
            const response = await api.post('/messages', {
                recipientId: activeRecipient.id,
                body: inputText
            });

            setMessages([...messages, response.data]);
            setInputText("");
            // Trigger inbox refresh
            window.dispatchEvent(new Event("refreshInbox"));
        } catch (error: any) {
            console.error("Failed to send message", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send message",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <Navbar links={PARENT_LINKS} />
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Inbox List */}
                <div className="w-72 border-r bg-muted/20 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            <h2 className="font-semibold text-lg">Messages</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <InboxList
                            selectedUserId={activeRecipient?.id}
                            onSelectConversation={handleSelectConversation}
                        />
                    </div>
                    <div className="p-3 border-t">
                        <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full">
                                    <Plus className="h-4 w-4 mr-2" /> New Message
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Select Teacher</DialogTitle></DialogHeader>
                                <div className="py-4">
                                    <Label className="mb-2 block">To:</Label>
                                    <Select onValueChange={handleNewMessageSelection}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a teacher..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {authorizedTeachers.length > 0 ? (
                                                authorizedTeachers.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-muted-foreground">No authorized teachers found.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {activeRecipient ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 border-b flex items-center px-4 bg-card/50">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 md:hidden"
                                    onClick={handleBackToInbox}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-9 w-9 mr-3">
                                    <AvatarImage src={activeRecipient.profileImage} />
                                    <AvatarFallback>{activeRecipient.fullName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold leading-none truncate">{activeRecipient.fullName}</h3>
                                    <span className="text-xs text-muted-foreground truncate block">{activeRecipient.email}</span>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                                {loadingMessages ? (
                                    <div className="flex justify-center p-4">Loading messages...</div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.senderId === currentUser?._id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-lg p-3 ${isMe
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-muted rounded-tl-none'
                                                    }`}>
                                                    <p dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(msg.body) }} />
                                                    <span className={`text-[10px] opacity-70 block mt-1 text-right ${isMe ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t bg-background">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type a secure message..."
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={!inputText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Secure Parent-Teacher Messaging</p>
                            <p className="text-sm mt-1 max-w-md text-center">
                                Select a teacher to discuss specific concerns directly and confidentially.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
