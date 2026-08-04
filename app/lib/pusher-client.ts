import type Pusher from "pusher-js";

// Prevent multiple instances in development
declare global {
  var pusherClient: Pusher | undefined;
}

const getPusherClient = () => {
  if (typeof window === "undefined") return undefined;
  
  // Use require as a fallback for hybrid modules in Next.js/Turbopack
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PusherClass = require("pusher-js");
  const ActualPusher = PusherClass.default || PusherClass;
  
  return globalThis.pusherClient || new ActualPusher(
    process.env.NEXT_PUBLIC_PUSHER_KEY!,
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    }
  );
};

export const pusherClient = getPusherClient() as Pusher;

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  globalThis.pusherClient = pusherClient;
}
