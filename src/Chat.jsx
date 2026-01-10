// src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { SendHorizonal, Edit3, Trash2, Check, X } from "lucide-react";

export default function Chat({ user, readOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const typingTimeoutRef = useRef(null);
  const endRef = useRef(null);
  const channelRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // --- Enrichir message ---
  const enrichMessage = async (message) => {
    const { data: profil } = await supabase
      .from("profils")
      .select("profilsid, nom, jeufavoris1")
      .eq("profilsid", message.user_id)
      .single();

    let coverage_url = "/default_avatar.png";

    if (profil?.jeufavoris1) {
      const { data: jeu } = await supabase
        .from("jeux")
        .select("couverture_url")
        .eq("id", profil.jeufavoris1)
        .single();

      coverage_url = jeu?.couverture_url || coverage_url;
    }

    return {
      ...message,
      user_name: profil?.nom || message.user_name,
      coverage_url,
    };
  };

  // --- Charger messages ---
  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!data) return;

    const userIds = [...new Set(data.map((m) => m.user_id))];

    const { data: profils } = await supabase
      .from("profils")
      .select("profilsid, nom, jeufavoris1")
      .in("profilsid", userIds);

    const jeuxIds = [
      ...new Set(profils.filter((p) => p.jeufavoris1).map((p) => p.jeufavoris1)),
    ];

    const { data: jeux } = await supabase
      .from("jeux")
      .select("id, couverture_url")
      .in("id", jeuxIds);

    const enriched = data.map((m) => {
      const profil = profils.find((p) => p.profilsid === m.user_id);
      const jeu = jeux.find((j) => j.id === profil?.jeufavoris1);

      return {
        ...m,
        user_name: profil?.nom || m.user_name,
        coverage_url: jeu?.couverture_url || "/default_avatar.png",
      };
    });

    setMessages(enriched);
    scrollToBottom();
  };

  // --- Utilisateurs pour mentions ---
  const loadUsers = async () => {
    const { data } = await supabase.from("profils").select("profilsid, nom");
    if (data) setUsersList(data);
  };

  // --- Notifications navigateur ---
  const notifyBrowser = (title, body) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  };

  // --- Realtime ---
  useEffect(() => {
    loadMessages();
    loadUsers();

    const channel = supabase.channel("chat-room");

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        async ({ new: msg }) => {
          const enriched = await enrichMessage(msg);
          setMessages((prev) => [...prev, enriched]);
          scrollToBottom();

          if (msg.user_id !== user.profilsid) {
            setUnreadCount((c) => c + 1);
            notifyBrowser("Nouveau message", msg.content);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat" },
        async ({ new: msg }) => {
          const enriched = await enrichMessage(msg);
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? enriched : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat" },
        ({ old }) => {
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.name === user.nom) return;

        setTypingUsers((prev) =>
          prev.includes(payload.name) ? prev : [...prev, payload.name]
        );

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers([]);
        }, 1500);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.profilsid]);

  // --- Typing ---
  const sendTyping = () => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // --- Envoyer message ---
  const sendMessage = async () => {
    if (readOnly) return;

    const text = input.trim();
    if (!text) return;

    await supabase.from("chat").insert({
      user_id: user.profilsid,
      user_name: user.nom,
      content: text,
    });

    setInput("");
    setMentionSuggestions([]);
  };

  // --- Edition ---
  const startEdit = (m) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const saveEdit = async () => {
    await supabase.from("chat").update({ content: editText }).eq("id", editingId);
    setEditingId(null);
    setEditText("");
  };

  const deleteMessage = async (id) => {
    await supabase.from("chat").delete().eq("id", id);
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    sendTyping();

    const match = val.match(/@(\w*)$/);
    if (match) {
      const search = match[1].toLowerCase();
      setMentionSuggestions(
        usersList.filter((u) =>
          u.nom?.toLowerCase().startsWith(search)
        )
      );
    } else {
      setMentionSuggestions([]);
    }
  };

  return (
    <div className="flex flex-col h-screen mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        💬 Tchat de l'association
        {unreadCount > 0 && (
          <span className="ml-2 bg-red-500 text-white px-2 rounded-full text-xs">
            {unreadCount}
          </span>
        )}
      </h1>

      <div className="flex-1 overflow-y-auto bg-white p-3 rounded border space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${
              m.user_id === user.profilsid ? "justify-end" : ""
            }`}
          >
            <img
              src={m.coverage_url}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="max-w-[80%]">
              <div className="text-xs opacity-70">{m.user_name}</div>

              <div className={`rounded px-3 py-2 ${
              m.user_id === user.profilsid ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
            }`}>
                {editingId === m.id ? (
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                ) : (
                  m.content
                )}
              </div>

              <div className="text-[10px] opacity-60 text-right">
                {formatDate(m.created_at)}
              </div>

              {m.user_id === user.profilsid && (
                <div className="flex gap-2 mt-1 text-xs">
                  {editingId === m.id ? (
                    <>
                      <button onClick={saveEdit} className="text-green-600"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-red-600"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(m)}><Edit3 size={14} /></button>
                      <button onClick={() => deleteMessage(m.id)}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="text-sm mt-2 text-gray-500">
          ✍️ {typingUsers.join(", ")} écrit...
        </div>
      )}

      <div className="flex mt-3 gap-2 relative">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Écrire un message… @pseudo"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded"
        >
          <SendHorizonal size={18} />
        </button>

        {mentionSuggestions.length > 0 && (
          <div className="absolute bottom-12 left-0 bg-white border rounded shadow w-full">
            {mentionSuggestions.map((u) => (
              <div
                key={u.profilsid}
                className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setInput(input.replace(/@\w*$/, `@${u.nom} `));
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
