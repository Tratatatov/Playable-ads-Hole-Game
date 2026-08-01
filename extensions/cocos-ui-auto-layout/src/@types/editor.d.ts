/**
 * Type declarations for Cocos Creator 3.x Editor globals.
 * These APIs are injected by the Cocos Creator Electron runtime —
 * they are NOT available via npm, so we declare them manually.
 */

declare const Editor: {
  Panel: {
    open(name: string): void;
    close(name: string): void;
  };
  Message: {
    send(target: string, message: string, ...args: any[]): void;
    request(target: string, message: string, ...args: any[]): Promise<any>;
  };
  Dialog: {
    error(title: string, options?: { detail?: string; buttons?: string[] }): void;
    warn(title: string, options?: { detail?: string; buttons?: string[] }): void;
    info(title: string, options?: { detail?: string; buttons?: string[] }): void;
  };
  log(...args: any[]): void;
};
