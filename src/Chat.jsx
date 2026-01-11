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

  const typingRef = useRef(null);
  const endRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // --- Enrichir message avec profil + couverture ---
  const enrichMessage = async (message) => {
    const { data: profil } = await supabase
      .from("profils")
      .select("id, nom, jeufavoris1")
      .eq("id", message.user_id)
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

  // Charger messages initiaux
  const loadMessages = async () => {
    const { data: chatData } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!chatData) return;

    const userIds = [...new Set(chatData.map((m) => m.user_id))];
    const { data: profilsData } = await supabase
      .from("profils")
      .select("id, nom, jeufavoris1")
      .in("id", userIds);

    const jeuxIds = [
      ...new Set(profilsData.filter((p) => p.jeufavoris1).map((p) => p.jeufavoris1))
    ];
    const { data: jeuxData } = await supabase
      .from("jeux")
      .select("id, couverture_url")
      .in("id", jeuxIds);

    const messagesWithDetails = chatData.map((m) => {
      const profil = profilsData.find((p) => p.id === m.user_id);
      const jeu = jeuxData.find((j) => j.id === profil?.jeufavoris1);
      return {
        ...m,
        user_name: profil?.nom || m.user_name,
        coverage_url: jeu?.couverture_url || "/default_avatar.png",
      };
    });

    setMessages(messagesWithDetails);
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
    if (!user?.id) return;
    loadMessages();
    loadUsers();

    const sub = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        async (payload) => {
          const newMessage = await enrichMessage(payload.new);
          setMessages((prev) => [...prev, newMessage]);
          scrollToBottom();

          if (payload.new.user_id !== user?.id) {
            setUnreadCount((c) => c + 1);
            notifyBrowser("Nouveau message", payload.new.content);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat" },
        async (payload) => {
          const updatedMessage = await enrichMessage(payload.new);
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? updatedMessage : m))
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
          if (name === user?.nom) return;

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

  const sendTyping = () => {
    if (!user?.nom) return;
    supabase.channel("chat-room").send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // --- Envoyer un message avec notifications push ---
  const sendMessage = async () => {
    if (!user?.id || readOnly) return;
    const text = input.trim();
    if (!text) return;

    // 1️⃣ Insérer le message
    const { data: newMessage } = await supabase
      .from("chat")
      .insert({ user_id: user.id, user_name: user.nom, content: text })
      .select()
      .single();

    setInput("");
    setMentionSuggestions([]);

    // 2️⃣ Détecter mentions @pseudo
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    // 3️⃣ Notifications via fonction serverless
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    // a) notif_chat → tous les devices sauf l'envoyeur
    fetch("https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "notif_chat",
        title: `💬 Nouveau message de ${user.nom}`,
        body: text,
        url: "/chat",
      }),
    });

    // b) notif_ping → pour chaque pseudo mentionné
    for (const pseudo of mentions) {
      fetch("https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "notif_ping",
          title: `🔔 Mention de ${user.nom}`,
          body: text,
          url: "/chat",
        }),
      });
    }
  };

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
  const deleteMessage = async (id) => {
    await supabase.from("chat").delete().eq("id", id);
  };
  const formatDate = (ts) =>
    new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    sendTyping();

    const match = val.match(/@(\w*)$/);
    if (match) {
      const search = match[1].toLowerCase();
      setMentionSuggestions(usersList.filter((u) => u.nom?.toLowerCase().startsWith(search)));
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
        {Array.isArray(messages) && messages.map((m) => (
          <div key={m.id} className={`flex items-start gap-2 ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}>
            <img src={m.coverage_url || "/default_avatar.png"} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex flex-col max-w-[80%] w-[80%]">
              <div className={`px-3 py-2 rounded-lg w-full ${m.user_id === user?.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"}`}>
                <div className="text-xs opacity-70 mb-1">{m.user_name}</div>
                {editingId === m.id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={1}
                    className="w-full bg-transparent resize-none outline-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
                <div className="text-[10px] text-right opacity-70 mt-1">{formatDate(m.created_at)}</div>
              </div>

              {m.user_id === user?.id && (
                <div className="flex gap-2 mt-1 text-xs opacity-70">
                  {editingId === m.id ? (
                    <>
                      <button onClick={saveEdit} className="text-green-600"><Check size={14} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={14} /></button>
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
        <div ref={endRef}></div>
      </div>

      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-600 mt-2">✍️ {typingUsers.join(", ")} écrit...</div>
      )}

      <div className="flex mt-3 gap-2 relative">
        <input
          disabled={readOnly}
          value={input}
          onChange={handleInputChange}
          placeholder="Écrire un message... @pseudo"
          className="flex-1 px-3 py-2 border rounded-lg shadow-sm"
        />
        <button
          onClick={sendMessage}
          disabled={readOnly}
          className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <SendHorizonal size={18} />
        </button>

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
