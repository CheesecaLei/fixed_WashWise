import Pusher from "pusher";

declare global {
  var pusherServer: Pusher | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PusherClass = (Pusher as any).default || Pusher;

export const pusherServer = globalThis.pusherServer || new PusherClass({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

if (process.env.NODE_ENV !== "production") {
  globalThis.pusherServer = pusherServer;
}
