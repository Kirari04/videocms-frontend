import { ServerConfig } from "composables/states";

export default defineNuxtComponent({
    async setup(props) {
        const token = useToken();
        const router = useRouter();
        if (!token.value) {
            router.push("/login");
        }

        const conf = useRuntimeConfig();
        const tokenExpire = useTokenExpire();
        const serverConfig = useServerConfig();
        const { data, error } = await useFetch<ServerConfig>(
            `${conf.public.apiUrl}/config`
        );
        if (error.value) {
            throw new Error(`Can't load server config: ${error.value.message}`);
        }
        if (data.value) {
            serverConfig.value = data.value;
        }
        let myinterval: NodeJS.Timer | null = null;
        if (token.value) {
            const { data, error } = await useFetch<{
                exp: string;
                username: string;
            }>(`${conf.public.apiUrl}/auth/check`, {
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
            });
            if (error.value) {
                token.value = "";
            } else {
                tokenExpire.value = new Date(`${data.value?.exp}`);
                let isRegenerating = false;
                myinterval = setInterval(async () => {
                    let leftSeconds = Math.round(
                        (tokenExpire.value!.getTime() - new Date().getTime()) /
                            1000
                    );
                    if (leftSeconds < 30) {
                        if (isRegenerating) {
                            return;
                        }
                        isRegenerating = true;
                        const { data: refreshData, error } = await useFetch<{
                            exp: string;
                            token: string;
                        }>(`${conf.public.apiUrl}/auth/refresh`, {
                            headers: {
                                Authorization: `Bearer ${token.value}`,
                            },
                        });
                        isRegenerating = false;
                        if (error.value) {
                            console.log(
                                "error",
                                error.value.message,
                                error.value.data
                            );
                            return;
                        }
                        tokenExpire.value = new Date(
                            `${refreshData.value?.exp}`
                        );
                        token.value = refreshData.value?.token;
                    }
                }, 1000);
            }
        }
        onBeforeRouteLeave(async (to, from) => {
            if (myinterval) {
                clearInterval(myinterval);
            }
        });
    },
});
