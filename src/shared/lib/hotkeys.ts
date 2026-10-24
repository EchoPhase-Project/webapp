/** A key combination and what to do when it is released. */
export type Hotkey = {
    /** Key codes that make the combination, e.g. ['ControlLeft', 'KeyK']. */
    keyCodes: string[];
    run: (e: KeyboardEvent, hotkey: Hotkey) => void;
};

/**
 * Global keyboard shortcuts: a combination fires on the keyup that ends it,
 * when all its keys were down. Listens to the window only while at least
 * one shortcut is registered.
 */
export class Hotkeys {
    private static readonly pressed = new Set<string>();
    private static hotkeys: Hotkey[] = [];
    private static listening = false;

    private static readonly onKeyDown = (e: KeyboardEvent) => {
        Hotkeys.pressed.add(e.code);
    };

    private static readonly onKeyUp = (e: KeyboardEvent) => {
        const down = new Set(Hotkeys.pressed);
        Hotkeys.pressed.delete(e.code);
        for (const hotkey of Hotkeys.hotkeys)
            if (hotkey.keyCodes.every((k) => down.has(k)))
                hotkey.run(e, hotkey);
    };

    // Keys released outside the window would otherwise stay "down".
    private static readonly onBlur = () => Hotkeys.pressed.clear();

    /** Registers a combination; returns a function that removes it. */
    static add(keyCodes: string[], run: Hotkey['run']): () => void {
        if (keyCodes.length === 0) throw new Error('keyCodes cannot be empty');
        const hotkey: Hotkey = { keyCodes, run };
        this.hotkeys.push(hotkey);
        this.listen();
        return () => this.remove(hotkey);
    }

    static remove(hotkey: Hotkey): void {
        this.hotkeys = this.hotkeys.filter((h) => h !== hotkey);
        if (this.hotkeys.length === 0) this.stop();
    }

    /** Keys held down right now. */
    static pressedKeys(): string[] {
        return [...this.pressed];
    }

    /** Removes every combination and stops listening. */
    static clear(): void {
        this.hotkeys = [];
        this.stop();
    }

    private static listen() {
        if (this.listening) return;
        this.listening = true;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    private static stop() {
        if (!this.listening) return;
        this.listening = false;
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        this.pressed.clear();
    }
}
