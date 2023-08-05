export default async function awaitEl(el: string): Promise<Element | null> {
    if (document.querySelector(el)) {
        return document.querySelector(el);
    }
    await new Promise((res) => setTimeout(res, 100));
    return awaitEl(el);
}
