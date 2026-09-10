
import { BridgeStatus } from "../types";

class BridgeClient {
  private socket: WebSocket | null = null;
  private statusListeners: ((status: BridgeStatus) => void)[] = [];
  private currentStatus: BridgeStatus = BridgeStatus.Disconnected;

  constructor() {
    // Start disconnected; only connect upon user request
    this.currentStatus = BridgeStatus.Disconnected;
  }

  public connect(url: string = 'ws://localhost:8866') {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.updateStatus(BridgeStatus.Connecting);
    
    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.info('UE5 Bridge Connected');
        this.updateStatus(BridgeStatus.Connected);
      };

      this.socket.onclose = () => {
        if (this.currentStatus !== BridgeStatus.Disconnected) {
          console.info('UE5 Bridge Disconnected');
          this.updateStatus(BridgeStatus.Disconnected);
        }
      };

      this.socket.onerror = () => {
        // Handle connection failure gracefully without throwing noisy console errors
        console.info('UE5 Bridge: Local host not reachable or plugin not active at', url);
        this.updateStatus(BridgeStatus.Disconnected);
      };

      this.socket.onmessage = (msg) => {
        console.info('Message from UE5 Bridge:', msg.data);
      };
    } catch (e) {
      console.info('UE5 Bridge Connection attempt ended:', e);
      this.updateStatus(BridgeStatus.Disconnected);
    }
  }

  public onStatusChange(callback: (status: BridgeStatus) => void) {
    this.statusListeners.push(callback);
    callback(this.currentStatus);
  }

  private updateStatus(status: BridgeStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach(cb => cb(status));
  }

  public async pushScript(script: string): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const payload = JSON.stringify({
      type: 'execute_python',
      payload: script
    });

    this.socket.send(payload);
    return true;
  }

  public disconnect() {
    this.socket?.close();
  }
}

export const bridgeClient = new BridgeClient();
