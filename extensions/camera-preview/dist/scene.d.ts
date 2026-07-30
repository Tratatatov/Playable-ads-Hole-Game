export declare function load(): void;
export declare function unload(): void;
export declare const methods: {
    listCameras(): string[];
    captureCamera(cameraName: string, width: number, height: number): string | null;
};
