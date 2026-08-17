declare module "socket.io-client" {
  interface Socket {
    on(ev: string, fn: (...args: unknown[]) => void): Socket;
    once(ev: string, fn: (...args: unknown[]) => void): Socket;
    emit(ev: string, data?: unknown): Socket;
    disconnect(): Socket;
  }
  function io(uri: string, opts?: Record<string, unknown>): Socket;
  export = io;
}
