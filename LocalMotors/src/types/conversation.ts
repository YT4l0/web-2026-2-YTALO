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

export interface ListMessagesResponse {
  conversation: Conversation;
  items: ChatMessage[];
  nextCursor: string | null;
}
