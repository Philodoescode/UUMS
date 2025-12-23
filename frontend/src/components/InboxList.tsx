import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  recipientId: string;
  participant: {
    id: string;
    fullName: string;
    email: string;
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
}

interface InboxListProps {
  selectedUserId?: string | null;
  onSelectConversation: (userId: string) => void;
}

const InboxList = ({ selectedUserId, onSelectConversation }: InboxListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const response = await api.get("/messages/inbox");
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch inbox", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh inbox when a new message might have been sent
  const refreshInbox = () => {
    fetchInbox();
  };

  // Expose refresh method via a custom event
  useEffect(() => {
    const handleRefresh = () => refreshInbox();
    window.addEventListener("refreshInbox", handleRefresh);
    return () => window.removeEventListener("refreshInbox", handleRefresh);
  }, []);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const truncateMessage = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start a chat from the Faculty Directory</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((convo) => {
        const isSelected = selectedUserId === convo.participant.id;
        return (
          <button
            key={convo.participant.id}
            onClick={() => onSelectConversation(convo.participant.id)}
            className={`w-full p-3 rounded-lg flex items-start gap-3 text-left transition-colors hover:bg-secondary/50 ${
              isSelected ? "bg-secondary ring-1 ring-ring" : ""
            }`}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback>
                {convo.participant.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">
                  {convo.participant.fullName}
                </span>
                {convo.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0 h-5 min-w-5 flex items-center justify-center">
                    {convo.unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {convo.lastMessage.isFromMe && (
                  <span className="text-muted-foreground/70">You: </span>
                )}
                {truncateMessage(convo.lastMessage.body)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {formatTime(convo.lastMessage.createdAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default InboxList;
