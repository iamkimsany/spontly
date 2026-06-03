export const CATEGORIES = [
  { id: 'sports', emoji: '🏃', label: 'Sports & Nature', examples: 'Hiking, climbing, yoga, cycling' },
  { id: 'creative', emoji: '🎨', label: 'Creative', examples: 'Drawing, ceramics, photography' },
  { id: 'music', emoji: '🎵', label: 'Music & Dance', examples: 'Salsa, hip-hop, concerts' },
  { id: 'food', emoji: '🍜', label: 'Food & Drinks', examples: 'Restaurants, cafés, cooking classes' },
  { id: 'learning', emoji: '📚', label: 'Learning', examples: 'Workshops, language clubs, lectures' },
  { id: 'events', emoji: '🎉', label: 'Events', examples: 'Exhibitions, festivals, markets' },
  { id: 'networking', emoji: '💼', label: 'Networking', examples: 'Meetups, startup events' },
  { id: 'games', emoji: '🎮', label: 'Games & Fun', examples: 'Board games, escape rooms, bowling' },
  { id: 'travel', emoji: '🌍', label: 'Travel', examples: 'Day trips, neighborhood walks' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];
