export type Locale = "en-US" | "zh-CN";

export type TranslationParams = Record<string, string | number>;

export type Translator = (key: string, params?: TranslationParams) => string;
