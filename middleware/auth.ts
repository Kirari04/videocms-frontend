export default defineNuxtRouteMiddleware((to, from) => {
    const token = useToken();
    const router = useRouter();
    console.log("token val", token.value)
    if (!token.value) {
        router.push("/login");
    }
});
