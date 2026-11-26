export const MAX_MESSAGE_LENGTH = 1000;

export interface ConversationVehicleSummary {
  vehicleId: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  price: number;
  city: string;
  location: string;
  mainImage: string;
}

export interface Conversation {
  conversationId: string;
  vehicleId: string;
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  otherParticipantName: string;
  role: 'buyer' | 'seller';
  vehicleAvailable: boolean;
  vehicleStatus: 'ativo' | 'oculto' | 'indisponivel';
  vehicle: ConversationVehicleSummary;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ListConversationsResponse {
  items: Conversation[];
  count: number;
  totalUnreadCount?: number;
}

export interface ListMessagesResponse {
  conversation: Conversation;
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface MarkConversationAsReadResponse {
  conversationId: string;
  readBy?: string;
  readAt: string;
  unreadCount?: number;
  totalUnreadCount?: number;
}

export type ConversationSocketStatus =
  | 'disabled'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface ConversationConnectedEvent {
  type: 'CONNECTED';
}

export interface NewMessageEvent {
  type: 'NEW_MESSAGE';
  conversationId: string;
  recipientId: string;
  message: ChatMessage;
  conversation?: {
    lastMessageText: string;
    lastMessageAt: string;
    lastMessageSenderId: string;
  };
}

export interface MessageReadEvent {
  type: 'MESSAGE_READ';
  conversationId: string;
  readBy: string;
  readAt: string;
}

export type ConversationSocketEvent =
  | ConversationConnectedEvent
  | NewMessageEvent
  | MessageReadEvent;
