// src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { SendHorizonal, Edit3, Trash2, Check, X } from "lucide-react";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const typingRef = useRef(null);
  const endRef = useRef(null);

  // Scroll automatique
  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Charger les messages avec l'avatar du jeu favori
  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat")
      .select(`
        *,
        profils:user_id (
          id,
          nom,
          jeufavoris1
        ),
        jeux:jeufavoris1 (
          couverture_url
        )
      `)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // Ajouter cover_url à chaque message
      const messagesWithAvatar = data.map((m) => ({
        ...m,
        coverage_url: m.jeux?.couverture_url || "/default_avatar.png",
        user_name: m.profils?.nom || m.user_name,
      }));
      setMessages(messagesWithAvatar);
      scrollToBottom();
    }
  };

  // Charger les utilisateurs pour @mentions
  const loadUsers = async () => {
    const { data } = await supabase.from("profils").select("id, nom");
    if (data) setUsersList(data);
  };

  // Notifications navigateur
  const notifyBrowser = (title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") new Notification(title, { body });
      });
    }
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

          if (payload.new.user_id !== user.id) {
            setUnreadCount((c) => c + 1);
            notifyBrowser("Nouveau message", payload.new.content);
          }
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
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
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

  // Typing indicator
  const sendTyping = () => {
    supabase.channel("chat-room").send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // Envoyer un message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    await supabase.from("chat").insert({
      user_id: user.id,
      user_name: user.nom,
      content: text,
    });

    setInput("");
    setMentionSuggestions([]);
  };

  // Édition
  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = async () => {
    await supabase
      .from("chat")
      .update({ content: editText })
      .eq("id", editingId);

    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Supprimer un message
  const deleteMessage = async (id) => {
    await supabase.from("chat").delete().eq("id", id);
  };

  // Format date
  const formatDate = (ts) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Gestion @mention
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    sendTyping();

    const match = val.match(/@(\w*)$/);
    if (match) {
      const search = match[1].toLowerCase();
      setMentionSuggestions(
        usersList.filter((u) => u.nom.toLowerCase().startsWith(search))
      );
    } else {
      setMentionSuggestions([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[85vh] p-4 max-w-4xl mx-auto relative">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        💬 Chat du Club
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
            {unreadCount}
          </span>
        )}
      </h1>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto bg-white p-3 rounded-lg shadow-inner space-y-2 border relative">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 ${
              m.user_id === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <img
              src={m.coverage_url || "/default_avatar.png"}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`px-3 py-2 rounded-lg ${
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

              {/* Actions édition / suppression */}
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
            </div>
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
      <div className="flex mt-3 gap-2 relative">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Écrire un message... @pseudo"
          className="flex-1 px-3 py-2 border rounded-lg shadow-sm"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <SendHorizonal size={18} />
        </button>

        {/* Mention suggestions */}
        {mentionSuggestions.length > 0 && (
          <div className="absolute bottom-12 left-0 bg-white border rounded shadow max-h-40 overflow-y-auto z-50 w-full">
            {mentionSuggestions.map((u) => (
              <div
                key={u.id}
                className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  const newText = input.replace(/@\w*$/, `@${u.nom} `);
                  setInput(newText);
                  setMentionSuggestions([]);
                }}
              >
                {u.nom}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
