import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Send, User as UserIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

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
    const [searchParams] = useSearchParams();
    const recipientId = searchParams.get('recipientId');
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // State
    const [activeRecipient, setActiveRecipient] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    // We would usually fetch a list of conversations here, but for MVP we might just rely on the active one
    // or fetch recent contacts. For now, let's focus on the active chat.

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load - If recipientId is present
    useEffect(() => {
        if (recipientId) {
            fetchRecipientDetails(recipientId);
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
            // Use direct user lookup endpoint - accessible to all authenticated users
            const response = await api.get(`/users/${id}`);
            setActiveRecipient(response.data);
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
            // Don't show toast on 404/empty history, just empty list
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
        } catch (error) {
            console.error("Failed to send message", error);
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Navbar links={STUDENT_LINKS} />
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - simplified for MVP to just show current or 'Select a contact' */}
                <div className="w-64 border-r bg-muted/20 hidden md:block p-4">
                    <h2 className="font-semibold mb-4 text-lg">Messages</h2>
                    {activeRecipient ? (
                        <div className="p-3 bg-secondary/50 rounded-lg flex items-center gap-3 cursor-pointer ring-1 ring-ring">
                             <Avatar>
                                <AvatarImage src={activeRecipient.profileImage} />
                                <AvatarFallback>{activeRecipient.fullName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                                <p className="font-medium truncate">{activeRecipient.fullName}</p>
                                <p className="text-xs text-muted-foreground">Active</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Select a contact from the directory to start chatting.</p>
                    )}
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {activeRecipient ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 border-b flex items-center px-6 bg-card/50">
                                <Avatar className="h-8 w-8 mr-3">
                                    <AvatarImage src={activeRecipient.profileImage} />
                                    <AvatarFallback>{activeRecipient.fullName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold leading-none">{activeRecipient.fullName}</h3>
                                    <span className="text-xs text-muted-foreground">{activeRecipient.email}</span>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                                {loadingMessages ? (
                                    <div className="flex justify-center p-4">Returning messages...</div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10">
                                        No messages yet. Say hello!
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.senderId === currentUser?._id; 
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-lg p-3 ${
                                                    isMe 
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                    : 'bg-muted rounded-tl-none'
                                                }`}>
                                                    <p>{msg.body}</p>
                                                    <span className="text-[10px] opacity-70 block mt-1 text-right">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                                        placeholder="Type a message..."
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={!inputText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <UserIcon className="h-16 w-16 mb-4 opacity-20" />
                            <p>Select a user from the directory to start messaging</p>
                            <Button variant="link" onClick={() => window.location.href='/student/directory'}>
                                Go to Faculty Directory
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
