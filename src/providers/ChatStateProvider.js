"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatStateContext = createContext();

export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatStateProvider');
  }
  return context;
};

export function ChatStateProvider({ children }) {
  // Store chat histories keyed by patient ID
  const [chatHistories, setChatHistories] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to normalize timestamps
  const normalizeTimestamp = (timestamp) => {
    if (!timestamp) {
      return new Date();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (typeof timestamp === 'number') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  };

  // Restore histories from sessionStorage on mount
  useEffect(() => {
    try {
      const keys = Object.keys(sessionStorage);
      const restoredHistories = {};
      
      keys.forEach(key => {
        if (key.startsWith('clara_chat_')) {
          const patientId = key.replace('clara_chat_', '');
          const saved = sessionStorage.getItem(key);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              // Normalize timestamps in restored messages
              const normalized = parsed.map(msg => ({
                ...msg,
                timestamp: normalizeTimestamp(msg.timestamp)
              }));
              restoredHistories[patientId] = normalized;
            } catch (e) {
              console.error(`Failed to parse chat history for patient ${patientId}:`, e);
            }
          }
        }
      });
      
      setChatHistories(restoredHistories);
    } catch (err) {
      console.error('Failed to restore chat histories:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Persist to sessionStorage whenever histories change
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      Object.entries(chatHistories).forEach(([patientId, messages]) => {
        const storageKey = `clara_chat_${patientId}`;
        if (messages && messages.length > 0) {
          sessionStorage.setItem(storageKey, JSON.stringify(messages));
        }
      });
    } catch (err) {
      console.error('Failed to save chat histories:', err);
    }
  }, [chatHistories, isInitialized]);

  const getMessages = (patientId) => {
    return chatHistories[patientId] || [];
  };

  const setMessages = (patientId, messages) => {
    setChatHistories(prev => ({
      ...prev,
      [patientId]: messages
    }));
  };

  const clearChat = (patientId) => {
    setChatHistories(prev => {
      const updated = { ...prev };
      delete updated[patientId];
      return updated;
    });
    
    try {
      sessionStorage.removeItem(`clara_chat_${patientId}`);
    } catch (err) {
      console.error('Failed to clear chat from storage:', err);
    }
  };

  const clearAllChats = () => {
    setChatHistories({});
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('clara_chat_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Failed to clear all chats:', err);
    }
  };

  return (
    <ChatStateContext.Provider
      value={{
        getMessages,
        setMessages,
        clearChat,
        clearAllChats,
        isInitialized
      }}
    >
      {children}
    </ChatStateContext.Provider>
  );
}
