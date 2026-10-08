export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  referencias?: string[];
  linksUteis?: { label: string; url: string }[];
}
