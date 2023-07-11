export default defineNuxtRouteMiddleware((to, from) => {
    const token = useToken();
    const router = useRouter();

    if (!token.value) {
        router.push("/login");
    }
});
