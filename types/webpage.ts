export type WebPageFormat = "markdown" | "html";

export interface StaticPageDraft {
    Title: string;
    Path: string;
    Content: string;
    Format: WebPageFormat;
    Published: boolean;
    ListInFooter: boolean;
}

export interface AdminWebPage extends StaticPageDraft {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}
