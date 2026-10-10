export declare class OpenAIVisionProvider {
    private logger;
    private client;
    private model;
    constructor();
    static isEnabled(): boolean;
    extractText(imagePath: string): Promise<{
        text: string | null;
        rawResponse: any;
    }>;
    describeElement(imagePath: string, elementKind: string, context?: string): Promise<{
        description: string | null;
        rawResponse: any;
    }>;
}
//# sourceMappingURL=openai-vision-provider.d.ts.map