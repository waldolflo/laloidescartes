// src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Smile, SendHorizonal, Edit3, Trash2, Check, X } from "lucide-react";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [usersList, setUsersList] = useState([]);

  const typingRef = useRef(null);
  const endRef = useRef(null);

  // 📌 Scroll bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // 📥 Load last 100 messages
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

  // 👥 Load user list (mentions)
  const loadUsers = async () => {
    const { data } = await supabase.from("profils").select("id, nom");
    if (data) setUsersList(data);
  };

  // 🔄 Real-time listener
  useEffect(() => {
    loadMessages();
    loadUsers();

    const sub = supabase
      .channel("chat-room")

      // INSERT messages
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )

      // UPDATE messages
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )

      // DELETE messages
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== payload.old.id)
          );
        }
      )

      // Typing notification
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }) => {
          const { name } = payload;
          if (name === user.nom) return;

          setTypingUsers((prev) =>
            prev.includes(name) ? prev : [...prev, name]
          );

          clearTimeout(typingRef.current);
          typingRef.current = setTimeout(() => {
            setTypingUsers([]);
          }, 1500);
        }
      )

      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  // ✍️ Typing indicator
  const sendTyping = () => {
    supabase.channel("chat-room").send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // 🚀 Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    await supabase.from("chat").insert({
      user_id: user.id,
      user_name: user.nom,
      content: text,
    });

    setInput("");
  };

  // ✏️ Editing
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = async () => {
    await supabase.from("chat")
      .update({ content: editText })
      .eq("id", editingId);

    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // 🗑 Delete
  const deleteMessage = async (id) => {
    await supabase.from("chat").delete().eq("id", id);
  };

  // ❤️ Reaction → via RPC append_reaction
  const addReaction = async (msgId, emoji) => {
    await supabase.rpc("append_reaction", {
      message_id: msgId,
      reaction: emoji,
    });
  };

  // 🕒 Format date
  const formatDate = (ts) => {
    return new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-[85vh] p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">💬 Chat du Club</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white p-3 rounded-lg shadow-inner space-y-2 border">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.user_id === user.id ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                m.user_id === user.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <div className="text-xs opacity-70 mb-1">{m.user_name}</div>

              {editingId === m.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-2 py-1 text-black rounded"
                />
              ) : (
                <div>{m.content}</div>
              )}

              <div className="text-[10px] text-right opacity-70 mt-1">
                {formatDate(m.created_at)}
              </div>
            </div>

            {/* Edit/Delete */}
            {m.user_id === user.id && (
              <div className="flex gap-2 mt-1 text-xs opacity-70">
                {editingId === m.id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="text-green-600"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-red-600"
                    >
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

            {/* Reaction buttons */}
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

            {/* Show reactions */}
            {m.reactions?.length > 0 && (
              <div className="text-sm ml-2 opacity-70">
                {m.reactions.join(" ")}
              </div>
            )}
          </div>
        ))}

        <div ref={endRef}></div>
      </div>

      {/* Typing */}
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-600 mt-2">
          ✍️ {typingUsers.join(", ")} écrit...
        </div>
      )}

      {/* Input */}
      <div className="flex mt-3 gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping();
          }}
          placeholder="Écrire un message..."
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
