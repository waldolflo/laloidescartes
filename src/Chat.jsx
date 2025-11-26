import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Smile, SendHorizonal, Edit3, Trash2, Check, X } from "lucide-react";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionList, setMentionList] = useState([]);

  const typingRef = useRef(null);
  const endRef = useRef(null);

  // Auto scroll
  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Load messages
  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  // Load users list for @mentions and avatars
  const loadUsers = async () => {
    const { data } = await supabase
      .from("profils")
      .select("id, nom, couverture_url");

    if (data) setUsersList(data);
  };

  // Real-time
  useEffect(() => {
    loadMessages();
    loadUsers();

    const sub = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== payload.old.id)
          );
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { name } = payload;
        if (name === user.nom) return;

        setTypingUsers((prev) =>
          prev.includes(name) ? prev : [...prev, name]
        );

        clearTimeout(typingRef.current);
        typingRef.current = setTimeout(() => {
          setTypingUsers([]);
        }, 1500);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  // Send typing
  const sendTyping = () => {
    supabase.channel("chat-room").send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    await supabase.from("chat").insert({
      user_id: user.id,
      user_name: user.nom,
      content: text,
    });

    setInput("");
    setMentionList([]);
  };

  // Reactions
  const addReaction = async (msgId, emoji) => {
    await supabase.rpc("append_reaction", {
      message_id: msgId,
      reaction: emoji,
    });
  };

  // Editing
  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = async () => {
    await supabase.from("chat").update({ content: editText }).eq("id", editingId);
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Delete
  const deleteMessage = async (id) => {
    await supabase.from("chat").delete().eq("id", id);
  };

  // Format date
  const formatDate = (ts) => {
    return new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Mentions suggestion
  const detectMention = (text) => {
    const match = text.match(/@(\w*)$/);
    if (!match) return setMentionList([]);

    const search = match[1].toLowerCase();
    if (search.length === 0) return setMentionList([]);

    setMentionList(
      usersList.filter((u) => u.nom.toLowerCase().includes(search))
    );
  };

  // Insert mention
  const applyMention = (nom) => {
    setInput((prev) => prev.replace(/@\w*$/, `@${nom} `));
    setMentionList([]);
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-3xl mx-auto p-4">

      <h1 className="text-2xl font-bold mb-3">💬 Chat du Club</h1>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto bg-white p-3 rounded-lg shadow-inner space-y-3 border">
        {messages.map((m) => {
          const profil = usersList.find((u) => u.id === m.user_id);

          return (
            <div key={m.id} className={`flex gap-2 ${m.user_id === user.id ? "flex-row-reverse text-right" : ""}`}>

              {/* Avatar */}
              <img
                src={profil?.couverture_url || "/default.jpg"}
                className="w-10 h-10 rounded-lg object-cover"
              />

              <div className="flex flex-col max-w-[75%]">

                {/* Bubble */}
                <div
                  className={`px-3 py-2 rounded-lg ${
                    m.user_id === user.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <div className="text-xs opacity-70">{m.user_name}</div>

                  {editingId === m.id ? (
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 text-black rounded mt-1"
                    />
                  ) : (
                    <div className="mt-1">{m.content}</div>
                  )}

                  <div className="text-[10px] opacity-70 mt-1">
                    {formatDate(m.created_at)}
                  </div>
                </div>

                {/* Edit/Delete */}
                {m.user_id === user.id && (
                  <div className="flex gap-2 mt-1 text-xs opacity-70">
                    {editingId === m.id ? (
                      <>
                        <button onClick={saveEdit} className="text-green-600">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit} className="text-red-600">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(m)}>
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => deleteMessage(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Reactions */}
                <div className="flex gap-1 mt-1">
                  {["👍", "❤️", "😂", "😮"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(m.id, emoji)}
                      className="text-xs hover:scale-125 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {m.reactions?.length > 0 && (
                  <div className="text-sm opacity-70 mt-1">
                    {m.reactions.join(" ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef}></div>
      </div>

      {/* Typing */}
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-600 mt-2">
          ✍️ {typingUsers.join(", ")} écrit...
        </div>
      )}

      {/* Mentions suggestion */}
      {mentionList.length > 0 && (
        <div className="bg-white border rounded shadow p-2 absolute bottom-20 w-64">
          {mentionList.map((u) => (
            <div
              key={u.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => applyMention(u.nom)}
            >
              @{u.nom}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex mt-3 gap-2 relative">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping();
            detectMention(e.target.value);
          }}
          placeholder="Écrire un message... @pseudo"
          className="flex-1 px-3 py-2 border rounded-lg shadow-sm"
        />

        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <SendHorizonal size={18} />
        </button>
      </div>
    </div>
  );
}
