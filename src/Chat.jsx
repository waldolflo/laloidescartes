// src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Smile, SendHorizonal } from "lucide-react";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [usersList, setUsersList] = useState([]);
  const typingRef = useRef(null);
  const endRef = useRef(null);

  // 🔔 Son de notification
  const notifSound = new Audio(
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_5785c33f9d.mp3"
  );

  // 📌 Scrolldown automatique
  const scrollToBottom = () => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // 📥 Charger les 100 derniers messages
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error) {
      setMessages(data);
      scrollToBottom();
    }
  };

  // 👥 Charger les utilisateurs pour les mentions
  const loadUsers = async () => {
    const { data } = await supabase.from("profils").select("id, nom");
    if (data) setUsersList(data);
  };

  // 🔄 Évènements temps réel
  useEffect(() => {
    loadMessages();
    loadUsers();

    // 🔊 Nouveau message
    const sub = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();

          if (payload.new.user_id !== user.id) notifSound.play();
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

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  // ✍️ Signaler qu’on écrit
  const sendTyping = () => {
    supabase.channel("chat-room").send({
      type: "broadcast",
      event: "typing",
      payload: { name: user.nom },
    });
  };

  // 🚀 Envoyer un message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    await supabase.from("chat").insert({
      user_id: user.id,
      user_name: user.nom,
      content: text,
    });

    setInput("");

    // 🔧 Nettoyage automatique si > 100 messages
    const { data } = await supabase
      .from("chat")
      .select("id")
      .order("created_at", { ascending: false });

    if (data.length > 100) {
      const idsToDelete = data.slice(100).map((m) => m.id);
      await supabase.from("chat").delete().in("id", idsToDelete);
    }
  };

  // 😄 Ajouter une réaction
  const addReaction = async (msgId, emoji) => {
    await supabase.from("chat").update({
      reactions: supabase.rpc("append_reaction", {
        message_id: msgId,
        reaction: emoji,
      }),
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
    <div className="p-4 max-w-3xl mx-auto flex flex-col h-[85vh]">
      <h1 className="text-2xl font-bold mb-4">💬 Chat du Club</h1>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto bg-white p-3 rounded-lg shadow-inner space-y-2 border">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.user_id === user.id ? "items-end" : "items-start"}`}>
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                m.user_id === user.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <div className="text-xs opacity-70 mb-1">{m.user_name}</div>
              <div>{m.content}</div>
              <div className="text-[10px] text-right opacity-70 mt-1">{formatDate(m.created_at)}</div>
            </div>

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

            {/* Affichage reactions */}
            {m.reactions && m.reactions.length > 0 && (
              <div className="text-sm ml-2 opacity-70">
                {m.reactions.join(" ")}
              </div>
            )}
          </div>
        ))}

        {/* Fin scroll */}
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
