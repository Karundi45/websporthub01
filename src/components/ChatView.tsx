import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User, Users, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function ChatView() {
  const location = useLocation();
  const navigate = useNavigate();
  // State from navigation: { recipientId: string, isGroup: boolean, name: string }
  const state = location.state as { recipientId?: string, isGroup?: boolean, name?: string } | null;

  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Realtime channel
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session || !state?.recipientId) return;

    const fetchMessages = async () => {
      if (state.isGroup) {
        const { data, error } = await supabase
          .from('GroupMessage')
          .select('*, sender:User(*)')
          .eq('groupId', state.recipientId)
          .order('time', { ascending: true });
        if (data) setMessages(data);
      } else {
        const { data, error } = await supabase
          .from('Message')
          .select('*, sender:User(*)')
          .or(`and(senderId.eq.${session.user.id},receiverId.eq.${state.recipientId}),and(senderId.eq.${state.recipientId},receiverId.eq.${session.user.id})`)
          .order('time', { ascending: true });
        if (data) setMessages(data);
      }
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    };

    fetchMessages();

    // Setup Realtime
    const roomName = state.isGroup ? `group_${state.recipientId}` : `dm_${[session.user.id, state.recipientId].sort().join('_')}`;
    const newChannel = supabase.channel(roomName, {
      config: { presence: { key: session.user.id } }
    });

    newChannel.on('broadcast', { event: 'typing' }, payload => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (payload.payload.isTyping) next.add(payload.payload.userId);
        else next.delete(payload.payload.userId);
        return next;
      });
    });

    if (state.isGroup) {
      newChannel.on('postgres', { event: 'INSERT', schema: 'public', table: 'GroupMessage', filter: `groupId=eq.${state.recipientId}` }, async (payload) => {
        const { data: sender } = await supabase.from('User').select('*').eq('id', payload.new.senderId).single();
        setMessages(prev => [...prev, { ...payload.new, sender }]);
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      });
    } else {
      newChannel.on('postgres', { event: 'INSERT', schema: 'public', table: 'Message' }, async (payload) => {
        const msg = payload.new;
        if ((msg.senderId === session.user.id && msg.receiverId === state.recipientId) ||
            (msg.senderId === state.recipientId && msg.receiverId === session.user.id)) {
          const { data: sender } = await supabase.from('User').select('*').eq('id', msg.senderId).single();
          setMessages(prev => [...prev, { ...msg, sender }]);
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 100);
        }
      });
    }

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        newChannel.track({ user_id: session.user.id });
      }
    });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [session, state?.recipientId, state?.isGroup]);

  const handleSend = async () => {
    if (!inputText.trim() || !session || !state?.recipientId) return;

    const text = inputText.trim();
    setInputText("");
    
    // Stop typing
    if (channel) {
      channel.send({ type: 'broadcast', event: 'typing', payload: { userId: session.user.id, isTyping: false } });
    }

    if (state.isGroup) {
      await supabase.from('GroupMessage').insert({
        groupId: state.recipientId,
        senderId: session.user.id,
        text: text
      });
    } else {
      await supabase.from('Message').insert({
        senderId: session.user.id,
        receiverId: state.recipientId,
        text: text,
        readBy: [session.user.id]
      });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (channel && session) {
      channel.send({ type: 'broadcast', event: 'typing', payload: { userId: session.user.id, isTyping: e.target.value.length > 0 } });
    }
  };

  if (!state?.recipientId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <MessageSquare className="w-12 h-12 text-brand-accent mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Chat Selected</h2>
        <p className="text-brand-text-secondary mb-6">Select a friend or group to start chatting.</p>
        <button onClick={() => navigate('/explore')} className="px-6 py-2 bg-brand-accent text-white rounded-md font-semibold">
          Find Friends
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#12141A]">
      {/* Header */}
      <div className="h-16 shrink-0 bg-[#1A1C23] border-b border-brand-border flex items-center px-4 gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#2A2D3A] rounded-full transition-colors text-brand-text-secondary hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-[#2A2D3A] flex items-center justify-center text-brand-accent">
          {state.isGroup ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white">{state.name || "Chat"}</h2>
          <p className="text-xs text-brand-text-secondary">{state.isGroup ? "Group Chat" : "Direct Message"}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === session?.user?.id;
          return (
            <div key={msg.id || idx} className={cn("flex flex-col max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
              {!isMine && state.isGroup && (
                <span className="text-[10px] text-brand-text-secondary ml-1 mb-1">{msg.sender?.name || "User"}</span>
              )}
              <div className={cn(
                "px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-[15px]",
                isMine ? "bg-brand-accent text-white rounded-br-sm" : "bg-[#2A2D3A] text-brand-text-primary rounded-bl-sm"
              )}>
                {msg.text}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-[10px] text-brand-text-secondary">
                  {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMine && !state.isGroup && (
                  <CheckCheck className={cn("w-3 h-3", (msg.readBy || []).includes(state.recipientId) ? "text-brand-accent" : "text-brand-text-secondary")} />
                )}
              </div>
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-brand-text-secondary text-xs italic ml-2">
            <div className="flex gap-1">
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
              <span className="animate-bounce delay-300">.</span>
            </div>
            Someone is typing
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#1A1C23] border-t border-brand-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-[#2A2D3A] border-none rounded-full px-4 py-3 text-[15px] focus:ring-1 focus:ring-brand-accent placeholder-brand-text-secondary"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 rounded-full bg-brand-accent text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-accent-hover transition-colors"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
