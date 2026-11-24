// Test helpers of the realtime feature. Only tests import this file, so it
// stays out of the bundle (and out of the coverage, as fixtures.ts).

/** A WebSocket the test opens, drops and reads. */
export class FakeSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    static made: FakeSocket[] = [];

    readyState = FakeSocket.CONNECTING;
    sent: unknown[] = [];
    closedWith?: number;
    onopen: (() => void) | null = null;
    onmessage: ((message: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;

    constructor(readonly url: string) {
        FakeSocket.made.push(this);
    }
    send(data: string) {
        this.sent.push(JSON.parse(data));
    }
    close(code?: number) {
        this.closedWith = code;
        this.drop();
    }
    open() {
        this.readyState = FakeSocket.OPEN;
        this.onopen?.();
    }
    /** A message from the server, as text (as the socket gives it). */
    deliver(data: unknown) {
        this.onmessage?.({
            data: typeof data === 'string' ? data : JSON.stringify(data),
        });
    }
    /** The connection is gone (the server, the network). */
    drop() {
        this.readyState = FakeSocket.CLOSED;
        this.onclose?.();
    }
}
