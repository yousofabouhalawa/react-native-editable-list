export type FeedItem = {
  id: string;
  author: string;
  avatarUrl: string;
  caption: string;
  comments: number;
  handle: string;
  imageUrl: string;
  likes: number;
  reposts: number;
  subtitle: string;
};

export type MessageItem = {
  id: string;
  avatarUrl: string;
  preview: string;
  sender: string;
  time: string;
  unread?: boolean;
};

export type ProductItem = {
  id: string;
  category: string;
  description: string;
  imageUrl: string;
  name: string;
  price: number;
  rating: number;
};

const image = (id: string, width: number, height: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;

const maleAvatar = (id: number) =>
  `https://randomuser.me/api/portraits/men/${id}.jpg`;

const malePostImage = (id: string) => image(id, 900, 780);

const FEED_PROFILES = [
  {
    author: 'Omar Haddad',
    avatarId: 32,
    caption: 'Found a quiet stretch of beach before the afternoon crowd.',
    handle: '@omar.builds',
    imageId: 'photo-1507525428034-b723cf961d3e',
    subtitle: 'Product engineer',
  },
  {
    author: 'Daniel Brooks',
    avatarId: 12,
    caption: 'Late light over the trail made the whole climb worth it.',
    handle: '@daniel.notes',
    imageId: 'photo-1500534314209-a25ddb2bd429',
    subtitle: 'Design systems',
  },
  {
    author: 'Malik Carter',
    avatarId: 46,
    caption: 'Quiet desk by the windows before the afternoon calls.',
    handle: '@malik.codes',
    imageId: 'photo-1497215728101-856f4ea42174',
    subtitle: 'Frontend lead',
  },
  {
    author: 'Elias Morgan',
    avatarId: 54,
    caption: 'Blue hour on the water always slows the day down.',
    handle: '@elias.motion',
    imageId: 'photo-1500375592092-40eb2168fd21',
    subtitle: 'Mobile designer',
  },
  {
    author: 'Yusuf Rahman',
    avatarId: 7,
    caption: 'A clean setup for editing photos after a long walk.',
    handle: '@yusuf.dev',
    imageId: 'photo-1517336714731-489689fd1ca8',
    subtitle: 'iOS engineer',
  },
  {
    author: 'Marcus Reed',
    avatarId: 68,
    caption: 'Parked the bike outside before the morning ride.',
    handle: '@marcus.ui',
    imageId: 'photo-1485965120184-e220f721d03e',
    subtitle: 'Interface builder',
  },
  {
    author: 'Noah Sullivan',
    avatarId: 22,
    caption: 'The mountains looked unreal after the rain cleared.',
    handle: '@noah.native',
    imageId: 'photo-1506744038136-46273834b3fb',
    subtitle: 'Native modules',
  },
  {
    author: 'Rami Saleh',
    avatarId: 75,
    caption: 'Simple dinner, good music, and no laptop for once.',
    handle: '@rami.frames',
    imageId: 'photo-1517248135467-4c7edcad34c4',
    subtitle: 'Performance testing',
  },
] as const;

export const FEED_ITEMS: FeedItem[] = Array.from(
  { length: 2400 },
  (_, index) => {
    const profile = FEED_PROFILES[index % FEED_PROFILES.length]!;
    const cycle = Math.floor(index / FEED_PROFILES.length);
    const likeBase = 840 + ((index * 37) % 12800);
    const commentBase = 12 + ((index * 11) % 520);
    const repostBase = 4 + ((index * 7) % 190);

    return {
      id: `feed-${index + 1}`,
      author: profile.author,
      avatarUrl: maleAvatar(profile.avatarId),
      caption: profile.caption,
      comments: commentBase,
      handle: profile.handle,
      imageUrl: `${malePostImage(profile.imageId)}&sig=${cycle}`,
      likes: likeBase,
      reposts: repostBase,
      subtitle: profile.subtitle,
    };
  }
);
export const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: 'message-1',
    avatarUrl: maleAvatar(32),
    preview: 'Can you send the beach photos when you get a minute?',
    sender: 'Omar Haddad',
    time: '9:42 AM',
    unread: true,
  },
  {
    id: 'message-2',
    avatarUrl: maleAvatar(12),
    preview: 'Lunch at 1 still works for me.',
    sender: 'Daniel Brooks',
    time: '9:18 AM',
  },
  {
    id: 'message-3',
    avatarUrl: maleAvatar(46),
    preview: 'The notes from yesterday are in the shared folder.',
    sender: 'Malik Carter',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: 'message-4',
    avatarUrl: maleAvatar(54),
    preview: 'That sunset shot came out better than expected.',
    sender: 'Elias Morgan',
    time: 'Yesterday',
  },
  {
    id: 'message-5',
    avatarUrl: maleAvatar(7),
    preview: 'I booked the early train for Saturday.',
    sender: 'Yusuf Rahman',
    time: 'Mon',
  },
  {
    id: 'message-6',
    avatarUrl: maleAvatar(68),
    preview: 'Coffee later? I found a quieter place nearby.',
    sender: 'Marcus Reed',
    time: 'Sun',
    unread: true,
  },
  {
    id: 'message-7',
    avatarUrl: maleAvatar(22),
    preview: 'The trail was muddy but worth it.',
    sender: 'Noah Sullivan',
    time: 'Fri',
  },
  {
    id: 'message-8',
    avatarUrl: maleAvatar(75),
    preview: 'I saved a table for six.',
    sender: 'Rami Saleh',
    time: 'Thu',
  },
  {
    id: 'message-9',
    avatarUrl: maleAvatar(15),
    preview: 'Send me the address when you are heading out.',
    sender: 'Adam Keller',
    time: 'Wed',
    unread: true,
  },
  {
    id: 'message-10',
    avatarUrl: maleAvatar(63),
    preview: 'The camera battery is charged.',
    sender: 'Samir Khan',
    time: 'Tue',
  },
  {
    id: 'message-11',
    avatarUrl: maleAvatar(81),
    preview: 'I can bring the tripod if you still need it.',
    sender: 'Jonah Price',
    time: 'Mon',
  },
  {
    id: 'message-12',
    avatarUrl: maleAvatar(4),
    preview: 'That new playlist is solid.',
    sender: 'Leo Martin',
    time: 'Sun',
  },
];

const BASE_PRODUCTS = [
  {
    category: 'Audio',
    description: 'Wireless over-ear headphones with active noise canceling.',
    imageUrl: image('photo-1505740420928-5e560c06d30e', 700, 640),
    name: 'Studio Noise-Canceling Headphones',
    price: 249,
    rating: 4.8,
  },
  {
    category: 'Footwear',
    description: 'Lightweight running sneakers with a breathable knit upper.',
    imageUrl: image('photo-1542291026-7eec264c27ff', 700, 640),
    name: 'Velocity Knit Runner',
    price: 138,
    rating: 4.6,
  },
  {
    category: 'Watches',
    description: 'Minimal analog watch with a stainless steel case.',
    imageUrl: image('photo-1523275335684-37898b6baf30', 700, 640),
    name: 'Classic Steel Watch',
    price: 189,
    rating: 4.7,
  },
  {
    category: 'Photography',
    description: 'Compact film camera for travel and everyday shooting.',
    imageUrl: image('photo-1526170375885-4d8ecf77b99f', 700, 640),
    name: 'Pocket Film Camera',
    price: 92,
    rating: 4.5,
  },
  {
    category: 'Computers',
    description: 'Portable laptop for writing, design work, and demos.',
    imageUrl: image('photo-1517336714731-489689fd1ca8', 700, 640),
    name: '13-inch Work Laptop',
    price: 1299,
    rating: 4.9,
  },
  {
    category: 'Eyewear',
    description: 'Acetate sunglasses with polarized lenses.',
    imageUrl: image('photo-1572635196237-14b3f281503f', 700, 640),
    name: 'Polarized City Sunglasses',
    price: 118,
    rating: 4.4,
  },
  {
    category: 'Wearables',
    description: 'Smart watch with fitness tracking and cellular support.',
    imageUrl: image('photo-1546868871-7041f2a55e12', 700, 640),
    name: 'Cellular Fitness Watch',
    price: 399,
    rating: 4.7,
  },
  {
    category: 'Fragrance',
    description: 'Warm citrus fragrance in a travel-friendly bottle.',
    imageUrl: image('photo-1585386959984-a41552231658', 700, 640),
    name: 'Cedar Citrus Eau de Parfum',
    price: 86,
    rating: 4.3,
  },
  {
    category: 'Bags',
    description: 'Structured leather backpack with laptop storage.',
    imageUrl: image('photo-1548036328-c9fa89d128fa', 700, 640),
    name: 'Structured Leather Backpack',
    price: 224,
    rating: 4.6,
  },
  {
    category: 'Home',
    description: 'Ceramic table lamp with a warm fabric shade.',
    imageUrl: image('photo-1507473885765-e6ed057f782c', 700, 640),
    name: 'Ceramic Reading Lamp',
    price: 74,
    rating: 4.5,
  },
  {
    category: 'Stationery',
    description: 'Hardcover notebook with smooth dot-grid paper.',
    imageUrl: image('photo-1455390582262-044cdead277a', 700, 640),
    name: 'Dot Grid Notebook',
    price: 28,
    rating: 4.6,
  },
  {
    category: 'Furniture',
    description: 'Painted wood stool for counters, studios, and small spaces.',
    imageUrl: image('photo-1503602642458-232111445657', 700, 640),
    name: 'Painted Wood Stool',
    price: 118,
    rating: 4.8,
  },
  {
    category: 'Kitchen',
    description: 'White ceramic cup set for coffee, tea, and small biscuits.',
    imageUrl: image('photo-1544787219-7f47ccb76574', 700, 640),
    name: 'Ceramic Coffee Cup Set',
    price: 32,
    rating: 4.5,
  },
  {
    category: 'Drinks',
    description: 'Boxed outdoor drink for hikes, lakeside breaks, and picnics.',
    imageUrl: image('photo-1553531384-cc64ac80f931', 700, 640),
    name: 'Trail Pack Beverage',
    price: 6,
    rating: 4.7,
  },
  {
    category: 'Lighting',
    description: 'Adjustable desk light with a warm dimming range.',
    imageUrl: image('photo-1513506003901-1e6a229e2d15', 700, 640),
    name: 'Adjustable Desk Light',
    price: 96,
    rating: 4.4,
  },
  {
    category: 'Writing',
    description: 'Balanced aluminum pen with a fine refill.',
    imageUrl: image('photo-1583485088034-697b5bc54ccd', 700, 640),
    name: 'Aluminum Fine Pen',
    price: 42,
    rating: 4.6,
  },
] as const;

export const PRODUCTS: ProductItem[] = Array.from(
  { length: 2400 },
  (_, index) => {
    const product = BASE_PRODUCTS[index % BASE_PRODUCTS.length]!;
    const cycle = Math.floor(index / BASE_PRODUCTS.length);
    const variant = cycle + 1;
    const rating = Math.min(
      5,
      Math.round((product.rating + ((index % 5) - 2) * 0.03) * 10) / 10
    );

    return {
      id: `product-${index + 1}`,
      category: product.category,
      description: product.description,
      imageUrl: `${product.imageUrl}&sig=${cycle}`,
      name: `${product.name} ${String(variant).padStart(2, '0')}`,
      price: product.price + ((index * 9) % 47),
      rating,
    };
  }
);
