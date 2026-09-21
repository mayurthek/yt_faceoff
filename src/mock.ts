import type { Channel } from "./game/types";

const MOCK_CHANNELS: Channel[] = [
  {
    id: "UCsXVk37bltHxD1rDPwtNMXQ",
    title: "Kurzgesagt – In a Nutshell",
    thumbnailUrl: "https://picsum.photos/seed/ucsxv/320/180",
    subscriberCount: 22500000,
    channelUrl: "https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNMXQ",
  },
  {
    id: "UCBa659QWEk1AI4Tg--mg2zw",
    title: "Ryan Trahan",
    thumbnailUrl: "https://picsum.photos/seed/ucba6/320/180",
    subscriberCount: 18400000,
    channelUrl: "https://www.youtube.com/channel/UCBa659QWEk1AI4Tg--mg2zw",
  },
  {
    id: "UCXuqSBlHAE6Xw-yeJA0Tunw",
    title: "Linustechtips",
    thumbnailUrl: "https://picsum.photos/seed/ucxuq/320/180",
    channelUrl: "https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw",
  },
  {
    id: "UClB4KMO5h9P6VPa1Ek1V3NQ",
    title: "Netflix",
    thumbnailUrl: "https://picsum.photos/seed/uclb4/320/180",
    subscriberCount: 60000000,
    channelUrl: "https://www.youtube.com/channel/UClB4KMO5h9P6VPa1Ek1V3NQ",
  },
  {
    id: "UCYO_jab_esuFRV4b17AJtAw",
    title: "3Blue1Brown",
    channelUrl: "https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw",
  },
  {
    id: "UCX6bQPVTY2dsf4GZtZ7U5nA",
    title: "MrBeast",
    thumbnailUrl: "https://picsum.photos/seed/ucx6b/320/180",
    subscriberCount: 316000000,
    channelUrl: "https://www.youtube.com/channel/UCX6bQPVTY2dsf4GZtZ7U5nA",
  },
  {
    id: "UC0rR2U1vmeejm0mjHkGZ_8A",
    title: "Markiplier",
    channelUrl: "https://www.youtube.com/channel/UC0rR2U1vmeejm0mjHkGZ_8A",
  },
  {
    id: "UCZZvgSMRsLCNlU4-km1frcg",
    title: "Rooster Teeth",
    thumbnailUrl: "https://picsum.photos/seed/uczzv/320/180",
    channelUrl: "https://www.youtube.com/channel/UCZZvgSMRsLCNlU4-km1frcg",
  },
];

export function fetchMockSubscriptions(
  delayMs = 650,
): Promise<Channel[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_CHANNELS.map((c) => ({ ...c }))), delayMs);
  });
}